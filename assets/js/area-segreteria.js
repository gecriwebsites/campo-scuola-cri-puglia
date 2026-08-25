(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const logoutButton = document.getElementById('logoutButton');
  const sessionLabel = document.getElementById('sessionLabel');
  const accessRole = document.getElementById('accessRole');
  const stationBadge = document.getElementById('stationBadge');
  const stationName = document.getElementById('stationName');
  const onlineStations = document.getElementById('onlineStations');
  const onlineBadge = document.getElementById('onlineBadge');
  const connectionState = document.getElementById('connectionState');
  const systemDot = document.getElementById('systemDot');
  const stationModal = document.getElementById('stationModal');
  const stationForm = document.getElementById('stationForm');
  const stationSelect = document.getElementById('stationSelect');
  const stationAvailability = document.getElementById('stationAvailability');
  const stationMessage = document.getElementById('stationMessage');
  const cancelStationButton = document.getElementById('cancelStationButton');
  const activateStationButton = document.getElementById('activateStationButton');

  const STATIONS = [
    'Segreteria 1',
    'Segreteria 2',
    'Segreteria 3',
    'Segreteria 4',
    'Segreteria 5'
  ];

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
      value = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(INSTANCE_STORAGE_KEY, value);
    }
    return value;
  })();

  function roleLabel(role) {
    const labels = {
      admin: 'Amministratore',
      segreteria: 'Segreteria',
      sola_lettura: 'Sola lettura',
      cucina: 'Cucina'
    };
    return labels[role] || role || 'Segreteria';
  }

  function setStationMessage(message = '', type = '') {
    stationMessage.textContent = message;
    stationMessage.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function setConnectionState(state) {
    connectionState.textContent = state;
    const online = state === 'Online';
    const waiting = state === 'Connessione…';
    systemDot.classList.toggle('online', online);
    systemDot.classList.toggle('waiting', waiting);
    systemDot.classList.toggle('offline', !online && !waiting);
  }

  async function verifyAuthorization(session) {
    const { data, error } = await client
      .from('utenti_segreteria')
      .select('nome_visualizzato, ruolo, attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data || !data.attivo) {
      await client.auth.signOut();
      location.replace('login-segreteria.html');
      return null;
    }

    return data;
  }

  function presenceEntries() {
    if (!presenceChannel) return [];
    const state = presenceChannel.presenceState();
    return Object.values(state).flat().filter(Boolean);
  }

  function entriesForStation(name) {
    return presenceEntries().filter(entry => entry.station_name === name);
  }

  function occupiedByOther(name) {
    return entriesForStation(name).some(entry => entry.instance_id !== instanceId);
  }

  function occupiedStations() {
    const occupied = new Set();
    presenceEntries().forEach(entry => {
      if (STATIONS.includes(entry.station_name)) occupied.add(entry.station_name);
    });
    return occupied;
  }

  function renderPresence() {
    const occupied = occupiedStations();
    const names = [...occupied].sort((a, b) => a.localeCompare(b, 'it'));
    onlineStations.textContent = `${occupied.size}/5`;
    onlineBadge.title = names.length
      ? `Online: ${names.join(' · ')}`
      : 'Nessuna postazione operativa connessa';
    renderStationOptions();
    validateCurrentStationClaim();
  }

  function renderStationOptions() {
    if (!stationSelect) return;

    const previousValue = stationSelect.value || currentStation || '';
    stationSelect.innerHTML = '<option value="">Seleziona…</option>';

    STATIONS.forEach(name => {
      const option = document.createElement('option');
      option.value = name;

      const occupiedElsewhere = occupiedByOther(name);
      const mine = currentStation === name;

      option.disabled = occupiedElsewhere && !mine;
      option.textContent = occupiedElsewhere && !mine
        ? `${name} — occupata`
        : mine
          ? `${name} — questa postazione`
          : `${name} — disponibile`;

      stationSelect.appendChild(option);
    });

    if ([...stationSelect.options].some(option => option.value === previousValue && !option.disabled)) {
      stationSelect.value = previousValue;
    }

    const freeCount = STATIONS.filter(name => !occupiedByOther(name) && name !== currentStation).length;
    stationAvailability.textContent = currentStation
      ? `${freeCount} postazioni libere oltre a quella attuale.`
      : `${freeCount} postazioni disponibili su 5.`;
  }

  function openStationModal(message = '') {
    renderStationOptions();
    setStationMessage(message, message ? 'error' : '');
    cancelStationButton.hidden = !currentStation;
    stationSelect.value = currentStation || '';
    stationModal.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => stationSelect.focus(), 30);
  }

  function closeStationModal() {
    stationModal.hidden = true;
    document.body.classList.remove('modal-open');
    setStationMessage();
  }

  function applyCurrentStation(name) {
    currentStation = name;
    sessionStorage.setItem(STATION_STORAGE_KEY, name);
    stationName.textContent = name;
    stationBadge.classList.add('active-station');
  }

  function clearCurrentStation() {
    currentStation = null;
    sessionStorage.removeItem(STATION_STORAGE_KEY);
    stationName.textContent = 'Da selezionare';
    stationBadge.classList.remove('active-station');
  }

  async function claimStation(name, options = {}) {
    if (!presenceChannel || !presenceReady || !STATIONS.includes(name) || stationChangeInProgress) return false;

    if (occupiedByOther(name)) {
      if (!options.silent) openStationModal(`${name} è già utilizzata da un altro operatore.`);
      return false;
    }

    stationChangeInProgress = true;
    activateStationButton.disabled = true;
    setStationMessage('Attivazione postazione…');

    try {
      await presenceChannel.untrack();
      await presenceChannel.track({
        station_name: name,
        instance_id: instanceId,
        user_id: currentSession.user.id,
        claimed_at: new Date().toISOString()
      });

      applyCurrentStation(name);
      closeStationModal();
      renderPresence();

      window.setTimeout(() => validateCurrentStationClaim(), 250);
      return true;
    } catch (_) {
      clearCurrentStation();
      openStationModal('Non è stato possibile attivare la postazione. Riprova.');
      return false;
    } finally {
      stationChangeInProgress = false;
      activateStationButton.disabled = false;
    }
  }

  async function validateCurrentStationClaim() {
    if (!currentStation || !presenceChannel || stationChangeInProgress) return;

    const entries = entriesForStation(currentStation);
    const distinctInstances = [...new Set(entries.map(entry => entry.instance_id).filter(Boolean))].sort();

    if (distinctInstances.length <= 1) return;

    const winner = distinctInstances[0];
    if (winner === instanceId) return;

    const lostStation = currentStation;
    clearCurrentStation();
    try { await presenceChannel.untrack(); } catch (_) {}
    openStationModal(`${lostStation} è stata occupata contemporaneamente da un'altra postazione. Selezionane una libera.`);
    renderPresence();
  }

  async function connectPresence() {
    setConnectionState('Connessione…');
    presenceReady = false;
    initialPresenceSynced = false;

    const initialSync = new Promise(resolve => {
      resolveInitialPresence = resolve;
      window.setTimeout(resolve, 1200);
    });

    presenceChannel = client.channel('campo-segreteria-presence', {
      config: {
        presence: { key: instanceId }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        renderPresence();
        if (!initialPresenceSynced) {
          initialPresenceSynced = true;
          resolveInitialPresence?.();
        }
      })
      .on('presence', { event: 'join' }, renderPresence)
      .on('presence', { event: 'leave' }, renderPresence)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          presenceReady = true;
          setConnectionState('Online');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('Da riconnettere');
        } else if (status === 'CLOSED') {
          setConnectionState('Offline');
        } else {
          setConnectionState('Connessione…');
        }
      });

    const startedAt = Date.now();
    while (!presenceReady && Date.now() - startedAt < 4000) {
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    await initialSync;
    renderPresence();
  }

  async function restoreOrSelectStation() {
    const savedStation = sessionStorage.getItem(STATION_STORAGE_KEY);

    if (savedStation && STATIONS.includes(savedStation) && !occupiedByOther(savedStation)) {
      const restored = await claimStation(savedStation, { silent: true });
      if (restored) return;
    }

    clearCurrentStation();
    openStationModal();
  }

  async function handleLogout() {
    logoutButton.disabled = true;

    try {
      if (presenceChannel) {
        try { await presenceChannel.untrack(); } catch (_) {}
        try { await client.removeChannel(presenceChannel); } catch (_) {}
      }
      sessionStorage.removeItem(STATION_STORAGE_KEY);
      await client.auth.signOut();
    } finally {
      location.replace('login-segreteria.html');
    }
  }

  async function init() {
    if (!config || !config.url || !config.publishableKey || !window.supabase) {
      location.replace('login-segreteria.html');
      return;
    }

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) {
      location.replace('login-segreteria.html');
      return;
    }

    currentSession = session;
    currentProfile = await verifyAuthorization(session);
    if (!currentProfile) return;

    accessRole.textContent = roleLabel(currentProfile.ruolo);
    sessionLabel.textContent = `${currentProfile.nome_visualizzato} · ${session.user.email || 'utente autorizzato'}`;

    logoutButton.addEventListener('click', handleLogout);
    stationBadge.addEventListener('click', () => openStationModal());
    cancelStationButton.addEventListener('click', closeStationModal);

    stationForm.addEventListener('submit', async event => {
      event.preventDefault();
      const selected = stationSelect.value;
      if (!selected) {
        setStationMessage('Seleziona una postazione.', 'error');
        return;
      }
      await claimStation(selected);
    });

    window.addEventListener('offline', () => setConnectionState('Offline'));
    window.addEventListener('online', () => {
      if (currentSession && (!presenceChannel || connectionState.textContent !== 'Online')) {
        location.reload();
      }
    });

    client.auth.onAuthStateChange((event, sessionValue) => {
      if (event === 'SIGNED_OUT' || !sessionValue) location.replace('login-segreteria.html');
    });

    await connectPresence();
    await restoreOrSelectStation();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
