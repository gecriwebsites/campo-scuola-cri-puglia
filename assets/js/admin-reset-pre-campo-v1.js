(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const READINESS_KEY = 'campo_cri_2026_readiness_admin_v1';
  const ACCORDION_KEY = 'campo_admin_accordion_open_v1';
  let client = null;
  let profile = null;
  let refreshing = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function updateCopy() {
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    if (!danger) return false;

    const title = danger.querySelector('h3');
    const intro = danger.querySelector(':scope > p');
    const preserved = danger.querySelector('.admin-preserved');
    const checkText = $('adminResetCheck')?.closest('label')?.querySelector('span');
    const button = $('adminResetButton');

    if (title) title.textContent = '⚠️ Reset pre-Campo · riparti da zero';
    if (intro) intro.textContent = 'Elimina definitivamente tutti i dati creati durante test e collaudi e riporta il gestionale allo stato iniziale prima dell’avvio reale del Campo.';
    if (preserved) preserved.innerHTML = '<strong>Rimangono soltanto:</strong> account e ruoli di accesso, corsi, aree di servizio, qualifiche, tipologie, servizi pasto e struttura vuota di tende/posti letto. Persone, QR, giornate, checklist, criticità, consegne, log e ogni altro dato operativo vengono azzerati.';
    if (checkText) checkText.textContent = 'Confermo di voler eliminare TUTTI i dati operativi e di test. Il gestionale ripartirà da zero e l’operazione non è annullabile.';
    if (button) button.textContent = 'Azzera completamente i dati di test';
    return true;
  }

  async function refreshCounts() {
    if (refreshing || !client || profile?.ruolo !== 'admin') return;
    const box = $('adminResetCounts');
    if (!box || $('adminToolsModal')?.hidden) return;
    refreshing = true;
    try {
      const { data, error } = await client.rpc('anteprima_reset_gestionale');
      if (error || !data) return;
      const stats = [
        ['Persone', data.persone],
        ['Turni', data.turni],
        ['Mezzi', data.mezzi],
        ['Import', data.importazioni],
        ['Ticket pasti', data.ticket_pasti],
        ['Mov. persone', data.movimenti_persone],
        ['Mov. mezzi', data.movimenti_mezzi],
        ['Letti occupati', data.letti_occupati],
        ['Giornate', data.giornate_operative],
        ['Criticità', data.criticita],
        ['Consegne', data.passaggi_consegne],
        ['Stampe QR', data.stampe_qr],
        ['Log attività', data.log_attivita]
      ];
      box.innerHTML = stats.map(([label,value]) => `<div class="admin-reset-stat"><small>${esc(label)}</small><strong>${Number(value || 0)}</strong></div>`).join('');
    } finally {
      refreshing = false;
    }
  }

  function clearLocalTestStateAfterSuccess() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const message = $('adminResetMessage');
      if (message?.classList.contains('success')) {
        try { localStorage.removeItem(READINESS_KEY); } catch (_) {}
        try { sessionStorage.removeItem(ACCORDION_KEY); } catch (_) {}
        clearInterval(timer);
        return;
      }
      if (attempts >= 24) clearInterval(timer);
    }, 50);
  }

  async function init() {
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const auth = await client.auth.getSession();
    const session = auth.data?.session;
    if (!session) return;
    const result = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (result.error || !result.data?.attivo || result.data.ruolo !== 'admin') return;
    profile = result.data;

    for (let i=0;i<80;i+=1) {
      if (updateCopy()) break;
      await new Promise(resolve => setTimeout(resolve,75));
    }

    document.addEventListener('click', event => {
      if (event.target.closest('#adminToolsButton')) {
        setTimeout(updateCopy, 30);
        setTimeout(refreshCounts, 300);
        setTimeout(refreshCounts, 800);
      }
      if (event.target.closest('#adminResetButton')) clearLocalTestStateAfterSuccess();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
