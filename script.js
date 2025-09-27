// ===== Utilities =====
const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);

const requiredFiles = { ad12:null, ad13:null, bromcom:null, entra:null };
function updateGenerateButton(){
  const ok = !!(requiredFiles.ad12 && requiredFiles.ad13 && requiredFiles.bromcom && requiredFiles.entra);
  byId('generate').disabled = !ok;
  byId('status').textContent = ok ? 'Ready to generate.' : 'Select all four files to enable.';
}

const sanitizeName = s => (!s || !s.trim()) ? '_Unspecified' : s.trim().replace(/[^A-Za-z0-9\-_]+/g,'_');

function parseDelimited(text, delimiter=',', requiredHeaders=[]){
  const rows=[]; let i=0, field='', row=[], inQ=false, c;
  const pushF=()=>{row.push(field);field='';}; const pushR=()=>{rows.push(row);row=[];};
  while(i<text.length){ c=text[i++]; if(inQ){ if(c==='"'){ if(text[i]==='"'){field+='"';i++;} else inQ=false; } else field+=c; }
    else{ if(c==='"') inQ=true; else if(c===delimiter) pushF(); else if(c==='\r'){/*ignore*/} else if(c==='\n'){ pushF(); pushR(); } else field+=c; } }
  if(field.length||row.length){pushF();pushR();}
  if(rows.length===0) return {headers:[],rows:[],headerIndex:new Map()};
  if(rows[0][0] && rows[0][0].charCodeAt(0)===0xFEFF) rows[0][0]=rows[0][0].slice(1);
  const headers=rows.shift().map(h=>(h||'').trim()); const headerIndex=new Map(); headers.forEach((h,i)=>headerIndex.set(h,i));
  for(const need of requiredHeaders){ if(!headerIndex.has(need)) throw new Error(`Missing required column "${need}" in ${delimiter==='\t'?'TSV':'CSV'}`); }
  return {headers, rows, headerIndex};
}

function readTextFile(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onerror=()=>rej(fr.error); fr.onload=()=>res(fr.result); fr.readAsText(file,'utf-8'); }); }

// ===== Core processing =====
async function processFiles({ad12File, ad13File, bromFile, entraFile}){
  const [ad12txt, ad13txt, bromcsv, entracsv] = await Promise.all([
    readTextFile(ad12File), readTextFile(ad13File), readTextFile(bromFile), readTextFile(entraFile)
  ]);

  const adReq = ['User Logon Name','E-Mail Address'];
  const ad12 = parseDelimited(ad12txt,'\t',adReq);
  const ad13 = parseDelimited(ad13txt,'\t',adReq);

  const emailToUpn = new Map(); const dupes=[]; const norm=s=>(s||'').trim().toLowerCase();
  function ingestAd(ad){
    const ixU = ad.headerIndex.get('User Logon Name'); const ixE = ad.headerIndex.get('E-Mail Address');
    const seen=new Map();
    for(const r of ad.rows){ if(!r||!r.length) continue; const upn=norm(r[ixU]||''); const email=norm(r[ixE]||''); if(!upn||!email) continue;
      if(!seen.has(email)) seen.set(email,upn);
      if(!emailToUpn.has(email)) emailToUpn.set(email,upn);
    }
    return seen;
  }
  const seen12=ingestAd(ad12); const seen13=ingestAd(ad13);
  for(const [email, upn12] of seen12.entries()){
    if(seen13.has(email)){ const upn13=seen13.get(email); dupes.push({email, upn12, upn13, status: upn12===upn13 ? 'consistent':'CONFLICT'}); }
  }

  const entraReq=['id','userPrincipalName'];
  const entra = parseDelimited(entracsv,',',entraReq);
  const ixId = entra.headerIndex.get('id'); const ixUpn = entra.headerIndex.get('userPrincipalName');
  const upnToId=new Map();
  for(const r of entra.rows){ if(!r||!r.length) continue; const id=(r[ixId]||'').trim(); const upn=norm(r[ixUpn]||''); if(id&&upn) upnToId.set(upn,id); }

  const bromReq=['House(s)','Student email','Year Group Name'];
  const brom = parseDelimited(bromcsv,',',bromReq);
  const bixH=brom.headerIndex.get('House(s)'); const bixE=brom.headerIndex.get('Student email'); const bixY=brom.headerIndex.get('Year Group Name');

  const groupMap=new Map(); const missing=[]; let processed=0, matched=0;
  const splitH = hs => (!hs||!hs.trim()) ? ['_Unspecified'] : hs.split(/[;,]/).map(s=>s.trim()).filter(Boolean);
  function addToGroup(houseName,yearName,id){
    const house=sanitizeName(houseName||'_Unspecified'); const year=sanitizeName(yearName||'_Unspecified');
    const key=`${house}|||${year}`; let set=groupMap.get(key); if(!set){ set=new Set(); groupMap.set(key,set); } set.add(id);
  }

  for(const r of brom.rows){
    if(!r||!r.length) continue; processed++;
    const emailRaw=(r[bixE]||'').trim(); const email=norm(emailRaw);
    const houses=splitH(r[bixH]||''); const year=(r[bixY]||'').trim()||'_Unspecified';
    if(!email){ missing.push({email:emailRaw||'(blank)',reason:'malformed',details:'Empty Student email'}); continue; }
    const upn = emailToUpn.get(email); if(!upn){ missing.push({email:emailRaw,reason:'no AD match',details:'Student email not in AD exports'}); continue; }
    const id = upnToId.get(upn); if(!id){ missing.push({email:emailRaw,reason:'no Entra id',details:`UPN resolved (${upn}) but not in Entra export`}); continue; }
    matched++; for(const h of houses) addToGroup(h,year,id);
  }

  const header = [
    'version:v1.0',
    'Member object ID or user principal name [memberObjectIdOrUpn] Required',
    'Example: 9832aad8-e4fe-496b-a604-95c6eF01ae75'
  ].join('\n');
  const enc=new TextEncoder(); const files=[]; const csvNames=[];
  for(const [key,setIds] of groupMap.entries()){
    const [house,year]=key.split('|||');
    const fname=`House-${house}_Year-${year}_members_v1.csv`;
    const content = header + '\n' + Array.from(setIds).join('\n') + '\n';
    files.push({name:fname, data:enc.encode(content)}); csvNames.push(fname);
  }

  return { processed, matched, missing, dupes, groups: groupMap.size, files, csvNames };
}

