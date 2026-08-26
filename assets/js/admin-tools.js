(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let profile = null;
  let busy = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function injectStyles() {
    if ($('adminToolsStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminToolsStyles';
    style.textContent = `
      .admin-tools-btn{border:1px solid #d9dde1;background:#fff;color:#31363a;border-radius:10px;padding:8px 11px;font:inherit;font-size:11px;font-weight:850;cursor:pointer;white-space:nowrap}.admin-tools-btn:hover{border-color:#d40000;color:#a90000}
      .admin-tools-modal[hidden]{display:none}.admin-tools-modal{position:fixed;inset:0;z-index:600;display:grid;place-items:center;padding:20px}.admin-tools-backdrop{position:absolute;inset:0;background:rgba(20,23,26,.62);backdrop-filter:blur(4px)}
      .admin-tools-card{position:relative;width:min(100%,680px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:22px;border:1px solid #e0e3e6;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.28)}
      .admin-tools-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.admin-tools-head h2{margin:4px 0 5px}.admin-tools-head p{margin:0;color:var(--muted);font-size:12px}.admin-tools-close{border:0;background:#f0f2f4;border-radius:10px;width:38px;height:38px;font-size:22px;cursor:pointer}
      .admin-danger{margin-top:20px;border:1px solid #efc6cb;background:#fff8f8;border-radius:16px;padding:17px}.admin-danger h3{margin:0 0 6px;color:#a0001d}.admin-danger>p{margin:0;color:#75575c;font-size:12px;line-height:1.5}
      .admin-reset-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.admin-reset-stat{background:#fff;border:1px solid #ecd9dc;border-radius:11px;padding:10px}.admin-reset-stat small{display:block;color:#7c6669;font-size:9px;font-weight:800}.admin-reset-stat strong{display:block;margin-top:2px;font-size:20px}
      .admin-preserved{margin:12px 0;padding:10px 12px;border-radius:11px;background:#f2faf5;border:1px solid #d6eadf;font-size:11px;color:#315c46;line-height:1.5}
      .admin-confirm{display:grid;gap:9px;margin-top:13px}.admin-confirm label{font-size:11px;font-weight:800}.admin-confirm input[type=text]{width:100%;height:42px;border:1px solid #d4d9dd;border-radius:10px;padding:0 11px;font:inherit;box-sizing:border-box}.admin-check{display:flex!important;align-items:flex-start;gap:8px;font-weight:650!important;line-height:1.4}
      .admin-reset-button{border:0;border-radius:10px;background:#b00020;color:#fff;padding:11px 14px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.admin-reset-button:disabled{opacity:.45;cursor:not-allowed}.admin-reset-message{margin-top:10px;font-size:11px;font-weight:750;min-height:16px}.admin-reset-message.error{color:#a0001d}.admin-reset-message.success{color:#16794f}
      @media(max-width:640px){.admin-reset-counts{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if ($('adminToolsButton')) return;
    const actions = document.querySelector('.reserved-header-actions');
    if (!actions) return;

    const button = document.createElement('button');
    button.id = 'adminToolsButton';
    button.type = 'button';
    button.className = 'admin-tools-btn';
    button.textContent = '⚙️ Amministrazione';
    const logout = $('logoutButton');
    actions.insertBefore(button, logout || null);

    const modal = document.createElement('div');
    modal.id = 'adminToolsModal';
    modal.className = 'admin-tools-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="admin-tools-backdrop" data-admin-close></div>
      <section class="admin-tools-card" role="dialog" aria-modal="true" aria-labelledby="adminToolsTitle">
        <div class="admin-tools-head"><div><div class="kicker">Solo Amministratore</div><h2 id="adminToolsTitle">Strumenti amministrazione</h2><p>Operazioni straordinarie sul gestionale del Campo.</p></div><button class="admin-tools-close" type="button" data-admin-close aria-label="Chiudi">×</button></div>
        <div class="admin-danger">
          <h3>⚠️ Svuota gestionale</h3>
          <p>Elimina tutti i dati operativi inseriti e riporta il gestionale allo stato iniziale, pronto per una nuova compilazione.</p>
          <div id="adminResetCounts" class="admin-reset-counts"><div class="admin-reset-stat"><small>Caricamento</small><strong>…</strong></div></div>
          <div class="admin-preserved"><strong>Vengono preservati:</strong> account e ruoli di accesso, corsi, aree di servizio, qualifiche master, tipologie, servizi pasto, struttura delle tende/posti letto e configurazione di sistema. Le assegnazioni e i dati operativi vengono invece azzerati.</div>
          <div class="admin-confirm">
            <label>Per confermare digita esattamente <strong>SVUOTA GESTIONALE</strong><input id="adminResetPhrase" type="text" autocomplete="off" placeholder="SVUOTA GESTIONALE"></label>
            <label class="admin-check"><input id="adminResetCheck" type="checkbox"><span>Confermo di voler eliminare i dati operativi. Questa operazione non è annullabile.</span></label>
            <button id="adminResetButton" class="admin-reset-button" type="button" disabled>Elimina tutti i dati operativi</button>
          </div>
          <div id="adminResetMessage" class="admin-reset-message" role="status" aria-live="polite"></div>
        </div>
      </section>`;
    document.body.appendChild(modal);

    button.addEventListener('click', openModal);
    modal.addEventListener('click', event => { if (event.target.closest('[data-admin-close]')) closeModal(); });
    $('adminResetPhrase').addEventListener('input', updateResetButton);
    $('adminResetCheck').addEventListener('change', updateResetButton);
    $('adminResetButton').addEventListener('click', runReset);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('adminToolsModal').hidden) closeModal(); });
  }

  function updateResetButton() {
    const valid = $('adminResetPhrase')?.value === 'SVUOTA GESTIONALE' && $('adminResetCheck')?.checked === true;
    if ($('adminResetButton')) $('adminResetButton').disabled = !valid || busy;
  }

  async function loadCounts() {
    const box = $('adminResetCounts');
    if (!box) return;
    box.innerHTML = '<div class="admin-reset-stat"><small>Caricamento</small><strong>…</strong></div>';
    const { data, error } = await client.rpc('anteprima_reset_gestionale');
    if (error) {
      box.innerHTML = `<div class="admin-reset-stat"><small>Errore</small><strong>!</strong></div>`;
      $('adminResetMessage').textContent = `Impossibile leggere l’anteprima: ${error.message}`;
      $('adminResetMessage').className = 'admin-reset-message error';
      return;
    }
    const stats = [
      ['Persone', data?.persone || 0], ['Turni', data?.turni || 0], ['Mezzi', data?.mezzi || 0], ['Import Excel', data?.importazioni || 0],
      ['Ticket pasti', data?.ticket_pasti || 0], ['Movimenti persone', data?.movimenti_persone || 0], ['Movimenti mezzi', data?.movimenti_mezzi || 0], ['Letti occupati', data?.letti_occupati || 0]
    ];
    box.innerHTML = stats.map(([label, value]) => `<div class="admin-reset-stat"><small>${esc(label)}</small><strong>${Number(value) || 0}</strong></div>`).join('');
  }

  async function openModal() {
    $('adminToolsModal').hidden = false;
    $('adminResetPhrase').value = '';
    $('adminResetCheck').checked = false;
    $('adminResetMessage').textContent = '';
    $('adminResetMessage').className = 'admin-reset-message';
    updateResetButton();
    await loadCounts();
  }

  function closeModal() {
    if (busy) return;
    $('adminToolsModal').hidden = true;
  }

  async function runReset() {
    if (busy || $('adminResetPhrase').value !== 'SVUOTA GESTIONALE' || !$('adminResetCheck').checked) return;
    if (!window.confirm('Conferma definitiva: eliminare tutti i dati operativi del gestionale?')) return;
    busy = true;
    updateResetButton();
    $('adminResetMessage').textContent = 'Azzeramento del gestionale in corso…';
    $('adminResetMessage').className = 'admin-reset-message';

    const { data, error } = await client.rpc('reset_gestionale_operativo', { p_conferma: 'SVUOTA GESTIONALE' });
    if (error || data?.status !== 'reset_completato') {
      busy = false;
      updateResetButton();
      $('adminResetMessage').textContent = `Reset non riuscito: ${error?.message || data?.status || 'errore'}`;
      $('adminResetMessage').className = 'admin-reset-message error';
      return;
    }

    $('adminResetMessage').textContent = `Gestionale svuotato. Eliminati ${data.persone_eliminate || 0} persone, ${data.turni_eliminati || 0} turni, ${data.mezzi_eliminati || 0} mezzi e ${data.importazioni_eliminate || 0} importazioni.`;
    $('adminResetMessage').className = 'admin-reset-message success';
    setTimeout(() => window.location.reload(), 1400);
  }

  async function init() {
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data, error: profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo || data.ruolo !== 'admin') return;
    profile = data;
    injectStyles();
    injectUi();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
