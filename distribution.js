// ===== Utilities =====
const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);

// Required files tracking
const requiredFiles = { 
  studentEmails: null, 
  studentClassList: null, 
  entraAd: null 
};

// Logging utility
class Logger {
  constructor(containerId) {
    this.container = byId(containerId);
    this.entries = [];
  }
  
  clear() {
    this.entries = [];
    this.container.innerHTML = '';
  }
  
  log(message, level = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.textContent = message;
    this.container.appendChild(entry);
    this.entries.push({ message, level, time: new Date() });
  }
  
  info(msg) { this.log(msg, 'info'); }
  warning(msg) { this.log(msg, 'warning'); }
  error(msg) { this.log(msg, 'error'); }
  success(msg) { this.log(msg, 'success'); }
}

const logger = new Logger('processingLog');

// Update button state based on files and tags
function updateGenerateButton() {
  const hasAllFiles = !!(requiredFiles.studentEmails && 
                         requiredFiles.studentClassList && 
                         requiredFiles.entraAd);
  const tagsInput = byId('classTagFilters').value.trim();
  const hasTags = tagsInput.length > 0;
  
  const canGenerate = hasAllFiles && hasTags;
  byId('generate').disabled = !canGenerate;
  
  if (!hasAllFiles) {
    byId('status').textContent = 'Select all three files to continue.';
  } else if (!hasTags) {
    byId('status').textContent = 'Enter at least one class tag to filter.';
  } else {
    byId('status').textContent = 'Ready to generate distribution groups.';
  }
}

// Sanitize names for filenames
function sanitizeName(s) {
  if (!s || !s.trim()) return 'Unspecified';
  return s.trim().replace(/[^A-Za-z0-9\-_]+/g, '_');
}

// Parse CSV with proper handling
function parseCSV(text, requiredHeaders = []) {
  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false, c;
  
  const pushField = () => { row.push(field.trim()); field = ''; };
  const pushRow = () => { if (row.length) { rows.push(row); row = []; } };
  
  while (i < text.length) {
    c = text[i++];
    if (inQuotes) {
      if (c === '"') {
        if (text[i] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        pushField();
      } else if (c === '\r') {
        // ignore
      } else if (c === '\n') {
        pushField();
        pushRow();
      } else {
        field += c;
      }
    }
  }
  
  if (field.length || row.length) {
    pushField();
    pushRow();
  }
  
  if (rows.length === 0) {
    return { headers: [], rows: [], headerIndex: new Map() };
  }
  
  const headers = rows.shift().map(h => h.trim());
  const headerIndex = new Map();
  headers.forEach((h, i) => headerIndex.set(h, i));
  
  // Validate required headers
  for (const required of requiredHeaders) {
    if (!headerIndex.has(required)) {
      throw new Error(`Missing required column "${required}" in CSV`);
    }
  }
  
  return { headers, rows, headerIndex };
}

// Read text file
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file, 'utf-8');
  });
}

// Read XLSX file using SheetJS
async function readXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays, starting from row 2 (headers on row 2)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          defval: ''
        });
        
        // Skip first row, use second row as headers
        if (jsonData.length < 2) {
          throw new Error('XLSX file must have at least 2 rows (with headers on row 2)');
        }
        
        const headers = jsonData[1].map(h => (h || '').toString().trim());
        const rows = jsonData.slice(2); // Data starts from row 3
        
        const headerIndex = new Map();
        headers.forEach((h, i) => headerIndex.set(h, i));
        
        resolve({ headers, rows, headerIndex });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Parse class tags from input
