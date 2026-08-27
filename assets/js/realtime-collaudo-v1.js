(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const INSTANCE_STORAGE_KEY = 'campo_scuola_segreteria_instance';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let channel = null;
  let subscribed = false;
  let running = false;
  let currentTestId = null;
  let responses = new Map();
  let finishTimer = null;

  const station = () => sessionStorage.getItem(STATION_STORAGE_KEY) || 'Postazione non selezionata';
  const instanceId = () => sessionStorage.getItem(INSTANCE_STORAGE_KEY) || 'istanza-sconosciuta';
  const roleLabel = role => ({ admin:'Admin', segreteria:'Segreteria', cucina:'Cucina', sola_lettura:'Sola lettura' }[role] || role || 'Utente');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyles() {
    if ($('realtimeCollaudoStyles')) return;
    const style = document.createElement('style');
    style.id = 'realtimeCollaudoStyles';
    style.textContent = `
      .rt-test{margin:12px 18px 0;padding:14px;border:1px solid #cfdde6;border-radius:6px;background:#f8fbfd}
      .rt-test-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rt-test-head h3{margin:0;font-size:16px;color:#233946}.rt-test-head p{margin:3px 0 0;font-size:12px;line-height:1.45;color:#667985}
      .rt-test-button{min-height:40px;border:0;border-radius:5px;background:#173b52;color:#fff;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap}.rt-test-button:disabled{opacity:.5;cursor:not-allowed}
      .rt-test-state{margin-top:10px;padding:9px 10px;border:1px solid #dce5ea;border-radius:4px;background:#fff;font-size:12px;color:#516672}.rt-test-state.ok{border-color:#cfe4d8;background:#f4fbf7;color:#176846}.rt-test-state.warn{border-color:#ecdba9;background:#fffaf0;color:#775800}.rt-test-state.error{border-color:#ecc8cd;background:#fff8f9;color:#9c1d31}
      .rt-test-results{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}.rt-test-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 9px;border:1px solid #e1e7eb;border-radius:4px;background:#fff}.rt-test-row strong{font-size:12px;color:#344955}.rt-test-row small{display:block;margin-top:2px;font-size:10px;color:#71818b}.rt-test-row span{font-size:10px;font-weight:850;color:#16794f;white-space:nowrap}
      @media(max-width:720px){.rt-test-head{flex-direction:column}.rt-test-button{width:100%}.rt-test-results{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function mountAdminUi() {
    if (profile?.ruolo !== 'admin' || $('realtimeCollaudo')) return !!$('realtimeCollaudo');
    const diagnostics = $('adminDiagnostics');
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    const anchor = diagnostics || danger;
    if (!anchor) return false;

    const box = document.createElement('section');
    box.id = 'realtimeCollaudo';
    box.className = 'rt-test';
    box.innerHTML = `
      <div class="rt-test-head">
        <div><h3>Collaudo postazioni Realtime</h3><p>Invia un segnale alle altre Area Riservata aperte. Segreteria e Cucina rispondono automaticamente senza modificare dati.</p></div>
        <button id="realtimeCollaudoRun" class="rt-test-button" type="button">Test Realtime</button>
      </div>
      <div id="realtimeCollaudoState" class="rt-test-state">Pronto. Apri l’Area Riservata su almeno un altro dispositivo per un test reale.</div>
      <div id="realtimeCollaudoResults" class="rt-test-results"></div>`;

    if (diagnostics) diagnostics.insertAdjacentElement('afterend', box);
    else danger.insertAdjacentElement('beforebegin', box);
    $('realtimeCollaudoRun')?.addEventListener('click', runTest);
    return true;
  }

  function setState(message, type='') {
    const el = $('realtimeCollaudoState');
    if (!el) return;
    el.textContent = message;
    el.className = `rt-test-state${type ? ` ${type}` : ''}`;
  }

  function renderResponses() {
    const box = $('realtimeCollaudoResults');
    if (!box) return;
    const rows = [...responses.values()].sort((a,b) => String(a.station).localeCompare(String(b.station), 'it'));
    box.innerHTML = rows.map(item => `
      <div class="rt-test-row">
        <div><strong>${esc(item.station || 'Postazione')}</strong><small>${esc(roleLabel(item.role))}${item.user ? ` · ${esc(item.user)}` : ''}</small></div>
        <span>RISPOSTA OK</span>
      </div>`).join('');
  }

  async function send(event, payload) {
    if (!channel || !subscribed) throw new Error('Canale Realtime non pronto');
    const result = await channel.send({ type:'broadcast', event, payload });
    if (result !== 'ok') throw new Error(`Invio Realtime: ${result}`);
  }

  async function answerPing(payload) {
    if (!payload?.test_id || payload.sender_instance === instanceId()) return;
    try {
      await send('pong', {
        test_id: payload.test_id,
        instance_id: instanceId(),
        station: station(),
        role: profile?.ruolo || '',
        user: profile?.nome_visualizzato || '',
        answered_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  function receivePong(payload) {
    if (!running || !payload?.test_id || payload.test_id !== currentTestId) return;
    const key = payload.instance_id || `${payload.station}-${payload.role}`;
    responses.set(key, payload);
    renderResponses();
    setState(`${responses.size} ${responses.size === 1 ? 'postazione ha risposto' : 'postazioni hanno risposto'}…`, 'ok');
  }

  function finishTest() {
    clearTimeout(finishTimer);
    running = false;
    const button = $('realtimeCollaudoRun');
    if (button) { button.disabled = false; button.textContent = 'Ripeti test'; }
    if (!responses.size) {
      setState('Nessun’altra postazione ha risposto. Verifica che un secondo PC/telefono sia aperto nell’Area Riservata e connesso.', 'warn');
    } else {
      setState(`Collaudo completato: ${responses.size} ${responses.size === 1 ? 'altra postazione raggiunta' : 'altre postazioni raggiunte'} in Realtime.`, 'ok');
    }
  }

  async function runTest() {
    if (running) return;
    if (!subscribed) {
      setState('Canale Realtime non ancora pronto. Riprova tra qualche secondo.', 'warn');
      return;
    }
    running = true;
    responses = new Map();
    renderResponses();
    currentTestId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const button = $('realtimeCollaudoRun');
    if (button) { button.disabled = true; button.textContent = 'Test in corso…'; }
    setState('Segnale inviato. Attendo le risposte dalle altre postazioni…');
    try {
      await send('ping', {
        test_id: currentTestId,
        sender_instance: instanceId(),
        sender_station: station(),
        sent_at: new Date().toISOString()
      });
      finishTimer = setTimeout(finishTest, 3500);
    } catch (error) {
      running = false;
      if (button) { button.disabled = false; button.textContent = 'Ripeti test'; }
      setState(`Test non avviato: ${error.message}`, 'error');
    }
  }

  async function init() {
    injectStyles();
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    const { data, error: profileError } = await client.from('utenti_segreteria').select('ruolo,attivo,nome_visualizzato').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo) return;
    profile = data;

    channel = client.channel('campo-collaudo-realtime-v1', { config:{ broadcast:{ self:false, ack:true } } });
    channel.on('broadcast', { event:'ping' }, ({ payload }) => answerPing(payload));
    channel.on('broadcast', { event:'pong' }, ({ payload }) => receivePong(payload));
    channel.subscribe(status => {
      subscribed = status === 'SUBSCRIBED';
      if (profile?.ruolo === 'admin' && $('realtimeCollaudoState')) {
        if (status === 'SUBSCRIBED') setState('Canale Realtime pronto. Apri un’altra postazione e avvia il test.');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setState('Canale Realtime da riconnettere.', 'error');
      }
    });

    if (profile?.ruolo === 'admin') {
      for (let i=0;i<60;i+=1) {
        if (mountAdminUi()) break;
        await new Promise(resolve => setTimeout(resolve,100));
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
