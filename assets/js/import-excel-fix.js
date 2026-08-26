(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let lastFile = null;
  let busy = false;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForElement(id, timeout = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const el = $(id);
      if (el) return el;
      await sleep(80);
    }
    return null;
  }

  function norm(value) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('it')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function showStatus(message, type = '') {
    const el = $('importAnalysisStatus');
    if (!el) return;
    el.hidden = false;
    el.className = `ix-analysis-status${type ? ` ${type}` : ''}`;
    el.textContent = message;
  }

  function clearStatus() {
    const el = $('importAnalysisStatus');
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
    el.className = 'ix-analysis-status';
  }

  function setProgress(text = '', percent = null) {
    const label = $('importProgressLabel');
    const bar = $('importProgressBar');
    if (label) label.textContent = text;
    if (bar) {
      bar.style.width = percent == null ? '0%' : `${Math.max(0, Math.min(100, percent))}%`;
      if (bar.parentElement) bar.parentElement.hidden = percent == null;
    }
  }

  function injectFixStyles() {
    if ($('importExcelFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'importExcelFixStyles';
    style.textContent = `
      #importExcelView .ix-layout{grid-template-columns:minmax(0,1fr) 290px;gap:18px}
      #importExcelView .ix-layout>div,#importExcelView .ix-panel,#importExcelView .ix-mapping-grid,#importExcelView .ix-map-row{min-width:0}
      #importExcelView .ix-mapping-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 12px}
      #importExcelView .ix-map-row{grid-template-columns:126px minmax(0,1fr);gap:9px;padding:5px 6px;border:1px solid transparent;border-radius:10px}
      #importExcelView .ix-map-row.mapped{background:#f2faf5;border-color:#dcefe3}
      #importExcelView .ix-map-row span{min-width:0;line-height:1.2}
      #importExcelView .ix-map-row select{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;text-overflow:ellipsis}
      #importExcelView .ix-actions{position:sticky;bottom:10px;z-index:5;background:rgba(255,255,255,.96);padding:10px 0 2px;backdrop-filter:blur(7px)}
      #importExcelView #importAnalyzeButton{min-width:220px}
      #importExcelView .ix-analysis-status{margin-top:10px;padding:11px 13px;border-radius:11px;border:1px solid #d8dde1;background:#f6f8f9;font-size:11px;font-weight:750;line-height:1.45}
      #importExcelView .ix-analysis-status.working{border-color:#d7e4f1;background:#f3f8fd;color:#205b88}
      #importExcelView .ix-analysis-status.success{border-color:#bfe1cd;background:#effaf4;color:#126743}
      #importExcelView .ix-analysis-status.error{border-color:#efc2c8;background:#fff3f4;color:#a0001d;white-space:pre-wrap}
      #importExcelView .ix-file-meta{align-items:center}
      #importExcelView .ix-table-wrap{max-width:100%}
      @media(max-width:1120px){
        #importExcelView .ix-layout{grid-template-columns:1fr}
        #importExcelView .ix-history{max-height:260px}
      }
      @media(max-width:760px){
        #importExcelView .ix-mapping-grid{grid-template-columns:1fr}
        #importExcelView .ix-map-row{grid-template-columns:120px minmax(0,1fr)}
        #importExcelView .ix-actions{position:static}
      }
      @media(max-width:480px){
        #importExcelView .ix-map-row{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function addStatusBox() {
    if ($('importAnalysisStatus')) return;
    const label = $('importProgressLabel');
    if (!label) return;
    const box = document.createElement('div');
    box.id = 'importAnalysisStatus';
    box.className = 'ix-analysis-status';
    box.hidden = true;
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    label.insertAdjacentElement('afterend', box);
  }

  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve, reject) => {
      const src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      const existing = [...document.scripts].find(s => s.src === src);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Libreria Excel non disponibile')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Libreria Excel non disponibile'));
      document.head.appendChild(script);
    });
  }

  async function ensureClient() {
    if (client) return client;
    if (!config || !window.supabase) throw new Error('Configurazione Supabase non disponibile');
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) throw new Error('Sessione scaduta: effettua nuovamente l’accesso');
    const { data: profile, error: profileError } = await client
      .from('utenti_segreteria')
      .select('ruolo,attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (profileError || !profile?.attivo || !['admin', 'segreteria'].includes(profile.ruolo)) {
      throw new Error('Account non autorizzato all’importazione');
    }
    return client;
  }

  async function sha256(file) {
    if (!window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
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

  function currentMapping() {
    const result = {};
    document.querySelectorAll('#importMappingGrid [data-map-field]').forEach(select => {
      if (select.value) result[select.dataset.mapField] = select.value;
    });
    return result;
  }

  function normalizedRow(row, mapping, profileCode) {
    const listFields = new Set(['tipologie', 'corsi', 'turni', 'aree', 'pasti', 'qualifiche', 'mezzi']);
    const out = {};
    Object.entries(mapping).forEach(([field, header]) => {
      const value = row?.[header];
      if (value === '' || value == null) return;
      if (listFields.has(field)) out[field] = splitList(value);
      else if (field === 'arrivo' || field === 'partenza') out[field] = normalizeDate(value);
      else if (field === 'pernotto') out[field] = normalizeBoolean(value);
      else out[field] = String(value).trim();
    });
    if (!Array.isArray(out.tipologie) || !out.tipologie.length) {
      if (profileCode === 'staff') out.tipologie = ['staff'];
      if (profileCode === 'docenti') out.tipologie = ['docente'];
      if (profileCode === 'discenti') out.tipologie = ['discente'];
    }
    return out;
  }

  function cfKey(data) {
    return String(data?.codice_fiscale || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  async function refreshAndOpenImport(importId) {
    const refresh = $('importExcelRefresh');
    if (refresh) refresh.click();
    for (let i = 0; i < 20; i += 1) {
      await sleep(150);
      const item = document.querySelector(`[data-import-id="${CSS.escape(importId)}"]`);
      if (item) {
        item.click();
        return true;
      }
    }
    return false;
  }

  function friendlyError(error) {
    const text = error?.message || String(error || 'Errore sconosciuto');
    if (/schema cache/i.test(text)) return `${text}\nSe hai appena eseguito la SQL 3D.9B, attendi qualche secondo e riprova.`;
    if (/permission|row-level|policy|rls/i.test(text)) return `${text}\nControllare i permessi RLS delle tabelle importazioni/importazioni_righe.`;
    return text;
  }

  async function analyze() {
    if (busy) return;
    const input = $('importFileInput');
    const file = lastFile || input?.files?.[0] || null;
    if (!file) {
      showStatus('Seleziona nuovamente il file Excel prima di avviare l’analisi.', 'error');
      return;
    }

    const button = $('importAnalyzeButton');
    busy = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Analisi in corso…';
    }
    clearStatus();

    try {
      showStatus('Avvio analisi del file…', 'working');
      setProgress('Lettura del foglio selezionato…', 5);
      await ensureXlsx();
      await ensureClient();

      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
      const selectedSheet = $('importSheet')?.value || workbook.SheetNames?.[0] || '';
      const sheet = workbook.Sheets?.[selectedSheet];
      if (!sheet) throw new Error('Foglio Excel non trovato');

      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, blankrows: false });
      if (!rows.length) throw new Error('Il foglio selezionato non contiene righe dati');

      const mapping = currentMapping();
      const profileCode = $('importProfile')?.value || 'altro';
      if (['staff', 'discenti', 'docenti'].includes(profileCode) && (!mapping.nome || !mapping.cognome)) {
        throw new Error('Per Staff, Discenti e Docenti devi collegare almeno le colonne Nome e Cognome.');
      }

      const headers = [...new Set(rows.slice(0, 50).flatMap(row => Object.keys(row || {})))];
      const hash = await sha256(file).catch(() => null);
      const fileType = (file.name.split('.').pop() || 'xlsx').toLowerCase();

      setProgress('Creazione o recupero sessione di staging…', 10);
      showStatus(`Analisi di ${rows.length} righe in preparazione…`, 'working');

      const { data: created, error: createError } = await client.rpc('crea_importazione_excel', {
        p_nome_file: file.name,
        p_tipo_file: fileType,
        p_dimensione_bytes: file.size,
        p_hash_file: hash,
        p_profilo: profileCode,
        p_mapping_colonne: mapping,
        p_note: null,
        p_postazione: getStation() || null,
        p_metadati: {
          foglio: selectedSheet,
          fogli: workbook.SheetNames || [],
          colonne: headers,
          righe_lette: rows.length
        }
      });
      if (createError) throw createError;

      let importId = null;
      if (created?.status === 'creata' || created?.status === 'file_gia_caricato') {
        importId = created.importazione_id;
      } else {
        throw new Error(`Impossibile preparare la sessione (${created?.status || 'risposta non valida'})`);
      }
      if (!importId) throw new Error('ID importazione non restituito dal database');

      const { error: mapError } = await client.rpc('imposta_mapping_importazione', {
        p_importazione_id: importId,
        p_mapping_colonne: mapping,
        p_profilo: profileCode,
        p_postazione: getStation() || null
      });
      if (mapError) throw mapError;

      const normalized = rows.map(row => normalizedRow(row, mapping, profileCode));
      const cfCounts = new Map();
      normalized.forEach(data => {
        const cf = cfKey(data);
        if (cf) cfCounts.set(cf, (cfCounts.get(cf) || 0) + 1);
      });

      let failed = 0;
      let firstFailure = '';
      const batchSize = 5;
      for (let start = 0; start < rows.length; start += batchSize) {
        const end = Math.min(start + batchSize, rows.length);
        const calls = [];
        for (let index = start; index < end; index += 1) {
          const data = normalized[index];
          const cf = cfKey(data);
          const warnings = [];
          if (cf && (cfCounts.get(cf) || 0) > 1) {
            warnings.push({
              tipo: 'cf_ripetuto_file',
              messaggio: `Codice fiscale presente ${cfCounts.get(cf)} volte nel foglio: le righe saranno consolidate nella fase di importazione effettiva.`
            });
          }
          calls.push(client.rpc('salva_riga_importazione', {
            p_importazione_id: importId,
            p_nome_foglio: selectedSheet,
            p_numero_riga: index + 2,
            p_dati_originali: rows[index],
            p_dati_normalizzati: data,
            p_errori: [],
            p_avvisi: warnings
          }));
        }

        const results = await Promise.all(calls);
        results.forEach(result => {
          if (result.error || result.data?.status !== 'analizzata') {
            failed += 1;
            if (!firstFailure) firstFailure = result.error?.message || result.data?.status || 'Errore riga';
          }
        });

        const percent = 15 + (end / rows.length) * 75;
        setProgress(`Analizzate ${end} / ${rows.length} righe…`, percent);
        showStatus(`Analisi in corso: ${end} di ${rows.length} righe elaborate.`, 'working');
      }

      setProgress('Apertura anteprima…', 95);
      await refreshAndOpenImport(importId);
      setProgress(failed ? 'Anteprima pronta con segnalazioni.' : 'Anteprima pronta.', 100);

      if (failed) {
        showStatus(`Anteprima preparata, ma ${failed} righe non sono state elaborate. Primo errore: ${firstFailure}`, 'error');
      } else {
        showStatus(`Anteprima pronta: ${rows.length} righe analizzate. Nessun dato operativo è stato ancora importato.`, 'success');
        const verifyPanel = $('importRowsBody')?.closest('.ix-panel');
        verifyPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      const message = friendlyError(error);
      setProgress('Analisi interrotta.', null);
      showStatus(`Analisi non riuscita: ${message}`, 'error');
      console.error('[Import Excel]', error);
    } finally {
      busy = false;
      if (button) {
        button.disabled = false;
        button.textContent = 'Analizza e prepara anteprima';
      }
    }
  }

  function replaceAnalyzeButton() {
    const old = $('importAnalyzeButton');
    if (!old || old.dataset.fixBound === '1') return;
    const fresh = old.cloneNode(true);
    fresh.dataset.fixBound = '1';
    old.replaceWith(fresh);
    fresh.addEventListener('click', analyze);
  }

  function bindFileCapture() {
    const input = $('importFileInput');
    if (input) {
      input.addEventListener('change', event => {
        lastFile = event.target.files?.[0] || null;
        clearStatus();
      });
      if (input.files?.[0]) lastFile = input.files[0];
    }

    const drop = $('importDrop');
    if (drop) {
      drop.addEventListener('drop', event => {
        const file = event.dataTransfer?.files?.[0];
        if (file) lastFile = file;
      }, true);
    }

    $('importResetButton')?.addEventListener('click', () => {
      lastFile = null;
      clearStatus();
    });
  }

  async function initFix() {
    const view = await waitForElement('importExcelView');
    if (!view) return;
    injectFixStyles();
    addStatusBox();
    bindFileCapture();
    replaceAnalyzeButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFix);
  } else {
    initFix();
  }
})();
