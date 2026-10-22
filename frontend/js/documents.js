import { apiRequest, requireLogin, API_BASE_URL, getToken } from './api.js';

const list = document.querySelector('#documentList');
const form = document.querySelector('#uploadForm');
const fileInput = document.querySelector('#documentFile');
const fileName = document.querySelector('#fileName');
const message = document.querySelector('#uploadMessage');
const refresh = document.querySelector('#refreshDocuments');
const searchInput = document.querySelector('#documentSearch');
const typeFilter = document.querySelector('#typeFilter');
const sortSelect = document.querySelector('#sortDocuments');
const year = document.querySelector('#year');
const textEditor = document.querySelector('#extractedText');
const toolMessage = document.querySelector('#toolMessage');
let documents = [];
let selectedDocument = null;
let cameraStream = null;
if (year) year.textContent = new Date().getFullYear();

function setMessage(node, text, kind = '') { if (!node) return; node.textContent = text; node.className = `form-message ${kind}`.trim(); }
function formatSize(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
function safeFileName(name) { return (name || 'accessmate-text.txt').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 150); }

function renderDocuments() {
  const q = (searchInput?.value || '').trim().toLocaleLowerCase();
  const type = typeFilter?.value || 'all';
  const sort = sortSelect?.value || 'newest';
  let filtered = documents.filter(doc => {
    const nameMatch = (doc.original_name || '').toLocaleLowerCase().includes(q);
    const ext = (doc.original_name || '').split('.').pop().toLowerCase();
    const typeMatch = type === 'all' || (type === 'image' ? ['png','jpg','jpeg','webp','bmp'].includes(ext) : type === 'pdf' ? ext === 'pdf' : type === 'text' ? ['txt','md','csv'].includes(ext) : !['png','jpg','jpeg','webp','bmp','pdf','txt','md','csv'].includes(ext));
    return nameMatch && typeMatch;
  });
  filtered.sort((a,b) => sort === 'name' ? a.original_name.localeCompare(b.original_name) : sort === 'oldest' ? new Date(a.created_at)-new Date(b.created_at) : new Date(b.created_at)-new Date(a.created_at));
  list.replaceChildren();
  if (!filtered.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = documents.length ? 'No documents match these filters.' : 'No documents yet. Upload your first file above.'; list.append(empty); return; }
  for (const doc of filtered) {
    const item = document.createElement('article'); item.className = 'document-item';
    const icon = document.createElement('span'); icon.className = 'file-icon pdf'; icon.textContent = (doc.mime_type || 'FILE').split('/').pop().slice(0,4).toUpperCase();
    const meta = document.createElement('div'); meta.className = 'document-meta';
    const name = document.createElement('strong'); name.textContent = doc.original_name;
    const detail = document.createElement('small'); detail.textContent = `${formatSize(Number(doc.size_bytes))} · ${new Date(doc.created_at).toLocaleString()}`;
    meta.append(name, detail);
    const actions = document.createElement('div'); actions.className = 'document-actions';
    const addButton = (label, handler) => { const b=document.createElement('button'); b.type='button'; b.className='button secondary small'; b.textContent=label; b.addEventListener('click',handler); actions.append(b); };
    addButton('Preview', () => previewDocument(doc));
    addButton('Download', () => downloadDocument(doc));
    addButton('Read text / OCR', () => runOcr(doc));
    addButton('Rename', () => renameDocument(doc));
    addButton('Delete', async () => { if (!window.confirm(`Delete “${doc.original_name}”? This cannot be undone.`)) return; try { await apiRequest(`/documents/${doc.id}`, {method:'DELETE'}); setMessage(message,'Document deleted.','success'); await loadDocuments(); } catch(e) { setMessage(message,e.message,'error'); } });
    item.append(icon, meta, actions); list.append(item);
  }
}

