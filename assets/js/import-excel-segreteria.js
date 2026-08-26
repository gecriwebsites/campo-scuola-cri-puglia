(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let workbook = null;
  let currentFile = null;
  let currentHash = null;
  let currentSheet = '';
  let headers = [];
  let rawRows = [];
  let mapping = {};
  let currentImportId = null;
  let importRows = [];
  let imports = [];
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;
  let processing = false;

  const STANDARD_FIELDS = [
    ['nome', 'Nome'],
    ['cognome', 'Cognome'],
    ['codice_fiscale', 'Codice fiscale'],
    ['email', 'Email'],
    ['telefono', 'Telefono'],
    ['comitato', 'Comitato'],
    ['regione', 'Regione'],
    ['componente', 'Componente CRI'],
    ['numero_badge', 'Numero badge'],
    ['tipologie', 'Tipologia / ruolo'],
    ['corsi', 'Corsi'],
    ['turni', 'Turni / disponibilità'],
    ['aree', 'Area / servizio'],
    ['arrivo', 'Data arrivo'],
    ['partenza', 'Data partenza'],
    ['pernotto', 'Pernottamento'],
    ['pasti', 'Pasti'],
    ['esigenze_alimentari', 'Allergie / intolleranze'],
    ['qualifiche', 'Qualifiche'],
    ['mezzi', 'Mezzi / targhe']
  ];

  const aliases = {
    nome: ['nome', 'first name'],
    cognome: ['cognome', 'surname', 'last name'],
    codice_fiscale: ['codice fiscale', 'cf', 'codice_fiscale', 'cod. fiscale'],
    email: ['email', 'e-mail', 'mail', 'indirizzo email', 'posta elettronica'],
    telefono: ['telefono', 'cellulare', 'tel', 'numero telefono', 'numero di telefono', 'phone'],
    comitato: ['comitato', 'comitato cri', 'comitato di appartenenza'],
    regione: ['regione'],
    componente: ['componente', 'componente cri'],
    numero_badge: ['numero badge', 'badge', 'n badge', 'n. badge'],
    tipologie: ['tipologia', 'tipologie', 'ruolo', 'profilo'],
    corsi: ['corso', 'corsi', 'corso scelto', 'corso di formazione'],
    turni: ['turno', 'turni', 'disponibilita', 'disponibilità', 'disponibilita turni', 'disponibilità turni'],
    aree: ['area', 'area servizio', 'area di servizio', 'servizio', 'supporto', 'attivita', 'attività'],
    arrivo: ['arrivo', 'data arrivo', 'data di arrivo', 'giorno arrivo'],
    partenza: ['partenza', 'data partenza', 'data di partenza', 'giorno partenza'],
    pernotto: ['pernotto', 'pernottamento', 'dormire', 'alloggio'],
    pasti: ['pasti', 'pasto', 'vitto', 'colazione pranzo cena'],
    esigenze_alimentari: ['allergie', 'intolleranze', 'allergie intolleranze', 'esigenze alimentari', 'intolleranze alimentari'],
    qualifiche: ['qualifica', 'qualifiche', 'qualifiche cri'],
    mezzi: ['mezzo', 'mezzi', 'targa', 'targhe', 'automezzo']
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  }

  function norm(value) {
    return String(value || '').trim().toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function showToast(message, type = '') {
    const el = $('importExcelToast') || $('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.className = `import-excel-toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
  }

  function setProgress(text = '', percent = null) {
    const label = $('importProgressLabel');
    const bar = $('importProgressBar');
    if (label) label.textContent = text;
    if (bar) {
      bar.style.width = percent == null ? '0%' : `${Math.max(0, Math.min(100, percent))}%`;
      bar.parentElement.hidden = percent == null;
    }
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve();
      const existing = [...document.scripts].find(s => s.src === src);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function injectStyles() {
    if ($('importExcelStyles')) return;
    const style = document.createElement('style');
    style.id = 'importExcelStyles';
    style.textContent = `
      .ix-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.ix-head h2{margin:3px 0 5px}.ix-head p{margin:0;color:var(--muted)}.ix-live{font-size:11px;font-weight:850;color:#16794f;margin-top:5px}
      .ix-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}.ix-panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 5px 18px rgba(20,20,20,.035)}.ix-panel h3{margin:4px 0 5px}.ix-panel>p{margin:0 0 14px;color:var(--muted);font-size:12px}
      .ix-drop{border:2px dashed #ccd2d8;border-radius:16px;padding:26px 18px;text-align:center;background:#fafbfc;cursor:pointer;transition:.15s}.ix-drop:hover,.ix-drop.drag{border-color:#d40000;background:#fff8f8}.ix-drop strong{display:block;font-size:16px;margin-bottom:4px}.ix-drop span{display:block;color:var(--muted);font-size:12px}.ix-drop input{display:none}.ix-file-meta{margin-top:10px;padding:10px 12px;border-radius:11px;background:#f4f6f7;font-size:11px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .ix-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.ix-field label,.ix-field>span{display:block;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#697078;margin-bottom:5px}.ix-field select,.ix-field input{width:100%;height:42px;border:1px solid #ccd2d8;border-radius:10px;background:#fff;padding:0 10px;font:inherit;font-size:12px}
      .ix-mapping{margin-top:16px;border-top:1px solid #eceff1;padding-top:14px}.ix-mapping-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ix-map-row{display:grid;grid-template-columns:130px 1fr;align-items:center;gap:8px}.ix-map-row span{font-size:11px;font-weight:800}.ix-map-row select{height:36px;border:1px solid #d4d9dd;border-radius:9px;background:#fff;padding:0 8px;font:inherit;font-size:11px}.ix-map-row.mapped{background:#f3faf6;border-radius:9px;padding:4px}
      .ix-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ix-progress{margin-top:13px;height:8px;background:#eceff1;border-radius:999px;overflow:hidden}.ix-progress[hidden]{display:none}.ix-progress>div{height:100%;background:#d40000;width:0;transition:width .15s}.ix-progress-label{font-size:11px;color:var(--muted);margin-top:6px;min-height:16px}
      .ix-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:14px}.ix-stat{border:1px solid #e3e7ea;border-radius:12px;padding:10px;background:#fafbfc}.ix-stat small{display:block;color:var(--muted);font-size:9px;font-weight:800}.ix-stat strong{display:block;font-size:20px;margin-top:2px}.ix-stat.green strong{color:#16794f}.ix-stat.blue strong{color:#1669a8}.ix-stat.yellow strong{color:#9b6900}.ix-stat.red strong{color:#b00020}
      .ix-filterbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}.ix-filter{border:1px solid #d9dde1;background:#fff;border-radius:999px;padding:7px 10px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.ix-filter.active{background:#202428;color:#fff;border-color:#202428}
      .ix-table-wrap{overflow:auto;border:1px solid #e2e5e8;border-radius:14px}.ix-table{width:100%;border-collapse:collapse;min-width:850px}.ix-table th{position:sticky;top:0;background:#f5f6f7;text-align:left;padding:9px;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#6a7178}.ix-table td{border-top:1px solid #edf0f2;padding:9px;font-size:11px;vertical-align:top}.ix-row-status{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;white-space:nowrap}.ix-row-status.valida{background:#e8f7ef;color:#126743}.ix-row-status.duplicata{background:#e8f1fb;color:#155f9b}.ix-row-status.da_validare{background:#fff4d8;color:#815b00}.ix-row-status.errore{background:#fde8ea;color:#a0001d}.ix-row-status.ignorata{background:#eceff1;color:#636a70}.ix-row-status.importata{background:#e8f7ef;color:#126743}.ix-mini{color:var(--muted);font-size:9px;margin-top:3px}.ix-warn{color:#8a5f00}.ix-err{color:#a0001d}.ix-candidate{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:5px}.ix-candidate button,.ix-row-actions button{border:1px solid #d5d9dd;background:#fff;border-radius:7px;padding:5px 7px;font:inherit;font-size:9px;font-weight:800;cursor:pointer}.ix-candidate button:hover,.ix-row-actions button:hover{border-color:#d40000}.ix-row-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
      .ix-history{display:grid;gap:7px;max-height:560px;overflow:auto}.ix-history-item{border:1px solid #e1e5e8;border-radius:11px;padding:10px;background:#fafbfc;cursor:pointer;text-align:left;font:inherit}.ix-history-item:hover{border-color:#c8ced3}.ix-history-item.active{border-color:#d40000;background:#fff8f8}.ix-history-item strong{display:block;font-size:11px}.ix-history-item small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.ix-history-status{display:inline-flex;margin-top:5px;border-radius:999px;background:#eceff1;padding:3px 6px;font-size:8px;font-weight:850}.ix-empty{text-align:center;color:var(--muted);padding:24px;font-size:12px}
      .import-excel-toast{position:fixed;right:22px;bottom:22px;z-index:450;max-width:430px;background:#202428;color:#fff;border-radius:12px;padding:12px 15px;font-weight:750;box-shadow:0 14px 38px rgba(0,0,0,.22)}.import-excel-toast.success{background:#16794f}.import-excel-toast.error{background:#b00020}.import-excel-toast[hidden]{display:none}
      @media(max-width:980px){.ix-layout{grid-template-columns:1fr}.ix-mapping-grid{grid-template-columns:1fr}.ix-history{max-height:260px}.ix-summary{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:620px){.ix-grid{grid-template-columns:1fr}.ix-summary{grid-template-columns:repeat(2,1fr)}.ix-map-row{grid-template-columns:110px 1fr}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('importExcelView')) return;

    const nav = workspace.querySelector('.app-nav');
    if (nav) {
      const btn = document.createElement('button');
      btn.className = 'app-nav-btn';
      btn.type = 'button';
      btn.dataset.view = 'import-excel';
      btn.textContent = 'Import Excel';
      btn.addEventListener('click', activateView);
      nav.appendChild(btn);
    }

    const section = document.createElement('section');
    section.id = 'importExcelView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'import-excel';
    section.hidden = true;
    section.innerHTML = `
      <div class="ix-head"><div><div class="kicker">Acquisizione dati</div><h2>Import Excel</h2><p>Caricamento controllato con mapping, anteprima e verifica duplicati. In questa fase nessun dato operativo viene ancora importato.</p><div id="importExcelRealtime" class="ix-live">Realtime in attivazione…</div></div><button id="importExcelRefresh" class="btn secondary" type="button">↻ Aggiorna</button></div>
      <div class="ix-layout">
        <div>
          <section class="ix-panel">
            <div class="panel-kicker">1 · File e profilo</div><h3>Prepara il file</h3><p>Supportati .xlsx, .xls e .csv. Il file viene letto nel browser e nel database salviamo solo le righe di staging e i metadati necessari alla verifica.</p>
            <label id="importDrop" class="ix-drop"><input id="importFileInput" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"><strong>📥 Seleziona o trascina un file</strong><span>Excel / CSV · nessuna importazione automatica</span></label>
            <div id="importFileMeta" class="ix-file-meta" hidden></div>
            <div class="ix-grid">
              <div class="ix-field"><span>Profilo file</span><select id="importProfile"><option value="staff">Staff</option><option value="discenti">Discenti</option><option value="docenti">Docenti</option><option value="altro" selected>Altro / personalizzato</option></select></div>
              <div class="ix-field"><span>Foglio da analizzare</span><select id="importSheet" disabled><option value="">Prima seleziona un file</option></select></div>
            </div>
            <div id="importMapping" class="ix-mapping" hidden><div class="panel-kicker">2 · Mapping colonne</div><h3>Collega le colonne</h3><p>Il sistema propone automaticamente i campi riconosciuti. Puoi correggerli prima dell'analisi.</p><div id="importMappingGrid" class="ix-mapping-grid"></div></div>
            <div class="ix-actions"><button id="importAnalyzeButton" class="btn primary" type="button" disabled>Analizza e prepara anteprima</button><button id="importResetButton" class="btn secondary" type="button">Nuovo file</button></div>
            <div class="ix-progress" hidden><div id="importProgressBar"></div></div><div id="importProgressLabel" class="ix-progress-label"></div>
          </section>

          <section class="ix-panel" style="margin-top:16px">
            <div class="panel-kicker">3 · Verifica</div><h3>Anteprima importazione</h3><p>Verde = nuova persona, blu = corrispondenza certa, giallo = verifica manuale, rosso = errore. Le righe sono ancora solo in staging.</p>
            <div class="ix-summary"><article class="ix-stat"><small>Righe</small><strong id="ixTotal">0</strong></article><article class="ix-stat green"><small>Valide / nuove</small><strong id="ixValid">0</strong></article><article class="ix-stat blue"><small>Già presenti</small><strong id="ixDuplicate">0</strong></article><article class="ix-stat yellow"><small>Da verificare</small><strong id="ixReview">0</strong></article><article class="ix-stat red"><small>Errori</small><strong id="ixError">0</strong></article></div>
            <div class="ix-filterbar" id="importRowFilters"><button class="ix-filter active" data-filter="all">Tutte</button><button class="ix-filter" data-filter="valida">Nuove</button><button class="ix-filter" data-filter="duplicata">Esistenti</button><button class="ix-filter" data-filter="da_validare">Da verificare</button><button class="ix-filter" data-filter="errore">Errori</button><button class="ix-filter" data-filter="ignorata">Ignorate</button></div>
            <div class="ix-table-wrap"><table class="ix-table"><thead><tr><th>Riga</th><th>Esito</th><th>Persona / dati</th><th>CF</th><th>Dettagli</th><th>Decisione</th></tr></thead><tbody id="importRowsBody"></tbody></table></div><div id="importRowsEmpty" class="ix-empty">Nessuna anteprima disponibile.</div>
          </section>
        </div>
        <aside class="ix-panel"><div class="panel-kicker">Storico staging</div><h3>Importazioni</h3><p>Sessioni preparate dalle postazioni di Segreteria. Selezionane una per rivedere le righe.</p><div id="importHistory" class="ix-history"></div></aside>
      </div>`;
    workspace.appendChild(section);

    const card = [...workspace.querySelectorAll('.module-card')].find(item => item.querySelector('strong')?.textContent.trim() === 'Importa Excel');
    if (card) {
      card.classList.add('module-button', 'active-module');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const status = card.querySelector('em');
      if (status) status.textContent = 'Operativo';
      const open = () => activateView();
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }

    const toast = document.createElement('div');
    toast.id = 'importExcelToast';
    toast.className = 'import-excel-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  function activateView() {
    document.querySelectorAll('.app-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'import-excel'));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'import-excel';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    setTimeout(() => $('importExcelView')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 10);
  }

  function autoMapHeaders() {
    const result = {};
    const used = new Set();
    STANDARD_FIELDS.forEach(([field]) => {
      let best = '';
      for (const header of headers) {
        if (used.has(header)) continue;
        const n = norm(header);
        const matches = (aliases[field] || []).some(alias => n === norm(alias) || n.includes(norm(alias)) || norm(alias).includes(n));
        if (matches) { best = header; break; }
      }
      if (best) { result[field] = best; used.add(best); }
    });
    mapping = result;
  }

  function renderMapping() {
    const grid = $('importMappingGrid');
    if (!grid) return;
    grid.innerHTML = STANDARD_FIELDS.map(([field, label]) => {
      const selected = mapping[field] || '';
      return `<label class="ix-map-row${selected ? ' mapped' : ''}"><span>${esc(label)}</span><select data-map-field="${field}"><option value="">— Non usare —</option>${headers.map(h => `<option value="${esc(h)}"${h === selected ? ' selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`;
    }).join('');
  }

  function firstNonEmptyKeys(rows) {
    const set = new Set();
    rows.slice(0, 50).forEach(row => Object.keys(row || {}).forEach(key => { if (String(row[key] ?? '').trim() !== '') set.add(key); }));
    return [...set];
  }

  function sheetRows(name) {
    const sheet = workbook?.Sheets?.[name];
    if (!sheet || !window.XLSX) return [];
    return window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, blankrows: false });
  }

  async function sha256(file) {
    if (!window.crypto?.subtle) return null;
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleFile(file) {
    if (!file || processing) return;
    const name = file.name || '';
    if (!/\.(xlsx|xls|csv)$/i.test(name)) {
      showToast('Formato non supportato. Usa .xlsx, .xls o .csv.', 'error');
      return;
    }
    try {
      setProgress('Lettura file…', 5);
      await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const buffer = await file.arrayBuffer();
      workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
      currentFile = file;
      currentHash = await sha256(file).catch(() => null);
      const sheets = workbook.SheetNames || [];
      currentSheet = sheets[0] || '';
      const sel = $('importSheet');
      sel.innerHTML = sheets.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
      sel.disabled = !sheets.length;
      if (currentSheet) sel.value = currentSheet;
      $('importFileMeta').hidden = false;
      $('importFileMeta').innerHTML = `<span><strong>${esc(file.name)}</strong> · ${(file.size / 1024).toFixed(1)} KB</span><span>${sheets.length} ${sheets.length === 1 ? 'foglio' : 'fogli'}</span>`;
      prepareSheet();
      setProgress('', null);
    } catch (error) {
      workbook = null;
      showToast(`Impossibile leggere il file: ${error.message}`, 'error');
      setProgress('', null);
    }
  }

  function prepareSheet() {
    if (!workbook || !currentSheet) return;
    rawRows = sheetRows(currentSheet);
    headers = firstNonEmptyKeys(rawRows);
    autoMapHeaders();
    renderMapping();
    $('importMapping').hidden = false;
    $('importAnalyzeButton').disabled = !rawRows.length;
    $('importFileMeta').innerHTML += `<span>${rawRows.length} righe dati · ${headers.length} colonne</span>`;
  }

  function resetFile() {
    workbook = null; currentFile = null; currentHash = null; currentSheet = ''; headers = []; rawRows = []; mapping = {}; currentImportId = null; importRows = [];
    $('importFileInput').value = '';
    $('importFileMeta').hidden = true;
    $('importFileMeta').innerHTML = '';
    $('importSheet').innerHTML = '<option value="">Prima seleziona un file</option>';
    $('importSheet').disabled = true;
    $('importMapping').hidden = true;
    $('importAnalyzeButton').disabled = true;
    setProgress('', null);
    renderRows();
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value ?? '').split(/[;,\n|]+/).map(v => v.trim()).filter(Boolean);
  }

  function normalizeBoolean(value) {
    const n = norm(value);
    if (!n) return null;
    if (['si', 'sì', 'yes', 'true', '1', 'x', 'previsto'].includes(n)) return true;
    if (['no', 'false', '0', 'non previsto'].includes(n)) return false;
    return String(value).trim();
  }

  function normalizeDate(value) {
    const s = String(value ?? '').trim();
    if (!s) return null;
    const iso = s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
    const it = s.match(/^([0-3]?\d)[\/\-.]([01]?\d)[\/\-.](\d{4})/);
    if (it) return `${it[3]}-${String(it[2]).padStart(2, '0')}-${String(it[1]).padStart(2, '0')}`;
    return s;
  }

  function mappedValue(row, field) {
    const header = mapping[field];
    return header ? row?.[header] : '';
  }

  function normalizedRow(row, profileCode) {
    const out = {};
    STANDARD_FIELDS.forEach(([field]) => {
      const value = mappedValue(row, field);
      if (value === '' || value == null) return;
      if (['tipologie', 'corsi', 'turni', 'aree', 'pasti', 'qualifiche', 'mezzi'].includes(field)) out[field] = splitList(value);
      else if (['arrivo', 'partenza'].includes(field)) out[field] = normalizeDate(value);
      else if (field === 'pernotto') out[field] = normalizeBoolean(value);
      else out[field] = String(value).trim();
    });
    if (!out.tipologie || !out.tipologie.length) {
      if (profileCode === 'staff') out.tipologie = ['staff'];
      if (profileCode === 'docenti') out.tipologie = ['docente'];
      if (profileCode === 'discenti') out.tipologie = ['discente'];
    }
    return out;
  }

  function cfKey(data) {
    return String(data?.codice_fiscale || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  async function runBatches(tasks, size = 5) {
    const results = [];
    for (let i = 0; i < tasks.length; i += size) {
      const batch = tasks.slice(i, i + size);
      results.push(...await Promise.all(batch.map(fn => fn())));
      setProgress(`Analisi righe ${Math.min(i + size, tasks.length)} / ${tasks.length}…`, 20 + (Math.min(i + size, tasks.length) / Math.max(1, tasks.length)) * 70);
    }
    return results;
  }

  async function analyzeFile() {
    if (!currentFile || !rawRows.length || processing) return;
    processing = true;
    $('importAnalyzeButton').disabled = true;
    try {
      const profileCode = $('importProfile').value;
      const fileType = (currentFile.name.split('.').pop() || 'xlsx').toLowerCase();
      setProgress('Creazione sessione di staging…', 8);
      const { data: created, error: createError } = await client.rpc('crea_importazione_excel', {
        p_nome_file: currentFile.name,
        p_tipo_file: fileType,
        p_dimensione_bytes: currentFile.size,
        p_hash_file: currentHash,
        p_profilo: profileCode,
        p_mapping_colonne: mapping,
        p_note: null,
        p_postazione: getStation() || null,
        p_metadati: { foglio: currentSheet, fogli: workbook.SheetNames, colonne: headers, righe_lette: rawRows.length }
      });
      if (createError) throw createError;
      if (created?.status === 'file_gia_caricato') {
        currentImportId = created.importazione_id;
        showToast('Questo stesso file risulta già preparato. Apro la sessione esistente.', 'success');
        await loadImportRows(currentImportId);
        await loadImports();
        return;
      }
      if (created?.status !== 'creata') throw new Error(`Sessione non creata (${created?.status || 'errore'})`);
      currentImportId = created.importazione_id;

      const { error: mapError } = await client.rpc('imposta_mapping_importazione', {
        p_importazione_id: currentImportId,
        p_mapping_colonne: mapping,
        p_profilo: profileCode,
        p_postazione: getStation() || null
      });
      if (mapError) throw mapError;

      const normalized = rawRows.map(row => normalizedRow(row, profileCode));
      const cfCounts = new Map();
      normalized.forEach(data => { const cf = cfKey(data); if (cf) cfCounts.set(cf, (cfCounts.get(cf) || 0) + 1); });

      const tasks = rawRows.map((row, index) => async () => {
        const data = normalized[index];
        const warnings = [];
        const cf = cfKey(data);
        if (cf && (cfCounts.get(cf) || 0) > 1) warnings.push({ tipo: 'cf_ripetuto_file', messaggio: `Codice fiscale presente ${cfCounts.get(cf)} volte nel foglio: le righe saranno consolidate nella fase di importazione effettiva.` });
        const errors = [];
        const { data: result, error } = await client.rpc('salva_riga_importazione', {
          p_importazione_id: currentImportId,
          p_nome_foglio: currentSheet,
          p_numero_riga: index + 2,
          p_dati_originali: row,
          p_dati_normalizzati: data,
          p_errori: errors,
          p_avvisi: warnings
        });
        return { result, error, index };
      });

      const results = await runBatches(tasks, 5);
      const failed = results.filter(r => r.error || r.result?.status !== 'analizzata');
      setProgress('Caricamento anteprima…', 95);
      await Promise.all([loadImportRows(currentImportId), loadImports()]);
      setProgress(failed.length ? `Anteprima pronta con ${failed.length} righe non elaborate.` : 'Anteprima pronta. Nessun dato operativo è stato ancora importato.', 100);
      showToast(failed.length ? 'Anteprima creata, ma alcune righe non sono state elaborate.' : 'Analisi completata: controlla l’anteprima prima dell’importazione.', failed.length ? 'error' : 'success');
    } catch (error) {
      showToast(`Analisi non riuscita: ${error.message}`, 'error');
      setProgress('Analisi interrotta.', null);
    } finally {
      processing = false;
      $('importAnalyzeButton').disabled = !currentFile || !rawRows.length;
    }
  }

  async function loadImports() {
    const { data, error } = await client.from('importazioni').select('id,nome_file,profilo,stato,righe_totali,righe_valide,righe_duplicate,righe_errore,righe_importate,created_at,postazione').order('created_at', { ascending: false }).limit(40);
    if (error) return;
    imports = data || [];
    renderHistory();
  }

  async function loadImportRows(id) {
    if (!id) { importRows = []; renderRows(); return; }
    const { data, error } = await client.from('importazioni_righe').select('id,numero_riga,nome_foglio,codice_fiscale,persona_id,dati_normalizzati,errori,avvisi,match_info,esito,azione_proposta,metodo_match,confermato_manualmente').eq('importazione_id', id).order('numero_riga', { ascending: true }).limit(5000);
    if (error) { showToast(`Impossibile caricare l'anteprima: ${error.message}`, 'error'); return; }
    currentImportId = id;
    importRows = data || [];
    renderRows();
    renderHistory();
  }

  function renderHistory() {
    const el = $('importHistory');
    if (!el) return;
    el.innerHTML = imports.map(item => `<button class="ix-history-item${item.id === currentImportId ? ' active' : ''}" type="button" data-import-id="${item.id}"><strong>${esc(item.nome_file)}</strong><small>${esc(item.profilo)} · ${new Date(item.created_at).toLocaleString('it-IT')} ${item.postazione ? `· ${esc(item.postazione)}` : ''}</small><span class="ix-history-status">${esc(item.stato)} · ${item.righe_totali || 0} righe</span></button>`).join('') || '<div class="ix-empty">Nessuna sessione di importazione.</div>';
  }

  function rowName(row) {
    const d = row.dati_normalizzati || {};
    return [d.nome, d.cognome].filter(Boolean).join(' ') || 'Dati non identificati';
  }

  function detailsHtml(row) {
    const d = row.dati_normalizzati || {};
    const bits = [d.comitato, d.email, d.telefono].filter(Boolean).map(esc);
    let html = bits.join(' · ') || '—';
    const warns = Array.isArray(row.avvisi) ? row.avvisi : [];
    const errs = Array.isArray(row.errori) ? row.errori : [];
    if (warns.length) html += `<div class="ix-mini ix-warn">⚠ ${warns.map(w => esc(w.messaggio || w.tipo || w)).join(' · ')}</div>`;
    if (errs.length) html += `<div class="ix-mini ix-err">✕ ${errs.map(e => esc(e.messaggio || e.campo || e)).join(' · ')}</div>`;
    return html;
  }

  function decisionHtml(row) {
    if (row.esito === 'da_validare') {
      const candidates = Array.isArray(row.match_info?.candidati) ? row.match_info.candidati : [];
      const candidateButtons = candidates.slice(0, 4).map(c => `<button type="button" data-resolve="collega_persona" data-row-id="${row.id}" data-person-id="${c.persona_id}">Collega a ${esc(`${c.nome || ''} ${c.cognome || ''}`.trim())}</button>`).join('');
      return `<div class="ix-candidate">${candidateButtons || '<span class="ix-mini">Nessun candidato dettagliato</span>'}</div><div class="ix-row-actions"><button type="button" data-resolve="nuova_persona" data-row-id="${row.id}">Crea nuova</button><button type="button" data-resolve="ignora" data-row-id="${row.id}">Ignora</button></div>`;
    }
    if (row.esito === 'duplicata') {
      const c = Array.isArray(row.match_info?.candidati) ? row.match_info.candidati[0] : null;
      return `<strong style="font-size:10px;color:#155f9b">Collegata a persona esistente</strong>${c ? `<div class="ix-mini">${esc(`${c.nome || ''} ${c.cognome || ''}`.trim())}</div>` : ''}`;
    }
    if (row.esito === 'valida') return '<strong style="font-size:10px;color:#126743">Nuova anagrafica proposta</strong>';
    if (row.esito === 'errore') return '<span class="ix-mini ix-err">Correggere il file/mapping prima dell’importazione.</span>';
    if (row.esito === 'ignorata') return '<span class="ix-mini">Riga esclusa manualmente.</span>';
    return '—';
  }

  function renderRows() {
    const body = $('importRowsBody');
    const empty = $('importRowsEmpty');
    if (!body) return;
    const activeFilter = $('importRowFilters')?.querySelector('.ix-filter.active')?.dataset.filter || 'all';
    const visible = importRows.filter(r => activeFilter === 'all' || r.esito === activeFilter);
    body.innerHTML = visible.map(row => `<tr><td><strong>${row.numero_riga}</strong><div class="ix-mini">${esc(row.nome_foglio || '')}</div></td><td><span class="ix-row-status ${esc(row.esito)}">${esc(row.esito.replaceAll('_', ' '))}</span><div class="ix-mini">${esc(row.azione_proposta || '')}</div></td><td><strong>${esc(rowName(row))}</strong><div class="ix-mini">${esc((row.dati_normalizzati || {}).tipologie?.join?.(', ') || '')}</div></td><td>${esc(row.codice_fiscale || '—')}</td><td>${detailsHtml(row)}</td><td>${decisionHtml(row)}</td></tr>`).join('');
    empty.hidden = !!visible.length;

    const counts = { total: importRows.length, valida: 0, duplicata: 0, da_validare: 0, errore: 0 };
    importRows.forEach(r => { if (Object.prototype.hasOwnProperty.call(counts, r.esito)) counts[r.esito] += 1; });
    $('ixTotal').textContent = counts.total;
    $('ixValid').textContent = counts.valida;
    $('ixDuplicate').textContent = counts.duplicata;
    $('ixReview').textContent = counts.da_validare;
    $('ixError').textContent = counts.errore;
  }

  async function resolveRow(rowId, action, personId = null) {
    const { data, error } = await client.rpc('risolvi_riga_importazione', { p_riga_id: rowId, p_azione: action, p_persona_id: personId });
    if (error || data?.status !== 'risolta') {
      showToast(`Decisione non salvata: ${error?.message || data?.status || 'errore'}`, 'error');
      return;
    }
    await Promise.all([loadImportRows(currentImportId), loadImports()]);
    showToast('Decisione salvata.', 'success');
  }

  function bindEvents() {
    $('importExcelRefresh')?.addEventListener('click', () => Promise.all([loadImports(), currentImportId ? loadImportRows(currentImportId) : Promise.resolve()]));
    $('importFileInput')?.addEventListener('change', e => handleFile(e.target.files?.[0]));
    const drop = $('importDrop');
    ['dragenter', 'dragover'].forEach(name => drop?.addEventListener(name, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(name => drop?.addEventListener(name, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop?.addEventListener('drop', e => handleFile(e.dataTransfer?.files?.[0]));
    $('importSheet')?.addEventListener('change', e => { currentSheet = e.target.value; prepareSheet(); });
    $('importMappingGrid')?.addEventListener('change', e => {
      const select = e.target.closest('[data-map-field]');
      if (!select) return;
      const field = select.dataset.mapField;
      if (select.value) mapping[field] = select.value; else delete mapping[field];
      renderMapping();
    });
    $('importAnalyzeButton')?.addEventListener('click', analyzeFile);
    $('importResetButton')?.addEventListener('click', resetFile);
    $('importHistory')?.addEventListener('click', e => { const btn = e.target.closest('[data-import-id]'); if (btn) loadImportRows(btn.dataset.importId); });
    $('importRowFilters')?.addEventListener('click', e => { const btn = e.target.closest('[data-filter]'); if (!btn) return; $('importRowFilters').querySelectorAll('.ix-filter').forEach(b => b.classList.toggle('active', b === btn)); renderRows(); });
    $('importRowsBody')?.addEventListener('click', e => { const btn = e.target.closest('[data-resolve]'); if (btn) resolveRow(btn.dataset.rowId, btn.dataset.resolve, btn.dataset.personId || null); });
  }

  function scheduleRealtime(payload) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      await loadImports();
      if (currentImportId && (!payload?.new?.importazione_id || payload.new.importazione_id === currentImportId || payload.old?.importazione_id === currentImportId)) await loadImportRows(currentImportId);
    }, 220);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-segreteria-import-excel');
    ['importazioni', 'importazioni_righe'].forEach(table => realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRealtime));
    realtimeChannel.subscribe(status => {
      const el = $('importExcelRealtime');
      if (!el) return;
      if (status === 'SUBSCRIBED') { el.textContent = '● Realtime collegato'; el.style.color = '#16794f'; }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { el.textContent = 'Realtime da riconnettere'; el.style.color = '#9b6900'; }
    });
  }

  async function init() {
    if (!config || !window.supabase || !$('standardWorkspace')) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    profile = await getProfile();
    if (!profile || !['admin', 'segreteria'].includes(profile.ruolo)) return;
    injectStyles();
    injectUi();
    bindEvents();
    await loadImports();
    connectRealtime();
  }

  document.addEventListener('DOMContentLoaded', init);
})();