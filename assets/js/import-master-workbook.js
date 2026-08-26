(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const MEALS = ['colazione', 'pranzo', 'cena'];
  const REQUIRED_SHEETS = ['01_PERSONE', '02_CORSI', '03_TURNI', '04_PASTI', '05_MEZZI'];

  let client = null;
  let session = null;
  let profile = null;
  let parsed = null;
  let selectedFile = null;
  let busy = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getStation = () => sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => String(value ?? '').trim();
  const upper = value => text(value).toUpperCase();
  const norm = value => text(value).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const cfNorm = value => upper(value).replace(/[^A-Z0-9]/g,'');
  const boolValue = value => {
    const v = norm(value);
    if (!v) return null;
    if (['si','sì','yes','true','1','x'].includes(v)) return true;
    if (['no','false','0'].includes(v)) return false;
    return null;
  };
  const splitList = value => Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(/[;,|\n]+/).map(v => v.trim()).filter(Boolean);

  function dateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear(), m = String(value.getMonth()+1).padStart(2,'0'), d = String(value.getDate()).padStart(2,'0');
      return `${y}-${m}-${d}`;
    }
    const s = text(value);
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return null;
  }

  function timeOnly(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mins = Math.round(value * 24 * 60) % (24*60);
      return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}:00`;
    }
    const s = text(value);
    const m = s.match(/(\d{1,2})[:.](\d{2})/);
    if (m) return `${String(Number(m[1])).padStart(2,'0')}:${m[2]}:00`;
    if (/^\d{1,2}$/.test(s)) return `${String(Number(s)).padStart(2,'0')}:00:00`;
    return null;
  }

  function dateTimeIso(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    const s = text(value);
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]||0), Number(m[5]||0), 0);
      return d.toISOString();
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]||0), Number(m[5]||0), 0);
      return d.toISOString();
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  function slug(value, max = 22) {
    return upper(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,max) || 'AREA';
  }

  function rowEmpty(row) {
    return !Object.values(row || {}).some(v => text(v) !== '');
  }

  function cleanObject(row) {
    const out = {};
    Object.entries(row || {}).forEach(([k,v]) => {
      const key = upper(k).replace(/\s+/g,'_');
      if (key === 'ESITO_RIGA') return;
      out[key] = v;
    });
    return out;
  }

  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Libreria Excel non disponibile'));
      document.head.appendChild(script);
    });
  }

  async function sha256(file) {
    if (!window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function parseWorkbook(workbook) {
    const result = { sheets:{}, errors:[], warnings:[] };
    REQUIRED_SHEETS.forEach(name => {
      const ws = workbook.Sheets[name];
      if (!ws) {
        result.errors.push(`Manca la scheda obbligatoria ${name}.`);
        result.sheets[name] = [];
        return;
      }
      const rows = window.XLSX.utils.sheet_to_json(ws, { defval:'', raw:false, blankrows:false, cellDates:true });
      result.sheets[name] = rows.map(cleanObject).filter(row => !rowEmpty(row));
    });

    const people = result.sheets['01_PERSONE'];
    const keys = new Set();
    people.forEach((row,i) => {
      const key = text(row.CHIAVE_PERSONA);
      if (!key || !text(row.NOME) || !text(row.COGNOME)) result.errors.push(`01_PERSONE riga ${i+2}: CHIAVE_PERSONA, NOME e COGNOME sono obbligatori.`);
      if (key && keys.has(norm(key))) result.errors.push(`01_PERSONE riga ${i+2}: CHIAVE_PERSONA duplicata (${key}).`);
      if (key) keys.add(norm(key));
      const start = dateOnly(row.DATA_ARRIVO), end = dateOnly(row.DATA_PARTENZA);
      if (start && end && start > end) result.errors.push(`01_PERSONE riga ${i+2}: DATA_ARRIVO successiva a DATA_PARTENZA.`);
    });

    ['02_CORSI','03_TURNI','04_PASTI'].forEach(sheetName => {
      result.sheets[sheetName].forEach((row,i) => {
        const key = text(row.CHIAVE_PERSONA);
        if (!key) result.errors.push(`${sheetName} riga ${i+2}: CHIAVE_PERSONA mancante.`);
        else if (!keys.has(norm(key))) result.errors.push(`${sheetName} riga ${i+2}: CHIAVE_PERSONA ${key} non presente in 01_PERSONE.`);
      });
    });

    result.sheets['03_TURNI'].forEach((row,i) => {
      if (!text(row.AREA_SERVIZIO) || !dateOnly(row.DATA) || !timeOnly(row.ORA_INIZIO) || !timeOnly(row.ORA_FINE)) {
        result.errors.push(`03_TURNI riga ${i+2}: AREA_SERVIZIO, DATA, ORA_INIZIO e ORA_FINE sono obbligatori.`);
      }
    });
    result.sheets['04_PASTI'].forEach((row,i) => {
      if (!dateOnly(row.DATA)) result.errors.push(`04_PASTI riga ${i+2}: DATA non valida.`);
    });
    result.sheets['05_MEZZI'].forEach((row,i) => {
      if (!text(row.TARGA) || !text(row.MARCA_MODELLO)) result.errors.push(`05_MEZZI riga ${i+2}: TARGA e MARCA_MODELLO sono obbligatori.`);
      [row.AUTISTA_PRINCIPALE, ...splitList(row.ALTRI_AUTISTI)].filter(Boolean).forEach(key => {
        if (!keys.has(norm(key))) result.errors.push(`05_MEZZI riga ${i+2}: autista ${key} non presente in 01_PERSONE.`);
      });
    });

    return result;
  }

  function injectStyles() {
    if ($('masterWorkbookStyles')) return;
    const style = document.createElement('style');
    style.id = 'masterWorkbookStyles';
    style.textContent = `
      .mw-panel{margin:0 0 18px;border:1px solid #cfd8e3;background:#fff;padding:18px}.mw-panel h3{margin:3px 0 5px;font-size:20px}.mw-panel p{margin:0;color:#5d6b78;font-size:13px;line-height:1.45}.mw-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-top:14px}.mw-drop{display:flex;align-items:center;gap:12px;min-height:58px;border:1px dashed #98a8b7;background:#f7f9fb;padding:12px 14px;cursor:pointer}.mw-drop input{display:none}.mw-drop strong{display:block;font-size:14px}.mw-drop span{display:block;font-size:11px;color:#6b7885;margin-top:2px}.mw-actions{display:flex;gap:8px}.mw-btn{min-height:44px;border:1px solid #b8c4ce;background:#fff;padding:9px 14px;font:inherit;font-weight:800;cursor:pointer}.mw-btn.primary{background:#c8102e;border-color:#c8102e;color:#fff}.mw-btn:disabled{opacity:.45;cursor:not-allowed}.mw-status{margin-top:12px;padding:11px 13px;background:#f4f7f9;border-left:4px solid #607d92;font-size:12px;line-height:1.45}.mw-status.error{background:#fff1f2;border-color:#c8102e;color:#7e1d2d}.mw-status.success{background:#eef8f3;border-color:#14734c;color:#165c41}.mw-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px}.mw-stat{border:1px solid #d9e1e7;background:#fafbfc;padding:10px}.mw-stat small{display:block;font-size:10px;color:#6a7783}.mw-stat strong{display:block;font-size:20px;margin-top:3px}.mw-progress{height:8px;background:#e5eaf0;margin-top:12px;overflow:hidden}.mw-progress>div{height:100%;width:0;background:#c8102e;transition:width .15s}.mw-errors{margin-top:10px;font-size:11px;color:#8b2436;line-height:1.5}.mw-errors div+div{margin-top:3px}.mw-legacy-toggle{margin-top:12px;border:0;background:transparent;color:#60707d;text-decoration:underline;cursor:pointer;font:inherit;font-size:11px}.mw-legacy-hidden .ix-layout{display:none!important}.mw-legacy-hidden>.ix-head{margin-bottom:12px!important}@media(max-width:850px){.mw-grid{grid-template-columns:1fr}.mw-actions{justify-content:flex-start}.mw-summary{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const view = $('importExcelView');
    if (!view || $('masterWorkbookPanel')) return;
    view.classList.add('mw-legacy-hidden');
    const panel = document.createElement('section');
    panel.id = 'masterWorkbookPanel';
    panel.className = 'mw-panel';
    panel.innerHTML = `
      <div class="panel-kicker">File unico gestionale</div>
      <h3>Importazione completa da Excel Master</h3>
      <p>Un solo file aggiorna anagrafiche, tipologie, alloggio, corsi, qualifiche, aree, turni, pasti, mezzi, autisti e presenza iniziale. I dati restano sempre modificabili dal gestionale.</p>
      <div class="mw-grid"><label class="mw-drop"><input id="masterWorkbookFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><span>📘</span><div><strong id="masterWorkbookFileName">Seleziona il file Master</strong><span>Usa il modello ufficiale con le schede 01_PERSONE → 05_MEZZI.</span></div></label><div class="mw-actions"><button id="masterWorkbookValidate" class="mw-btn" type="button" disabled>Controlla file</button><button id="masterWorkbookImport" class="mw-btn primary" type="button" disabled>Importa tutto</button></div></div>
      <div class="mw-progress"><div id="masterWorkbookProgress"></div></div>
      <div id="masterWorkbookStatus" class="mw-status">Seleziona il file. Prima dell'importazione viene eseguito un controllo completo senza scrivere dati.</div>
      <div id="masterWorkbookSummary" class="mw-summary" hidden></div>
      <div id="masterWorkbookErrors" class="mw-errors"></div>
      <button id="masterLegacyToggle" class="mw-legacy-toggle" type="button">Mostra importazione vecchio formato</button>`;
    const head = view.querySelector('.ix-head');
    head?.insertAdjacentElement('afterend', panel);

    $('masterWorkbookFile')?.addEventListener('change', onFile);
    $('masterWorkbookValidate')?.addEventListener('click', validateSelected);
    $('masterWorkbookImport')?.addEventListener('click', importSelected);
    $('masterLegacyToggle')?.addEventListener('click', () => {
      view.classList.toggle('mw-legacy-hidden');
      $('masterLegacyToggle').textContent = view.classList.contains('mw-legacy-hidden') ? 'Mostra importazione vecchio formato' : 'Nascondi importazione vecchio formato';
    });
  }

  function setStatus(message, type='') {
    const el = $('masterWorkbookStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `mw-status${type ? ` ${type}` : ''}`;
  }
  function setProgress(value) { if ($('masterWorkbookProgress')) $('masterWorkbookProgress').style.width = `${Math.max(0,Math.min(100,value))}%`; }
  function showErrors(items=[]) {
    const el = $('masterWorkbookErrors');
    if (!el) return;
    el.innerHTML = items.slice(0,15).map(v => `<div>• ${esc(v)}</div>`).join('') + (items.length>15 ? `<div>… altri ${items.length-15} messaggi</div>` : '');
  }
  function showSummary(result) {
    const el = $('masterWorkbookSummary');
    if (!el) return;
    const stats = [
      ['Persone', result.sheets['01_PERSONE'].length],['Corsi', result.sheets['02_CORSI'].length],['Turni', result.sheets['03_TURNI'].length],['Pasti', result.sheets['04_PASTI'].length],['Mezzi', result.sheets['05_MEZZI'].length]
    ];
    el.hidden = false;
    el.innerHTML = stats.map(([label,value]) => `<div class="mw-stat"><small>${label}</small><strong>${value}</strong></div>`).join('');
  }

  async function onFile(event) {
    selectedFile = event.target.files?.[0] || null;
    parsed = null;
    $('masterWorkbookFileName').textContent = selectedFile ? selectedFile.name : 'Seleziona il file Master';
    $('masterWorkbookValidate').disabled = !selectedFile;
    $('masterWorkbookImport').disabled = true;
    setProgress(0); showErrors([]); if ($('masterWorkbookSummary')) $('masterWorkbookSummary').hidden = true;
    setStatus(selectedFile ? 'File selezionato. Premi “Controlla file”.' : 'Seleziona il file Master.');
  }

  async function validateSelected() {
    if (!selectedFile || busy) return;
    busy = true; $('masterWorkbookValidate').disabled = true; setProgress(8); setStatus('Lettura e controllo del file…');
    try {
      await ensureXlsx();
      const wb = window.XLSX.read(await selectedFile.arrayBuffer(), { type:'array', cellDates:true });
      parsed = parseWorkbook(wb);
      showSummary(parsed); showErrors(parsed.errors.length ? parsed.errors : parsed.warnings);
      setProgress(100);
      if (parsed.errors.length) {
        setStatus(`File non pronto: ${parsed.errors.length} problemi da correggere.`, 'error');
        $('masterWorkbookImport').disabled = true;
      } else {
        setStatus('Controllo completato: il file è pronto per l’importazione completa.', 'success');
        $('masterWorkbookImport').disabled = false;
      }
    } catch (error) {
      parsed = null; setStatus(`Controllo non riuscito: ${error.message}`, 'error'); showErrors([error.message]); setProgress(0);
    } finally { busy = false; $('masterWorkbookValidate').disabled = !selectedFile; }
  }

  async function ensureProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (error || !data?.attivo || !['admin','segreteria'].includes(data.ruolo)) throw new Error('Profilo non autorizzato.');
    return data;
  }

  async function createImportSession() {
    const hash = await sha256(selectedFile).catch(() => null);
    const { data, error } = await client.rpc('crea_importazione_excel', {
      p_nome_file: selectedFile.name,
      p_tipo_file: 'xlsx',
      p_dimensione_bytes: selectedFile.size,
      p_hash_file: hash,
      p_profilo: 'altro',
      p_mapping_colonne: { formato:'master_workbook_v1' },
      p_note: 'Importazione completa da file Master',
      p_postazione: getStation() || null,
      p_metadati: { formato:'master_workbook_v1', schede: REQUIRED_SHEETS }
    });
    if (error) throw error;
    if (!data?.importazione_id) throw new Error(`Sessione import non disponibile (${data?.status || 'errore'}).`);
    if (data.status === 'file_gia_caricato') {
      const { data: existing } = await client.from('importazioni').select('stato').eq('id', data.importazione_id).maybeSingle();
      if (['completata','completata_con_errori','importazione'].includes(existing?.stato)) throw new Error('Questo identico file risulta già importato. Salva una nuova versione dell’Excel dopo le modifiche.');
    }
    await client.from('importazioni').update({ stato:'importazione', updated_at:new Date().toISOString() }).eq('id', data.importazione_id);
    return data.importazione_id;
  }

  async function auditRows(importId, entries) {
    for (let i=0;i<entries.length;i+=150) {
      const batch = entries.slice(i,i+150);
      const { error } = await client.from('importazioni_righe').upsert(batch, { onConflict:'importazione_id,nome_foglio,numero_riga' });
      if (error) throw error;
    }
  }

  async function importPeople(importId, errors, warnings) {
    const rows = parsed.sheets['01_PERSONE'];
    let existingRes = await client.from('persone').select('id,chiave_import,nome,cognome,codice_fiscale,email,telefono,comitato,regione,componente_cri,numero_badge,tipologia,settore_alloggio,pernotto,data_arrivo_prevista,data_partenza_prevista,badge_consegnato,gadget_consegnato,qr_attivo,presente,contatto_ice_nome,contatto_ice_telefono,note,attivo');
    if (existingRes.error) {
      if (/chiave_import/i.test(existingRes.error.message || '')) throw new Error('Prima esegui in Supabase il file supabase/step-master-workbook.sql.');
      throw existingRes.error;
    }
    let existing = existingRes.data || [];
    const byKey = new Map(existing.filter(p=>text(p.chiave_import)).map(p=>[norm(p.chiave_import),p]));
    const byCf = new Map(existing.filter(p=>cfNorm(p.codice_fiscale)).map(p=>[cfNorm(p.codice_fiscale),p]));
    const personByKey = new Map();
    const sourceByKey = new Map();
    const audit = [];

    const typeLinks = [], qualTokens = [], areaTokens = [], bedRequests = [], presenceRequests = [];
    const peopleSource = new Map();

    for (let i=0;i<rows.length;i++) {
      const row = rows[i], key = text(row.CHIAVE_PERSONA), nk = norm(key), cf = cfNorm(row.CODICE_FISCALE);
      let person = byKey.get(nk) || (cf ? byCf.get(cf) : null) || null;
      try {
        const types = splitList(row.TIPOLOGIE).map(v=>norm(v)).filter(Boolean);
        const validTypes = types.filter(v=>['discente','docente','staff','ospite','altro'].includes(v));
        if (types.length !== validTypes.length) warnings.push(`01_PERSONE riga ${i+2}: una o più tipologie non riconosciute.`);
        const payload = { chiave_import:key, nome:text(row.NOME), cognome:text(row.COGNOME), attivo:true };
        if (cf) payload.codice_fiscale = cf;
        if (text(row.EMAIL)) payload.email = text(row.EMAIL).toLowerCase();
        if (text(row.TELEFONO)) payload.telefono = text(row.TELEFONO).replace(/\s+/g,'');
        if (text(row.COMITATO)) payload.comitato = text(row.COMITATO);
        if (text(row.REGIONE)) payload.regione = text(row.REGIONE);
        if (text(row.COMPONENTE_CRI)) payload.componente_cri = text(row.COMPONENTE_CRI);
        if (text(row.NUMERO_BADGE)) payload.numero_badge = text(row.NUMERO_BADGE);
        if (validTypes.length) payload.tipologia = validTypes[0];
        if (text(row.SETTORE_ALLOGGIO)) {
          const sec = norm(row.SETTORE_ALLOGGIO).replace(/\s+/g,'_');
          payload.settore_alloggio = ['uomo','donna','da_definire'].includes(sec) ? sec : 'da_definire';
        }
        const pernotto = boolValue(row.PERNOTTO); if (pernotto !== null) payload.pernotto = pernotto;
        const arr = dateOnly(row.DATA_ARRIVO); if (arr) payload.data_arrivo_prevista = arr;
        const part = dateOnly(row.DATA_PARTENZA); if (part) payload.data_partenza_prevista = part;
        const badge = boolValue(row.BADGE_CONSEGNATO); if (badge !== null) payload.badge_consegnato = badge;
        const gadget = boolValue(row.GADGET_CONSEGNATO); if (gadget !== null) payload.gadget_consegnato = gadget;
        const qr = boolValue(row.QR_ATTIVO); if (qr !== null) payload.qr_attivo = qr;
        if (text(row.ICE_NOME)) payload.contatto_ice_nome = text(row.ICE_NOME);
        if (text(row.ICE_TELEFONO)) payload.contatto_ice_telefono = text(row.ICE_TELEFONO);
        if (text(row.NOTE)) payload.note = text(row.NOTE);

        let result;
        if (person) result = await client.from('persone').update(payload).eq('id',person.id).select().single();
        else result = await client.from('persone').insert(payload).select().single();
        if (result.error) throw result.error;
        person = result.data;
        byKey.set(nk,person); if (cf) byCf.set(cf,person); personByKey.set(nk,person.id); sourceByKey.set(nk,row); peopleSource.set(person.id,row);

        validTypes.forEach(t=>typeLinks.push({persona_id:person.id,tipologia_codice:t}));
        splitList(row.QUALIFICHE).forEach(t=>qualTokens.push({personId:person.id,token:t}));
        splitList(row.AREE_SERVIZIO).forEach(t=>areaTokens.push({personId:person.id,token:t}));
        if (text(row.TENDA) && text(row.POSTO_LETTO)) bedRequests.push({personId:person.id,row,key});
        const pi = boolValue(row.PRESENTE_INIZIALE); if (pi !== null) presenceRequests.push({personId:person.id,wanted:pi});

        audit.push({importazione_id:importId,nome_foglio:'01_PERSONE',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[],avvisi:[],esito:'importata',persona_id:person.id});
      } catch (error) {
        const msg = `01_PERSONE riga ${i+2}: ${error.message}`; errors.push(msg);
        audit.push({importazione_id:importId,nome_foglio:'01_PERSONE',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[{messaggio:error.message}],avvisi:[],esito:'errore',persona_id:person?.id || null});
      }
    }

    if (typeLinks.length) {
      for (let i=0;i<typeLinks.length;i+=200) await client.from('persone_tipologie').upsert(typeLinks.slice(i,i+200), {onConflict:'persona_id,tipologia_codice',ignoreDuplicates:true});
    }

    const { data: qRows } = await client.from('qualifiche').select('id,codice,nome,attiva');
    const qMap = new Map(); (qRows||[]).forEach(q=>{ if(q.codice) qMap.set(norm(q.codice),q); qMap.set(norm(q.nome),q); });
    const qLinks=[];
    for (const item of qualTokens) {
      let q = qMap.get(norm(item.token));
      if (!q) {
        const code = slug(item.token,24);
        const ins = await client.from('qualifiche').insert({codice:code,nome:text(item.token),attiva:true}).select().single();
        if (ins.error) { warnings.push(`Qualifica ${item.token} non creata: ${ins.error.message}`); continue; }
        q = ins.data; qMap.set(norm(item.token),q); qMap.set(norm(code),q);
      }
      qLinks.push({persona_id:item.personId,qualifica_id:q.id});
    }
    if (qLinks.length) for (let i=0;i<qLinks.length;i+=200) await client.from('persone_qualifiche').upsert(qLinks.slice(i,i+200), {onConflict:'persona_id,qualifica_id',ignoreDuplicates:true});

    const areaCache = await ensureAreas(areaTokens.map(x=>x.token), warnings);
    const aLinks=[]; areaTokens.forEach(item=>{ const a=areaCache.get(norm(item.token)); if(a) aLinks.push({persona_id:item.personId,area_servizio_id:a.id}); });
    if (aLinks.length) for (let i=0;i<aLinks.length;i+=200) await client.from('persone_aree').upsert(aLinks.slice(i,i+200), {onConflict:'persona_id,area_servizio_id',ignoreDuplicates:true});

    for (const req of bedRequests) await assignBed(req, peopleSource.get(req.personId), warnings);
    for (const req of presenceRequests) {
      const current = byKey.get([...byKey.entries()].find(([,p])=>p.id===req.personId)?.[0]) || existing.find(p=>p.id===req.personId);
      const present = current?.presente === true;
      if (present === req.wanted) continue;
      const { data, error } = await client.rpc('registra_movimento_persona_sicuro',{p_persona_id:req.personId,p_tipo:req.wanted?'entrata':'uscita',p_postazione:getStation()});
      if (error || !['registrato','gia_presente','gia_fuori'].includes(data?.status)) warnings.push(`Presenza iniziale non aggiornata per una persona: ${error?.message || data?.status || 'errore'}`);
    }

    await auditRows(importId,audit);
    return {personByKey,sourceByKey,areaCache};
  }

  async function ensureAreas(tokens, warnings) {
    const { data } = await client.from('aree_servizio').select('id,codice,nome,attivo');
    const map = new Map(); const usedCodes = new Set();
    (data||[]).forEach(a=>{ map.set(norm(a.nome),a); map.set(norm(a.codice),a); usedCodes.add(upper(a.codice)); });
    for (const token of [...new Set(tokens.map(text).filter(Boolean))]) {
      if (map.get(norm(token))) continue;
      let code = slug(token), base=code, n=2; while(usedCodes.has(code)){ code=`${base.slice(0,18)}_${n++}`; }
      const res = await client.from('aree_servizio').insert({codice:code,nome:token,attivo:true}).select().single();
      if (res.error) { warnings.push(`Area ${token} non creata: ${res.error.message}`); continue; }
      map.set(norm(token),res.data); map.set(norm(code),res.data); usedCodes.add(code);
    }
    return map;
  }

  async function assignBed(req, personRow, warnings) {
    const tentCode = upper(req.row.TENDA), bedCodeRaw = upper(req.row.POSTO_LETTO);
    const { data: tents } = await client.from('tende').select('id,codice,destinazione,posti_emergenza_attivi').eq('codice',tentCode).limit(1);
    const tent = tents?.[0]; if (!tent) { warnings.push(`${req.key}: tenda ${tentCode} non trovata.`); return; }
    const { data: beds } = await client.from('posti_letto').select('id,codice_posto,emergenza,attivo,persona_id').eq('tenda_id',tent.id);
    const bedNum = bedCodeRaw.replace(/^P/,'').padStart(2,'0');
    const bed = (beds||[]).find(b=>upper(b.codice_posto).replace(/^P/,'').padStart(2,'0')===bedNum);
    if (!bed) { warnings.push(`${req.key}: posto ${bedCodeRaw} non trovato in ${tentCode}.`); return; }
    if (bed.emergenza && !tent.posti_emergenza_attivi) await client.rpc('imposta_posti_emergenza_tenda',{p_tenda_id:tent.id,p_attivi:true});
    if (tent.destinazione === 'da_definire') {
      const types = splitList(personRow?.TIPOLOGIE).map(norm);
      let dest = norm(personRow?.SETTORE_ALLOGGIO)==='uomo'?'uomini':norm(personRow?.SETTORE_ALLOGGIO)==='donna'?'donne':null;
      if (types.includes('docente') && tentCode==='T05') dest='faculty';
      if (dest) await client.from('tende').update({destinazione:dest,solo_docenti:dest==='faculty'}).eq('id',tent.id);
    }
    const { data, error } = await client.rpc('assegna_posto_letto',{p_persona_id:req.personId,p_posto_letto_id:bed.id,p_postazione:getStation()});
    if (error || data?.status !== 'assegnato') warnings.push(`${req.key}: posto letto non assegnato (${error?.message || data?.status || 'errore'}).`);
  }

  async function importCourses(importId, personByKey, errors) {
    const rows=parsed.sheets['02_CORSI'], audit=[];
    const { data:cRows, error:cErr } = await client.from('corsi').select('id,codice,nome,attivo'); if(cErr) throw cErr;
    const cMap=new Map(); (cRows||[]).forEach(c=>{cMap.set(norm(c.codice),c);cMap.set(norm(c.nome),c);});
    const links=[];
    rows.forEach((row,i)=>{
      const personId=personByKey.get(norm(row.CHIAVE_PERSONA)), course=cMap.get(norm(row.CODICE_CORSO)), role=norm(row.RUOLO_CORSO)||'discente';
      if(!personId||!course||!['discente','docente','direttore','supporto'].includes(role)) {
        const msg=`02_CORSI riga ${i+2}: persona/corso/ruolo non valido.`; errors.push(msg); audit.push({importazione_id:importId,nome_foglio:'02_CORSI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[{messaggio:msg}],avvisi:[],esito:'errore',persona_id:personId||null}); return;
      }
      links.push({persona_id:personId,corso_id:course.id,ruolo:role,note:text(row.NOTE)||null});
      audit.push({importazione_id:importId,nome_foglio:'02_CORSI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[],avvisi:[],esito:'importata',persona_id:personId});
    });
    if(links.length) for(let i=0;i<links.length;i+=200) await client.from('persone_corsi').upsert(links.slice(i,i+200),{onConflict:'persona_id,corso_id,ruolo',ignoreDuplicates:true});
    await auditRows(importId,audit);
  }

  async function importShifts(importId, personByKey, areaCache, errors, warnings) {
    const rows=parsed.sheets['03_TURNI'], audit=[];
    const allAreas = await ensureAreas(rows.map(r=>r.AREA_SERVIZIO),warnings); allAreas.forEach((v,k)=>areaCache.set(k,v));
    const { data: existing } = await client.from('turni').select('id,codice,data,ora_inizio,ora_fine,area_servizio_id,titolo,luogo,attivo').gte('data',CAMP_START).lte('data',CAMP_END);
    const byCode=new Map((existing||[]).filter(t=>t.codice).map(t=>[upper(t.codice),t]));
    const byComposite=new Map((existing||[]).map(t=>[`${t.area_servizio_id}|${t.data}|${String(t.ora_inizio).slice(0,5)}|${String(t.ora_fine).slice(0,5)}|${norm(t.titolo)}`,t]));
    const links=[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i], personId=personByKey.get(norm(row.CHIAVE_PERSONA)), area=areaCache.get(norm(row.AREA_SERVIZIO)), date=dateOnly(row.DATA), start=timeOnly(row.ORA_INIZIO), end=timeOnly(row.ORA_FINE);
      try{
        if(!personId||!area||!date||!start||!end) throw new Error('dati turno incompleti');
        const title=text(row.TITOLO)||`${area.nome} ${start.slice(0,5)}-${end.slice(0,5)}`;
        let code=text(row.CODICE_TURNO); if(!code) code=`AUTO-${slug(area.codice||area.nome,12)}-${date.replace(/-/g,'')}-${start.slice(0,5).replace(':','')}-${end.slice(0,5).replace(':','')}`;
        let turn=byCode.get(upper(code))||byComposite.get(`${area.id}|${date}|${start.slice(0,5)}|${end.slice(0,5)}|${norm(title)}`);
        if(!turn){
          const ins=await client.from('turni').insert({codice:code,data:date,ora_inizio:start,ora_fine:end,area_servizio_id:area.id,titolo:title,luogo:text(row.LUOGO)||null,numero_richiesto:Number(row.NUMERO_RICHIESTO)||null,note:text(row.NOTE_TURNO)||null,attivo:true}).select().single();
          if(ins.error) throw ins.error; turn=ins.data; byCode.set(upper(code),turn);
        }
        const state=norm(row.STATO_PERSONA)||'disponibile';
        links.push({persona_id:personId,turno_id:turn.id,stato:['disponibile','assegnato','confermato','rinunciato','assente'].includes(state)?state:'disponibile',fonte:'excel_master',importazione_id:importId,note:text(row.NOTE_PERSONA)||null,stato_modificato_at:new Date().toISOString(),stato_modificato_da:session.user.id,stato_modificato_postazione:getStation()||null});
        audit.push({importazione_id:importId,nome_foglio:'03_TURNI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[],avvisi:[],esito:'importata',persona_id:personId});
      }catch(error){ const msg=`03_TURNI riga ${i+2}: ${error.message}`; errors.push(msg); audit.push({importazione_id:importId,nome_foglio:'03_TURNI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[{messaggio:error.message}],avvisi:[],esito:'errore',persona_id:personId||null}); }
    }
    if(links.length) for(let i=0;i<links.length;i+=150) await client.from('persone_turni').upsert(links.slice(i,i+150),{onConflict:'persona_id,turno_id'});
    await auditRows(importId,audit);
  }

  function datesBetween(from,to){ const out=[]; let d=new Date(`${from}T12:00:00`), e=new Date(`${to}T12:00:00`); while(d<=e){ out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); } return out; }

  async function importMeals(importId, personByKey, sourceByKey, errors, warnings) {
    const { data: services, error:sErr } = await client.from('servizi_pasto').select('id,data,tipo,attivo').gte('data',CAMP_START).lte('data',CAMP_END); if(sErr) throw sErr;
    const serviceMap=new Map((services||[]).filter(s=>s.attivo!==false).map(s=>[`${s.data}|${s.tipo}`,s]));
    const desired=new Map();
    sourceByKey.forEach((row,key)=>{
      if(boolValue(row.PASTI_AUTOMATICI)!==true) return;
      let from=dateOnly(row.DATA_ARRIVO)||CAMP_START, to=dateOnly(row.DATA_PARTENZA)||CAMP_END; if(from<CAMP_START)from=CAMP_START;if(to>CAMP_END)to=CAMP_END;if(from>to)return;
      const personId=personByKey.get(key); datesBetween(from,to).forEach(date=>MEALS.forEach(type=>{ const s=serviceMap.get(`${date}|${type}`); if(s) desired.set(`${personId}|${s.id}`,{persona_id:personId,servizio_pasto_id:s.id,previsto:true,ticket_attivo:true,fonte:'excel_master'}); }));
    });
    const audit=[];
    parsed.sheets['04_PASTI'].forEach((row,i)=>{
      const personId=personByKey.get(norm(row.CHIAVE_PERSONA)), date=dateOnly(row.DATA);
      if(!personId||!date){ const msg=`04_PASTI riga ${i+2}: persona o data non valida.`; errors.push(msg); audit.push({importazione_id:importId,nome_foglio:'04_PASTI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[{messaggio:msg}],avvisi:[],esito:'errore',persona_id:personId||null}); return; }
      MEALS.forEach(type=>{ const col=type==='colazione'?'COLAZIONE':type==='pranzo'?'PRANZO':'CENA', val=boolValue(row[col]); if(val===null)return; const s=serviceMap.get(`${date}|${type}`); if(s) desired.set(`${personId}|${s.id}`,{persona_id:personId,servizio_pasto_id:s.id,previsto:val,ticket_attivo:val,fonte:'excel_master',motivo_ultima_variazione:'Import Excel Master'}); });
      audit.push({importazione_id:importId,nome_foglio:'04_PASTI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[],avvisi:[],esito:'importata',persona_id:personId});
    });
    const personIds=[...new Set([...desired.values()].map(x=>x.persona_id))];
    const consumed=new Set();
    for(let i=0;i<personIds.length;i+=80){ const {data}=await client.from('persone_pasti').select('persona_id,servizio_pasto_id,consumato').in('persona_id',personIds.slice(i,i+80)); (data||[]).forEach(t=>{if(t.consumato)consumed.add(`${t.persona_id}|${t.servizio_pasto_id}`);}); }
    const payload=[]; desired.forEach((v,k)=>{ if(consumed.has(k)&&v.previsto===false){warnings.push('Un ticket pasto già utilizzato non è stato rimosso dal file Master.');return;} payload.push({...v,updated_at:new Date().toISOString()}); });
    if(payload.length) for(let i=0;i<payload.length;i+=200) await client.from('persone_pasti').upsert(payload.slice(i,i+200),{onConflict:'persona_id,servizio_pasto_id'});
    await auditRows(importId,audit);
  }

  async function importVehicles(importId, personByKey, errors, warnings) {
    const rows=parsed.sheets['05_MEZZI'], audit=[];
    const { data: existing, error:eErr } = await client.from('mezzi').select('id,targa,marca_modello,tipologia,comitato,regione,presente,updated_at'); if(eErr) throw eErr;
    const map=new Map((existing||[]).map(v=>[upper(v.targa).replace(/[^A-Z0-9]/g,''),v]));
    for(let i=0;i<rows.length;i++){
      const row=rows[i], plate=upper(row.TARGA).replace(/[^A-Z0-9]/g,''), model=text(row.MARCA_MODELLO); let vehicle=map.get(plate)||null;
      try{
        let res;
        const payload={targa:plate,marca_modello:model,fonte:'excel_master'}; if(text(row.TIPOLOGIA))payload.tipologia=text(row.TIPOLOGIA); if(text(row.COMITATO))payload.comitato=text(row.COMITATO); if(text(row.REGIONE))payload.regione=text(row.REGIONE); if(text(row.NOTE))payload.note=text(row.NOTE);
        if(vehicle) res=await client.from('mezzi').update(payload).eq('id',vehicle.id).select().single(); else res=await client.from('mezzi').insert(payload).select().single();
        if(res.error) throw res.error; vehicle=res.data; map.set(plate,vehicle);
        const start=dateTimeIso(row.DATA_INIZIO); let activationId=null;
        if(start){
          const {data,error}=await client.rpc('salva_attivazione_mezzo',{p_mezzo_id:vehicle.id,p_data_inizio:start,p_data_fine:dateTimeIso(row.DATA_FINE),p_destinazione:text(row.DESTINAZIONE)||null,p_note:text(row.NOTE)||null,p_attiva:boolValue(row.ATTIVA)!==false,p_fonte:'excel_master',p_postazione:getStation(),p_attivazione_id:null,p_importazione_id:importId});
          if(error||data?.status!=='salvata') throw new Error(error?.message||data?.status||'attivazione non salvata'); activationId=data.attivazione_id;
        }
        if(activationId){
          const principal=personByKey.get(norm(row.AUTISTA_PRINCIPALE)); if(principal){ const r=await client.rpc('imposta_autista_mezzo',{p_attivazione_id:activationId,p_persona_id:principal,p_principale:true,p_note:null,p_fonte:'excel_master',p_postazione:getStation(),p_importazione_id:importId}); if(r.error) warnings.push(`Autista principale ${row.AUTISTA_PRINCIPALE}: ${r.error.message}`); }
          for(const key of splitList(row.ALTRI_AUTISTI)){ const personId=personByKey.get(norm(key)); if(!personId)continue; const r=await client.rpc('imposta_autista_mezzo',{p_attivazione_id:activationId,p_persona_id:personId,p_principale:false,p_note:null,p_fonte:'excel_master',p_postazione:getStation(),p_importazione_id:importId}); if(r.error) warnings.push(`Autista ${key}: ${r.error.message}`); }
        }
        const wanted=boolValue(row.PRESENTE_INIZIALE); if(wanted!==null && vehicle.presente!==wanted){ const mv=await client.rpc('registra_movimento_mezzo_sicuro',{p_mezzo_id:vehicle.id,p_tipo:wanted?'entrata':'uscita',p_fonte:'excel_master',p_note:null,p_postazione:getStation()}); if(mv.error) warnings.push(`${plate}: presenza mezzo non aggiornata (${mv.error.message}).`); }
        audit.push({importazione_id:importId,nome_foglio:'05_MEZZI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[],avvisi:[],esito:'importata',persona_id:null});
      }catch(error){ const msg=`05_MEZZI riga ${i+2}: ${error.message}`; errors.push(msg); audit.push({importazione_id:importId,nome_foglio:'05_MEZZI',numero_riga:i+2,dati_originali:row,dati_normalizzati:row,errori:[{messaggio:error.message}],avvisi:[],esito:'errore',persona_id:null}); }
    }
    await auditRows(importId,audit);
  }

  async function importSelected() {
    if(!parsed||parsed.errors.length||busy)return;
    if(!window.confirm('Importare l’intero file Master nel gestionale? I dati esistenti verranno aggiornati senza cancellare i campi lasciati vuoti.'))return;
    busy=true; $('masterWorkbookImport').disabled=true; $('masterWorkbookValidate').disabled=true; setProgress(2); setStatus('Importazione completa in corso…'); showErrors([]);
    const errors=[], warnings=[];
    try{
      await ensureProfile();
      const importId=await createImportSession();
      setProgress(10); setStatus('1/5 · Anagrafiche, tipologie, qualifiche e alloggi…');
      const peopleResult=await importPeople(importId,errors,warnings);
      setProgress(35); setStatus('2/5 · Corsi…'); await importCourses(importId,peopleResult.personByKey,errors);
      setProgress(50); setStatus('3/5 · Turni e assegnazioni…'); await importShifts(importId,peopleResult.personByKey,peopleResult.areaCache,errors,warnings);
      setProgress(70); setStatus('4/5 · Pasti…'); await importMeals(importId,peopleResult.personByKey,peopleResult.sourceByKey,errors,warnings);
      setProgress(86); setStatus('5/5 · Mezzi, attivazioni e autisti…'); await importVehicles(importId,peopleResult.personByKey,errors,warnings);
      await client.rpc('ricalcola_importazione',{p_importazione_id:importId}).catch(()=>{});
      await client.from('importazioni').update({stato:errors.length?'completata_con_errori':'completata',completata_at:new Date().toISOString(),righe_errore:errors.length,updated_at:new Date().toISOString()}).eq('id',importId);
      setProgress(100); showErrors([...errors,...warnings]);
      setStatus(errors.length?`Importazione completata con ${errors.length} errori e ${warnings.length} avvisi. I dati corretti sono già operativi.`:`Importazione completata. Tutto il file Master è stato applicato al gestionale${warnings.length?` con ${warnings.length} avvisi`:''}.`,errors.length?'error':'success');
      document.dispatchEvent(new CustomEvent('campo-master-import-complete',{detail:{importId,errors,warnings}}));
      $('importExcelRefresh')?.click();
    }catch(error){ setStatus(`Importazione interrotta: ${error.message}`,'error'); showErrors([error.message,...errors,...warnings]); setProgress(0); }
    finally{busy=false;$('masterWorkbookValidate').disabled=!selectedFile;$('masterWorkbookImport').disabled=!parsed||!!parsed.errors.length;}
  }

  async function init(){
    if(!config||!window.supabase)return;
    for(let i=0;i<120;i++){if($('importExcelView'))break;await sleep(100);} if(!$('importExcelView'))return;
    client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth=await client.auth.getSession(); session=auth.data?.session; if(!session)return; profile=await ensureProfile().catch(()=>null); if(!profile)return;
    injectStyles(); injectUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
