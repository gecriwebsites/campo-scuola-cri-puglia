(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const els = {
    logout: $('logoutButton'), session: $('sessionLabel'), access: $('accessRole'),
    stationBadge: $('stationBadge'), stationName: $('stationName'), onlineStations: $('onlineStations'), onlineBadge: $('onlineBadge'),
    connection: $('connectionState'), systemDot: $('systemDot'), modal: $('stationModal'), form: $('stationForm'), select: $('stationSelect'),
    availability: $('stationAvailability'), message: $('stationMessage'), cancel: $('cancelStationButton'), activate: $('activateStationButton')
  };

  const ALL_STATIONS = [
    'Admin', 'Referente Segreteria',
    'Cucina 1', 'Cucina 2', 'Cucina 3',
    'Segreteria 1', 'Segreteria 2', 'Segreteria 3', 'Segreteria 4', 'Segreteria 5'
  ];
  const STATIONS_BY_ROLE = {
    admin: ['Admin'],
    cucina: ['Cucina 1', 'Cucina 2', 'Cucina 3'],
    segreteria: ['Referente Segreteria', 'Segreteria 1', 'Segreteria 2', 'Segreteria 3', 'Segreteria 4', 'Segreteria 5'],
    sola_lettura: []
  };
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const INSTANCE_STORAGE_KEY = 'campo_scuola_segreteria_instance';

  let client = null;
  let currentSession = null;
  let currentProfile = null;
  let presenceChannel = null;
  let currentStation = null;
  let presenceReady = false;
  let initialPresenceSynced = false;
  let resolveInitialPresence = null;
  let stationChangeInProgress = false;

  const instanceId = (() => {
    let value = sessionStorage.getItem(INSTANCE_STORAGE_KEY);
    if (!value) {
      value = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(INSTANCE_STORAGE_KEY, value);
    }
    return value;
  })();

  const roleLabel = role => ({ admin:'Amministratore', segreteria:'Segreteria', sola_lettura:'Sola lettura', cucina:'Cucina' }[role] || role || 'Segreteria');
  const allowedStations = () => STATIONS_BY_ROLE[currentProfile?.ruolo] || [];
  const presenceEntries = () => presenceChannel ? Object.values(presenceChannel.presenceState()).flat().filter(Boolean) : [];
  const entriesForStation = name => presenceEntries().filter(entry => entry.station_name === name);
  const occupiedByOther = name => entriesForStation(name).some(entry => entry.instance_id !== instanceId);

  function setStationMessage(message = '', type = '') {
    if (!els.message) return;
    els.message.textContent = message;
    els.message.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function setConnectionState(state) {
    if (els.connection) els.connection.textContent = state;
    const online = state === 'Online';
    const waiting = state === 'Connessione…';
    els.systemDot?.classList.toggle('online', online);
    els.systemDot?.classList.toggle('waiting', waiting);
    els.systemDot?.classList.toggle('offline', !online && !waiting);
  }

  async function verifyAuthorization(session) {
    const { data, error } = await client.from('utenti_segreteria').select('nome_visualizzato,ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (error || !data || !data.attivo) {
      await client.auth.signOut({ scope:'local' });
      location.replace('login-segreteria.html');
      return null;
    }
    return data;
  }

  function occupiedStations() {
    const occupied = new Set();
    presenceEntries().forEach(entry => { if (ALL_STATIONS.includes(entry.station_name)) occupied.add(entry.station_name); });
    return occupied;
  }

  function renderStationOptions() {
    if (!els.select) return;
    const stations = allowedStations();
    const previous = els.select.value || currentStation || '';
    els.select.innerHTML = '<option value="">Seleziona…</option>';
    stations.forEach(name => {
      const option = document.createElement('option');
      const occupiedElsewhere = occupiedByOther(name);
      const mine = currentStation === name;
      option.value = name;
      option.disabled = occupiedElsewhere && !mine;
      option.textContent = occupiedElsewhere && !mine ? `${name} — occupata` : mine ? `${name} — questa postazione` : `${name} — disponibile`;
      els.select.appendChild(option);
    });
    if ([...els.select.options].some(option => option.value === previous && !option.disabled)) els.select.value = previous;
    const freeCount = stations.filter(name => !occupiedByOther(name) && name !== currentStation).length;
    if (els.availability) {
      els.availability.textContent = stations.length === 1
        ? (occupiedByOther(stations[0]) ? `${stations[0]} è attualmente occupata da un'altra sessione.` : `${stations[0]} è assegnata automaticamente a questo account.`)
        : (currentStation ? `${freeCount} postazioni disponibili oltre a quella attuale.` : `${freeCount} postazioni disponibili per questo account.`);
    }
  }

  function renderPresence() {
    const occupied = occupiedStations();
    const names = [...occupied].sort((a,b) => a.localeCompare(b,'it'));
    if (els.onlineStations) els.onlineStations.textContent = `${occupied.size}/${ALL_STATIONS.length}`;
    if (els.onlineBadge) els.onlineBadge.title = names.length ? `Online: ${names.join(' · ')}` : 'Nessuna postazione operativa connessa';
    renderStationOptions();
    void validateCurrentStationClaim();
  }

  function openStationModal(message = '') {
    const stations = allowedStations();
    renderStationOptions();
    setStationMessage(message, message ? 'error' : '');
    if (els.cancel) els.cancel.hidden = !currentStation;
    if (els.select) {
      els.select.value = currentStation || '';
      els.select.disabled = stations.length === 1;
      if (stations.length === 1) els.select.value = stations[0];
    }
    if (els.modal) els.modal.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => els.select?.focus(), 30);
  }

  function closeStationModal() {
    if (els.modal) els.modal.hidden = true;
    document.body.classList.remove('modal-open');
    setStationMessage();
  }

  function applyCurrentStation(name) {
    currentStation = name;
    sessionStorage.setItem(STATION_STORAGE_KEY, name);
    if (els.stationName) els.stationName.textContent = name;
    els.stationBadge?.classList.add('active-station');
    window.dispatchEvent(new CustomEvent('campo:station-changed', { detail:{ station:name } }));
  }

  function clearCurrentStation() {
    currentStation = null;
    sessionStorage.removeItem(STATION_STORAGE_KEY);
    if (els.stationName) els.stationName.textContent = 'Da selezionare';
    els.stationBadge?.classList.remove('active-station');
  }

  async function claimStation(name, options = {}) {
    const stations = allowedStations();
    if (!presenceChannel || !presenceReady || !stations.includes(name) || stationChangeInProgress) return false;
    if (occupiedByOther(name)) {
      if (!options.silent) openStationModal(`${name} è già utilizzata da un altro operatore.`);
      return false;
    }
    stationChangeInProgress = true;
    if (els.activate) els.activate.disabled = true;
    setStationMessage('Attivazione postazione…');
    try {
      await presenceChannel.untrack();
      await presenceChannel.track({ station_name:name, instance_id:instanceId, user_id:currentSession.user.id, role:currentProfile?.ruolo || '', claimed_at:new Date().toISOString() });
      applyCurrentStation(name);
      closeStationModal();
      renderPresence();
      setTimeout(() => void validateCurrentStationClaim(), 250);
      return true;
    } catch (_) {
      clearCurrentStation();
      openStationModal('Non è stato possibile attivare la postazione. Riprova.');
      return false;
    } finally {
      stationChangeInProgress = false;
      if (els.activate) els.activate.disabled = false;
    }
  }

  async function validateCurrentStationClaim() {
    if (!currentStation || !presenceChannel || stationChangeInProgress) return;
    if (!allowedStations().includes(currentStation)) {
      clearCurrentStation();
      try { await presenceChannel.untrack(); } catch (_) {}
      await restoreOrSelectStation();
      return;
    }
    const distinct = [...new Set(entriesForStation(currentStation).map(entry => entry.instance_id).filter(Boolean))].sort();
    if (distinct.length <= 1 || distinct[0] === instanceId) return;
    const lost = currentStation;
    clearCurrentStation();
    try { await presenceChannel.untrack(); } catch (_) {}
    openStationModal(`${lost} è stata occupata contemporaneamente da un'altra postazione.`);
    renderPresence();
  }

  async function connectPresence() {
    setConnectionState('Connessione…');
    presenceReady = false;
    initialPresenceSynced = false;
    const initialSync = new Promise(resolve => { resolveInitialPresence = resolve; setTimeout(resolve, 1200); });
    presenceChannel = client.channel('campo-segreteria-presence', { config:{ presence:{ key:instanceId } } });
    presenceChannel
      .on('presence', { event:'sync' }, () => { renderPresence(); if (!initialPresenceSynced) { initialPresenceSynced = true; resolveInitialPresence?.(); } })
      .on('presence', { event:'join' }, renderPresence)
      .on('presence', { event:'leave' }, renderPresence)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { presenceReady = true; setConnectionState('Online'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionState('Da riconnettere');
        else if (status === 'CLOSED') setConnectionState('Offline');
        else setConnectionState('Connessione…');
      });
    const started = Date.now();
    while (!presenceReady && Date.now() - started < 4000) await new Promise(resolve => setTimeout(resolve, 80));
    await initialSync;
    renderPresence();
  }

  async function restoreOrSelectStation() {
    const stations = allowedStations();
    const saved = sessionStorage.getItem(STATION_STORAGE_KEY);
    if (!stations.length) { clearCurrentStation(); openStationModal('A questo account non è associata alcuna postazione operativa.'); return; }
    if (saved && stations.includes(saved) && !occupiedByOther(saved)) {
      if (await claimStation(saved, { silent:true })) return;
    }
    clearCurrentStation();
    if (stations.length === 1) {
      if (occupiedByOther(stations[0])) { openStationModal(`${stations[0]} è già utilizzata da un'altra sessione.`); return; }
      await claimStation(stations[0], { silent:true });
      return;
    }
    openStationModal();
  }

  async function handleLogout() {
    if (els.logout) els.logout.disabled = true;
    try {
      if (presenceChannel) {
        try { await presenceChannel.untrack(); } catch (_) {}
        try { await client.removeChannel(presenceChannel); } catch (_) {}
      }
      sessionStorage.removeItem(STATION_STORAGE_KEY);
      await client.auth.signOut({ scope:'local' });
    } finally { location.replace('login-segreteria.html'); }
  }

  async function init() {
    if (!config?.url || !config?.publishableKey || !window.supabase) { location.replace('login-segreteria.html'); return; }
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session }, error } = await client.auth.getSession();
    if (error || !session) { location.replace('login-segreteria.html'); return; }
    currentSession = session;
    currentProfile = await verifyAuthorization(session);
    if (!currentProfile) return;
    window.CAMPO_RESERVED_PROFILE = currentProfile;
    document.body.dataset.appRole = currentProfile.ruolo || '';
    if (els.access) els.access.textContent = roleLabel(currentProfile.ruolo);
    if (els.session) els.session.textContent = `${currentProfile.nome_visualizzato} · ${session.user.email || 'utente autorizzato'}`;

    const stations = allowedStations();
    if (els.stationBadge) {
      if (stations.length === 1) {
        els.stationBadge.disabled = true;
        els.stationBadge.title = `Postazione assegnata automaticamente: ${stations[0]}`;
      } else {
        els.stationBadge.disabled = false;
        els.stationBadge.title = 'Cambia postazione';
        els.stationBadge.addEventListener('click', () => openStationModal());
      }
    }
    els.logout?.addEventListener('click', handleLogout);
    els.cancel?.addEventListener('click', closeStationModal);
    els.form?.addEventListener('submit', async event => {
      event.preventDefault();
      const selected = els.select?.value || '';
      if (!selected) { setStationMessage('Seleziona una postazione.', 'error'); return; }
      await claimStation(selected);
    });
    window.addEventListener('offline', () => setConnectionState('Offline'));
    window.addEventListener('online', () => { if (currentSession && (!presenceChannel || els.connection?.textContent !== 'Online')) location.reload(); });
    client.auth.onAuthStateChange((event, value) => { if (event === 'SIGNED_OUT' || !value) location.replace('login-segreteria.html'); });
    await connectPresence();
    await restoreOrSelectStation();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

(() => {
  if (document.getElementById('pernottamentiModuleScript')) return;
  const script = document.createElement('script');
  script.id = 'pernottamentiModuleScript';
  script.src = 'assets/js/pernottamenti-segreteria.js?v=3d5b';
  script.defer = true;
  document.head.appendChild(script);
})();