(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let currentDate = CAMP_START;
  let dashboardData = null;
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;
  let loading = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
  }

  function clampDate(value) {
    if (!value || value < CAMP_START) return CAMP_START;
    if (value > CAMP_END) return CAMP_END;
    return value;
  }

  function initialDate() {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return today >= CAMP_START && today <= CAMP_END ? today : CAMP_START;
  }

  function addDays(value, amount) {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + amount));
    return date.toISOString().slice(0, 10);
  }

  function formatDate(value, long = true) {
    if (!value) return '—';
    const [y, m, d] = String(value).split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('it-IT', long
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { weekday: 'short', day: '2-digit', month: '2-digit' }
    ).format(date);
  }

  function formatTime(value) {
    return value ? String(value).slice(0, 5) : '—';
  }

  function formatGenerated(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria')
      .select('ruolo,attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function showToast(message, type = '') {
    let toast = $('situationToast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `situation-toast${type ? ` ${type}` : ''}`;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3400);
  }

  function injectStyles() {
    if ($('situationStyles')) return;
    const style = document.createElement('style');
    style.id = 'situationStyles';
    style.textContent = `
      .situation-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.situation-head h2{margin:4px 0 5px}.situation-head p{margin:0;color:var(--muted)}
      .situation-datebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.situation-datebar input{height:42px;border:1px solid #cfd4d9;border-radius:11px;background:#fff;padding:0 11px;font:inherit;font-weight:750}.situation-date-btn{width:42px;height:42px;border:1px solid #d9dde1;border-radius:11px;background:#fff;font:inherit;font-size:20px;cursor:pointer}.situation-date-btn:disabled{opacity:.35;cursor:not-allowed}.situation-refresh{height:42px}
      .situation-date-title{background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:16px}.situation-date-title strong{font-size:18px;text-transform:capitalize}.situation-date-title span{font-size:11px;color:var(--muted);font-weight:750}
      .situation-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.situation-kpi{background:#fff;border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:0 5px 18px rgba(20,20,20,.035);position:relative;overflow:hidden}.situation-kpi .kpi-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.situation-kpi .kpi-icon{width:36px;height:36px;border-radius:11px;background:#f3f5f7;display:grid;place-items:center;font-size:18px}.situation-kpi small{display:block;color:var(--muted);font-weight:750}.situation-kpi strong{display:block;font-size:28px;line-height:1.05;margin:8px 0 4px}.situation-kpi em{font-style:normal;font-size:11px;color:var(--muted)}.situation-kpi.alert{border-color:#efc1c1;background:#fffafa}.situation-kpi.alert .kpi-icon{background:#fff0f0}.situation-kpi.good{border-color:#cfe5d9}.situation-kpi.warning{border-color:#ead7a8;background:#fffdf7}
      .situation-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;align-items:start}.situation-panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 5px 18px rgba(20,20,20,.035)}.situation-panel h3{margin:4px 0 4px;font-size:19px}.situation-panel>p{margin:0 0 14px;color:var(--muted);font-size:12px}.situation-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.situation-panel-head .panel-link{border:0;background:#f3f4f5;border-radius:9px;padding:8px 10px;font:inherit;font-weight:800;font-size:11px;cursor:pointer}
      .critical-list{display:grid;gap:8px}.critical-item{border:1px solid #ead3d3;background:#fff8f8;border-radius:13px;padding:12px 13px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.critical-item.warning{border-color:#ead7a8;background:#fffaf0}.critical-item strong{display:block;font-size:13px}.critical-item small{display:block;margin-top:3px;color:#6a6f74;font-size:11px;line-height:1.35}.critical-item b{font-size:13px;white-space:nowrap}.critical-empty{border:1px solid #cfe5d9;background:#f2fbf6;border-radius:13px;padding:17px;color:#176846;font-size:12px;font-weight:750}
      .meal-situation-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.meal-situation{border:1px solid #e2e5e8;border-radius:13px;padding:12px;background:#fafbfc}.meal-situation h4{margin:0 0 10px;font-size:13px}.meal-situation-values{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.meal-situation-values span{text-align:center;border-radius:9px;background:#fff;padding:7px 4px}.meal-situation-values em{display:block;font-style:normal;font-size:9px;color:var(--muted)}.meal-situation-values strong{display:block;font-size:17px;margin-top:2px}
      .coverage-box{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}.coverage-stat{border:1px solid #e3e6e8;border-radius:11px;padding:10px;background:#fafbfc}.coverage-stat small{display:block;color:var(--muted);font-size:10px;font-weight:750}.coverage-stat strong{display:block;font-size:20px;margin-top:4px}.coverage-progress{height:9px;background:#eceff1;border-radius:999px;overflow:hidden;margin:10px 0 4px}.coverage-progress>span{display:block;height:100%;background:#1c8a5a;border-radius:999px;transition:width .25s ease}.coverage-caption{font-size:10px;color:var(--muted)}
      .shift-situation-list{display:grid;gap:7px}.shift-situation{border:1px solid #e2e5e8;border-radius:12px;padding:11px 12px}.shift-situation.uncovered{border-color:#e8bcbc;background:#fff9f9}.shift-situation-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.shift-situation strong{font-size:12px}.shift-situation small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.shift-situation-count{font-size:11px;font-weight:850;white-space:nowrap}.shift-situation-count.bad{color:#b00020}
      .situation-quicklinks{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}.situation-quicklink{border:1px solid #dfe3e6;background:#fff;border-radius:12px;padding:11px 8px;font:inherit;font-weight:800;font-size:11px;cursor:pointer}.situation-quicklink:hover{border-color:#d40000;background:#fff8f8}
      .situation-loading{opacity:.6;pointer-events:none}.situation-realtime{font-size:11px;font-weight:800;color:#16794f}.situation-realtime.warning{color:#986800}.situation-toast{position:fixed;right:22px;bottom:22px;z-index:500;max-width:420px;background:#1f2327;color:#fff;border-radius:12px;padding:12px 15px;font-weight:750;box-shadow:0 14px 38px rgba(0,0,0,.22)}.situation-toast.error{background:#b00020}.situation-toast.success{background:#16794f}.situation-toast[hidden]{display:none}
      @media(max-width:1050px){.situation-kpis{grid-template-columns:repeat(2,1fr)}.situation-grid{grid-template-columns:1fr}.situation-quicklinks{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:650px){.situation-head{flex-direction:column}.situation-datebar{width:100%}.situation-datebar input{flex:1;min-width:0}.situation-kpis{grid-template-columns:1fr 1fr}.meal-situation-grid{grid-template-columns:1fr}.situation-quicklinks{grid-template-columns:1fr 1fr}.coverage-box{grid-template-columns:1fr 1fr}.situation-date-title{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function activateView() {
    document.querySelectorAll('.app-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.view === 'situazione');
    });
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'situazione';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    setTimeout(() => $('situationView')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 10);
  }

  function openModule(view) {
    const navButton = document.querySelector(`.app-nav-btn[data-view="${view}"]`);
    if (navButton) {
      navButton.click();
      return;
    }
    const panel = document.querySelector(`[data-view-panel="${view}"]`);
    if (!panel) return;
    document.querySelectorAll('[data-view-panel]').forEach(item => {
      const active = item === panel;
      item.hidden = !active;
      item.classList.toggle('active', active);
    });
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('situationView')) return;

    const nav = workspace.querySelector('.app-nav');
    if (nav) {
      const button = document.createElement('button');
      button.className = 'app-nav-btn';
      button.type = 'button';
      button.dataset.view = 'situazione';
      button.textContent = 'Situazione Campo';
      button.addEventListener('click', activateView);
      nav.appendChild(button);
    }

    const section = document.createElement('section');
    section.id = 'situationView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'situazione';
    section.hidden = true;
    section.innerHTML = `
      <div class="situation-head">
        <div><div class="kicker">Quadro operativo</div><h2>Situazione Campo</h2><p>Indicatori, fabbisogni e criticità aggiornati in tempo reale.</p><div id="situationRealtime" class="situation-realtime">Realtime in attivazione…</div></div>
        <div class="situation-datebar">
          <button id="situationPrevDay" class="situation-date-btn" type="button" title="Giorno precedente">‹</button>
          <input id="situationDate" type="date" min="${CAMP_START}" max="${CAMP_END}">
          <button id="situationNextDay" class="situation-date-btn" type="button" title="Giorno successivo">›</button>
          <button id="situationRefresh" class="btn secondary situation-refresh" type="button">↻ Aggiorna</button>
        </div>
      </div>

      <div class="situation-date-title"><strong id="situationDateTitle">—</strong><span id="situationGenerated">Ultimo aggiornamento —</span></div>

      <div id="situationContent">
        <div class="situation-kpis">
          <article id="situationPeopleCard" class="situation-kpi"><div class="kpi-top"><small>Persone presenti</small><span class="kpi-icon">👥</span></div><strong id="situationPeople">—</strong><em id="situationPeopleMeta">—</em></article>
          <article id="situationVehiclesCard" class="situation-kpi"><div class="kpi-top"><small>Mezzi presenti</small><span class="kpi-icon">🚑</span></div><strong id="situationVehicles">—</strong><em id="situationVehiclesMeta">—</em></article>
          <article id="situationBedsCard" class="situation-kpi"><div class="kpi-top"><small>Pernottamenti</small><span class="kpi-icon">⛺</span></div><strong id="situationBeds">—</strong><em id="situationBedsMeta">—</em></article>
          <article id="situationShiftsCard" class="situation-kpi"><div class="kpi-top"><small>Turni scoperti</small><span class="kpi-icon">🗓️</span></div><strong id="situationShifts">—</strong><em id="situationShiftsMeta">—</em></article>
        </div>

        <div class="situation-grid">
          <div style="display:grid;gap:14px">
            <section class="situation-panel">
              <div class="situation-panel-head"><div><div class="panel-kicker">Copertura operativa</div><h3>Turni della giornata</h3></div><button class="panel-link" type="button" data-situation-open="turni">Apri Turni</button></div>
              <div class="coverage-box">
                <div class="coverage-stat"><small>Richiesti</small><strong id="situationRequired">0</strong></div>
                <div class="coverage-stat"><small>Coperti</small><strong id="situationCovered">0</strong></div>
                <div class="coverage-stat"><small>Confermati</small><strong id="situationConfirmed">0</strong></div>
              </div>
              <div class="coverage-progress"><span id="situationCoverageBar" style="width:0%"></span></div>
              <div id="situationCoverageCaption" class="coverage-caption">—</div>
              <div id="situationShiftList" class="shift-situation-list" style="margin-top:13px"></div>
            </section>

            <section class="situation-panel">
              <div class="situation-panel-head"><div><div class="panel-kicker">Vitto</div><h3>Pasti della giornata</h3></div><button class="panel-link" type="button" data-situation-open="pasti">Apri Pasti</button></div>
              <div id="situationMeals" class="meal-situation-grid"></div>
            </section>
          </div>

          <div style="display:grid;gap:14px">
            <section class="situation-panel">
              <div class="panel-kicker">Attenzione</div><h3>Criticità operative</h3><p>Situazioni che richiedono una verifica della Segreteria.</p>
              <div id="situationCriticalList" class="critical-list"></div>
            </section>

            <section class="situation-panel">
              <div class="panel-kicker">Accesso rapido</div><h3>Moduli del Campo</h3><p>Apri direttamente il modulo operativo interessato.</p>
              <div class="situation-quicklinks">
                <button class="situation-quicklink" type="button" data-situation-open="persone">👥 Persone</button>
                <button class="situation-quicklink" type="button" data-situation-open="turni">🗓️ Turni</button>
                <button class="situation-quicklink" type="button" data-situation-open="pernottamenti">⛺ Tende</button>
                <button class="situation-quicklink" type="button" data-situation-open="pasti">🍽️ Pasti</button>
                <button class="situation-quicklink" type="button" data-situation-open="mezzi">🚑 Mezzi</button>
              </div>
            </section>
          </div>
        </div>
      </div>`;
    workspace.appendChild(section);

    const dashboardCards = [...workspace.querySelectorAll('.module-card')];
    const card = dashboardCards.find(item => item.querySelector('strong')?.textContent.trim() === 'Situazione Campo');
    if (card) {
      card.classList.add('module-button', 'active-module');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const status = card.querySelector('em');
      if (status) status.textContent = 'Operativo';
      const open = () => activateView();
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    }

    const toast = document.createElement('div');
    toast.id = 'situationToast';
    toast.className = 'situation-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    $('situationDate').value = currentDate;
    $('situationDate').addEventListener('change', () => {
      currentDate = clampDate($('situationDate').value);
      $('situationDate').value = currentDate;
      loadDashboard();
    });
    $('situationPrevDay').addEventListener('click', () => changeDay(-1));
    $('situationNextDay').addEventListener('click', () => changeDay(1));
    $('situationRefresh').addEventListener('click', () => loadDashboard());
    section.addEventListener('click', event => {
      const button = event.target.closest('[data-situation-open]');
      if (button) openModule(button.dataset.situationOpen);
    });
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = String(value ?? '—');
  }

  function setCardState(id, state = '') {
    const el = $(id);
    if (!el) return;
    el.classList.remove('alert', 'warning', 'good');
    if (state) el.classList.add(state);
  }

  function changeDay(amount) {
    const next = addDays(currentDate, amount);
    if (next < CAMP_START || next > CAMP_END) return;
    currentDate = next;
    $('situationDate').value = currentDate;
    loadDashboard();
  }

  function updateDateControls() {
    setText('situationDateTitle', formatDate(currentDate));
    $('situationPrevDay').disabled = currentDate <= CAMP_START;
    $('situationNextDay').disabled = currentDate >= CAMP_END;
  }

  function renderMeals(pasti = {}) {
    const definitions = [
      ['colazione', 'Colazione'], ['pranzo', 'Pranzo'], ['cena', 'Cena']
    ];
    $('situationMeals').innerHTML = definitions.map(([key, label]) => {
      const row = pasti[key] || {};
      return `<article class="meal-situation"><h4>${label}</h4><div class="meal-situation-values"><span><em>Previsti</em><strong>${Number(row.previsti || 0)}</strong></span><span><em>Consumati</em><strong>${Number(row.consumati || 0)}</strong></span><span><em>Restanti</em><strong>${Number(row.restanti || 0)}</strong></span></div></article>`;
    }).join('');
  }

  function renderShifts(turni = {}) {
    const requested = Number(turni.personale_richiesto || 0);
    const covered = Number(turni.personale_coperto || 0);
    const confirmed = Number(turni.personale_confermato || 0);
    setText('situationRequired', requested);
    setText('situationCovered', covered);
    setText('situationConfirmed', confirmed);

    const percentage = requested > 0 ? Math.min(100, Math.round((covered / requested) * 100)) : (Number(turni.totali || 0) ? 100 : 0);
    $('situationCoverageBar').style.width = `${percentage}%`;
    setText('situationCoverageCaption', Number(turni.totali || 0)
      ? `Copertura ${percentage}% · ${Number(turni.totali || 0)} ${Number(turni.totali || 0) === 1 ? 'turno' : 'turni'} nella giornata`
      : 'Nessun turno programmato per questa giornata');

    const rows = Array.isArray(turni.dettaglio) ? turni.dettaglio : [];
    $('situationShiftList').innerHTML = rows.length ? rows.map(row => {
      const uncovered = Number(row.scoperti || 0);
      const title = row.titolo || row.area || 'Turno';
      const meta = [row.area, `${formatTime(row.ora_inizio)}–${formatTime(row.ora_fine)}`, row.luogo].filter(Boolean).join(' · ');
      return `<article class="shift-situation${uncovered > 0 ? ' uncovered' : ''}"><div class="shift-situation-top"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></div><span class="shift-situation-count${uncovered > 0 ? ' bad' : ''}">${Number(row.coperti || 0)}/${Number(row.richiesti || 0)}${uncovered > 0 ? ` · mancano ${uncovered}` : ' · coperto'}</span></div></article>`;
    }).join('') : '<div class="critical-empty">Nessun turno programmato.</div>';
  }

  function renderCriticalities(data) {
    const criticita = data.criticita || {};
    const items = [];

    if (Number(criticita.turni_scoperti || 0) > 0) {
      items.push({
        label: `${Number(criticita.turni_scoperti)} ${Number(criticita.turni_scoperti) === 1 ? 'turno scoperto' : 'turni scoperti'}`,
        detail: 'Il personale assegnato/confermato non copre ancora il fabbisogno previsto.',
        action: 'turni', value: '⚠️'
      });
    }
    if (Number(criticita.pernottamenti_senza_posto || 0) > 0) {
      items.push({
        label: `${Number(criticita.pernottamenti_senza_posto)} ${Number(criticita.pernottamenti_senza_posto) === 1 ? 'pernottamento senza posto' : 'pernottamenti senza posto'}`,
        detail: 'Ci sono persone con pernottamento attivo ma senza letto assegnato.',
        action: 'pernottamenti', value: '⛺'
      });
    }
    if (Number(criticita.posti_emergenza_occupati || 0) > 0) {
      items.push({
        label: `${Number(criticita.posti_emergenza_occupati)} ${Number(criticita.posti_emergenza_occupati) === 1 ? 'posto emergenza occupato' : 'posti emergenza occupati'}`,
        detail: 'Sono in utilizzo posti letto previsti come capacità di emergenza.',
        action: 'pernottamenti', value: '!' , warning: true
      });
    }

    const container = $('situationCriticalList');
    if (!items.length) {
      container.innerHTML = '<div class="critical-empty">✓ Nessuna criticità automatica rilevata.</div>';
      return;
    }
    container.innerHTML = items.map(item => `<button type="button" data-situation-open="${item.action}" class="critical-item${item.warning ? ' warning' : ''}" style="width:100%;text-align:left;font:inherit;cursor:pointer"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></div><b>${escapeHtml(item.value)}</b></button>`).join('');
  }

  function render(data) {
    dashboardData = data || {};
    const persone = dashboardData.persone || {};
    const mezzi = dashboardData.mezzi || {};
    const pernottamenti = dashboardData.pernottamenti || {};
    const turni = dashboardData.turni || {};

    updateDateControls();
    setText('situationGenerated', `Ultimo aggiornamento ${formatGenerated(dashboardData.generato_at)}`);

    setText('situationPeople', `${Number(persone.presenti || 0)} / ${Number(persone.totali || 0)}`);
    setText('situationPeopleMeta', `${Number(persone.previsti_giornata || 0)} previsti nella giornata · ${Number(persone.fuori || 0)} fuori`);
    setCardState('situationPeopleCard', Number(persone.presenti || 0) > 0 ? 'good' : '');

    setText('situationVehicles', `${Number(mezzi.presenti || 0)} / ${Number(mezzi.totali || 0)}`);
    setText('situationVehiclesMeta', `${Number(mezzi.fuori || 0)} fuori dal Campo`);
    setCardState('situationVehiclesCard', Number(mezzi.presenti || 0) > 0 ? 'good' : '');

    setText('situationBeds', `${Number(pernottamenti.letti_occupati || 0)} / ${Number(pernottamenti.previsti || 0)}`);
    setText('situationBedsMeta', `${Number(pernottamenti.senza_posto || 0)} senza posto · emergenza ${Number(pernottamenti.posti_emergenza_occupati || 0)}/${Number(pernottamenti.posti_emergenza_attivi || 0)}`);
    setCardState('situationBedsCard', Number(pernottamenti.senza_posto || 0) > 0 ? 'alert' : (Number(pernottamenti.posti_emergenza_occupati || 0) > 0 ? 'warning' : 'good'));

    setText('situationShifts', Number(turni.scoperti || 0));
    setText('situationShiftsMeta', `${Number(turni.totali || 0)} totali · ${Number(turni.personale_coperto || 0)}/${Number(turni.personale_richiesto || 0)} copertura`);
    setCardState('situationShiftsCard', Number(turni.scoperti || 0) > 0 ? 'alert' : 'good');

    renderShifts(turni);
    renderMeals(dashboardData.pasti || {});
    renderCriticalities(dashboardData);
  }

  async function loadDashboard(options = {}) {
    if (loading) return;
    loading = true;
    const content = $('situationContent');
    if (content && !options.silent) content.classList.add('situation-loading');
    if ($('situationRefresh')) $('situationRefresh').disabled = true;
    updateDateControls();

    try {
      const { data, error } = await client.rpc('situazione_campo_dashboard', { p_data: currentDate });
      if (error) throw error;
      render(data || {});
    } catch (error) {
      showToast(`Situazione Campo non disponibile: ${error.message}`, 'error');
    } finally {
      loading = false;
      if (content) content.classList.remove('situation-loading');
      if ($('situationRefresh')) $('situationRefresh').disabled = false;
    }
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadDashboard({ silent: true }), 220);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-situazione-generale');
    [
      'persone', 'movimenti_persone', 'posti_letto', 'tende',
      'mezzi', 'movimenti_mezzi', 'attivazioni_mezzi',
      'turni', 'persone_turni', 'servizi_pasto', 'persone_pasti'
    ].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    });
    realtimeChannel.subscribe(status => {
      const el = $('situationRealtime');
      if (!el) return;
      if (status === 'SUBSCRIBED') {
        el.textContent = '● Realtime collegato';
        el.className = 'situation-realtime';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        el.textContent = 'Realtime da riconnettere';
        el.className = 'situation-realtime warning';
      }
    });
  }

  async function init() {
    if (!config || !window.supabase || !$('standardWorkspace')) return;
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    profile = await getProfile();
    if (!profile || !['admin', 'segreteria'].includes(profile.ruolo)) return;

    currentDate = initialDate();
    injectStyles();
    injectUi();
    await loadDashboard();
    connectRealtime();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
