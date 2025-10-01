// ===== Utilities =====
const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);

const requiredFiles = { bromcom: null, entra: null };

function updateGenerateButton() {
  const ok = !!(requiredFiles.bromcom && requiredFiles.entra);
  byId('generate').disabled = !ok;
  byId('status').textContent = ok ? 'Ready to generate.' : 'Select both files to enable.';
}

const sanitizeName = s => (!s || !s.trim()) ? '_Unspecified' : s.trim().replace(/[^A-Za-z0-9\-_]+/g, '_');

function parseCSV(text, requiredHeaders = []) {
  const rows = []; let i = 0, field = '', row = [], inQ = false, c;
  const pushF = () => { row.push(field); field = ''; };
  const pushR = () => { if (row.length) rows.push(row); row = []; };

  while (i < text.length) {
    c = text[i++];
    if (inQ) {
      if (c === '"') {
        if (text[i] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') pushF();
      else if (c === '\r') { /*ignore*/ }
      else if (c === '\n') { pushF(); pushR(); }
      else field += c;
    }
  }

  if (field.length || row.length) { pushF(); pushR(); }
  if (rows.length === 0) return { headers: [], rows: [], headerIndex: new Map() };

  // Remove BOM if present
  if (rows[0][0] && rows[0][0].charCodeAt(0) === 0xFEFF) rows[0][0] = rows[0][0].slice(1);

  const headers = rows.shift().map(h => (h || '').trim());
  const headerIndex = new Map();
  headers.forEach((h, i) => headerIndex.set(h, i));

  for (const need of requiredHeaders) {
    if (!headerIndex.has(need)) throw new Error(`Missing required column "${need}" in CSV`);
  }

  return { headers, rows, headerIndex };
}

function readTextFile(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(fr.error);
    fr.onload = () => res(fr.result);
    fr.readAsText(file, 'utf-8');
  });
}

