(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  const els = {
    workspace: $('kitchenWorkspace'), date: $('kitchenDate'), refresh: $('kitchenRefresh'), realtime: $('kitchenRealtimeState'), search: $('kitchenSearch'), searchResults: $('kitchenSearchResults'), scan: $('kitchenScanButton'),
    personPanel: $('kitchenPersonPanel'), personName: $('kitchenPersonName'), personBadge: $('kitchenPersonBadge'), dietary: $('kitchenDietary'), tickets: $('kitchenTickets'),
    breakfastExpected: $('breakfastExpected'), breakfastUsed: $('breakfastUsed'), breakfastRemaining: $('breakfastRemaining'), lunchExpected: $('lunchExpected'), lunchUsed: $('lunchUsed'), lunchRemaining: $('lunchRemaining'), dinnerExpected: $('dinnerExpected'), dinnerUsed: $('dinnerUsed'), dinnerRemaining: $('dinnerRemaining'), toast: $('toast')
  };

  let client = null, session = null, currentPersonId = null, realtimeChannel = null, searchTimer = null, reloadTimer = null, toastTimer = null;
  const mealLabels = { colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena' };

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char])); }
  function todayRome() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function formatDateTime(value) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); }
  function getStation() { return sessionStorage.getItem(STATION_STORAGE_KEY) || 'Cucina'; }

  function showToast(message, type = '') {
    clearTimeout(toastTimer); els.toast.textContent = message; els.toast.className = `toast${type ? ` ${type}` : ''}`; els.toast.hidden = false; toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3300);
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function resetMealCounters() {
    ['breakfastExpected','breakfastUsed','breakfastRemaining','lunchExpected','lunchUsed','lunchRemaining','dinnerExpected','dinnerUsed','dinnerRemaining'].forEach(key => { if (els[key]) els[key].textContent = '0'; });
  }

  function applyMealCounter(tipo, row) {
    const map = { colazione: ['breakfastExpected','breakfastUsed','breakfastRemaining'], pranzo: ['lunchExpected','lunchUsed','lunchRemaining'], cena: ['dinnerExpected','dinnerUsed','dinnerRemaining'] };
    const ids = map[tipo]; if (!ids) return; els[ids[0]].textContent = String(row.previsti ?? 0); els[ids[1]].textContent = String(row.consumati ?? 0); els[ids[2]].textContent = String(row.restanti ?? 0);
  }

  async function loadDashboard() {
    resetMealCounters();
    const { data, error } = await client.rpc('cucina_dashboard', { p_data: els.date.value || null });
    if (error) { showToast(`Dashboard pasti non disponibile: ${error.message}`, 'error'); return; }
    (data || []).forEach(row => applyMealCounter(row.tipo, row));
  }

  function renderSearchResults(rows) {
    els.searchResults.innerHTML = (rows || []).map(person => `<button class="kitchen-search-result" type="button" data-kitchen-person="${person.persona_id}"><span><strong>${escapeHtml(`${person.nome} ${person.cognome}`)}</strong><small>${person.numero_badge ? `Badge ${escapeHtml(person.numero_badge)}` : 'Nessun badge associato'}</small></span>${person.esigenza_alimentare ? '<span class="dietary-mini">⚠ Esigenza alimentare</span>' : '<span class="muted-mini">Apri</span>'}</button>`).join('') || '<div class="kitchen-search-empty">Nessun risultato.</div>';
  }

  async function searchPeople() {
    const query = els.search.value.trim(); if (query.length < 2) { els.searchResults.innerHTML = ''; return; }
    const { data, error } = await client.rpc('cucina_cerca_persone', { p_query: query });
    if (error) { showToast(`Ricerca non disponibile: ${error.message}`, 'error'); return; }
    renderSearchResults(data || []);
  }

  function normalizeTicketRows(data) {
    const map = new Map(); (data?.ticket || []).forEach(ticket => map.set(ticket.tipo, ticket));
    return ['colazione', 'pranzo', 'cena'].map(tipo => map.get(tipo) || { tipo, ticket_id: null, stato: 'servizio_non_attivo', consumato_at: null, consumato_postazione: null });
  }

  function ticketStateText(ticket) {
    switch (ticket.stato) { case 'disponibile': return 'Disponibile'; case 'utilizzato': return 'Utilizzato'; case 'non_previsto': return 'Non previsto'; case 'non_disponibile': return 'Non disponibile'; default: return 'Servizio non attivo'; }
  }

  function renderPerson(data) {
    currentPersonId = data?.persona_id || null;
    if (!data || data.status !== 'ok') { els.personPanel.hidden = true; return; }
    els.personName.textContent = `${data.nome || ''} ${data.cognome || ''}`.trim();
    els.personBadge.textContent = data.numero_badge ? `Badge ${data.numero_badge}` : 'Nessun badge associato';
    if (data.esigenza_alimentare) { els.dietary.hidden = false; els.dietary.innerHTML = `<strong>⚠ Esigenza alimentare</strong><span>${escapeHtml(data.esigenza_alimentare_descrizione || 'Segnalazione presente')}</span>`; }
    else { els.dietary.hidden = true; els.dietary.innerHTML = ''; }

    els.tickets.innerHTML = normalizeTicketRows(data).map(ticket => {
      const tipo = ticket.tipo, available = ticket.stato === 'disponibile', used = ticket.stato === 'utilizzato';
      const detail = used && ticket.consumato_at ? `Utilizzato ${formatDateTime(ticket.consumato_at)}${ticket.consumato_postazione ? ` · ${escapeHtml(ticket.consumato_postazione)}` : ''}` : ticketStateText(ticket);
      return `<article class="meal-ticket ${tipo} ${used ? 'used' : ''}"><div class="meal-ticket-icon">🎫</div><div class="meal-ticket-copy"><small>Ticket</small><strong>${mealLabels[tipo]}</strong><span>${detail}</span></div><button class="meal-use-button" type="button" data-consume-meal="${tipo}" ${available ? '' : 'disabled'}>${available ? 'Usa ticket' : ticketStateText(ticket)}</button></article>`;
    }).join('');
    els.personPanel.hidden = false;
  }

  async function loadPerson(personId) {
    const { data, error } = await client.rpc('cucina_leggi_persona', { p_persona_id: personId, p_data: els.date.value || null });
    if (error) { showToast(`Scheda pasto non disponibile: ${error.message}`, 'error'); return; }
    renderPerson(data);
  }

  async function readQr(token) {
    const uuid = String(token || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) { showToast('QR non riconosciuto.', 'error'); return; }
    const { data, error } = await client.rpc('cucina_leggi_qr', { p_qr_token: uuid, p_data: els.date.value || null });
    if (error) { showToast(`QR non leggibile: ${error.message}`, 'error'); return; }
    if (!data || data.status !== 'ok') { showToast('QR non valido o disattivato.', 'error'); return; }
    els.search.value = `${data.nome || ''} ${data.cognome || ''}`.trim(); els.searchResults.innerHTML = ''; renderPerson(data);
  }

  async function consumeMeal(tipo) {
    if (!currentPersonId) return;
    const button = els.tickets.querySelector(`[data-consume-meal="${tipo}"]`); if (button) button.disabled = true;
    const { data, error } = await client.rpc('cucina_consuma_ticket_persona', { p_persona_id: currentPersonId, p_tipo: tipo, p_data: els.date.value || null, p_postazione: getStation() });
    if (error) showToast(`Consumo non registrato: ${error.message}`, 'error');
    else if (data?.status === 'consumato') showToast(`${mealLabels[tipo]} registrato.`, 'success');
    else if (data?.status === 'gia_utilizzato') showToast(`${mealLabels[tipo]} già utilizzato${data.consumato_at ? ` alle ${formatDateTime(data.consumato_at)}` : ''}.`, 'error');
    else if (data?.status === 'non_previsto') showToast(`${mealLabels[tipo]} non previsto per questa persona.`, 'error');
    else showToast(`${mealLabels[tipo]} non disponibile.`, 'error');
    await loadDashboard(); await loadPerson(currentPersonId);
  }

  function scheduleReload() { clearTimeout(reloadTimer); reloadTimer = setTimeout(async () => { await loadDashboard(); if (currentPersonId) await loadPerson(currentPersonId); }, 180); }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-cucina-db');
    ['persone_pasti', 'servizi_pasto', 'cucina_persone', 'movimenti_ticket_pasti'].forEach(table => realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload));
    realtimeChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') { els.realtime.textContent = '● Realtime collegato'; els.realtime.className = 'kitchen-realtime online'; }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { els.realtime.textContent = 'Realtime da riconnettere'; els.realtime.className = 'kitchen-realtime warning'; }
    });
  }

  function bindEvents() {
    els.date.addEventListener('change', async () => { await loadDashboard(); if (currentPersonId) await loadPerson(currentPersonId); });
    els.refresh.addEventListener('click', scheduleReload);
    els.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchPeople, 180); });
    els.searchResults.addEventListener('click', event => { const button = event.target.closest('[data-kitchen-person]'); if (button) loadPerson(button.dataset.kitchenPerson); });
    els.tickets.addEventListener('click', event => { const button = event.target.closest('[data-consume-meal]'); if (button && !button.disabled) consumeMeal(button.dataset.consumeMeal); });
    els.scan.addEventListener('click', async () => { try { await window.CampoQrScanner.open({ title: 'Scansiona QR per i pasti', subtitle: 'Inquadra il QR personale per visualizzare i ticket del giorno.', onScan: readQr }); } catch (error) { showToast(error.message, 'error'); } });
  }

  async function waitForStation() {
    for (let i = 0; i < 120; i += 1) { if (getStation() === 'Cucina') return true; await new Promise(resolve => setTimeout(resolve, 100)); }
    return false;
  }

  async function init() {
    if (!config || !window.supabase || !els.workspace) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession(); if (error || !currentSession) return; session = currentSession;
    const profile = await getProfile(); if (profile?.ruolo !== 'cucina') return;

    els.workspace.hidden = false;
    const title = document.getElementById('reservedAreaTitle'); if (title) title.textContent = 'Area Cucina';
    els.date.value = todayRome(); bindEvents();
    const stationReady = await waitForStation(); if (!stationReady) { showToast('Postazione Cucina non disponibile.', 'error'); return; }
    connectRealtime(); await loadDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let session = null;
  let loadedPersonId = null;
  let rowExists = false;
  let saveTimer = null;
  let realtimeChannel = null;
  let localSaveInProgress = false;

  function injectStyles() {
    if ($('dietaryEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'dietaryEditorStyles';
    style.textContent = `
      .dietary-editor{border:1px solid #ead6a7;background:#fffaf0;border-radius:14px;padding:14px;margin-bottom:14px}
      .dietary-editor .switch-row{margin:0}
      .dietary-details{display:block;margin-top:12px;font-size:13px;font-weight:800;color:var(--ink)}
      .dietary-details[hidden]{display:none}
      .dietary-details textarea{margin-top:7px;min-height:82px;width:100%;resize:vertical}
      .dietary-save-state{min-height:18px;margin-top:8px;font-size:12px;font-weight:750;color:var(--muted)}
      .dietary-save-state.saving{color:#8b6100}.dietary-save-state.saved{color:#16794f}.dietary-save-state.error{color:#b00020}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if ($('personDietaryPresent')) return;
    const form = $('personForm');
    if (!form) return;
    const titles = [...form.querySelectorAll('.form-section-title')];
    const iceTitle = titles.find(node => node.textContent.trim().toLowerCase() === 'contatto ice');
    const iceGrid = iceTitle?.nextElementSibling;
    if (!iceGrid) return;

    const fragment = document.createElement('div');
    fragment.innerHTML = `
      <div class="form-section-title" id="personDietaryTitle">Esigenze alimentari</div>
      <div class="dietary-editor" id="personDietaryEditor">
        <label class="switch-row">
          <input id="personDietaryPresent" type="checkbox">
          <span><b>Allergie / intolleranze alimentari</b><small>Segnalazione operativa condivisa con la Cucina</small></span>
        </label>
        <label id="personDietaryDetailsWrap" class="dietary-details" hidden>
          Dettaglio dell'esigenza
          <textarea id="personDietaryDescription" class="field-textarea" rows="3" placeholder="Es. celiachia, allergia alla frutta a guscio, intolleranza al lattosio…"></textarea>
        </label>
        <div id="personDietarySaveState" class="dietary-save-state" aria-live="polite"></div>
      </div>`;

    const nodes = [...fragment.childNodes];
    iceGrid.after(...nodes);
  }

  function setState(message = '', type = '') {
    const el = $('personDietarySaveState');
    if (!el) return;
    el.textContent = message;
    el.className = `dietary-save-state${type ? ` ${type}` : ''}`;
  }

  function refreshDetailsVisibility() {
    const present = $('personDietaryPresent');
    const wrap = $('personDietaryDetailsWrap');
    const description = $('personDietaryDescription');
    if (!present || !wrap || !description) return;
    wrap.hidden = !present.checked;
    description.disabled = !present.checked;
    if (!present.checked) description.value = '';
  }

  function currentPersonId() {
    return String($('personId')?.value || '').trim() || null;
  }

  async function loadDietaryForCurrentPerson() {
    const personId = currentPersonId();
    if (!personId || $('personModal')?.hidden) return;
    loadedPersonId = personId;
    rowExists = false;
    setState('Caricamento…');

    const { data, error } = await client
      .from('esigenze_alimentari')
      .select('persona_id,presente,descrizione')
      .eq('persona_id', personId)
      .maybeSingle();

    if (loadedPersonId !== personId) return;
    if (error) {
      setState(`Impossibile leggere la segnalazione: ${error.message}`, 'error');
      return;
    }

    rowExists = !!data;
    $('personDietaryPresent').checked = !!data?.presente;
    $('personDietaryDescription').value = data?.descrizione || '';
    refreshDetailsVisibility();
    setState(data?.presente ? 'Segnalazione attiva · sincronizzata con Cucina' : 'Nessuna esigenza alimentare segnalata');
  }

  async function saveDietary() {
    clearTimeout(saveTimer);
    const personId = currentPersonId();
    if (!personId || personId !== loadedPersonId || $('personModal')?.hidden) return;

    const present = !!$('personDietaryPresent')?.checked;
    const description = present ? (String($('personDietaryDescription')?.value || '').trim() || null) : null;

    if (!rowExists && !present) {
      setState('Nessuna esigenza alimentare segnalata');
      return;
    }

    localSaveInProgress = true;
    setState('Salvataggio…', 'saving');

    let result;
    if (rowExists) {
      result = await client
        .from('esigenze_alimentari')
        .update({ presente: present, descrizione: description })
        .eq('persona_id', personId);
    } else {
      result = await client
        .from('esigenze_alimentari')
        .insert({ persona_id: personId, presente: present, descrizione: description });
    }

    localSaveInProgress = false;
    if (result.error) {
      setState(`Salvataggio non riuscito: ${result.error.message}`, 'error');
      return;
    }

    rowExists = true;
    setState(present ? 'Salvato · disponibile anche alla Cucina' : 'Salvato · nessuna esigenza alimentare', 'saved');
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDietary, 650);
  }

  function bindUi() {
    $('personDietaryPresent')?.addEventListener('change', async () => {
      refreshDetailsVisibility();
      await saveDietary();
    });
    $('personDietaryDescription')?.addEventListener('input', scheduleSave);
    $('personDietaryDescription')?.addEventListener('blur', saveDietary);
    $('personForm')?.addEventListener('submit', () => { if (currentPersonId() === loadedPersonId) void saveDietary(); });

    const modal = $('personModal');
    if (modal) {
      const observer = new MutationObserver(() => {
        if (!modal.hidden) setTimeout(loadDietaryForCurrentPerson, 0);
        else { clearTimeout(saveTimer); loadedPersonId = null; rowExists = false; }
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-segreteria-dietary');
    realtimeChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esigenze_alimentari' }, payload => {
        const personId = payload.new?.persona_id || payload.old?.persona_id;
        if (!localSaveInProgress && personId && personId === loadedPersonId && !$('personModal')?.hidden) {
          loadDietaryForCurrentPerson();
        }
      })
      .subscribe();
  }

  async function init() {
    if (!config || !window.supabase || !$('personForm')) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;

    const { data: profile, error: profileError } = await client
      .from('utenti_segreteria')
      .select('ruolo,attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileError || !profile?.attivo || !['admin', 'segreteria'].includes(profile.ruolo)) return;

    injectStyles();
    injectUi();
    bindUi();
    connectRealtime();
    if (!$('personModal')?.hidden) await loadDietaryForCurrentPerson();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