async function loadDocuments() {
  if (!requireLogin()) return;
  list.textContent = 'Loading documents…';
  try { const result = await apiRequest('/documents'); documents = Array.isArray(result.documents) ? result.documents : []; renderDocuments(); }
  catch (err) { list.replaceChildren(); const p=document.createElement('p'); p.className='form-message error'; p.textContent=err.message; list.append(p); }
}

async function downloadDocument(doc) {
  try { const response=await fetch(`${API_BASE_URL}/documents/${doc.id}/download`,{headers:{Authorization:`Bearer ${getToken()}`}}); if(!response.ok) throw new Error(`Download failed (${response.status})`); const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=safeFileName(doc.original_name); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  catch(e) { setMessage(message,e.message,'error'); }
}

async function previewDocument(doc) {
  selectedDocument = doc;
  const panel = document.querySelector('#documentPreview');
  const body = document.querySelector('#previewBody');
  const title = document.querySelector('#previewTitle');
  title.textContent = doc.original_name;
  body.replaceChildren();
  const ext = (doc.original_name || '').split('.').pop().toLowerCase();
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (!response.ok) throw new Error(`Preview failed (${response.status})`);
    const blob = await response.blob();
    if (ext === 'pdf') { const frame=document.createElement('iframe'); frame.title=`Preview of ${doc.original_name}`; frame.src=URL.createObjectURL(blob); frame.style.cssText='width:100%;min-height:420px;border:0;border-radius:12px'; body.append(frame); }
    else if (['png','jpg','jpeg','webp','gif','bmp'].includes(ext)) { const img=document.createElement('img'); img.alt=`Preview of ${doc.original_name}`; img.src=URL.createObjectURL(blob); img.style.cssText='max-width:100%;max-height:60vh;object-fit:contain'; body.append(img); }
    else if (['txt','csv','md'].includes(ext)) { const text=await blob.text(); textEditor.value=text; const pre=document.createElement('pre'); pre.textContent=text; pre.style.whiteSpace='pre-wrap'; body.append(pre); }
    else { const p=document.createElement('p'); p.textContent='Inline preview is not supported for this file type. Use Download to open it in a compatible application.'; body.append(p); }
    panel.hidden=false; panel.scrollIntoView({behavior:document.documentElement.dataset.reducedMotion==='true'?'auto':'smooth',block:'start'});
  } catch(e) { setMessage(toolMessage,e.message,'error'); }
}