function parseClassTags(input) {
  if (!input || !input.trim()) return [];
  
  // Split by whitespace, commas, and newlines
  const tags = input.split(/[\s,\n]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  return [...new Set(tags)]; // Remove duplicates
}

// Check if StudentClassList contains any of the tags
function matchesClassTags(classList, tags) {
  if (!classList || !tags.length) return false;
  
  const classListLower = classList.toLowerCase();
  return tags.some(tag => classListLower.includes(tag.toLowerCase()));
}

// Main processing function
async function processFiles() {
  logger.clear();
  logger.info('Starting processing...');
  
  try {
    // Read all files
    logger.info('Reading student emails file...');
    const emailsData = await readXLSX(requiredFiles.studentEmails);
    
    logger.info('Reading student class list file...');
    const classData = await readXLSX(requiredFiles.studentClassList);
    
    logger.info('Reading Entra AD file...');
    const entraText = await readTextFile(requiredFiles.entraAd);
    const entraData = parseCSV(entraText, ['mail', 'id']);
    
    // Validate required columns
    const emailsRequired = ['Preferred Last name', 'Preferred First name', 
                           'Admission Number', 'Year Group Name', 'Student email'];
    for (const col of emailsRequired) {
      if (!emailsData.headerIndex.has(col)) {
        throw new Error(`Missing required column "${col}" in student emails file`);
      }
    }
    
    const classRequired = ['StudentFullName', 'StudentYearGroup', 
                          'StudentClassList', 'AdmissionNo'];
    for (const col of classRequired) {
      if (!classData.headerIndex.has(col)) {
        throw new Error(`Missing required column "${col}" in class list file`);
      }
    }
    
    // Build Entra lookup (mail -> id)
    logger.info('Building Entra ID lookup...');
    const entraLookup = new Map();
    const mailIdx = entraData.headerIndex.get('mail');
    const idIdx = entraData.headerIndex.get('id');
    let entraCount = 0;
    
    for (const row of entraData.rows) {
      const mail = (row[mailIdx] || '').trim().toLowerCase();
      const id = (row[idIdx] || '').trim();
      
      if (mail && id && !entraLookup.has(mail)) {
        entraLookup.set(mail, id);
        entraCount++;
      }
    }
    logger.info(`Loaded ${entraCount} Entra IDs`);
    
    // Build student emails lookup (admission number -> student data)
    logger.info('Building student emails lookup...');
    const studentsLookup = new Map();
    const emailAdmIdx = emailsData.headerIndex.get('Admission Number');
    const emailEmailIdx = emailsData.headerIndex.get('Student email');
    const emailYearIdx = emailsData.headerIndex.get('Year Group Name');
    const emailFirstIdx = emailsData.headerIndex.get('Preferred First name');
    const emailLastIdx = emailsData.headerIndex.get('Preferred Last name');
    
    for (const row of emailsData.rows) {
      const admNo = (row[emailAdmIdx] || '').toString().trim();
      const email = (row[emailEmailIdx] || '').trim();
      const year = (row[emailYearIdx] || '').trim();
      const firstName = (row[emailFirstIdx] || '').trim();
      const lastName = (row[emailLastIdx] || '').trim();
      
      if (admNo && email) {
        if (!studentsLookup.has(admNo)) {
          studentsLookup.set(admNo, {
            admissionNumber: admNo,
            email: email,
            emailLower: email.toLowerCase(),
            yearGroup: year,
            firstName: firstName,
            lastName: lastName
          });
        }
      }
    }
    logger.info(`Loaded ${studentsLookup.size} students from emails file`);
    
    // Build class list lookup and merge
    logger.info('Processing class lists...');
    const classAdmIdx = classData.headerIndex.get('AdmissionNo');
    const classListIdx = classData.headerIndex.get('StudentClassList');
    const classYearIdx = classData.headerIndex.get('StudentYearGroup');
    const classNameIdx = classData.headerIndex.get('StudentFullName');
    
    const canonicalStudents = [];
    const unmatchedWarnings = new Set();
    
    for (const row of classData.rows) {
      const admNo = (row[classAdmIdx] || '').toString().trim();
      const classList = (row[classListIdx] || '').trim();
      const yearGroup = (row[classYearIdx] || '').trim();
      const fullName = (row[classNameIdx] || '').trim();
      
      if (!admNo) continue;
      
      const student = studentsLookup.get(admNo);
      if (!student) {
        unmatchedWarnings.add(`AdmissionNo ${admNo} (${fullName}) in class list but not in emails file`);
        continue;
      }
      
      // Verify year groups match
      if (yearGroup && student.yearGroup && yearGroup !== student.yearGroup) {
        logger.warning(`Year group mismatch for ${admNo}: "${yearGroup}" (class list) vs "${student.yearGroup}" (emails)`);
      }
      
      // Get Entra ID
      const entraId = entraLookup.get(student.emailLower);
      if (!entraId) {
        unmatchedWarnings.add(`No Entra ID for ${student.email} (${fullName})`);
        continue;
      }
      
      // Add to canonical list
      canonicalStudents.push({
        admissionNumber: admNo,
        email: student.email,
        yearGroup: student.yearGroup || yearGroup,
        classList: classList,
        id: entraId,
        fullName: fullName
      });
    }
    
    // Log warnings
    for (const warning of unmatchedWarnings) {
      logger.warning(warning);
    }
    
    logger.success(`Built canonical dataset with ${canonicalStudents.size} students`);
    
    // Apply class tag filters
    const tagsInput = byId('classTagFilters').value;
    const tags = parseClassTags(tagsInput);
    
    if (tags.length === 0) {
      throw new Error('No class tags specified');
    }
    
    logger.info(`Filtering by tags: ${tags.join(', ')}`);
    
    const filteredStudents = canonicalStudents.filter(student => 
      matchesClassTags(student.classList, tags)
    );
    
    logger.info(`Filtered to ${filteredStudents.length} students with matching tags`);
    
    if (filteredStudents.length === 0) {
      logger.warning('No students match the specified class tags');
      return {
        totalStudents: canonicalStudents.length,
        matched: canonicalStudents.length,
        filtered: 0,
        withId: 0,
        files: [],
        yearGroups: new Map()
      };
    }
    
    // Check yeargroup mode
    const yearGroupMode = byId('yeargroupMode').checked;
    
    // Generate CSVs
    const csvHeader = [
      'version:v1.0',
      'Member object ID or user principal name [memberObjectIdOrUpn] Required',
      'Example: 9832aad8-e4fe-496b-a604-95c6eF01ae75'
    ].join('\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const files = [];
    const yearGroupStats = new Map();
    
    if (yearGroupMode) {
      // Group by year
      const yearGroups = new Map();
      
      for (const student of filteredStudents) {
        const year = student.yearGroup || 'Unspecified';
        if (!yearGroups.has(year)) {
          yearGroups.set(year, new Set());
        }
        yearGroups.get(year).add(student.id);
      }
      
      // Create CSV for each year group
      for (const [year, ids] of yearGroups.entries()) {
        const sanitizedYear = sanitizeName(year);
        const tagToken = tags.slice(0, 3).join('_').slice(0, 20);
        const filename = `distribution_group_${sanitizedYear}_${tagToken}_${timestamp}.csv`;
        
        const content = csvHeader + '\n' + Array.from(ids).join('\n') + '\n';
        
        files.push({
          name: filename,
          content: content,
          year: year,
          count: ids.size
        });
        
        yearGroupStats.set(year, ids.size);
        logger.success(`Generated CSV for ${year} with ${ids.size} IDs`);
      }
    } else {
      // Single CSV for all
      const allIds = new Set(filteredStudents.map(s => s.id));
      const tagToken = tags.slice(0, 3).join('_').slice(0, 20);
      const filename = `distribution_group_all_${tagToken}_${timestamp}.csv`;
      
      const content = csvHeader + '\n' + Array.from(allIds).join('\n') + '\n';
      
      files.push({
        name: filename,
        content: content,
        count: allIds.size
      });
      
      // Still calculate year group stats for display
      for (const student of filteredStudents) {
        const year = student.yearGroup || 'Unspecified';
        yearGroupStats.set(year, (yearGroupStats.get(year) || 0) + 1);
      }
      
      logger.success(`Generated single CSV with ${allIds.size} IDs`);
    }
    
    return {
      totalStudents: studentsLookup.size,
      matched: canonicalStudents.length,
      filtered: filteredStudents.length,
      withId: filteredStudents.length, // All filtered have IDs by design
      files: files,
      yearGroups: yearGroupStats
    };
    
  } catch (error) {
    logger.error(`Processing failed: ${error.message}`);
    throw error;
  }
}

// Render results
function renderResults(results) {
  byId('results').classList.remove('hidden');
  
  // Update stats
  byId('statTotal').textContent = results.totalStudents;
  byId('statMatched').textContent = results.matched;
  byId('statFiltered').textContent = results.filtered;
  byId('statWithId').textContent = results.withId;
  byId('statFiles').textContent = results.files.length;
  
  // Update CSV list
  const csvList = byId('csvList');
  csvList.innerHTML = '';
  
  if (results.files.length === 0) {
    const span = document.createElement('span');
    span.textContent = 'No CSV files generated (no matching students).';
    csvList.appendChild(span);
  } else {
    // Create download links
    for (const file of results.files) {
      const blob = new Blob([file.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.className = 'download-link';
      link.href = url;
      link.download = file.name;
      link.innerHTML = `<span class="pill">CSV</span> <code>${file.name}</code>`;
      
      const div = document.createElement('div');
      div.appendChild(link);
      csvList.appendChild(div);
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }
  
  // Update year group breakdown
  const yearGroupTbody = byId('yearGroupTbody');
  yearGroupTbody.innerHTML = '';
  
  if (results.yearGroups.size > 0) {
    const sortedYears = Array.from(results.yearGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [year, count] of sortedYears) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${year}</td>
        <td>${count}</td>
        <td>${count}</td>
      `;
      yearGroupTbody.appendChild(tr);
    }
    
    byId('yearGroupHint').textContent = `${results.yearGroups.size} year groups`;
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="hint">No data</td>';
    yearGroupTbody.appendChild(tr);
  }
}

// Load SheetJS library dynamically
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load SheetJS library'));
    document.head.appendChild(script);
  });
}

// Initialize
async function init() {
  // Load SheetJS
  try {
    await loadSheetJS();
    logger.info('SheetJS library loaded');
  } catch (error) {
    logger.error('Failed to load required libraries');
    byId('generate').disabled = true;
    byId('status').textContent = 'Failed to load required libraries. Please refresh the page.';
    return;
  }
  
  // Wire up file inputs
  byId('studentEmails').addEventListener('change', (e) => {
    requiredFiles.studentEmails = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });
  
  byId('studentClassList').addEventListener('change', (e) => {
    requiredFiles.studentClassList = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });
  
  byId('entraAd').addEventListener('change', (e) => {
    requiredFiles.entraAd = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });
  
  // Wire up class tags input
  byId('classTagFilters').addEventListener('input', updateGenerateButton);
  
  // Wire up generate button
  byId('generate').addEventListener('click', async () => {
    const btn = byId('generate');
    const status = byId('status');
    
    btn.disabled = true;
    status.textContent = 'Processing files...';
    
    try {
      const results = await processFiles();
      renderResults(results);
      
      if (results.files.length === 0) {
        status.textContent = 'No CSV files generated (no matching students).';
      } else {
        status.textContent = `Generated ${results.files.length} CSV file(s). Click to download.`;
      }
    } catch (error) {
      console.error('Processing error:', error);
      status.textContent = `Error: ${error.message}`;
      logger.error(`Fatal error: ${error.message}`);
    } finally {
      btn.disabled = false;
      updateGenerateButton();
    }
  });
  
  // Initial button state
  updateGenerateButton();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}