// ===== Saving (no ZIP) =====
async function saveCsvsToFolder(files){
  if (!('showDirectoryPicker' in window)) throw new Error('Directory picker not supported in this browser.');
  const dir = await window.showDirectoryPicker();
  for (const f of files) {
    const fh = await dir.getFileHandle(f.name, { create: true });
    const ws = await fh.createWritable();
    await ws.write(f.data);
    await ws.close();
  }
}

function offerIndividualDownloads(files){
  // Create object URLs and link them in the CSV list (user clicks to save)
  const list = byId('csvList');
  for (const f of files) {
    const blob = new Blob([f.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const div = document.createElement('div');
    div.innerHTML = `<span class="pill">CSV</span> <a class="linklike" download="${f.name}" href="${url}"><code>${f.name}</code></a>`;
    list.appendChild(div);
    // Revoke later (after some time); if user hasn't clicked, they can regenerate
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }
}

function renderResults(res){
  byId('results').classList.remove('hidden');
  byId('statProcessed').textContent=String(res.processed);
  byId('statMatched').textContent=String(res.matched);
  byId('statMissing').textContent=String(res.missing.length);
  byId('statGroups').textContent=String(res.groups);
  byId('statCsvs').textContent=String(res.files.length);

  const list=byId('csvList'); list.innerHTML='';
  if(res.csvNames.length===0){
    const span=document.createElement('span'); span.className='hint'; span.textContent='No CSVs generated (no matches).'; list.appendChild(span);
  } else {
    // Links added later if using "downloads" mode
    for(const n of res.csvNames.sort()){
      const div=document.createElement('div'); div.innerHTML=`<span class="pill">CSV</span> <code>${n}</code>`; list.appendChild(div);
    }
  }

  const tb=byId('missingTbody'); tb.innerHTML='';
  res.missing.forEach((m,i)=>{ const tr=document.createElement('tr'); const cls=m.reason==='malformed'?'warn':'bad';
    tr.innerHTML=`<td>${i+1}</td><td><code>${m.email}</code></td><td class="${cls}">${m.reason}</td><td class="hint">${m.details||''}</td>`; tb.appendChild(tr); });

  const td=byId('dupeTbody'); td.innerHTML='';
  res.dupes.forEach((d,i)=>{ const cls=d.status==='consistent'?'ok':'bad';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td><code>${d.email}</code></td><td><code>${d.upn12}</code></td><td><code>${d.upn13}</code></td><td class="${cls}">${d.status}</td>`;
    td.appendChild(tr);
  });
}

// ===== Wire-up =====
['ad12','ad13','bromcom','entra'].forEach(id=>{
  byId(id).addEventListener('change', (e)=>{
    requiredFiles[id] = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    updateGenerateButton();
  });
});

byId('generate').addEventListener('click', async ()=>{
  const btn=byId('generate'); const status=byId('status'); const mode=byId('saveMode').value;
  btn.disabled=true; status.textContent='Processing...';
  try{
    const res = await processFiles({
      ad12File: requiredFiles.ad12,
      ad13File: requiredFiles.ad13,
      bromFile: requiredFiles.bromcom,
      entraFile: requiredFiles.entra,
    });

    renderResults(res);

    if (res.files.length === 0) {
      status.textContent = 'No CSVs to save (no matches).';
    } else if (mode === 'folder') {
      if ('showDirectoryPicker' in window) {
        status.textContent='Choose a folder to save the CSVs...';
        await saveCsvsToFolder(res.files);
        status.textContent='Saved CSVs to the chosen folder.';
      } else {
        status.textContent='Folder save not supported in this browser; falling back to individual downloads below.';
        // replace plain list with clickable downloads
        const list=byId('csvList'); list.innerHTML=''; offerIndividualDownloads(res.files);
      }
    } else { // downloads
      status.textContent='Creating download links...';
      const list=byId('csvList'); list.innerHTML=''; offerIndividualDownloads(res.files);
      status.textContent='Click each filename to download.';
    }
  } catch (err) {
    console.error(err);
    alert('Error: ' + (err?.message || err));
    status.textContent='Error. Please check files and try again.';
  } finally { btn.disabled=false; }
});

updateGenerateButton();
