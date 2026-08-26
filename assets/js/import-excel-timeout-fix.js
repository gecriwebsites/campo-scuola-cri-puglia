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
  const cfKey = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const phoneKey = value => String(value || '').replace(/[^0-9]/g, '');
  const emailKey = value => String(value || '').trim().toLocaleLowerCase('it');
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

  async function sha256(file) {
    if (!window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(s => /xlsx\.full\.min\.js/.test(s.src || ''));
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Libreria Excel non disponibile')), { once: true });
        return;
      }
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

  async function rpcWithRetry(name, args, maxAttempts = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { data, error } = await client.rpc(name, args);
      if (!error) return { data, error: null, attempts: attempt };
      lastError = error;
      if (!temporaryError(error) || attempt === maxAttempts) break;
      await sleep(450 * attempt);
    }
    return { data: null, error: lastError, attempts: maxAttempts };
  }

  async function queryWithRetry(factory, maxAttempts = 3) {
    let last = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await factory();
      if (!result.error) return result;
      last = result;
      if (!temporaryError(result.error) || attempt === maxAttempts) break;
      await sleep(450 * attempt);
    }
    return last || { data: null, error: new Error('Richiesta non completata') };
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
      await sleep(120);
    }
  }

  function personView(person) {
    return {
      persona_id: person.id,
      nome: person.nome,
      cognome: person.cognome,
      codice_fiscale: person.codice_fiscale,
      email: person.email,
      telefono: person.telefono,
      comitato: person.comitato,
      attivo: person.attivo
    };
  }

  function buildPeopleIndexes(people) {
    const byCf = new Map();
    const byEmail = new Map();
    const byPhone = new Map();
    const byName = new Map();

    const add = (map, key, person) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(person);
    };

    people.forEach(person => {
      add(byCf, cfKey(person.codice_fiscale), person);
      add(byEmail, emailKey(person.email), person);
      add(byPhone, phoneKey(person.telefono), person);
      const nk = `${norm(person.nome)}|${norm(person.cognome)}`;
      if (nk !== '|') add(byName, nk, person);
    });

    return { byCf, byEmail, byPhone, byName };
  }

  function uniquePeople(items) {
    const map = new Map();
    items.forEach(person => { if (person?.id) map.set(person.id, person); });
    return [...map.values()];
  }

  function analyzeLocally(data, profile, indexes, warnings = []) {
    const errors = [];
    const name = String(data.nome || '').trim();
    const surname = String(data.cognome || '').trim();

    if (['staff','discenti','docenti'].includes(profile) && (!name || !surname)) {
      errors.push({ campo: 'anagrafica', messaggio: 'Nome e cognome sono obbligatori' });
    }

    if (errors.length) {
      return {
        esito: 'errore',
        azione_proposta: 'errore',
        persona_id: null,
        metodo_match: null,
        match_info: {},
        errori: errors,
        avvisi: warnings
      };
    }

    const cf = cfKey(data.codice_fiscale);
    if (cf) {
      const cfMatches = indexes.byCf.get(cf) || [];
      if (cfMatches.length === 1) {
        return {
          esito: 'duplicata',
          azione_proposta: 'aggiorna_persona',
          persona_id: cfMatches[0].id,
          metodo_match: 'codice_fiscale',
          match_info: { status: 'persona_esistente', metodo: 'codice_fiscale', persona_id: cfMatches[0].id, candidati: cfMatches.map(personView) },
          errori: [],
          avvisi: warnings
        };
      }
      if (cfMatches.length > 1) {
        return {
          esito: 'da_validare',
          azione_proposta: 'possibile_duplicato',
          persona_id: null,
          metodo_match: 'codice_fiscale_multiplo',
          match_info: { status: 'possibile_duplicato', metodo: 'codice_fiscale_multiplo', candidati: cfMatches.slice(0, 10).map(personView) },
          errori: [],
          avvisi: [...warnings, { tipo: 'possibile_duplicato', messaggio: 'Verificare la possibile corrispondenza con una persona già presente' }]
        };
      }
    }

    const weak = [];
    const email = emailKey(data.email);
    const phone = phoneKey(data.telefono);
    const nameKey = `${norm(name)}|${norm(surname)}`;
    if (email) weak.push(...(indexes.byEmail.get(email) || []));
    if (phone) weak.push(...(indexes.byPhone.get(phone) || []));
    if (name && surname) weak.push(...(indexes.byName.get(nameKey) || []));
    const candidates = uniquePeople(weak).slice(0, 10);

    if (candidates.length) {
      return {
        esito: 'da_validare',
        azione_proposta: 'possibile_duplicato',
        persona_id: null,
        metodo_match: 'dati_anagrafici',
        match_info: { status: 'possibile_duplicato', metodo: 'dati_anagrafici', candidati: candidates.map(personView) },
        errori: [],
        avvisi: [...warnings, { tipo: 'possibile_duplicato', messaggio: 'Verificare la possibile corrispondenza con una persona già presente' }]
      };
    }

    return {
      esito: 'valida',
      azione_proposta: 'nuova_persona',
      persona_id: null,
      metodo_match: 'nessuna_corrispondenza',
      match_info: { status: 'nuova_persona', metodo: 'nessuna_corrispondenza', candidati: [] },
      errori: [],
      avvisi: warnings
    };
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
      setProgress('Lettura Excel…', 5);

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

      setStatus(`Analisi rapida di ${rows.length} righe: confronto locale e salvataggio in blocco.`, 'working');
      setProgress('Creazione / recupero sessione…', 10);

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

      const importStateResult = await queryWithRetry(() => client.from('importazioni').select('stato').eq('id', importId).maybeSingle());
      if (importStateResult.error) throw importStateResult.error;
      if (['importazione','completata','completata_con_errori'].includes(importStateResult.data?.stato)) {
        setStatus('Questo file è già stato consolidato nel gestionale e non può essere rianalizzato. Apro lo storico esistente.', 'warning');
        await openPreparedImport(importId);
        return;
      }

      const mapped = await rpcWithRetry('imposta_mapping_importazione', {
        p_importazione_id: importId,
        p_mapping_colonne: mapping,
        p_profilo: profile,
        p_postazione: getStation() || null
      });
      if (mapped.error) throw mapped.error;

      setProgress('Caricamento indice anagrafico…', 20);
      const peopleResult = await queryWithRetry(() => client.from('persone')
        .select('id,nome,cognome,codice_fiscale,email,telefono,comitato,attivo')
        .eq('attivo', true)
        .limit(5000));
      if (peopleResult.error) throw peopleResult.error;

      const indexes = buildPeopleIndexes(peopleResult.data || []);
      const normalized = rows.map(row => normalizeRow(row, mapping, profile));
      const cfCounts = new Map();
      normalized.forEach(data => {
        const cf = cfKey(data.codice_fiscale);
        if (cf) cfCounts.set(cf, (cfCounts.get(cf) || 0) + 1);
      });

      setProgress('Analisi locale delle righe…', 35);
      const now = new Date().toISOString();
      const stagedRows = rows.map((row, index) => {
        const data = normalized[index];
        const cf = cfKey(data.codice_fiscale);
        const warnings = [];
        if (cf && (cfCounts.get(cf) || 0) > 1) {
          warnings.push({ tipo: 'cf_ripetuto_file', messaggio: `Codice fiscale presente ${cfCounts.get(cf)} volte nel foglio: le righe verranno consolidate nella fase di importazione effettiva.` });
        }
        const analysis = analyzeLocally(data, profile, indexes, warnings);
        return {
          importazione_id: importId,
          nome_foglio: sheetName || 'Foglio1',
          numero_riga: index + 2,
          dati_originali: row || {},
          dati_normalizzati: data || {},
          codice_fiscale: cf || null,
          persona_id: analysis.persona_id,
          errori: analysis.errori,
          avvisi: analysis.avvisi,
          match_info: analysis.match_info,
          esito: analysis.esito,
          azione_proposta: analysis.azione_proposta,
          metodo_match: analysis.metodo_match,
          confermato_manualmente: false,
          risolto_at: null,
          risolto_da: null,
          updated_at: now
        };
      });

      setProgress(`Salvataggio rapido di ${stagedRows.length} righe…`, 55);
      const chunkSize = 100;
      for (let start = 0; start < stagedRows.length; start += chunkSize) {
        const chunk = stagedRows.slice(start, start + chunkSize);
        const saved = await queryWithRetry(() => client.from('importazioni_righe').upsert(chunk, {
          onConflict: 'importazione_id,nome_foglio,numero_riga'
        }), 4);
        if (saved.error) throw saved.error;
        const done = Math.min(start + chunk.length, stagedRows.length);
        setProgress(`Salvate ${done} / ${stagedRows.length} righe…`, 55 + (done / stagedRows.length) * 30);
      }

      const counts = { valida: 0, duplicata: 0, da_validare: 0, errore: 0, ignorata: 0, importata: 0 };
      stagedRows.forEach(row => { if (Object.prototype.hasOwnProperty.call(counts, row.esito)) counts[row.esito] += 1; });
      const state = counts.da_validare > 0 || counts.errore > 0 ? 'validazione' : 'pronta';

      setProgress('Aggiornamento riepilogo…', 90);
      const updated = await queryWithRetry(() => client.from('importazioni').update({
        mapping_colonne: mapping,
        profilo: profile,
        postazione: getStation() || null,
        righe_totali: stagedRows.length,
        righe_valide: counts.valida,
        righe_duplicate: counts.duplicata,
        righe_errore: counts.errore,
        righe_importate: counts.importata,
        stato: state,
        validata_at: state === 'pronta' ? now : null,
        validata_da: state === 'pronta' ? (await client.auth.getUser()).data?.user?.id || null : null,
        updated_at: now
      }).eq('id', importId), 3);
      if (updated.error) throw updated.error;

      setProgress('Caricamento anteprima…', 96);
      await openPreparedImport(importId);

      const notes = [];
      if (counts.duplicata) notes.push(`${counts.duplicata} già presenti`);
      if (counts.da_validare) notes.push(`${counts.da_validare} da verificare`);
      if (counts.errore) notes.push(`${counts.errore} errori`);
      setStatus(`Anteprima pronta: ${stagedRows.length} righe analizzate e salvate in blocco${notes.length ? ` · ${notes.join(' · ')}` : ''}. Nessun dato operativo è stato ancora importato.`, counts.errore ? 'warning' : 'success');
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