// ===== Core processing =====
async function processFiles({ bromFile, entraFile }) {
  const [bromcsv, entracsv] = await Promise.all([
    readTextFile(bromFile),
    readTextFile(entraFile)
  ]);

  // Parse files
  const bromcom = parseCSV(bromcsv, ['House(s)', 'Student email', 'Year Group Name']);
  const entra = parseCSV(entracsv, ['id', 'mail']);

  const norm = s => (s || '').trim().toLowerCase();

  // Build Entra ID lookup: email -> id
  const emailToId = new Map();
  const ixMail = entra.headerIndex.get('mail');
  const ixId = entra.headerIndex.get('id');

  for (const r of entra.rows) {
    if (!r || !r.length) continue;
    const email = norm(r[ixMail] || '');
    const id = (r[ixId] || '').trim();
    if (!email || !id) continue;
    if (!emailToId.has(email)) emailToId.set(email, id);
  }

  // Process Bromcom records
  const ixHouse = bromcom.headerIndex.get('House(s)');
  const ixEmail = bromcom.headerIndex.get('Student email');
  const ixYear = bromcom.headerIndex.get('Year Group Name');

  const groupMap = new Map(); // "House_Year" -> Set of IDs
  const missing = [];

  for (const r of bromcom.rows) {
    if (!r || !r.length) continue;

    const email = norm(r[ixEmail] || '');
    const house = (r[ixHouse] || '').trim();
    const year = (r[ixYear] || '').trim();

    if (!email) continue;

    const entraId = emailToId.get(email);
    if (!entraId) {
      missing.push({ email, house, year, reason: 'No Entra ID found' });
      continue;
    }

    if (!house || !year) {
      missing.push({ email, house, year, reason: 'Missing house or year group' });
      continue;
    }

    // Create group key
    const groupKey = `${sanitizeName(house)}_${sanitizeName(year)}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { house, year, ids: new Set() });
    }

    groupMap.get(groupKey).ids.add(entraId);
  }

  return {
    processed: bromcom.rows.length,
    matched: bromcom.rows.length - missing.length,
    missing: missing.length,
    groups: groupMap,
    missingDetails: missing
  };
}

// ===== CSV generation =====
function generateCSVs(results) {
  const csvHeader = [
    'version:v1.0',
    'Member object ID or user principal name [memberObjectIdOrUpn] Required',
    'Example: 9832aad8-e4fe-496b-a604-95c6ef01ae75'
  ].join('\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const files = [];

  for (const [groupKey, groupData] of results.groups.entries()) {
    const filename = `${groupKey}_${timestamp}.csv`;
    const content = csvHeader + '\n' + Array.from(groupData.ids).join('\n') + '\n';

    files.push({
      name: filename,
      content: content,
      house: groupData.house,
      year: groupData.year,
      count: groupData.ids.size
    });
  }

  return files;
}

// ===== Rendering =====
function renderResults(results, files) {
  byId('results').classList.remove('hidden');

  // Update stats
  byId('statProcessed').textContent = results.processed;
  byId('statMatched').textContent = results.matched;
  byId('statMissing').textContent = results.missing;
  byId('statGroups').textContent = results.groups.size;
  byId('statCsvs').textContent = files.length;

  // Render CSV list
  const csvList = byId('csvList');
  csvList.innerHTML = '';

  if (files.length === 0) {
    csvList.innerHTML = '<span class="hint">No CSV files generated.</span>';
  } else {
    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.className = 'download-link';
      link.href = url;
      link.download = file.name;
      link.innerHTML = `<span class="pill">CSV</span> <code>${file.name}</code> <span class="hint">(${file.count} IDs)</span>`;

      csvList.appendChild(link);

      // Clean up blob URL after delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  }

  // Render missing matches table
  const missingTbody = byId('missingTbody');
  missingTbody.innerHTML = '';

  if (results.missingDetails.length === 0) {
    missingTbody.innerHTML = '<tr><td colspan="4" class="hint">No missing matches - all students processed successfully!</td></tr>';
  } else {
    results.missingDetails.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${item.email || 'N/A'}</td>
        <td>${item.reason}</td>
        <td>${item.house || 'N/A'} / ${item.year || 'N/A'}</td>
      `;
      missingTbody.appendChild(tr);
    });
  }
}

// ===== File System API =====
async function saveToFolder(files) {
  try {
    const dirHandle = await window.showDirectoryPicker();

    for (const file of files) {
      const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
    }

    return { success: true, count: files.length };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    throw err;
  }
}

// ===== Main handler =====
async function handleGenerate() {
  const btn = byId('generate');
  const status = byId('status');

  btn.disabled = true;
  status.textContent = 'Processing files...';

  try {
    const results = await processFiles({
      bromFile: requiredFiles.bromcom,
      entraFile: requiredFiles.entra
    });

    const files = generateCSVs(results);
    renderResults(results, files);

    // Handle save mode
    const saveMode = byId('saveMode').value;

    if (saveMode === 'folder' && window.showDirectoryPicker) {
      status.textContent = 'Select a folder to save files...';
      const saveResult = await saveToFolder(files);

      if (saveResult.success) {
        status.textContent = `✓ Saved ${saveResult.count} CSV files to selected folder.`;
      } else if (saveResult.cancelled) {
        status.textContent = 'Folder selection cancelled. Click CSV links below to download individually.';
      }
    } else {
      status.textContent = `Generated ${files.length} CSV file(s). Click links below to download.`;
    }

  } catch (error) {
    console.error('Processing error:', error);
    status.textContent = `Error: ${error.message}`;
  } finally {
    btn.disabled = false;
    updateGenerateButton();
  }
}

// ===== Initialize =====
function init() {
  // Wire up file inputs
  byId('bromcom').addEventListener('change', (e) => {
    requiredFiles.bromcom = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });

  byId('entra').addEventListener('change', (e) => {
    requiredFiles.entra = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });

  // Wire up generate button
  byId('generate').addEventListener('click', handleGenerate);

  // Initial state
  updateGenerateButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
