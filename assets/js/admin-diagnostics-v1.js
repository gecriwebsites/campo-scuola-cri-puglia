(() => {
  'use strict';
  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let running = false;

  function injectStyles() {
    if ($('adminDiagnosticsV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminDiagnosticsV1Styles';
    style.textContent = `
      .admin-diagnostics{margin:12px 18px 0;padding:14px;border:1px solid #d7e1e7;border-radius:6px;background:#fff}
      .admin-diagnostics-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.admin-diagnostics-head h3{margin:0;font-size:16px;color:#233946}.admin-diagnostics-head p{margin:3px 0 0;font-size:12px;color:#6d7d87;line-height:1.4}
      .admin-diagnostics-run{min-height:40px;border:0;border-radius:5px;background:#173b52;color:#fff;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap}.admin-diagnostics-run:disabled{opacity:.5;cursor:not-allowed}
      .admin-diagnostics-list{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:11px}.admin-diagnostic-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 9px;border:1px solid #e1e6ea;border-radius:4px;background:#fafbfc}.admin-diagnostic-row strong{font-size:11px;color:#344955}.admin-diagnostic-row span{font-size:10px;font-weight:850;white-space:nowrap}.admin-diagnostic-row.ok span{color:#16794f}.admin-diagnostic-row.error{border-color:#ecc8cd;background:#fff8f9}.admin-diagnostic-row.error span{color:#a0001d}.admin-diagnostic-row.wait span{color:#7a6a33}
      .admin-diagnostics-note{margin-top:8px;font-size:11px;line-height:1.4;color:#70808a}
      @media(max-width:720px){.admin-diagnostics-head{align-items:flex-start;flex-direction:column}.admin-diagnostics-list{grid-template-columns:1fr}.admin-diagnostics-run{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function row(label, state, detail='') {
    const cls = state === 'OK' ? 'ok' : state === 'ERRORE' ? 'error' : 'wait';
    return `<div class="admin-diagnostic-row ${cls}"><strong>${label}${detail ? ` · ${detail}` : ''}</strong><span>${state}</span></div>`;
  }

  function mount() {
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    if (!danger || $('adminDiagnostics')) return false;
    const box = document.createElement('section');
    box.id = 'adminDiagnostics';
    box.className = 'admin-diagnostics';
    box.innerHTML = `
      <div class="admin-diagnostics-head"><div><h3>Diagnostica gestionale</h3><p>Controllo in sola lettura di interfaccia, database e funzioni principali.</p></div><button id="adminDiagnosticsRun" class="admin-diagnostics-run" type="button">Esegui controllo</button></div>
      <div id="adminDiagnosticsList" class="admin-diagnostics-list"><div class="admin-diagnostics-note">Nessun controllo eseguito.</div></div>
      <div class="admin-diagnostics-note">La diagnostica non crea, modifica o elimina dati.</div>`;
    danger.insertAdjacentElement('beforebegin', box);
    $('adminDiagnosticsRun')?.addEventListener('click', run);
    return true;
  }

  async function safeTable(name) {
    try {
      const { error, count } = await client.from(name).select('*', { count:'exact', head:true });
      return error ? { ok:false, detail:error.message } : { ok:true, detail:`${Number(count || 0)} record` };
    } catch (e) { return { ok:false, detail:e.message }; }
  }

  async function safeRpc(name, args) {
    try {
      const { error } = await client.rpc(name, args);
      return error ? { ok:false, detail:error.message } : { ok:true, detail:'raggiungibile' };
    } catch (e) { return { ok:false, detail:e.message }; }
  }

  async function run() {
    if (running || !client) return;
    running = true;
    const button = $('adminDiagnosticsRun');
    const list = $('adminDiagnosticsList');
    if (button) { button.disabled = true; button.textContent = 'Controllo…'; }
    if (list) list.innerHTML = row('Avvio diagnostica','ATTESA');

    const frontend = [
      ['Area Segreteria', 'standardWorkspace'], ['Scheda persona', 'personModal'], ['Turni', 'shiftView'], ['Alloggi', 'overnightView'],
      ['Mezzi', 'vehicleView'], ['Situazione Campo', 'situationView'], ['Import Master', 'masterWorkbookPanel'], ['Area Cucina', 'kitchenWorkspace']
    ];
    const results = frontend.map(([label,id]) => ({ label:`UI · ${label}`, ok:!!$(id), detail:$(id) ? 'caricato' : 'non trovato' }));

    const tables = ['persone','turni','tende','posti_letto','servizi_pasto','persone_pasti','mezzi'];
    for (const table of tables) {
      const test = await safeTable(table);
      results.push({ label:`DB · ${table}`, ...test });
    }

    const situation = await safeRpc('situazione_campo_dashboard', { p_data:'2026-09-16' });
    results.push({ label:'RPC · Situazione Campo', ...situation });
    const resetPreview = await safeRpc('anteprima_reset_gestionale', {});
    results.push({ label:'RPC · Anteprima reset', ...resetPreview });

    if (list) list.innerHTML = results.map(item => row(item.label, item.ok ? 'OK' : 'ERRORE', item.ok ? item.detail : String(item.detail || '').slice(0,80))).join('');
    const errors = results.filter(item => !item.ok).length;
    if (button) { button.disabled = false; button.textContent = errors ? `Ripeti controllo (${errors} errori)` : 'Ripeti controllo'; }
    running = false;
  }

  async function init() {
    injectStyles();
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data, error:profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo || data.ruolo !== 'admin') return;
    for (let i=0;i<50;i+=1) {
      if (mount()) return;
      await new Promise(resolve => setTimeout(resolve,100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
