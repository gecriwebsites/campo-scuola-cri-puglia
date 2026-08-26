(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let busy = false;
  let droppedFile = null;

  const STANDARD_FIELDS = [
    'nome','cognome','codice_fiscale','email','telefono','comitato','regione','componente','numero_badge',
    'tipologie','corsi','turni','aree','arrivo','partenza','pernotto','pasti','esigenze_alimentari','qualifiche','mezzi'
  ];

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = value => String(value || '').trim().toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  const getStation = () => sessionStorage.getItem(STATION_STORAGE_KEY) || '';

  function setStatus(message, type = '') {
    let el = $('importAnalysisStatus');
    if (!el) {
      const actions = $('importAnalyzeButton')?.closest('.ix-actions');
      if (!actions) return;
      el = document.createElement('div');
      el.id = 'importAnalysisStatus';
      actions.insertAdjacentElement('afterend', el);
    }
    el.hidden = false;
    el.className = `ix-analysis-status${type ? ` ${type}` : ''}`;
    el.textContent = message;
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

  function splitList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value ?? '').split(/[;,\n|]+/).map(v => v.trim()).filter(Boolean);
  }

  function normalizeBoolean(value) {
    const n = norm(value);
    if (!n) return null;
    if (['si','sì','yes','true','1','x','previsto'].includes(n)) return true;
    if (['no','false','0','non previsto'].includes(n)) return false;
    return String(value).trim();
  }

  function normalizeDate(value) {
    const s = String(value ?? '').trim();
    if (!s) return null;
    const iso = s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`;
    const it = s.match(/^([0-3]?\d)[\/\-.]([01]?\d)[\/\-.](\d{4})/);
    if (it) return `${it[3]}-${String(it[2]).padStart(2,'0')}-${String(it[1]).padStart(2,'0')}`;
    return s;
  }

  function readMapping() {
    const map = {};
    document.querySelectorAll('#importMappingGrid select[data-map-field]').forEach(select => {
      if (select.value) map[select.dataset.mapField] = select.value;
    });
    return map;
  }

  function normalizeRow(row, mapping, profile) {
    const out = {};
    STANDARD_FIELDS.forEach(field => {
      const header = mapping[field];
      if (!header) return;
      const value = row?.[header];
      if (value === '' || value == null) return;
      if (['tipologie','corsi','turni','aree','pasti','qualifiche','mezzi'].includes(field)) out[field] = splitList(value);
      else if (['arrivo','partenza'].includes(field)) out[field] = normalizeDate(value);
      else if (field === 'pernotto') out[field] = normalizeBoolean(value);
      else out[field] = String(value).trim();
    });
    if (!out.tipologie?.length) {
      if (profile === 'staff') out.tipologie = ['staff'];
      if (profile === 'docenti') out.tipologie = ['docente'];
      if (profile === 'discenti') out.tipologie = ['discente'];
    }
    return out;
  }

  function cfKey(data) {
    return String(data?.codice_fiscale || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  async function sha256(file) {
    if (!window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Libreria Excel non disponibile'));
      document.head.appendChild(script);
    });
  }

  function temporaryError(error) {
    const message = String(error?.message || error || '');
    return /timeout|upstream|gateway|temporar|network|fetch|connection|429|502|503|504/i.test(message);
  }

  async function rpcWithRetry(name, args, maxAttempts = 4) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { data, error } = await client.rpc(name, args);
      if (!error) return { data, error: null, attempts: attempt };
      lastError = error;
      if (!temporaryError(error) || attempt === maxAttempts) break;
      await sleep(650 * attempt);
    }
    return { data: null, error: lastError, attempts: maxAttempts };
  }

  async function openPreparedImport(importId) {
    $('importExcelRefresh')?.click();
    for (let i = 0; i < 40; i += 1) {
      const button = document.querySelector(`[data-import-id="${CSS.escape(importId)}"]`);
      if (button) {
        button.click();
        setTimeout(() => document.querySelector('#importRowsBody')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
        return;
      }
      await sleep(150);
    }
  }

  async function robustAnalyze() {
    if (busy) return;

    const file = $('importFileInput')?.files?.[0] || droppedFile;
    if (!file) {
      setStatus('Seleziona nuovamente il file Excel prima di avviare l’analisi.', 'error');
      return;
    }

    const mapping = readMapping();
    if (!mapping.nome || !mapping.cognome) {
      setStatus('Controlla il mapping: Nome e Cognome devono essere collegati a una colonna.', 'error');
      return;
    }

    busy = true;
    const button = $('importAnalyzeButton');
    if (button) button.disabled = true;

    try {
      await ensureXlsx();
      setStatus('Preparazione del file…', 'working');
      setProgress('Lettura Excel…', 4);

      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = $('importSheet')?.value || workbook.SheetNames?.[0];
      const sheet = workbook.Sheets?.[sheetName];
      if (!sheet) throw new Error('Foglio Excel non trovato.');

      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, blankrows: false });
      if (!rows.length) throw new Error('Il foglio selezionato non contiene righe dati.');

      const profile = $('importProfile')?.value || 'altro';
      const hash = await sha256(file).catch(() => null);
      const extension = (file.name.split('.').pop() || 'xlsx').toLowerCase();

      setStatus(`Analisi protetta di ${rows.length} righe: invio sequenziale per evitare timeout.`, 'working');
      setProgress('Creazione / recupero sessione di staging…', 7);

      const created = await rpcWithRetry('crea_importazione_excel', {
        p_nome_file: file.name,
        p_tipo_file: extension,
        p_dimensione_bytes: file.size,
        p_hash_file: hash,
        p_profilo: profile,
        p_mapping_colonne: mapping,
        p_note: null,
        p_postazione: getStation() || null,
        p_metadati: { foglio: sheetName, fogli: workbook.SheetNames, colonne: Object.keys(rows[0] || {}), righe_lette: rows.length }
      });
      if (created.error) throw created.error;

      const importId = created.data?.importazione_id;
      if (!importId || !['creata','file_gia_caricato'].includes(created.data?.status)) {
        throw new Error(`Sessione di staging non disponibile (${created.data?.status || 'errore'}).`);
      }

      const mapped = await rpcWithRetry('imposta_mapping_importazione', {
        p_importazione_id: importId,
        p_mapping_colonne: mapping,
        p_profilo: profile,
        p_postazione: getStation() || null
      });
      if (mapped.error) throw mapped.error;

      const normalized = rows.map(row => normalizeRow(row, mapping, profile));
      const cfCounts = new Map();
      normalized.forEach(data => {
        const cf = cfKey(data);
        if (cf) cfCounts.set(cf, (cfCounts.get(cf) || 0) + 1);
      });

      const failures = [];
      let retriesUsed = 0;

      for (let index = 0; index < rows.length; index += 1) {
        const data = normalized[index];
        const cf = cfKey(data);
        const warnings = [];
        if (cf && (cfCounts.get(cf) || 0) > 1) {
          warnings.push({ tipo: 'cf_ripetuto_file', messaggio: `Codice fiscale presente ${cfCounts.get(cf)} volte nel foglio: le righe verranno consolidate nella fase di importazione effettiva.` });
        }

        const pct = 10 + ((index + 1) / rows.length) * 84;
        setProgress(`Analisi riga ${index + 1} / ${rows.length}…`, pct);

        const saved = await rpcWithRetry('salva_riga_importazione', {
          p_importazione_id: importId,
          p_nome_foglio: sheetName,
          p_numero_riga: index + 2,
          p_dati_originali: rows[index],
          p_dati_normalizzati: data,
          p_errori: [],
          p_avvisi: warnings
        }, 5);

        if (saved.attempts > 1) retriesUsed += saved.attempts - 1;
        if (saved.error || saved.data?.status !== 'analizzata') {
          failures.push({ row: index + 2, error: saved.error?.message || saved.data?.status || 'errore sconosciuto' });
        }

        // Evita picchi di richieste sul piano Free/PostgREST.
        await sleep(260);
      }

      setProgress('Caricamento anteprima…', 98);
      await openPreparedImport(importId);

      if (failures.length) {
        const first = failures[0];
        setStatus(`Anteprima aggiornata: ${rows.length - failures.length}/${rows.length} righe elaborate. ${failures.length} da riprovare (prima: riga ${first.row}, ${first.error}). Premi di nuovo “Analizza” per ritentare: le righe già salvate non verranno duplicate.`, 'warning');
      } else {
        const retryText = retriesUsed ? ` Sono stati recuperati automaticamente ${retriesUsed} timeout temporanei.` : '';
        setStatus(`Anteprima pronta: ${rows.length} righe elaborate correttamente.${retryText} Nessun dato operativo è stato ancora importato.`, 'success');
      }
      setProgress('Anteprima aggiornata.', 100);
    } catch (error) {
      setStatus(`Analisi non riuscita: ${error?.message || error}`, 'error');
      setProgress('Analisi interrotta.', null);
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  async function init() {
    if (!config || !window.supabase) return;
    const analyze = await (async () => {
      for (let i = 0; i < 100; i += 1) {
        if ($('importAnalyzeButton')) return $('importAnalyzeButton');
        await sleep(100);
      }
      return null;
    })();
    if (!analyze) return;

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });

    $('importFileInput')?.addEventListener('change', event => { droppedFile = event.target.files?.[0] || null; }, true);
    $('importDrop')?.addEventListener('drop', event => { droppedFile = event.dataTransfer?.files?.[0] || null; }, true);

    analyze.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      robustAnalyze();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
