(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const OPEN_ITEMS = [
    ['postazioni','Postazioni operative assegnate e online'],
    ['diagnostica','Diagnostica gestionale eseguita senza errori'],
    ['realtime','Realtime verificato tra almeno due postazioni'],
    ['backup','Backup operativo esportato'],
    ['arrivi','Arrivi e anagrafiche della giornata verificati'],
    ['turni','Turni della giornata verificati'],
    ['pasti','Pasti e comunicazioni alla Cucina verificati'],
    ['alloggi','Alloggi e variazioni pernottamenti verificati'],
    ['mezzi','Mezzi, autisti e movimentazioni previste verificati']
  ];
  const CLOSE_ITEMS = [
    ['presenze','Presenze e persone ancora dentro/fuori ricontrollate'],
    ['pasti','Consumi pasti della giornata verificati'],
    ['mezzi','Movimenti mezzi e mezzi presenti verificati'],
    ['turni_domani','Turni del giorno successivo ricontrollati'],
    ['alloggi','Pernottamenti e posti letto aggiornati'],
    ['criticita','Criticità e note di passaggio consegne registrate'],
    ['backup','Backup operativo di fine giornata esportato']
  ];

  let client = null;
  let session = null;
  let profile = null;
  let selectedDate = CAMP_START;
  let currentRow = null;
  let channel = null;
  let saving = false;
  let setupMissing = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isCampDate = value => value >= CAMP_START && value <= CAMP_END;

  function romeToday() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(p => [p.type,p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function initialDate() {
    const today = romeToday();
    return isCampDate(today) ? today : CAMP_START;
  }

  function formatDate(value) {
    if (!value) return '—';
    const [y,m,d] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', { weekday:'long', day:'2-digit', month:'long', timeZone:'Europe/Rome' }).format(new Date(Date.UTC(y,m-1,d,12)));
  }

  function stateLabel(state) {
    return ({ da_aprire:'Da aprire', operativa:'Giornata operativa', chiusa:'Giornata chiusa' })[state] || 'Da aprire';
  }

  function injectStyles() {
    if ($('dailyOpsV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'dailyOpsV1Styles';
    style.textContent = `
      .daily-status-chip{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid #dfe3e8;background:#fff;border-radius:999px;padding:6px 10px;font-size:12px}
      .daily-status-chip i{width:8px;height:8px;border-radius:50%;background:#c69216;display:block}.daily-status-chip.operativa i{background:#18875a}.daily-status-chip.chiusa i{background:#66737c}.daily-status-chip strong{font-size:12px;color:#324751}.daily-status-chip span{font-size:11px;color:#74818a}
      .daily-ops{margin:12px 18px 0;padding:16px;border:1px solid #d7e1e7;border-radius:7px;background:#fff}
      .daily-ops-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px}.daily-ops-head h3{margin:0;font-size:18px;color:#213846}.daily-ops-head p{margin:4px 0 0;font-size:12px;color:#6e7d87;line-height:1.45}
      .daily-date{display:grid;gap:4px;min-width:190px}.daily-date span{font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#6d7a83}.daily-date input{height:40px;border:1px solid #ccd5db;border-radius:5px;padding:0 9px;font:inherit;font-size:12px;background:#fff}
      .daily-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;padding:12px 13px;border:1px solid #ead9a9;border-left:4px solid #c28a13;border-radius:5px;background:#fffaf0}.daily-banner.operativa{border-color:#cce6d8;border-left-color:#168454;background:#f3fbf6}.daily-banner.chiusa{border-color:#d8dfe3;border-left-color:#66737c;background:#f7f9fa}.daily-banner strong{display:block;font-size:14px}.daily-banner small{display:block;margin-top:2px;font-size:11px;color:#6d7a83}.daily-state{font-size:11px;font-weight:900;white-space:nowrap}
      .daily-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px}.daily-box{border:1px solid #e1e6ea;border-radius:6px;padding:12px;background:#fafbfc}.daily-box h4{margin:0 0 9px;font-size:13px;color:#314753}.daily-list{display:grid;gap:5px}.daily-item{display:flex;align-items:flex-start;gap:9px;padding:8px 9px;border:1px solid #e2e6e9;border-radius:4px;background:#fff;cursor:pointer}.daily-item input{width:17px;height:17px;margin:1px 0 0;flex:0 0 auto}.daily-item span{font-size:11px;line-height:1.4;color:#3e515d}.daily-item.done{border-color:#d1e6da;background:#f7fcf9}
      .daily-note{margin-top:12px}.daily-note label{display:block;font-size:11px;font-weight:850;color:#465a65;margin-bottom:5px}.daily-note textarea{width:100%;min-height:76px;resize:vertical;border:1px solid #ccd5db;border-radius:5px;padding:9px 10px;font:inherit;font-size:12px;box-sizing:border-box;background:#fff}
      .daily-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px}.daily-actions-left,.daily-actions-right{display:flex;gap:7px;flex-wrap:wrap}.daily-btn{min-height:39px;border:1px solid #cbd4da;border-radius:5px;background:#fff;padding:7px 11px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.daily-btn.primary{border-color:#173b52;background:#173b52;color:#fff}.daily-btn.success{border-color:#168454;background:#168454;color:#fff}.daily-btn.danger{border-color:#9d293d;background:#9d293d;color:#fff}.daily-btn:disabled{opacity:.45;cursor:not-allowed}.daily-message{min-height:16px;margin-top:8px;font-size:11px;font-weight:750;color:#65747e}.daily-message.error{color:#a0001d}.daily-message.success{color:#16794f}
      .daily-roles{margin-top:12px;border:1px solid #e1e6ea;border-radius:6px;overflow:hidden}.daily-roles-head{padding:10px 12px;background:#f6f8f9;border-bottom:1px solid #e1e6ea}.daily-roles-head strong{font-size:13px;color:#304753}.daily-role-grid{display:grid;grid-template-columns:repeat(3,1fr)}.daily-role{padding:11px 12px;border-right:1px solid #edf0f2}.daily-role:last-child{border-right:0}.daily-role strong{display:block;font-size:12px;color:#314854}.daily-role small{display:block;margin-top:4px;font-size:10px;line-height:1.4;color:#71808a}
      .daily-setup{margin-top:11px;padding:10px 12px;border:1px solid #efc9cf;background:#fff7f8;border-radius:5px;color:#8c2435;font-size:11px;line-height:1.45}
      @media(max-width:760px){.daily-ops-head{align-items:stretch;flex-direction:column}.daily-date{min-width:0}.daily-grid{grid-template-columns:1fr}.daily-role-grid{grid-template-columns:1fr}.daily-role{border-right:0;border-bottom:1px solid #edf0f2}.daily-role:last-child{border-bottom:0}.daily-banner{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function mountStatusChip() {
    const bar = document.querySelector('.reserved-statusbar-inner');
    if (!bar || $('dailyOpsStatusChip')) return;
    const chip = document.createElement('div');
    chip.id = 'dailyOpsStatusChip';
    chip.className = 'daily-status-chip';
    chip.innerHTML = '<i></i><strong>Giornata</strong><span>pre-campo</span>';
    bar.appendChild(chip);
  }

  function checklistHtml(items, phase) {
    return items.map(([key,label]) => `<label class="daily-item"><input type="checkbox" data-daily-phase="${phase}" data-daily-key="${key}"><span>${esc(label)}</span></label>`).join('');
  }

  function mountAdmin() {
    if (profile?.ruolo !== 'admin') return true;
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    if (!danger || $('dailyOpsAdmin')) return false;
    const section = document.createElement('section');
    section.id = 'dailyOpsAdmin';
    section.className = 'daily-ops';
    section.innerHTML = `
      <div class="daily-ops-head"><div><h3>Gestione giornata operativa</h3><p>Apertura e chiusura condivise tra tutte le postazioni, con checklist e passaggio consegne per data.</p></div><label class="daily-date"><span>Giornata</span><input id="dailyOpsDate" type="date" min="${CAMP_START}" max="${CAMP_END}" value="${selectedDate}"></label></div>
      <div id="dailyOpsBanner" class="daily-banner"><div><strong>${stateLabel('da_aprire')}</strong><small>${formatDate(selectedDate)}</small></div><span class="daily-state">DA APRIRE</span></div>
      <div id="dailyOpsSetup" class="daily-setup" hidden>Modulo database non ancora installato. Esegui <strong>supabase/step-giornata-operativa.sql</strong> nel SQL Editor di Supabase, poi ricarica la pagina.</div>
      <div class="daily-grid">
        <div class="daily-box"><h4>Apertura giornata</h4><div class="daily-list">${checklistHtml(OPEN_ITEMS,'open')}</div></div>
        <div class="daily-box"><h4>Chiusura giornata</h4><div class="daily-list">${checklistHtml(CLOSE_ITEMS,'close')}</div></div>
      </div>
      <div class="daily-note"><label for="dailyOpsNote">Note / passaggio consegne</label><textarea id="dailyOpsNote" placeholder="Criticità, variazioni, attività da riprendere, informazioni utili al turno successivo…"></textarea></div>
      <div class="daily-actions"><div class="daily-actions-left"><button id="dailyOpsSave" class="daily-btn" type="button">Salva verifiche</button><button id="dailyOpsRefresh" class="daily-btn" type="button">↻ Aggiorna</button></div><div class="daily-actions-right"><button id="dailyOpsOpen" class="daily-btn success" type="button">Apri giornata</button><button id="dailyOpsReopen" class="daily-btn primary" type="button" hidden>Riapri giornata</button><button id="dailyOpsClose" class="daily-btn danger" type="button">Chiudi giornata</button></div></div>
      <div id="dailyOpsMessage" class="daily-message"></div>
      <div class="daily-roles"><div class="daily-roles-head"><strong>Ruoli operativi</strong></div><div class="daily-role-grid"><div class="daily-role"><strong>Admin</strong><small>Configurazione, apertura/chiusura giornata, Import Master, backup, diagnostica, supervisione e gestione eccezioni.</small></div><div class="daily-role"><strong>Segreteria</strong><small>Accredito, anagrafiche, presenze, QR, alloggi, turni, pasti, mezzi e aggiornamento dei dati operativi.</small></div><div class="daily-role"><strong>Cucina</strong><small>Ricerca/scansione persona, visione esigenze alimentari e consumo dei ticket pasto. Nessun accesso alle altre funzioni gestionali.</small></div></div></div>`;
    danger.insertAdjacentElement('beforebegin', section);

    $('dailyOpsDate')?.addEventListener('change', async event => {
      selectedDate = event.target.value;
      await loadDay();
    });
    $('dailyOpsSave')?.addEventListener('click', () => saveDay(currentRow?.stato || 'da_aprire'));
    $('dailyOpsRefresh')?.addEventListener('click', loadDay);
    $('dailyOpsOpen')?.addEventListener('click', () => saveDay('operativa', true));
    $('dailyOpsReopen')?.addEventListener('click', () => saveDay('operativa', true));
    $('dailyOpsClose')?.addEventListener('click', () => saveDay('chiusa', true));
    section.querySelectorAll('[data-daily-phase]').forEach(input => input.addEventListener('change', () => input.closest('.daily-item')?.classList.toggle('done', input.checked)));
    return true;
  }

  function setMessage(message='', type='') {
    const el = $('dailyOpsMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `daily-message${type ? ` ${type}` : ''}`;
  }

  function readChecklist(phase) {
    const out = {};
    document.querySelectorAll(`[data-daily-phase="${phase}"]`).forEach(input => { out[input.dataset.dailyKey] = input.checked === true; });
    return out;
  }

  function allChecked(items, checklist) { return items.every(([key]) => checklist?.[key] === true); }

  function applyChecklist(phase, data={}) {
    document.querySelectorAll(`[data-daily-phase="${phase}"]`).forEach(input => {
      input.checked = data?.[input.dataset.dailyKey] === true;
      input.closest('.daily-item')?.classList.toggle('done', input.checked);
    });
  }

  function updateAdminUi() {
    if (profile?.ruolo !== 'admin' || !$('dailyOpsAdmin')) return;
    const state = currentRow?.stato || 'da_aprire';
    const banner = $('dailyOpsBanner');
    if (banner) {
      banner.className = `daily-banner${state === 'operativa' ? ' operativa' : state === 'chiusa' ? ' chiusa' : ''}`;
      const strong = banner.querySelector('strong');
      const small = banner.querySelector('small');
      const badge = banner.querySelector('.daily-state');
      if (strong) strong.textContent = stateLabel(state);
      if (small) small.textContent = formatDate(selectedDate);
      if (badge) badge.textContent = state === 'operativa' ? 'OPERATIVA' : state === 'chiusa' ? 'CHIUSA' : 'DA APRIRE';
    }
    applyChecklist('open', currentRow?.checklist_apertura || {});
    applyChecklist('close', currentRow?.checklist_chiusura || {});
    if ($('dailyOpsNote')) $('dailyOpsNote').value = currentRow?.note || '';

    const openComplete = allChecked(OPEN_ITEMS, currentRow?.checklist_apertura || readChecklist('open'));
    const closeComplete = allChecked(CLOSE_ITEMS, currentRow?.checklist_chiusura || readChecklist('close'));
    if ($('dailyOpsOpen')) { $('dailyOpsOpen').hidden = state !== 'da_aprire'; $('dailyOpsOpen').disabled = setupMissing || !openComplete || saving; }
    if ($('dailyOpsClose')) { $('dailyOpsClose').hidden = state !== 'operativa'; $('dailyOpsClose').disabled = setupMissing || !closeComplete || saving; }
    if ($('dailyOpsReopen')) { $('dailyOpsReopen').hidden = state !== 'chiusa'; $('dailyOpsReopen').disabled = setupMissing || saving; }
    if ($('dailyOpsSave')) $('dailyOpsSave').disabled = setupMissing || saving;
  }

  function updateStatusChip(row) {
    const chip = $('dailyOpsStatusChip');
    if (!chip) return;
    const today = romeToday();
    chip.className = 'daily-status-chip';
    const text = chip.querySelector('span');
    const strong = chip.querySelector('strong');
    if (!isCampDate(today)) {
      if (strong) strong.textContent = 'Campo';
      if (text) text.textContent = today < CAMP_START ? 'pre-campo' : 'concluso';
      return;
    }
    const state = row?.stato || 'da_aprire';
    chip.classList.toggle('operativa', state === 'operativa');
    chip.classList.toggle('chiusa', state === 'chiusa');
    if (strong) strong.textContent = `Giornata ${today.slice(8,10)}/${today.slice(5,7)}`;
    if (text) text.textContent = stateLabel(state);
  }

  async function loadSpecific(date) {
    try {
      const { data, error } = await client.from('giornate_operative').select('*').eq('data', date).maybeSingle();
      if (error) {
        if (String(error.message || '').toLowerCase().includes('giornate_operative') || error.code === '42P01') setupMissing = true;
        return { data:null, error };
      }
      setupMissing = false;
      return { data:data || null, error:null };
    } catch (error) { return { data:null, error }; }
  }

  async function loadDay() {
    if (!client || !isCampDate(selectedDate)) return;
    setMessage('Aggiornamento giornata…');
    const result = await loadSpecific(selectedDate);
    currentRow = result.data;
    if ($('dailyOpsSetup')) $('dailyOpsSetup').hidden = !setupMissing;
    if (result.error && !setupMissing) setMessage(`Impossibile leggere la giornata: ${result.error.message || result.error}`, 'error');
    else if (setupMissing) setMessage('Installa prima il modulo SQL della giornata operativa.', 'error');
    else setMessage(currentRow ? 'Stato giornata aggiornato.' : 'Nessuna apertura registrata per questa data.');
    updateAdminUi();
  }

  async function loadTodayBadge() {
    const today = romeToday();
    if (!isCampDate(today)) { updateStatusChip(null); return; }
    const result = await loadSpecific(today);
    if (!result.error) updateStatusChip(result.data);
  }

  async function saveDay(targetState, requireComplete=false) {
    if (saving || setupMissing || profile?.ruolo !== 'admin') return;
    const openChecklist = readChecklist('open');
    const closeChecklist = readChecklist('close');
    if (targetState === 'operativa' && requireComplete && !allChecked(OPEN_ITEMS, openChecklist)) {
      setMessage('Completa tutta la checklist di apertura prima di aprire la giornata.', 'error'); return;
    }
    if (targetState === 'chiusa' && requireComplete && !allChecked(CLOSE_ITEMS, closeChecklist)) {
      setMessage('Completa tutta la checklist di chiusura prima di chiudere la giornata.', 'error'); return;
    }
    if (targetState === 'chiusa' && !window.confirm(`Chiudere definitivamente la giornata del ${formatDate(selectedDate)}?`)) return;

    saving = true;
    updateAdminUi();
    setMessage(targetState === 'operativa' ? 'Apertura giornata…' : targetState === 'chiusa' ? 'Chiusura giornata…' : 'Salvataggio verifiche…');
    try {
      const { data, error } = await client.rpc('salva_giornata_operativa', {
        p_data:selectedDate,
        p_stato:targetState,
        p_checklist_apertura:openChecklist,
        p_checklist_chiusura:closeChecklist,
        p_note:String($('dailyOpsNote')?.value || '').trim() || null
      });
      if (error) {
        if (String(error.message || '').toLowerCase().includes('salva_giornata_operativa') || error.code === '42883') setupMissing = true;
        throw error;
      }
      currentRow = Array.isArray(data) ? data[0] : data;
      setMessage(targetState === 'operativa' ? 'Giornata aperta: tutte le postazioni vedranno lo stato operativo.' : targetState === 'chiusa' ? 'Giornata chiusa e passaggio consegne salvato.' : 'Verifiche salvate.', 'success');
    } catch (error) {
      setMessage(setupMissing ? 'Modulo SQL non installato: esegui step-giornata-operativa.sql.' : `Operazione non riuscita: ${error.message || error}`, 'error');
    } finally {
      saving = false;
      if ($('dailyOpsSetup')) $('dailyOpsSetup').hidden = !setupMissing;
      updateAdminUi();
      await loadTodayBadge();
    }
  }

  function subscribeRealtime() {
    if (!client || channel) return;
    channel = client.channel('giornata-operativa-ui')
      .on('postgres_changes', { event:'*', schema:'public', table:'giornate_operative' }, payload => {
        const row = payload.new || payload.old;
        if (row?.data === selectedDate && profile?.ruolo === 'admin') void loadDay();
        if (row?.data === romeToday()) void loadTodayBadge();
      })
      .subscribe();
  }

  async function init() {
    injectStyles();
    mountStatusChip();
    selectedDate = initialDate();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session:currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    const { data, error:profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo) return;
    profile = data;

    for (let i=0;i<60;i+=1) {
      if (mountAdmin()) break;
      await new Promise(resolve => setTimeout(resolve,100));
    }
    await loadTodayBadge();
    if (profile.ruolo === 'admin') await loadDay();
    subscribeRealtime();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
