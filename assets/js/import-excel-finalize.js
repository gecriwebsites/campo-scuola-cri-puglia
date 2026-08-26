(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let profile = null;
  let busy = false;
  let observer = null;
  let refreshTimer = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function station() { return sessionStorage.getItem(STATION_STORAGE_KEY) || ''; }

  function currentImportId() {
    return document.querySelector('#importHistory .ix-history-item.active')?.dataset.importId || null;
  }

  function isTimeout(error) {
    const text = String(error?.message || error || '').toLowerCase();
    return text.includes('timeout') || text.includes('upstream request timeout') || text.includes('gateway') || text.includes('504');
  }

  async function rpcWithRetry(name, args, attempts = 4) {
    let last = null;
    for (let i = 1; i <= attempts; i += 1) {
      const response = await client.rpc(name, args);
      if (!response.error) return response;
      last = response;
      if (!isTimeout(response.error) || i === attempts) return response;
      setStatus(`Connessione lenta: nuovo tentativo ${i + 1}/${attempts}…`, 'working');
      await sleep(650 * i);
    }
    return last;
  }

  function injectStyles() {
    if ($('importFinalizeStyles')) return;
    const style = document.createElement('style');
    style.id = 'importFinalizeStyles';
    style.textContent = `
      #importExcelView .ix-finalize-box{margin:0 0 14px;border:1px solid #dce2e7;background:linear-gradient(135deg,#fbfcfd,#f5f8fa);border-radius:15px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}
      #importExcelView .ix-finalize-box.ready{border-color:#c8e3d4;background:linear-gradient(135deg,#f7fcf9,#eef9f3)}
      #importExcelView .ix-finalize-box.blocked{border-color:#edd7a2;background:#fffaf0}
      #importExcelView .ix-finalize-box.completed{border-color:#cbdced;background:#f4f8fc}
      #importExcelView .ix-finalize-copy strong{display:block;font-size:13px}.ix-finalize-copy span{display:block;margin-top:3px;font-size:10px;line-height:1.45;color:var(--muted)}
      #importExcelView .ix-finalize-button{border:0;border-radius:10px;background:#16794f;color:#fff;padding:10px 13px;font:inherit;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}.ix-finalize-button:hover{filter:brightness(.96)}.ix-finalize-button:disabled{opacity:.45;cursor:not-allowed}
      #importExcelView .ix-finalize-progress{grid-column:1/-1;height:7px;background:#e4e9ec;border-radius:999px;overflow:hidden}.ix-finalize-progress[hidden]{display:none}.ix-finalize-progress>div{height:100%;width:0;background:#16794f;transition:width .18s}
      #importExcelView .ix-finalize-status{grid-column:1/-1;font-size:10px;font-weight:750;min-height:14px}.ix-finalize-status.working{color:#205b88}.ix-finalize-status.error{color:#a0001d}.ix-finalize-status.success{color:#16794f}
      .ix-finalize-modal[hidden]{display:none}.ix-finalize-modal{position:fixed;inset:0;z-index:700;display:grid;place-items:center;padding:20px}.ix-finalize-backdrop{position:absolute;inset:0;background:rgba(20,23,26,.62);backdrop-filter:blur(4px)}
      .ix-finalize-card{position:relative;width:min(100%,620px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:22px;border:1px solid #e0e4e7;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.28)}
      .ix-finalize-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ix-finalize-head h2{margin:4px 0 5px}.ix-finalize-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}.ix-finalize-close{border:0;background:#f0f2f4;border-radius:10px;width:38px;height:38px;font-size:22px;cursor:pointer}
      .ix-finalize-warning{margin-top:16px;padding:12px 13px;border:1px solid #ecd6a5;border-radius:12px;background:#fffaf0;font-size:11px;line-height:1.5;color:#705513}
      .ix-finalize-confirm{display:grid;gap:10px;margin-top:16px}.ix-finalize-confirm label{font-size:11px;font-weight:800}.ix-finalize-confirm input{width:100%;height:42px;border:1px solid #d4d9dd;border-radius:10px;padding:0 11px;font:inherit;box-sizing:border-box}.ix-finalize-confirm .ix-check{display:flex;gap:8px;align-items:flex-start;font-weight:650}
      .ix-finalize-confirm-button{border:0;border-radius:10px;background:#16794f;color:#fff;padding:11px 14px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.ix-finalize-confirm-button:disabled{opacity:.45;cursor:not-allowed}
      .ix-finalize-result{margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ix-result-stat{border:1px solid #e0e5e8;background:#fafbfc;border-radius:11px;padding:10px}.ix-result-stat small{display:block;color:var(--muted);font-size:9px;font-weight:800}.ix-result-stat strong{display:block;font-size:20px;margin-top:2px}
      #importExcelView .ix-history-action[disabled]{opacity:.4;cursor:not-allowed}.ix-history-locked{font-size:8px;font-weight:800;color:#52606c;margin-top:4px;text-align:center}
      @media(max-width:680px){#importExcelView .ix-finalize-box{grid-template-columns:1fr}.ix-finalize-result{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if ($('importFinalizeBox')) return;
    const verifyPanel = $('importRowsBody')?.closest('.ix-panel');
    const filters = $('importRowFilters');
    if (!verifyPanel || !filters) return;

    const box = document.createElement('div');
    box.id = 'importFinalizeBox';
    box.className = 'ix-finalize-box';
    box.innerHTML = `
      <div class="ix-finalize-copy"><strong>Importazione effettiva</strong><span id="importFinalizeHint">Seleziona una sessione di importazione per verificarne lo stato.</span></div>
      <button id="importFinalizeButton" class="ix-finalize-button" type="button" disabled>Conferma e importa nel gestionale</button>
      <div id="importFinalizeProgress" class="ix-finalize-progress" hidden><div id="importFinalizeProgressBar"></div></div>
      <div id="importFinalizeStatus" class="ix-finalize-status"></div>`;
    verifyPanel.insertBefore(box, filters);

    const modal = document.createElement('div');
    modal.id = 'importFinalizeModal';
    modal.className = 'ix-finalize-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="ix-finalize-backdrop" data-finalize-close></div>
      <section class="ix-finalize-card" role="dialog" aria-modal="true" aria-labelledby="importFinalizeTitle">
        <div class="ix-finalize-head"><div><div class="kicker">Conferma finale</div><h2 id="importFinalizeTitle">Importa nel gestionale</h2><p id="importFinalizeSubtitle">Le righe approvate verranno consolidate nei moduli operativi.</p></div><button class="ix-finalize-close" type="button" data-finalize-close aria-label="Chiudi">×</button></div>
        <div class="ix-finalize-warning"><strong>Attenzione:</strong> da questo momento l'importazione non sarà più semplice staging. Verranno create o aggiornate anagrafiche e relazioni operative. Le righe gialle o rosse devono essere risolte prima di procedere.</div>
        <div class="ix-finalize-confirm">
          <label>Digita esattamente <strong>CONFERMA IMPORTAZIONE</strong><input id="importFinalizePhrase" type="text" autocomplete="off" placeholder="CONFERMA IMPORTAZIONE"></label>
          <label class="ix-check"><input id="importFinalizeCheck" type="checkbox"><span>Ho verificato l'anteprima e confermo l'importazione dei dati approvati.</span></label>
          <button id="importFinalizeConfirmButton" class="ix-finalize-confirm-button" type="button" disabled>Avvia importazione</button>
        </div>
        <div id="importFinalizeResult" class="ix-finalize-result" hidden></div>
      </section>`;
    document.body.appendChild(modal);

    $('importFinalizeButton').addEventListener('click', openModal);
    modal.addEventListener('click', event => { if (event.target.closest('[data-finalize-close]')) closeModal(); });
    $('importFinalizePhrase').addEventListener('input', updateConfirmButton);
    $('importFinalizeCheck').addEventListener('change', updateConfirmButton);
    $('importFinalizeConfirmButton').addEventListener('click', runImport);
  }

  function setStatus(message = '', type = '') {
    const el = $('importFinalizeStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `ix-finalize-status${type ? ` ${type}` : ''}`;
  }

  function setProgress(done, total) {
    const wrap = $('importFinalizeProgress');
    const bar = $('importFinalizeProgressBar');
    if (!wrap || !bar) return;
    if (!total) { wrap.hidden = true; bar.style.width = '0%'; return; }
    wrap.hidden = false;
    bar.style.width = `${Math.max(0, Math.min(100, (done / total) * 100))}%`;
  }

  function updateConfirmButton() {
    const valid = $('importFinalizePhrase')?.value === 'CONFERMA IMPORTAZIONE' && $('importFinalizeCheck')?.checked === true;
    if ($('importFinalizeConfirmButton')) $('importFinalizeConfirmButton').disabled = !valid || busy;
  }

  function closeModal() {
    if (busy) return;
    const modal = $('importFinalizeModal');
    if (modal) modal.hidden = true;
  }

  async function openModal() {
    const id = currentImportId();
    if (!id || busy) return;
    $('importFinalizePhrase').value = '';
    $('importFinalizeCheck').checked = false;
    $('importFinalizeResult').hidden = true;
    $('importFinalizeResult').innerHTML = '';
    $('importFinalizeModal').hidden = false;
    updateConfirmButton();

    const { data, error } = await client.from('importazioni').select('nome_file,profilo,stato,righe_totali,righe_valide,righe_duplicate,righe_errore,righe_importate').eq('id', id).maybeSingle();
    if (!error && data) {
      $('importFinalizeSubtitle').textContent = `${data.nome_file} · ${data.profilo} · ${data.righe_totali || 0} righe in staging.`;
    }
  }

  async function loadState() {
    const id = currentImportId();
    const box = $('importFinalizeBox');
    const button = $('importFinalizeButton');
    const hint = $('importFinalizeHint');
    if (!box || !button || !hint) return;

    box.className = 'ix-finalize-box';
    button.disabled = true;

    if (!id) {
      hint.textContent = 'Seleziona una sessione di importazione per verificarne lo stato.';
      setStatus('');
      lockCompletedHistoryActions();
      return;
    }

    const { data, error } = await client.from('importazioni').select('id,nome_file,stato,righe_totali,righe_valide,righe_duplicate,righe_errore,righe_importate').eq('id', id).maybeSingle();
    if (error || !data) {
      hint.textContent = 'Impossibile verificare lo stato della sessione.';
      box.classList.add('blocked');
      lockCompletedHistoryActions();
      return;
    }

    const { data: rows, error: rowsError } = await client.from('importazioni_righe').select('esito').eq('importazione_id', id).limit(6000);
    if (rowsError) {
      hint.textContent = `Stato ${data.stato}. Ricarica per verificare le righe.`;
      box.classList.add('blocked');
      lockCompletedHistoryActions();
      return;
    }

    const counts = { valida: 0, duplicata: 0, da_validare: 0, errore: 0, ignorata: 0, importata: 0 };
    (rows || []).forEach(row => { if (Object.prototype.hasOwnProperty.call(counts, row.esito)) counts[row.esito] += 1; });

    if (['completata', 'completata_con_errori'].includes(data.stato)) {
      box.classList.add('completed');
      hint.textContent = `Importazione già conclusa: ${counts.importata} righe importate${counts.errore ? `, ${counts.errore} con errore` : ''}.`;
      button.disabled = true;
      button.textContent = 'Importazione completata';
    } else if (data.stato === 'importazione') {
      box.classList.add('blocked');
      hint.textContent = `Importazione avviata: ${counts.importata} righe già consolidate, ${counts.valida + counts.duplicata} ancora da elaborare.`;
      button.disabled = false;
      button.textContent = 'Riprendi importazione';
    } else if (counts.da_validare > 0 || counts.errore > 0) {
      box.classList.add('blocked');
      hint.textContent = `Prima risolvi ${counts.da_validare} righe da verificare e ${counts.errore} errori.`;
      button.disabled = true;
      button.textContent = 'Conferma e importa nel gestionale';
    } else if ((counts.valida + counts.duplicata) > 0) {
      box.classList.add('ready');
      hint.textContent = `${counts.valida} nuove + ${counts.duplicata} anagrafiche esistenti pronte. ${counts.ignorata} righe ignorate.`;
      button.disabled = false;
      button.textContent = 'Conferma e importa nel gestionale';
    } else {
      box.classList.add('blocked');
      hint.textContent = 'Non ci sono righe importabili in questa sessione.';
      button.disabled = true;
    }

    lockCompletedHistoryActions();
  }

  function lockCompletedHistoryActions() {
    document.querySelectorAll('#importHistory .ix-history-entry').forEach(entry => {
      const status = entry.querySelector('.ix-history-status')?.textContent?.toLowerCase() || '';
      const locked = status.includes('completata') || status.includes('importazione');
      entry.querySelectorAll('.ix-history-action').forEach(button => {
        button.disabled = locked;
        button.title = locked ? 'Sessione già consolidata nel gestionale: non può essere sostituita o eliminata.' : '';
      });
      let label = entry.querySelector('.ix-history-locked');
      if (locked && !label) {
        label = document.createElement('div');
        label.className = 'ix-history-locked';
        label.textContent = '🔒 Consolidata';
        entry.querySelector('.ix-history-actions')?.appendChild(label);
      }
      if (!locked && label) label.remove();
    });
  }

  async function runImport() {
    const id = currentImportId();
    if (!id || busy || $('importFinalizePhrase').value !== 'CONFERMA IMPORTAZIONE' || !$('importFinalizeCheck').checked) return;

    busy = true;
    updateConfirmButton();
    $('importFinalizeButton').disabled = true;
    $('importFinalizeResult').hidden = true;
    setStatus('Verifica e avvio dell’importazione…', 'working');
    setProgress(0, 1);

    try {
      const { data: importInfo, error: infoError } = await client.from('importazioni').select('stato').eq('id', id).maybeSingle();
      if (infoError || !importInfo) throw new Error(infoError?.message || 'Sessione non trovata');

      if (importInfo.stato !== 'importazione') {
        const start = await rpcWithRetry('avvia_importazione_effettiva', { p_importazione_id: id, p_conferma: 'CONFERMA IMPORTAZIONE' });
        if (start.error) throw start.error;
        if (start.data?.status === 'importazione_non_pronta') {
          throw new Error(`Importazione non pronta: ${start.data.da_validare || 0} righe da verificare, ${start.data.errori || 0} errori.`);
        }
        if (!['avviata', 'gia_completata'].includes(start.data?.status)) throw new Error(start.data?.status || 'Avvio non riuscito');
        if (start.data?.status === 'gia_completata') {
          setStatus('Questa importazione risulta già completata.', 'success');
          return;
        }
      }

      const { data: rows, error: rowsError } = await client.from('importazioni_righe')
        .select('id,numero_riga,esito')
        .eq('importazione_id', id)
        .in('esito', ['valida', 'duplicata'])
        .order('numero_riga', { ascending: true })
        .limit(6000);
      if (rowsError) throw rowsError;

      const queue = rows || [];
      const failures = [];
      setProgress(0, Math.max(queue.length, 1));

      for (let i = 0; i < queue.length; i += 1) {
        const row = queue[i];
        setStatus(`Importazione riga ${i + 1}/${queue.length} · Excel riga ${row.numero_riga}…`, 'working');
        const response = await rpcWithRetry('importa_riga_staging', { p_riga_id: row.id, p_postazione: station() || null }, 5);
        if (response.error || !['importata', 'gia_importata', 'ignorata'].includes(response.data?.status)) {
          failures.push({ row: row.numero_riga, message: response.error?.message || response.data?.messaggio || response.data?.status || 'errore' });
        }
        setProgress(i + 1, queue.length);
        await sleep(120);
      }

      setStatus('Finalizzazione importazione…', 'working');
      const final = await rpcWithRetry('finalizza_importazione_effettiva', { p_importazione_id: id }, 4);
      if (final.error) throw final.error;
      if (final.data?.status === 'importazione_incompleta') {
        throw new Error(`Importazione incompleta: ${final.data.righe_da_importare || 0} righe ancora da importare, ${final.data.righe_da_validare || 0} da verificare.`);
      }
      if (!['completata', 'completata_con_errori'].includes(final.data?.status)) throw new Error(final.data?.status || 'Finalizzazione non riuscita');

      const d = final.data;
      const result = $('importFinalizeResult');
      result.innerHTML = [
        ['Persone nuove', d.persone_nuove],
        ['Persone aggiornate', d.persone_aggiornate],
        ['Tipologie aggiunte', d.tipologie_aggiunte],
        ['Corsi collegati', d.corsi_aggiunti],
        ['Qualifiche collegate', d.qualifiche_aggiunte],
        ['Turni collegati', d.turni_aggiunti],
        ['Righe importate', d.righe_importate],
        ['Righe ignorate', d.righe_ignorate],
        ['Errori', d.righe_errore]
      ].map(([label, value]) => `<div class="ix-result-stat"><small>${esc(label)}</small><strong>${Number(value) || 0}</strong></div>`).join('');
      result.hidden = false;

      setStatus(d.status === 'completata_con_errori' || failures.length ? `Importazione conclusa con alcune anomalie${failures.length ? `. Prima anomalia: riga ${failures[0].row} · ${failures[0].message}` : '.'}` : 'Importazione completata correttamente. I dati sono ora nel gestionale.', d.status === 'completata_con_errori' || failures.length ? 'error' : 'success');
      setProgress(queue.length || 1, queue.length || 1);

      $('importExcelRefresh')?.click();
      setTimeout(() => {
        loadState();
        window.dispatchEvent(new CustomEvent('campo:import-completed', { detail: { importazione_id: id, risultato: d } }));
      }, 500);
    } catch (error) {
      setStatus(`Importazione interrotta: ${error.message}. Puoi riprenderla senza duplicare le righe già consolidate.`, 'error');
    } finally {
      busy = false;
      updateConfirmButton();
      await loadState();
    }
  }

  function scheduleStateRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(loadState, 180);
  }

  async function waitForUi() {
    for (let i = 0; i < 140; i += 1) {
      if ($('importRowsBody') && $('importHistory') && $('importExcelView')) return true;
      await sleep(100);
    }
    return false;
  }

  async function init() {
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data, error: profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo || !['admin', 'segreteria'].includes(data.ruolo)) return;
    profile = data;
    if (!await waitForUi()) return;

    injectStyles();
    injectUi();
    await loadState();

    observer = new MutationObserver(scheduleStateRefresh);
    observer.observe($('importHistory'), { childList: true, subtree: true, characterData: true });
    observer.observe($('importRowsBody'), { childList: true, subtree: true });

    $('importHistory').addEventListener('click', () => setTimeout(loadState, 100));
    $('importExcelRefresh')?.addEventListener('click', () => setTimeout(loadState, 300));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('importFinalizeModal')?.hidden) closeModal(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
