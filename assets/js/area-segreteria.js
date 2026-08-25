(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const authView = document.getElementById('authView');
  const appView = document.getElementById('appView');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginButton = document.getElementById('loginButton');
  const loginMessage = document.getElementById('loginMessage');
  const togglePassword = document.getElementById('togglePassword');
  const logoutButton = document.getElementById('logoutButton');
  const sessionLabel = document.getElementById('sessionLabel');
  const accessRole = document.getElementById('accessRole');
  const stationSetup = document.getElementById('stationSetup');
  const stationForm = document.getElementById('stationForm');
  const stationNameInput = document.getElementById('stationNameInput');
  const stationName = document.getElementById('stationName');
  const changeStationButton = document.getElementById('changeStationButton');
  const dashboardContent = document.getElementById('dashboardContent');
  const onlineStations = document.getElementById('onlineStations');
  const onlineStationsDetail = document.getElementById('onlineStationsDetail');
  const connectionState = document.getElementById('connectionState');

  let client = null;
  let currentSession = null;
  let currentProfile = null;
  let presenceChannel = null;
  let presenceKey = null;

  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';

  function setMessage(message = '', type = '') {
    loginMessage.textContent = message;
    loginMessage.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function setLoginBusy(busy) {
    loginButton.disabled = busy;
    loginButton.textContent = busy ? 'Accesso in corso…' : "Accedi all'Area Segreteria";
  }

  function setConnectionState(state, detail) {
    connectionState.textContent = state;
    connectionState.classList.toggle('connection-ok', state === 'Online');
    connectionState.classList.toggle('connection-warn', state !== 'Online');
    if (detail) onlineStationsDetail.textContent = detail;
  }

  function roleLabel(role) {
    const labels = {
      admin: 'Amministratore',
      segreteria: 'Segreteria',
      sola_lettura: 'Sola lettura',
      cucina: 'Cucina'
    };
    return labels[role] || role || 'Segreteria';
  }

  async function verifyAuthorization(session) {
    const { data, error } = await client
      .from('utenti_segreteria')
      .select('nome_visualizzato, ruolo, attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data || !data.attivo) {
      await client.auth.signOut();
      throw new Error('Questo account non è autorizzato ad accedere all’Area Segreteria.');
    }

    return data;
  }

  async function showAuthenticatedArea(session) {
    currentSession = session;

    try {
      currentProfile = await verifyAuthorization(session);
    } catch (error) {
      showLogin(error.message);
      return;
    }

    authView.hidden = true;
    appView.hidden = false;
    sessionLabel.textContent = `${currentProfile.nome_visualizzato} · ${session.user.email || 'utente autorizzato'}`;
    accessRole.textContent = roleLabel(currentProfile.ruolo);

    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    if (savedStation) {
      await activateStation(savedStation);
    } else {
      dashboardContent.hidden = true;
      stationSetup.hidden = false;
      setTimeout(() => stationNameInput.focus(), 50);
    }
  }

  function showLogin(message = '') {
    currentSession = null;
    currentProfile = null;
    appView.hidden = true;
    authView.hidden = false;
    dashboardContent.hidden = true;
    stationSetup.hidden = true;
    if (message) setMessage(message, 'error');
  }

  function getUniqueStationsFromPresence() {
    if (!presenceChannel) return [];
    const state = presenceChannel.presenceState();
    const names = new Set();

    Object.values(state).forEach(entries => {
      entries.forEach(entry => {
        if (entry.station_name) names.add(entry.station_name);
      });
    });

    return [...names].sort((a, b) => a.localeCompare(b, 'it'));
  }

  function renderPresence() {
    const stations = getUniqueStationsFromPresence();
    onlineStations.textContent = String(Math.max(stations.length, 1));
    onlineStationsDetail.textContent = stations.length
      ? stations.join(' · ')
      : 'Connessione realtime attiva';
  }

  async function stopPresence() {
    if (presenceChannel && client) {
      try {
        await client.removeChannel(presenceChannel);
      } catch (_) {
        // Nessuna azione necessaria: la sessione può essere già terminata.
      }
    }
    presenceChannel = null;
    presenceKey = null;
  }

  async function startPresence(name) {
    await stopPresence();

    presenceKey = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    presenceChannel = client.channel('campo-segreteria-presence', {
      config: {
        presence: { key: presenceKey }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, renderPresence)
      .on('presence', { event: 'join' }, renderPresence)
      .on('presence', { event: 'leave' }, renderPresence)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('Online', 'Connessione realtime attiva');
          await presenceChannel.track({
            station_name: name,
            user_id: currentSession.user.id,
            online_at: new Date().toISOString()
          });
          renderPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('Da riconnettere', 'Verifica della connessione in corso');
        } else if (status === 'CLOSED') {
          setConnectionState('Offline', 'Connessione realtime non attiva');
        } else {
          setConnectionState('Connessione…', 'Collegamento realtime in corso');
        }
      });
  }

  async function activateStation(rawName) {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) return;

    localStorage.setItem(STATION_STORAGE_KEY, name);
    stationName.textContent = name;
    stationNameInput.value = name;
    stationSetup.hidden = true;
    dashboardContent.hidden = false;
    setConnectionState('Connessione…', 'Collegamento realtime in corso');
    await startPresence(name);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      setMessage('Inserisci email e password.', 'error');
      return;
    }

    setLoginBusy(true);

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    setLoginBusy(false);

    if (error || !data.session) {
      setMessage('Credenziali non valide. Verifica email e password e riprova.', 'error');
      return;
    }

    loginPassword.value = '';
    setMessage('Accesso effettuato.', 'success');
    await showAuthenticatedArea(data.session);
  }

  async function handleLogout() {
    logoutButton.disabled = true;
    await stopPresence();
    await client.auth.signOut();
    logoutButton.disabled = false;
    loginPassword.value = '';
    showLogin();
  }

  async function init() {
    if (!config || !config.url || !config.publishableKey || !window.supabase) {
      showLogin('Configurazione del servizio non disponibile.');
      return;
    }

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    togglePassword.addEventListener('click', () => {
      const showing = loginPassword.type === 'text';
      loginPassword.type = showing ? 'password' : 'text';
      togglePassword.textContent = showing ? 'Mostra' : 'Nascondi';
      togglePassword.setAttribute('aria-label', showing ? 'Mostra password' : 'Nascondi password');
    });

    stationForm.addEventListener('submit', async event => {
      event.preventDefault();
      await activateStation(stationNameInput.value);
    });

    changeStationButton.addEventListener('click', async () => {
      await stopPresence();
      dashboardContent.hidden = true;
      stationSetup.hidden = false;
      stationNameInput.value = localStorage.getItem(STATION_STORAGE_KEY) || '';
      stationNameInput.focus();
      stationNameInput.select();
    });

    window.addEventListener('offline', () => setConnectionState('Offline', 'Connessione di rete assente'));
    window.addEventListener('online', () => {
      if (localStorage.getItem(STATION_STORAGE_KEY) && currentSession) {
        startPresence(localStorage.getItem(STATION_STORAGE_KEY));
      }
    });

    const { data: { session }, error } = await client.auth.getSession();

    if (error || !session) {
      showLogin();
      return;
    }

    await showAuthenticatedArea(session);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
