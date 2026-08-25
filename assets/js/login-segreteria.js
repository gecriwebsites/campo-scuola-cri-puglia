(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginButton = document.getElementById('loginButton');
  const loginMessage = document.getElementById('loginMessage');
  const togglePassword = document.getElementById('togglePassword');

  let client = null;

  function setMessage(message = '', type = '') {
    loginMessage.textContent = message;
    loginMessage.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function setBusy(busy) {
    loginButton.disabled = busy;
    loginButton.textContent = busy ? 'Accesso in corso…' : "Accedi all'Area Segreteria";
  }

  async function isAuthorized(session) {
    const { data, error } = await client
      .from('utenti_segreteria')
      .select('attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();

    return !error && !!data && data.attivo === true;
  }

  async function goToReservedArea(session) {
    if (!session) return false;

    const authorized = await isAuthorized(session);
    if (!authorized) {
      await client.auth.signOut({ scope: 'local' });
      setMessage('Questo account non è autorizzato ad accedere all’Area Segreteria.', 'error');
      return false;
    }

    location.replace('area-segreteria.html');
    return true;
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

    setBusy(true);
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      setBusy(false);
      setMessage('Credenziali non valide. Verifica email e password e riprova.', 'error');
      return;
    }

    loginPassword.value = '';
    setMessage('Accesso effettuato. Apertura area operativa…', 'success');

    const redirected = await goToReservedArea(data.session);
    if (!redirected) setBusy(false);
  }

  async function init() {
    if (!config || !config.url || !config.publishableKey || !window.supabase) {
      setMessage('Configurazione del servizio non disponibile.', 'error');
      loginButton.disabled = true;
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

    togglePassword.addEventListener('click', () => {
      const showing = loginPassword.type === 'text';
      loginPassword.type = showing ? 'password' : 'text';
      togglePassword.textContent = showing ? 'Mostra' : 'Nascondi';
      togglePassword.setAttribute('aria-label', showing ? 'Mostra password' : 'Nascondi password');
    });

    const { data: { session }, error } = await client.auth.getSession();
    if (!error && session) await goToReservedArea(session);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
