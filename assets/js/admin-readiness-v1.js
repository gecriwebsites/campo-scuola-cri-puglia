(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'campo_cri_2026_readiness_admin_v1';
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  let client = null;
  let running = false;

  const manualItems = [
    ['backup', 'Backup operativo esportato prima dell’avvio'],
    ['master', 'File Master controllato e importato / aggiornato'],
    ['realtime', 'Collaudo Realtime eseguito con almeno due postazioni'],
    ['qrprint', 'Stampa QR adesivo provata sulla stampante prevista'],
    ['qrscan', 'Scansione QR provata da telefono / postazione accredito'],
    ['kitchen', 'Cucina 1, Cucina 2 e Cucina 3 verificate'],
    ['housing', 'Tende, posti letto e assegnazioni ricontrollati'],
    ['ops', 'Turni, pasti e mezzi ricontrollati'],
    ['infra', 'Rete, alimentazione e dispositivi delle postazioni verificati']
  ];

  function injectStyles() {
    if ($('adminReadinessV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminReadinessV1Styles';
    style.textContent = `
      .admin-readiness{margin:12px 18px 0;padding:16px;border:1px solid #d7e1e7;border-radius:7px;background:#fff}
      .admin-readiness-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .admin-readiness-head h3{margin:0;font-size:18px;color:#213846}.admin-readiness-head p{margin:4px 0 0;font-size:12px;line-height:1.45;color:#6e7d87}
      .admin-readiness-run{min-height:40px;border:0;border-radius:5px;background:#173b52;color:#fff;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap}.admin-readiness-run:disabled{opacity:.5;cursor:not-allowed}
      .admin-ready-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:13px 0 0;padding:12px 13px;border:1px solid #ead9a9;border-left:4px solid #c28a13;border-radius:5px;background:#fffaf0}.admin-ready-banner.ready{border-color:#cce6d8;border-left-color:#168454;background:#f3fbf6}.admin-ready-banner strong{display:block;font-size:14px}.admin-ready-banner small{display:block;margin-top:2px;font-size:11px;color:#6d7a83}.admin-ready-badge{font-size:11px;font-weight:900;white-space:nowrap;color:#8b6200}.admin-ready-banner.ready .admin-ready-badge{color:#16794f}
      .admin-readiness-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px}.admin-readiness-box{border:1px solid #e1e6ea;border-radius:6px;padding:12px;background:#fafbfc}.admin-readiness-box h4{margin:0 0 9px;font-size:13px;color:#314753}.admin-auto-list{display:grid;gap:5px}.admin-auto-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:7px 8px;border:1px solid #e2e6e9;border-radius:4px;background:#fff}.admin-auto-row strong{font-size:11px;color:#3f515c}.admin-auto-row span{font-size:10px;font-weight:900;white-space:nowrap}.admin-auto-row.ok span{color:#16794f}.admin-auto-row.warn span{color:#906400}.admin-auto-row.error span{color:#aa1830}.admin-auto-row small{display:block;margin-top:2px;font-size:10px;color:#7a8790;font-weight:500}
      .admin-manual-list{display:grid;gap:5px}.admin-manual-item{display:flex;align-items:flex-start;gap:9px;padding:7px 8px;border:1px solid #e2e6e9;border-radius:4px;background:#fff;cursor:pointer}.admin-manual-item input{width:17px;height:17px;margin:1px 0 0;flex:0 0 auto}.admin-manual-item span{font-size:11px;line-height:1.4;color:#3e515d}.admin-manual-item.done{border-color:#d1e6da;background:#f7fcf9}.admin-manual-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:9px}.admin-manual-actions small{font-size:10px;color:#74818a}.admin-readiness-reset{border:1px solid #d9dfe3;background:#fff;border-radius:4px;padding:6px 8px;font:inherit;font-size:10px;font-weight:800;color:#61717c;cursor:pointer}
      .admin-stations{margin-top:12px;border:1px solid #e1e6ea;border-radius:6px;overflow:hidden}.admin-stations-head{padding:10px 12px;background:#f6f8f9;border-bottom:1px solid #e1e6ea}.admin-stations-head strong{font-size:13px;color:#304753}.admin-stations-head small{display:block;margin-top:2px;font-size:10px;color:#74818a}.admin-station-table{width:100%;border-collapse:collapse}.admin-station-table th,.admin-station-table td{text-align:left;padding:8px 10px;border-bottom:1px solid #edf0f2;font-size:10px;vertical-align:top}.admin-station-table th{background:#fafbfc;color:#6d7982;text-transform:uppercase;letter-spacing:.04em}.admin-station-table tr:last-child td{border-bottom:0}.admin-station-table td:first-child{font-weight:850;color:#314854;white-space:nowrap}
      .admin-start-procedure{margin-top:12px;padding:12px;border:1px solid #dce3e8;border-radius:6px;background:#fff}.admin-start-procedure h4{margin:0 0 8px;font-size:13px}.admin-start-procedure ol{margin:0;padding-left:20px}.admin-start-procedure li{margin:5px 0;font-size:11px;line-height:1.4;color:#465b67}
      @media(max-width:760px){.admin-readiness-head{flex-direction:column}.admin-readiness-run{width:100%}.admin-readiness-grid{grid-template-columns:1fr}.admin-stations{overflow:auto}.admin-station-table{min-width:560px}.admin-ready-banner{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function manualComplete() {
    const state = loadState();
    return manualItems.every(([key]) => state[key] === true);
  }

  function updateManualUi() {
    const state = loadState();
    manualItems.forEach(([key]) => {
      const input = $(`readiness_${key}`);
      if (!input) return;
      input.checked = state[key] === true;
      input.closest('.admin-manual-item')?.classList.toggle('done', input.checked);
    });
    const completed = manualItems.filter(([key]) => state[key] === true).length;
    const progress = $('adminReadinessManualProgress');
    if (progress) progress.textContent = `${completed}/${manualItems.length} verifiche completate su questo PC Admin`;
    evaluateReady();
  }

  function evaluateReady() {
    const box = $('adminReadyBanner');
    if (!box) return;
    const autoOk = box.dataset.autoOk === '1';
    const ready = autoOk && manualComplete();
    box.classList.toggle('ready', ready);
    const title = box.querySelector('strong');
    const copy = box.querySelector('small');
    const badge = box.querySelector('.admin-ready-badge');
    if (ready) {
      if (title) title.textContent = 'Pronto ad aprire gli accrediti';
      if (copy) copy.textContent = 'Controlli automatici e checklist del primo giorno risultano completati.';
      if (badge) badge.textContent = 'PRONTO';
    } else {
      if (title) title.textContent = 'Preparazione da completare';
      if (copy) copy.textContent = 'Completa i controlli automatici e le verifiche manuali prima di aprire le postazioni di accredito.';
      if (badge) badge.textContent = 'DA VERIFICARE';
    }
  }

  function mount() {
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    if (!danger || $('adminReadiness')) return false;
    const section = document.createElement('section');
    section.id = 'adminReadiness';
    section.className = 'admin-readiness';
    section.innerHTML = `
      <div class="admin-readiness-head">
        <div><h3>Preparazione Campo</h3><p>Checklist di apertura, stato tecnico e configurazione consigliata delle postazioni prima dell’avvio operativo.</p></div>
        <button id="adminReadinessRun" class="admin-readiness-run" type="button">Controlla preparazione</button>
      </div>
      <div id="adminReadyBanner" class="admin-ready-banner" data-auto-ok="0"><div><strong>Preparazione da completare</strong><small>Esegui i controlli e completa la checklist prima di aprire gli accrediti.</small></div><span class="admin-ready-badge">DA VERIFICARE</span></div>
      <div class="admin-readiness-grid">
        <div class="admin-readiness-box"><h4>Controlli automatici</h4><div id="adminReadinessAuto" class="admin-auto-list"><div class="admin-auto-row warn"><div><strong>Controlli non eseguiti</strong></div><span>ATTESA</span></div></div></div>
        <div class="admin-readiness-box"><h4>Checklist primo giorno</h4><div class="admin-manual-list">${manualItems.map(([key,label]) => `<label class="admin-manual-item"><input id="readiness_${key}" data-readiness-key="${key}" type="checkbox"><span>${label}</span></label>`).join('')}</div><div class="admin-manual-actions"><small id="adminReadinessManualProgress"></small><button id="adminReadinessReset" class="admin-readiness-reset" type="button">Azzera checklist</button></div></div>
      </div>
      <div class="admin-stations"><div class="admin-stations-head"><strong>Postazioni consigliate</strong><small>È una distribuzione operativa consigliata, non un vincolo del gestionale.</small></div><table class="admin-station-table"><thead><tr><th>Postazione</th><th>Utilizzo consigliato</th></tr></thead><tbody>
        <tr><td>Admin</td><td>Configurazione, Import Master, backup, diagnostica e supervisione generale.</td></tr>
        <tr><td>Referente Segreteria</td><td>Situazione Campo, coordinamento delle postazioni e gestione delle eccezioni.</td></tr>
        <tr><td>Segreteria 1–2</td><td>Accredito, consegna badge/gadget, stampa QR e registrazione presenza.</td></tr>
        <tr><td>Segreteria 3</td><td>Anagrafiche, alloggi e gestione variazioni dei pernottamenti.</td></tr>
        <tr><td>Segreteria 4</td><td>Turni, disponibilità e supporto gestione pasti.</td></tr>
        <tr><td>Segreteria 5</td><td>Mezzi, autisti e supporto logistico / segreteria.</td></tr>
        <tr><td>Cucina 1–3</td><td>Scansione QR e consumo ticket pasto da tre punti contemporanei.</td></tr>
      </tbody></table></div>
      <div class="admin-start-procedure"><h4>Procedura prima di aprire gli accrediti</h4><ol><li>Accendi Admin e Referente Segreteria, assegna le postazioni e verifica che il sistema sia online.</li><li>Esegui Diagnostica gestionale e Collaudo Realtime con almeno una seconda postazione.</li><li>Esporta un Backup operativo e controlla che il file Master definitivo sia stato importato correttamente.</li><li>Prova una scheda persona completa: apertura, salvataggio, stampa QR e scansione.</li><li>Controlla alloggi, pasti, turni e mezzi; verifica in particolare le persone con esigenze alimentari.</li><li>Apri Segreteria 1–5 e Cucina 1–3 secondo necessità. Solo a questo punto avvia l’accredito reale.</li></ol></div>`;
    danger.insertAdjacentElement('beforebegin', section);

    section.querySelectorAll('[data-readiness-key]').forEach(input => input.addEventListener('change', () => {
      const state = loadState();
      state[input.dataset.readinessKey] = input.checked;
      state.updated_at = new Date().toISOString();
      saveState(state);
      updateManualUi();
    }));
    $('adminReadinessReset')?.addEventListener('click', () => {
      if (!window.confirm('Azzera tutte le spunte della checklist di preparazione su questo PC?')) return;
      localStorage.removeItem(STORAGE_KEY);
      updateManualUi();
    });
    $('adminReadinessRun')?.addEventListener('click', runChecks);
    updateManualUi();
    return true;
  }

  async function countTable(name) {
    try {
      const { count, error } = await client.from(name).select('*', { count:'exact', head:true });
      return error ? { ok:false, count:0, error:error.message } : { ok:true, count:Number(count || 0) };
    } catch (e) { return { ok:false, count:0, error:e.message }; }
  }

  function autoRow(label, state, detail) {
    const cls = state === 'OK' ? 'ok' : state === 'ERRORE' ? 'error' : 'warn';
    return `<div class="admin-auto-row ${cls}"><div><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ''}</div><span>${state}</span></div>`;
  }

  async function runChecks() {
    if (running || !client) return;
    running = true;
    const button = $('adminReadinessRun');
    const list = $('adminReadinessAuto');
    if (button) { button.disabled = true; button.textContent = 'Controllo…'; }
    if (list) list.innerHTML = autoRow('Controllo preparazione', 'ATTESA', 'Lettura dello stato operativo in corso.');

    const station = sessionStorage.getItem(STATION_STORAGE_KEY) || '';
    const [people, tents, beds, meals, courses, areas] = await Promise.all([
      countTable('persone'), countTable('tende'), countTable('posti_letto'), countTable('servizi_pasto'), countTable('corsi'), countTable('aree_servizio')
    ]);

    const checks = [];
    checks.push({ label:'Postazione Admin', state:station === 'Admin' ? 'OK' : 'DA PREPARARE', detail:station ? `Postazione attuale: ${station}` : 'Nessuna postazione assegnata.' });
    checks.push({ label:'Collegamento database', state:people.ok && tents.ok && meals.ok ? 'OK' : 'ERRORE', detail:people.ok ? 'Supabase raggiungibile.' : (people.error || 'Errore database') });
    checks.push({ label:'Anagrafiche persone', state:people.ok && people.count > 0 ? 'OK' : people.ok ? 'DA PREPARARE' : 'ERRORE', detail:people.ok ? `${people.count} persone disponibili.` : people.error });
    checks.push({ label:'Struttura alloggi', state:tents.ok && beds.ok && tents.count > 0 && beds.count > 0 ? 'OK' : (tents.ok && beds.ok ? 'DA PREPARARE' : 'ERRORE'), detail:tents.ok && beds.ok ? `${tents.count} tende · ${beds.count} posti letto.` : (tents.error || beds.error) });
    checks.push({ label:'Servizi pasto', state:meals.ok && meals.count > 0 ? 'OK' : meals.ok ? 'DA PREPARARE' : 'ERRORE', detail:meals.ok ? `${meals.count} servizi pasto configurati.` : meals.error });
    checks.push({ label:'Corsi', state:courses.ok && courses.count > 0 ? 'OK' : courses.ok ? 'DA PREPARARE' : 'ERRORE', detail:courses.ok ? `${courses.count} corsi configurati.` : courses.error });
    checks.push({ label:'Aree di servizio', state:areas.ok && areas.count > 0 ? 'OK' : areas.ok ? 'DA PREPARARE' : 'ERRORE', detail:areas.ok ? `${areas.count} aree disponibili.` : areas.error });

    const criticalOk = checks.every(item => item.state === 'OK');
    if (list) list.innerHTML = checks.map(item => autoRow(item.label, item.state, item.detail)).join('');
    const banner = $('adminReadyBanner');
    if (banner) banner.dataset.autoOk = criticalOk ? '1' : '0';
    evaluateReady();
    if (button) { button.disabled = false; button.textContent = 'Ricontrolla preparazione'; }
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
    for (let i=0;i<60;i+=1) {
      if (mount()) return;
      await new Promise(resolve => setTimeout(resolve,100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