async function renameDocument(doc) {
  const newName = window.prompt('Enter a new document name (include the file extension):', doc.original_name);
  if (newName === null) return;
  const clean = newName.trim();
  if (!clean || /[\\/:*?"<>|\x00-\x1f]/.test(clean)) { setMessage(message,'Enter a valid filename without path or special characters.','error'); return; }
  try { await apiRequest(`/documents/${doc.id}`, {method:'PATCH', body:JSON.stringify({originalName:clean})}); setMessage(message,'Document renamed.','success'); await loadDocuments(); }
  catch(e) { setMessage(message, `Rename is not available in the current backend yet. ${e.message}`, 'error'); }
}

async function runOcr(doc) {
  selectedDocument = doc; setMessage(toolMessage,`Requesting OCR for ${doc.original_name}…`);
  try {
    const result = await apiRequest(`/documents/${doc.id}/ocr`, {method:'POST',body:JSON.stringify({language:document.querySelector('#ocrLanguage')?.value || 'eng'})});
    const text = result.text ?? result.extractedText ?? result.document?.extracted_text;
    if (typeof text !== 'string') throw new Error('The OCR endpoint returned no extracted text.');
    textEditor.value = text; setMessage(toolMessage, text ? 'OCR text loaded.' : 'OCR completed but returned no readable text.', text ? 'success' : 'error');
  } catch(e) { setMessage(toolMessage,`OCR backend is not implemented or unavailable yet. No text was fabricated. Details: ${e.message}`,'error'); }
}

form.addEventListener('submit', async event => {
  event.preventDefault(); if (!requireLogin()) return; const file=fileInput.files[0]; if(!file) return;
  if(file.size > 10*1024*1024) { setMessage(message,'File must be 10 MB or smaller.','error'); return; }
  const allowed=['pdf','doc','docx','txt','png','jpg','jpeg']; const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(!allowed.includes(ext)) { setMessage(message,'This file type is not supported.','error'); return; }
  const body=new FormData(); body.append('document',file); const button=form.querySelector('button[type="submit"]'); button.disabled=true; setMessage(message,'Uploading document…');
  try { await apiRequest('/documents',{method:'POST',body}); setMessage(message,'Document uploaded.','success'); form.reset(); fileName.textContent='No file selected'; await loadDocuments(); }
  catch(e) { setMessage(message,e.message,'error'); } finally { button.disabled=false; }
});
fileInput.addEventListener('change',()=>{fileName.textContent=fileInput.files[0]?.name||'No file selected';});
refresh.addEventListener('click',loadDocuments);
[searchInput,typeFilter,sortSelect].filter(Boolean).forEach(el=>el.addEventListener('input',renderDocuments));
document.querySelector('#closePreview')?.addEventListener('click',()=>{document.querySelector('#documentPreview').hidden=true;});
document.querySelector('#exportText')?.addEventListener('click',()=>{const text=textEditor.value;if(!text.trim()){setMessage(toolMessage,'There is no extracted text to export yet. Run OCR or open a text document first.','error');return;}try{const blob=new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=safeFileName((selectedDocument?.original_name||'accessmate').replace(/\.[^.]+$/,'')+'-text.txt');document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);setMessage(toolMessage,'Text file downloaded.','success');}catch(e){setMessage(toolMessage,`Export failed: ${e.message}`,'error');}});

// Browser-native speech synthesis reads the actual text in the editor.
let utterance = null;
document.querySelector('#speakText')?.addEventListener('click',()=>{if(!('speechSynthesis' in window)){setMessage(toolMessage,'Speech synthesis is not supported in this browser.','error');return;}const text=textEditor.value.trim();if(!text){setMessage(toolMessage,'Load or extract text before starting speech.','error');return;}window.speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(text);const lang=document.querySelector('#speechLanguage')?.value||'en-US';utterance.lang=lang;const voices=window.speechSynthesis.getVoices();const select=document.querySelector('#speechVoice');if(select?.value){const v=voices.find(x=>x.name===select.value);if(v)utterance.voice=v;}utterance.onerror=e=>setMessage(toolMessage,`Speech playback error: ${e.error}`,'error');window.speechSynthesis.speak(utterance);setMessage(toolMessage,'Reading the current text aloud.','success');});
document.querySelector('#pauseText')?.addEventListener('click',()=>{if(!('speechSynthesis'in window))return;if(window.speechSynthesis.speaking && !window.speechSynthesis.paused)window.speechSynthesis.pause();else if(window.speechSynthesis.paused)window.speechSynthesis.resume();});
document.querySelector('#stopText')?.addEventListener('click',()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();setMessage(toolMessage,'Speech stopped.');});
function populateVoices(){const select=document.querySelector('#speechVoice');if(!select||!('speechSynthesis'in window))return;const current=select.value;select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Browser default voice';select.append(first);for(const voice of window.speechSynthesis.getVoices()){const option=document.createElement('option');option.value=voice.name;option.textContent=`${voice.name} (${voice.lang})`;select.append(option);}select.value=current;}
if('speechSynthesis'in window){populateVoices();window.speechSynthesis.onvoiceschanged=populateVoices;}

// Camera QR/barcode support uses BarcodeDetector only when provided by the browser.
async function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}const video=document.querySelector('#scannerVideo');if(video)video.srcObject=null;}
document.querySelector('#startScanner')?.addEventListener('click',async()=>{const video=document.querySelector('#scannerVideo');const result=document.querySelector('#scanResult');if(!('BarcodeDetector'in window)){setMessage(toolMessage,'Live QR/barcode scanning is unavailable in this browser. Use a browser that supports BarcodeDetector; uploaded-image decoding requires a backend/library integration.','error');return;}try{const detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','pdf417','data_matrix']});cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=cameraStream;await video.play();setMessage(toolMessage,'Camera active. Point it at a QR code or supported barcode.');const scan=async()=>{if(!cameraStream)return;try{const codes=await detector.detect(video);if(codes.length){result.value=codes[0].rawValue||'';setMessage(toolMessage,'Code decoded. Review the content before opening any link.','success');await stopCamera();return;}}catch{}requestAnimationFrame(scan);};requestAnimationFrame(scan);}catch(e){await stopCamera();setMessage(toolMessage,`Could not start camera: ${e.message}. Check permissions and use localhost or HTTPS.`,'error');}});
document.querySelector('#stopScanner')?.addEventListener('click',async()=>{await stopCamera();setMessage(toolMessage,'Camera stopped.');});
document.querySelector('#copyScan')?.addEventListener('click',async()=>{const text=document.querySelector('#scanResult').value;if(!text){setMessage(toolMessage,'No decoded content to copy.','error');return;}try{await navigator.clipboard.writeText(text);setMessage(toolMessage,'Decoded content copied.','success');}catch{setMessage(toolMessage,'Clipboard access denied by browser. Select and copy the result manually.','error');}});
document.querySelectorAll('[data-logout]').forEach(button=>button.addEventListener('click',()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();stopCamera();localStorage.removeItem('accessmate_token');localStorage.removeItem('accessmate_user');window.location.href='./index.html';}));
loadDocuments();

// AI is deliberately connected only through the backend; missing integration is reported plainly.
document.querySelector('#analyzeDocument')?.addEventListener('click', async()=>{
  const source=textEditor.value.trim(); const question=document.querySelector('#aiQuestion').value.trim(); const output=document.querySelector('#aiResult');
  if(!source){setMessage(document.querySelector('#aiMessage'),'Load or extract document text before requesting analysis.','error');return;}
  setMessage(document.querySelector('#aiMessage'),'Sending document text to the configured backend AI service…');
  try { const result=await apiRequest('/ai/analyze',{method:'POST',body:JSON.stringify({text:source,question,documentId:selectedDocument?.id||null})}); const answer=result.answer||result.summary||result.result; if(typeof answer!=='string'||!answer.trim())throw new Error('The API returned no analysis text.'); output.value=answer;setMessage(document.querySelector('#aiMessage'),'AI response received.','success'); }
  catch(e){setMessage(document.querySelector('#aiMessage'),`AI analysis is not available until the backend endpoint and provider are configured. No generated answer was substituted. Details: ${e.message}`,'error');}
});

document.querySelector('#decodeImage')?.addEventListener('click',async()=>{
  const input=document.querySelector('#barcodeImage');const file=input.files?.[0];
  if(!file){setMessage(toolMessage,'Choose an image containing a QR code or supported barcode.','error');return;}
  if(!('BarcodeDetector'in window)){setMessage(toolMessage,'Uploaded-image decoding is not supported by this browser. The backend image-decoding endpoint is not implemented yet.','error');return;}
  try{const detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','pdf417','data_matrix']});const bitmap=await createImageBitmap(file);const codes=await detector.detect(bitmap);bitmap.close?.();if(!codes.length){setMessage(toolMessage,'No supported code was detected in this image.','error');return;}document.querySelector('#scanResult').value=codes.map(c=>c.rawValue||'').filter(Boolean).join('\n');setMessage(toolMessage,'Code decoded from uploaded image. Review content before opening links.','success');}
  catch(e){setMessage(toolMessage,`Image decoding failed: ${e.message}`,'error');}
});
