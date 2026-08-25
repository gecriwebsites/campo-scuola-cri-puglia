(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  const els = {
    workspace: $('kitchenWorkspace'),
    date: $('kitchenDate'),
    refresh: $('kitchenRefresh'),
    realtime: $('kitchenRealtimeState'),
    search: $('kitchenSearch'),
    searchResults: $('kitchenSearchResults'),
    scan: $('kitchenScanButton'),
    personPanel: $('kitchenPersonPanel'),
    personName: $('kitchenPersonName'),
    personBadge: $('kitchenPersonBadge'),
    dietary: $('kitchenDietary'),
    tickets: $('kitchenTickets'),
    breakfastExpected: $('breakfastExpected'),
    breakfastUsed: $('breakfastUsed'),
    breakfastRemaining: $('breakfastRemaining'),
    lunchExpected: $('lunchExpected'),
    lunchUsed: $('lunchUsed'),
    lunchRemaining: $('lunchRemaining'),
    dinnerExpected: $('dinnerExpected'),
    dinnerUsed: $('dinnerUsed'),
    dinnerRemaining: $('dinnerRemaining'),
    toast: $('toast')
  };

  let client = null;
  let session = null;
  let role = null;
  let currentPersonId = null;
  let currentPersonData = null;
  let realtimeChannel = null;
  let searchTimer = null;
  let reloadTimer = null;
  let toastTimer = null;

  const mealLabels = { colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function todayRome() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function showToast(message, type = '') {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast${type ? ` ${type}` : ''}`;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3300);
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || 'Cucina';
  }

  async function getProfile() {
    const { data, error } = await client
      .from('utenti_segreteria')
      .select('ruolo,attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error || !data || !data.attivo) return null;
    return data;
  }

  function resetMealCounters() {
    ['breakfastExpected','breakfastUsed','breakfastRemaining','lunchExpected','lunchUsed','lunchRemaining','dinnerExpected','dinnerUsed','dinnerRemaining']
      .forEach(key => { if (els[key]) els[key].textContent = '0'; });
  }

  function applyMealCounter(tipo, row) {
    const map = {
      colazione: ['breakfastExpected','breakfastUsed','breakfastRemaining'],
      pranzo: ['lunchExpected','lunchUsed','lunchRemaining'],
      cena: ['dinnerExpected','dinnerUsed','dinnerRemaining']
    };
    const ids = map[tipo];
    if (!ids) return;
    els[ids[0]].textContent = String(row.previsti ?? 0);
    els[ids[1]].textContent = String(row.consumati ?? 0);
    els[ids[2]].textContent = String(row.restanti ?? 0);
  }

  async function loadDashboard() {
    resetMealCounters();
    const { data, error } = await client.rpc('cucina_dashboard', { p_data: els.date.value || null });
    if (error) {
      showToast(`Dashboard pasti non disponibile: ${error.message}`, 'error');
      return;
    }
    (data || []).forEach(row => applyMealCounter(row.tipo, row));
  }

  function renderSearchResults(rows) {
    els.searchResults.innerHTML = (rows || []).map(person => `
      <button class="kitchen-search-result" type="button" data-kitchen-person="${person.persona_id}">
        <span><strong>${escapeHtml(`${person.nome} ${person.cognome}`)}</strong><small>${person.numero_badge ? `Badge ${escapeHtml(person.numero_badge)}` : 'Nessun badge associato'}</small></span>
        ${person.esigenza_alimentare ? '<span class="dietary-mini">⚠ Esigenza alimentare</span>' : '<span class="muted-mini">Apri</span>'}
      </button>
    `).join('') || '<div class="kitchen-search-empty">Nessun risultato.</div>';
  }

  async function searchPeople() {
    const query = els.search.value.trim();
    if (query.length < 2) {
      els.searchResults.innerHTML = '';
      return;
    }
    const { data, error } = await client.rpc('cucina_cerca_persone', { p_query: query });
    if (error) {
      showToast(`Ricerca non disponibile: ${error.message}`, 'error');
      return;
    }
    renderSearchResults(data || []);
  }

  function normalizeTicketRows(data) {
    const map = new Map();
    (data?.ticket || []).forEach(ticket => map.set(ticket.tipo, ticket));
    return ['colazione', 'pranzo', 'cena'].map(tipo => map.get(tipo) || {
      tipo, ticket_id: null, stato: 'servizio_non_attivo', consumato_at: null, consumato_postazione: null
    });
  }

  function ticketStateText(ticket) {
    switch (ticket.stato) {
      case 'disponibile': return 'Disponibile';
      case 'utilizzato': return 'Utilizzato';
      case 'non_previsto': return 'Non previsto';
      case 'non_disponibile': return 'Non disponibile';
      default: return 'Servizio non attivo';
    }
  }

  function renderPerson(data) {
    currentPersonData = data;
    currentPersonId = data?.persona_id || null;
    if (!data || data.status !== 'ok') {
      els.personPanel.hidden = true;
      return;
    }

    els.personName.textContent = `${data.nome || ''} ${data.cognome || ''}`.trim();
    els.personBadge.textContent = data.numero_badge ? `Badge ${data.numero_badge}` : 'Nessun badge associato';

    if (data.esigenza_alimentare) {
      els.dietary.hidden = false;
      els.dietary.innerHTML = `<strong>⚠ Esigenza alimentare</strong><span>${escapeHtml(data.esigenza_alimentare_descrizione || 'Segnalazione presente')}</span>`;
    } else {
      els.dietary.hidden = true;
      els.dietary.innerHTML = '';
    }

    els.tickets.innerHTML = normalizeTicketRows(data).map(ticket => {
      const tipo = ticket.tipo;
      const available = ticket.stato === 'disponibile';
      const used = ticket.stato === 'utilizzato';
      const detail = used && ticket.consumato_at
        ? `Utilizzato ${formatDateTime(ticket.consumato_at)}${ticket.consumato_postazione ? ` · ${escapeHtml(ticket.consumato_postazione)}` : ''}`
        : ticketStateText(ticket);
      return `
        <article class="meal-ticket ${tipo} ${used ? 'used' : ''}">
          <div class="meal-ticket-icon">🎫</div>
          <div class="meal-ticket-copy">
            <small>Ticket</small>
            <strong>${mealLabels[tipo]}</strong>
            <span>${detail}</span>
          </div>
          <button class="meal-use-button" type="button" data-consume-meal="${tipo}" ${available ? '' : 'disabled'}>
            ${available ? 'Usa ticket' : ticketStateText(ticket)}
          </button>
        </article>`;
    }).join('');

    els.personPanel.hidden = false;
  }

  async function loadPerson(personId) {
    const { data, error } = await client.rpc('cucina_leggi_persona', {
      p_persona_id: personId,
      p_data: els.date.value || null
    });
    if (error) {
      showToast(`Scheda pasto non disponibile: ${error.message}`, 'error');
      return;
    }
    renderPerson(data);
  }

  async function readQr(token) {
    const uuid = String(token || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
      showToast('QR non riconosciuto.', 'error');
      return;
    }

    const { data, error } = await client.rpc('cucina_leggi_qr', {
      p_qr_token: uuid,
      p_data: els.date.value || null
    });
    if (error) {
      showToast(`QR non leggibile: ${error.message}`, 'error');
      return;
    }
    if (!data || data.status !== 'ok') {
      showToast('QR non valido o disattivato.', 'error');
      return;
    }
    els.search.value = `${data.nome || ''} ${data.cognome || ''}`.trim();
    els.searchResults.innerHTML = '';
    renderPerson(data);
  }

  async function consumeMeal(tipo) {
    if (!currentPersonId) return;
    const button = els.tickets.querySelector(`[data-consume-meal="${tipo}"]`);
    if (button) button.disabled = true;

    const { data, error } = await client.rpc('cucina_consuma_ticket_persona', {
      p_persona_id: currentPersonId,
      p_tipo: tipo,
      p_data: els.date.value || null,
      p_postazione: getStation()
    });

    if (error) {
      showToast(`Consumo non registrato: ${error.message}`, 'error');
    } else if (data?.status === 'consumato') {
      showToast(`${mealLabels[tipo]} registrato.`, 'success');
    } else if (data?.status === 'gia_utilizzato') {
      showToast(`${mealLabels[tipo]} già utilizzato${data.consumato_at ? ` alle ${formatDateTime(data.consumato_at)}` : ''}.`, 'error');
    } else if (data?.status === 'non_previsto') {
      showToast(`${mealLabels[tipo]} non previsto per questa persona.`, 'error');
    } else {
      showToast(`${mealLabels[tipo]} non disponibile.`, 'error');
    }

    await loadDashboard();
    await loadPerson(currentPersonId);
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      await loadDashboard();
      if (currentPersonId) await loadPerson(currentPersonId);
    }, 180);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-cucina-db');
    ['persone_pasti', 'servizi_pasto', 'cucina_persone', 'movimenti_ticket_pasti'].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    });
    realtimeChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        els.realtime.textContent = '● Realtime collegato';
        els.realtime.className = 'kitchen-realtime online';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        els.realtime.textContent = 'Realtime da riconnettere';
        els.realtime.className = 'kitchen-realtime warning';
      }
    });
  }

  function bindEvents() {
    els.date.addEventListener('change', async () => {
      await loadDashboard();
      if (currentPersonId) await loadPerson(currentPersonId);
    });
    els.refresh.addEventListener('click', scheduleReload);
    els.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(searchPeople, 180);
    });
    els.searchResults.addEventListener('click', event => {
      const button = event.target.closest('[data-kitchen-person]');
      if (button) loadPerson(button.dataset.kitchenPerson);
    });
    els.tickets.addEventListener('click', event => {
      const button = event.target.closest('[data-consume-meal]');
      if (button && !button.disabled) consumeMeal(button.dataset.consumeMeal);
    });
    els.scan.addEventListener('click', async () => {
      try {
        await window.CampoQrScanner.open({
          title: 'Scansiona QR per i pasti',
          subtitle: 'Inquadra il QR personale per visualizzare i ticket del giorno.',
          onScan: readQr
        });
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  async function waitForStation() {
    for (let i = 0; i < 120; i += 1) {
      if (getStation() === 'Cucina') return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async function init() {
    if (!config || !window.supabase || !els.workspace) return;

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });

    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;

    const profile = await getProfile();
    role = profile?.ruolo || null;
    if (role !== 'cucina') return;

    els.date.value = todayRome();
    bindEvents();
    const stationReady = await waitForStation();
    if (!stationReady) {
      showToast('Postazione Cucina non disponibile.', 'error');
      return;
    }

    connectRealtime();
    await loadDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
