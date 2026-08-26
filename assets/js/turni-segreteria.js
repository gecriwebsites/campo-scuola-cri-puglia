(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let areas = [];
  let shifts = [];
  let links = [];
  let people = [];
  let currentDate = CAMP_START;
  let currentArea = '';
  let selectedShiftId = null;
  let editingShiftId = null;
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;

  const stateLabels = {
    disponibile: 'Disponibile',
    assegnato: 'Assegnato',
    confermato: 'Confermato',
    rinunciato: 'Rinunciato',
    assente: 'Assente'
  };

  const activeCoverageStates = new Set(['assegnato', 'confermato']);
  const visibleLinkedStates = new Set(['disponibile', 'assegnato', 'confermato', 'rinunciato', 'assente']);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('it');
  }

  function fullName(person) {
    return `${person?.nome || ''} ${person?.cognome || ''}`.trim();
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function formatTime(value) {
    return value ? String(value).slice(0, 5) : '—';
  }

  function formatDate(value) {
    if (!value) return '—';
    const [y, m, d] = String(value).split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
  }

  function initialDate() {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return today >= CAMP_START && today <= CAMP_END ? today : CAMP_START;
  }

  function areaById(id) {
    return areas.find(area => area.id === id) || null;
  }

  function shiftById(id) {
    return shifts.find(shift => shift.id === id) || null;
  }

  function personById(id) {
    return people.find(person => person.id === id) || null;
  }

  function linksForShift(shiftId) {
    return links.filter(link => link.turno_id === shiftId && visibleLinkedStates.has(link.stato));
  }

  function showToast(message, type = '') {
    const toast = $('shiftToast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `shift-toast${type ? ` ${type}` : ''}`;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  async function getProfile() {
    const { data, error } = await client
      .from('utenti_segreteria')
      .select('ruolo,attivo')
      .eq('user_id', session.user.id)
      .maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function injectStyles() {
    if ($('shiftModuleStyles')) return;
    const style = document.createElement('style');
    style.id = 'shiftModuleStyles';
    style.textContent = `
      .shift-view-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:10px 0 18px}.shift-view-head h2{font-size:34px;margin:5px 0}.shift-view-head p{margin:0;color:var(--muted)}
      .shift-head-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.shift-realtime{font-size:11px;font-weight:850;color:#16794f}.shift-realtime.warning{color:#9a6500}
      .shift-filter-bar{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;grid-template-columns:minmax(190px,.65fr) minmax(200px,.8fr) 46px;gap:10px;align-items:end;box-shadow:0 5px 18px rgba(20,20,20,.03)}
      .shift-filter-bar label{font-size:11px;font-weight:850;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.shift-filter-bar input,.shift-filter-bar select{display:block;width:100%;height:46px;margin-top:6px;border:1px solid #ccd2d8;border-radius:11px;background:#fff;padding:0 11px;font:inherit}
      .shift-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:11px;margin:14px 0}.shift-summary-card{background:#fff;border:1px solid var(--line);border-radius:15px;padding:14px;box-shadow:0 5px 18px rgba(20,20,20,.03)}.shift-summary-card small{display:block;color:var(--muted);font-weight:750;font-size:11px}.shift-summary-card strong{display:block;font-size:25px;line-height:1;margin-top:5px}.shift-summary-card.covered strong{color:#16794f}.shift-summary-card.gap strong{color:#b00020}
      .shift-day-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:26px 0 12px}.shift-day-title h3{margin:0;font-size:23px}.shift-day-title span{font-size:12px;color:var(--muted)}
      .shift-list{display:grid;gap:11px}.shift-card{background:#fff;border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:0 5px 18px rgba(20,20,20,.03);display:grid;grid-template-columns:minmax(0,1.35fr) minmax(150px,.55fr) minmax(210px,.8fr) auto;gap:15px;align-items:center}.shift-card.shortage{border-color:#e7b5b5}.shift-card.covered{border-color:#cfe4d8}
      .shift-main{display:flex;gap:12px;align-items:flex-start}.shift-area-icon{width:42px;height:42px;border-radius:12px;background:#f4f5f7;display:grid;place-items:center;font-size:19px;flex:0 0 auto}.shift-main h4{margin:0;font-size:16px}.shift-main p{margin:4px 0 0;color:var(--muted);font-size:12px}.shift-main .shift-area{display:inline-flex;margin-top:7px;border-radius:999px;background:#f2f4f7;color:#4c535a;padding:4px 7px;font-size:10px;font-weight:850}
      .shift-time strong{display:block;font-size:16px}.shift-time small{display:block;color:var(--muted);margin-top:3px;font-size:11px}.shift-coverage{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.shift-count{border:1px solid #e3e6e9;background:#fafbfc;border-radius:10px;padding:8px;text-align:center}.shift-count small{display:block;color:var(--muted);font-size:9px;font-weight:800}.shift-count strong{display:block;margin-top:2px;font-size:15px}.shift-count.ok strong{color:#16794f}.shift-count.warn strong{color:#b00020}
      .shift-actions{display:flex;gap:7px;justify-content:flex-end}.shift-actions button{border:1px solid #d7dbe0;background:#fff;border-radius:9px;padding:8px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.shift-actions button.primary{border-color:var(--cri);background:var(--cri);color:#fff}.shift-actions button:hover{border-color:var(--cri)}
      .shift-empty{background:#fff;border:1px dashed #ccd2d8;border-radius:16px;padding:36px 18px;text-align:center;color:var(--muted)}
      .shift-modal[hidden],.shift-toast[hidden]{display:none}.shift-modal{position:fixed;inset:0;z-index:285;display:grid;place-items:center;padding:20px}.shift-modal-backdrop{position:absolute;inset:0;background:rgba(20,23,26,.6);backdrop-filter:blur(4px)}.shift-modal-card{position:relative;width:min(100%,720px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.24)}.shift-modal-card.large{width:min(100%,980px)}
      .shift-modal-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.shift-modal-head h2{margin:5px 0 4px;font-size:25px}.shift-modal-head p{margin:0;color:var(--muted);font-size:12px}.shift-modal-close{border:0;background:#f2f3f4;border-radius:10px;width:36px;height:36px;font-size:22px;cursor:pointer}.shift-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:18px}.shift-form-grid .wide{grid-column:1/-1}.shift-form-grid label{font-size:12px;font-weight:800}.shift-form-grid input,.shift-form-grid select,.shift-form-grid textarea{display:block;width:100%;margin-top:6px;border:1px solid #ccd2d8;border-radius:11px;background:#fff;padding:0 11px;font:inherit}.shift-form-grid input,.shift-form-grid select{height:45px}.shift-form-grid textarea{padding:10px 11px;resize:vertical}.shift-form-actions{display:flex;justify-content:space-between;gap:10px;margin-top:17px;align-items:center}.shift-form-actions-right{display:flex;gap:8px}.shift-danger{border:1px solid #e4b4bd;background:#fff5f7;color:#b00020;border-radius:10px;padding:9px 12px;font:inherit;font-weight:850;cursor:pointer}
      .shift-manage-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.shift-meta-pill{display:inline-flex;border:1px solid #dde1e5;border-radius:999px;padding:6px 9px;background:#fafbfc;font-size:11px;font-weight:750}.shift-manage-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:15px}.shift-manage-summary span{border:1px solid #e2e5e8;border-radius:10px;padding:8px;text-align:center}.shift-manage-summary small{display:block;color:var(--muted);font-size:9px}.shift-manage-summary strong{display:block;margin-top:2px;font-size:15px}
      .shift-manage-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:14px}.shift-linked,.shift-candidates{border:1px solid #e0e4e8;border-radius:14px;padding:13px;background:#fafbfc}.shift-panel-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.shift-panel-title h3{margin:0;font-size:17px}.shift-panel-title small{color:var(--muted)}
      .shift-person-list{display:grid;gap:7px;max-height:470px;overflow:auto}.shift-person-row{background:#fff;border:1px solid #e0e4e8;border-radius:11px;padding:10px}.shift-person-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.shift-person-top strong{display:block;font-size:12px}.shift-person-top small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.shift-state-select{height:34px;border:1px solid #ccd2d8;border-radius:9px;background:#fff;padding:0 7px;font:inherit;font-size:10px;font-weight:800}.shift-person-note{display:flex;gap:6px;margin-top:8px}.shift-person-note input{width:100%;height:34px;border:1px solid #d8dde1;border-radius:8px;padding:0 8px;font:inherit;font-size:10px}.shift-person-note button,.shift-remove-person{border:1px solid #d7dbe0;background:#fff;border-radius:8px;padding:0 9px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.shift-remove-person{color:#b00020;border-color:#e6c1c8}.shift-source{display:inline-flex;margin-top:6px;border-radius:999px;background:#f1f2f4;padding:3px 6px;font-size:9px;color:#666}
      .shift-candidate-search{display:flex;align-items:center;gap:7px;border:1px solid #ccd2d8;background:#fff;border-radius:10px;padding:0 10px}.shift-candidate-search input{width:100%;height:42px;border:0;outline:0;font:inherit}.shift-add-state{display:flex;align-items:center;gap:7px;margin:9px 0}.shift-add-state label{font-size:10px;font-weight:800;color:var(--muted)}.shift-add-state select{height:34px;border:1px solid #ccd2d8;border-radius:8px;background:#fff;padding:0 7px;font:inherit;font-size:10px}.shift-candidate-row{display:flex;justify-content:space-between;gap:9px;align-items:center;background:#fff;border:1px solid #e1e4e7;border-radius:10px;padding:9px}.shift-candidate-row strong{display:block;font-size:12px}.shift-candidate-row small{display:block;color:var(--muted);font-size:9px;margin-top:2px}.shift-candidate-row button{border:0;background:var(--cri);color:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.shift-candidate-row button:disabled{background:#bbb;cursor:not-allowed}
      .shift-toast{position:fixed;right:22px;bottom:22px;z-index:420;max-width:420px;background:#1f2327;color:#fff;border-radius:12px;padding:12px 15px;font-weight:750;box-shadow:0 14px 38px rgba(0,0,0,.22)}.shift-toast.success{background:#16794f}.shift-toast.error{background:#b00020}.shift-toast.warning{background:#8b6100}
      @media(max-width:1000px){.shift-summary{grid-template-columns:repeat(3,1fr)}.shift-card{grid-template-columns:1fr 1fr}.shift-actions{justify-content:flex-start}.shift-manage-layout{grid-template-columns:1fr}.shift-filter-bar{grid-template-columns:1fr 1fr 46px}}
      @media(max-width:680px){.shift-view-head{align-items:flex-start;flex-direction:column}.shift-head-actions{justify-content:flex-start}.shift-filter-bar{grid-template-columns:1fr}.shift-summary{grid-template-columns:repeat(2,1fr)}.shift-card{grid-template-columns:1fr}.shift-coverage{grid-template-columns:repeat(3,1fr)}.shift-form-grid{grid-template-columns:1fr}.shift-form-grid .wide{grid-column:auto}.shift-manage-summary{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('shiftView')) return;

    const nav = workspace.querySelector('.app-nav');
    if (nav) {
      const button = document.createElement('button');
      button.className = 'app-nav-btn';
      button.type = 'button';
      button.dataset.view = 'turni';
      button.textContent = 'Turni';
      button.addEventListener('click', activateView);
      const pasti = nav.querySelector('[data-view="pasti"]');
      if (pasti) nav.insertBefore(button, pasti);
      else nav.appendChild(button);
    }

    const section = document.createElement('section');
    section.id = 'shiftView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'turni';
    section.hidden = true;
    section.innerHTML = `
      <div class="shift-view-head">
        <div><div class="kicker">Organizzazione operativa</div><h2>Turni</h2><p>Disponibilità, assegnazioni, conferme e fabbisogno per giornata e area.</p><div id="shiftRealtime" class="shift-realtime">Realtime in attivazione…</div></div>
        <div class="shift-head-actions"><button id="shiftRefresh" class="btn secondary" type="button">↻ Aggiorna</button><button id="shiftCreate" class="btn primary" type="button">＋ Nuovo turno</button></div>
      </div>
      <div class="shift-filter-bar">
        <label>Giornata<input id="shiftDate" type="date" min="${CAMP_START}" max="${CAMP_END}"></label>
        <label>Area<select id="shiftAreaFilter"><option value="">Tutte le aree</option></select></label>
        <button id="shiftToday" class="icon-btn" type="button" title="Data iniziale">↺</button>
      </div>
      <div class="shift-summary">
        <article class="shift-summary-card"><small>Turni</small><strong id="shiftMetricCount">0</strong></article>
        <article class="shift-summary-card"><small>Fabbisogno</small><strong id="shiftMetricRequired">0</strong></article>
        <article class="shift-summary-card covered"><small>Coperti</small><strong id="shiftMetricCovered">0</strong></article>
        <article class="shift-summary-card"><small>Confermati</small><strong id="shiftMetricConfirmed">0</strong></article>
        <article class="shift-summary-card gap"><small>Scoperti</small><strong id="shiftMetricGap">0</strong></article>
      </div>
      <div class="shift-day-title"><h3 id="shiftDayTitle">—</h3><span id="shiftDayMeta"></span></div>
      <div id="shiftList" class="shift-list"></div>`;

    const pastiView = workspace.querySelector('[data-view-panel="pasti"]');
    if (pastiView) workspace.insertBefore(section, pastiView);
    else workspace.appendChild(section);

    const dashboardCards = [...workspace.querySelectorAll('.module-card')];
    const card = dashboardCards.find(item => item.querySelector('strong')?.textContent.trim() === 'Turni');
    if (card) {
      card.classList.add('module-button', 'active-module');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const status = card.querySelector('em');
      if (status) status.textContent = 'Operativo';
      const open = () => activateView();
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    }

    const editModal = document.createElement('div');
    editModal.id = 'shiftEditModal';
    editModal.className = 'shift-modal';
    editModal.hidden = true;
    editModal.innerHTML = `<div class="shift-modal-backdrop" data-close-shift-edit></div><section class="shift-modal-card" role="dialog" aria-modal="true"><div class="shift-modal-head"><div><div class="kicker">Turno operativo</div><h2 id="shiftEditTitle">Nuovo turno</h2><p>Definisci data, area, orario, luogo e fabbisogno.</p></div><button class="shift-modal-close" type="button" data-close-shift-edit>×</button></div><form id="shiftForm"><div class="shift-form-grid"><label>Data<input id="shiftFormDate" type="date" min="${CAMP_START}" max="${CAMP_END}" required></label><label>Area<select id="shiftFormArea" required></select></label><label>Ora inizio<input id="shiftFormStart" type="time"></label><label>Ora fine<input id="shiftFormEnd" type="time"></label><label class="wide">Titolo<input id="shiftFormTitle" type="text" placeholder="Es. Supporto logistico mattina"></label><label>Luogo<input id="shiftFormPlace" type="text" placeholder="Es. Campo / Segreteria / Mensa"></label><label>Numero richiesto<input id="shiftFormRequired" type="number" min="0" step="1" placeholder="0"></label><label class="wide">Note<textarea id="shiftFormNotes" rows="3" placeholder="Indicazioni operative facoltative"></textarea></label></div><div id="shiftFormMessage" class="form-message" aria-live="polite"></div><div class="shift-form-actions"><button id="shiftDelete" class="shift-danger" type="button" hidden>Elimina turno</button><div class="shift-form-actions-right"><button class="btn secondary" type="button" data-close-shift-edit>Annulla</button><button id="shiftSave" class="btn primary" type="submit">Salva turno</button></div></div></form></section>`;
    document.body.appendChild(editModal);

    const manageModal = document.createElement('div');
    manageModal.id = 'shiftManageModal';
    manageModal.className = 'shift-modal';
    manageModal.hidden = true;
    manageModal.innerHTML = `<div class="shift-modal-backdrop" data-close-shift-manage></div><section class="shift-modal-card large" role="dialog" aria-modal="true"><div class="shift-modal-head"><div><div class="kicker">Assegnazioni</div><h2 id="shiftManageTitle">Gestione turno</h2><p id="shiftManageSubtitle"></p></div><button class="shift-modal-close" type="button" data-close-shift-manage>×</button></div><div id="shiftManageMeta" class="shift-manage-meta"></div><div id="shiftManageSummary" class="shift-manage-summary"></div><div class="shift-manage-layout"><section class="shift-linked"><div class="shift-panel-title"><h3>Persone collegate</h3><small id="shiftLinkedCount">0</small></div><div id="shiftLinkedList" class="shift-person-list"></div></section><section class="shift-candidates"><div class="shift-panel-title"><h3>Aggiungi persona</h3><small>Ricerca anagrafica</small></div><div class="shift-candidate-search"><span>⌕</span><input id="shiftCandidateSearch" type="search" placeholder="Nome, cognome, CF, badge…" autocomplete="off"></div><div class="shift-add-state"><label>Stato iniziale</label><select id="shiftCandidateState"><option value="disponibile">Disponibile</option><option value="assegnato">Assegnato</option><option value="confermato">Confermato</option></select></div><div id="shiftCandidateList" class="shift-person-list"></div></section></div></section>`;
    document.body.appendChild(manageModal);

    const toast = document.createElement('div');
    toast.id = 'shiftToast';
    toast.className = 'shift-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    $('shiftDate').value = currentDate;
    $('shiftDate').addEventListener('change', () => { currentDate = $('shiftDate').value || CAMP_START; render(); });
    $('shiftAreaFilter').addEventListener('change', () => { currentArea = $('shiftAreaFilter').value; render(); });
    $('shiftToday').addEventListener('click', () => { currentDate = initialDate(); $('shiftDate').value = currentDate; render(); });
    $('shiftRefresh').addEventListener('click', loadAll);
    $('shiftCreate').addEventListener('click', () => openShiftEditor());
    $('shiftList').addEventListener('click', event => {
      const manage = event.target.closest('[data-manage-shift]');
      const edit = event.target.closest('[data-edit-shift]');
      if (manage) openManageShift(manage.dataset.manageShift);
      if (edit) openShiftEditor(edit.dataset.editShift);
    });
    $('shiftForm').addEventListener('submit', saveShift);
    $('shiftDelete').addEventListener('click', deleteShift);
    $('shiftCandidateSearch').addEventListener('input', renderCandidates);
    $('shiftLinkedList').addEventListener('change', event => {
      const select = event.target.closest('[data-shift-link-state]');
      if (select) updateLinkState(select.dataset.shiftLinkState, select.value);
    });
    $('shiftLinkedList').addEventListener('click', event => {
      const save = event.target.closest('[data-save-shift-note]');
      const remove = event.target.closest('[data-remove-shift-person]');
      if (save) saveLinkNote(save.dataset.saveShiftNote);
      if (remove) removeLink(remove.dataset.removeShiftPerson);
    });
    $('shiftCandidateList').addEventListener('click', event => {
      const add = event.target.closest('[data-add-shift-person]');
      if (add) addPersonToShift(add.dataset.addShiftPerson);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-close-shift-edit]')) closeShiftEditor();
      if (event.target.closest('[data-close-shift-manage]')) closeManageShift();
    });
  }

  function activateView() {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'turni'));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'turni';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    render();
  }

  function renderAreaOptions() {
    const filter = $('shiftAreaFilter');
    const form = $('shiftFormArea');
    if (!filter || !form) return;
    const filterValue = currentArea;
    filter.innerHTML = '<option value="">Tutte le aree</option>' + areas.map(area => `<option value="${area.id}">${escapeHtml(area.nome || area.codice)}</option>`).join('');
    filter.value = filterValue;
    form.innerHTML = '<option value="">Seleziona area…</option>' + areas.map(area => `<option value="${area.id}">${escapeHtml(area.nome || area.codice)}</option>`).join('');
  }

  function filteredShifts() {
    return shifts.filter(shift => shift.attivo !== false && shift.data === currentDate && (!currentArea || shift.area_servizio_id === currentArea));
  }

  function shiftStats(shift) {
    const rows = linksForShift(shift.id);
    const counts = { disponibile: 0, assegnato: 0, confermato: 0, rinunciato: 0, assente: 0 };
    rows.forEach(row => { if (Object.prototype.hasOwnProperty.call(counts, row.stato)) counts[row.stato] += 1; });
    const covered = counts.assegnato + counts.confermato;
    const required = Number(shift.numero_richiesto || 0);
    const gap = Math.max(0, required - covered);
    return { rows, counts, covered, required, gap };
  }

  function updateMetrics(rows) {
    let required = 0, covered = 0, confirmed = 0;
    rows.forEach(shift => {
      const stats = shiftStats(shift);
      required += stats.required;
      covered += stats.covered;
      confirmed += stats.counts.confermato;
    });
    $('shiftMetricCount').textContent = rows.length;
    $('shiftMetricRequired').textContent = required;
    $('shiftMetricCovered').textContent = covered;
    $('shiftMetricConfirmed').textContent = confirmed;
    $('shiftMetricGap').textContent = Math.max(0, required - covered);
  }

  function render() {
    if (!$('shiftList')) return;
    const rows = filteredShifts().sort((a, b) => String(a.ora_inizio || '').localeCompare(String(b.ora_inizio || '')) || String(a.titolo || '').localeCompare(String(b.titolo || ''), 'it'));
    $('shiftDayTitle').textContent = formatDate(currentDate);
    $('shiftDayMeta').textContent = currentArea ? (areaById(currentArea)?.nome || '') : 'Tutte le aree';
    updateMetrics(rows);

    if (!rows.length) {
      $('shiftList').innerHTML = '<div class="shift-empty"><strong>Nessun turno configurato.</strong><br>Usa “Nuovo turno” per creare la prima fascia operativa della giornata.</div>';
      return;
    }

    $('shiftList').innerHTML = rows.map(shift => {
      const area = areaById(shift.area_servizio_id);
      const stats = shiftStats(shift);
      const coverageClass = stats.required > 0 && stats.gap > 0 ? 'shortage' : (stats.required > 0 && stats.covered >= stats.required ? 'covered' : '');
      const time = shift.ora_inizio || shift.ora_fine ? `${formatTime(shift.ora_inizio)} – ${formatTime(shift.ora_fine)}` : 'Orario da definire';
      return `<article class="shift-card ${coverageClass}">
        <div class="shift-main"><div class="shift-area-icon">🗓️</div><div><h4>${escapeHtml(shift.titolo || area?.nome || 'Turno operativo')}</h4><p>${escapeHtml(shift.luogo || 'Luogo non indicato')}${shift.note ? ` · ${escapeHtml(shift.note)}` : ''}</p><span class="shift-area">${escapeHtml(area?.nome || area?.codice || 'Area non definita')}</span></div></div>
        <div class="shift-time"><strong>${escapeHtml(time)}</strong><small>Fabbisogno: ${stats.required || '—'}</small></div>
        <div class="shift-coverage"><div class="shift-count"><small>Disponibili</small><strong>${stats.counts.disponibile}</strong></div><div class="shift-count ok"><small>Coperti</small><strong>${stats.covered}</strong></div><div class="shift-count ${stats.gap ? 'warn' : 'ok'}"><small>Scoperti</small><strong>${stats.gap}</strong></div></div>
        <div class="shift-actions"><button type="button" data-edit-shift="${shift.id}">Modifica</button><button class="primary" type="button" data-manage-shift="${shift.id}">Gestisci</button></div>
      </article>`;
    }).join('');
  }

  function openShiftEditor(shiftId = null) {
    editingShiftId = shiftId || null;
    const shift = shiftId ? shiftById(shiftId) : null;
    $('shiftEditTitle').textContent = shift ? 'Modifica turno' : 'Nuovo turno';
    $('shiftFormDate').value = shift?.data || currentDate;
    $('shiftFormArea').value = shift?.area_servizio_id || currentArea || '';
    $('shiftFormStart').value = shift?.ora_inizio ? String(shift.ora_inizio).slice(0, 5) : '';
    $('shiftFormEnd').value = shift?.ora_fine ? String(shift.ora_fine).slice(0, 5) : '';
    $('shiftFormTitle').value = shift?.titolo || '';
    $('shiftFormPlace').value = shift?.luogo || '';
    $('shiftFormRequired').value = shift?.numero_richiesto ?? '';
    $('shiftFormNotes').value = shift?.note || '';
    $('shiftFormMessage').textContent = '';
    $('shiftDelete').hidden = !shift;
    $('shiftEditModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeShiftEditor() {
    $('shiftEditModal').hidden = true;
    editingShiftId = null;
    if ($('shiftManageModal')?.hidden) document.body.classList.remove('modal-open');
  }

  async function saveShift(event) {
    event.preventDefault();
    const payload = {
      data: $('shiftFormDate').value,
      area_servizio_id: $('shiftFormArea').value || null,
      ora_inizio: $('shiftFormStart').value || null,
      ora_fine: $('shiftFormEnd').value || null,
      titolo: String($('shiftFormTitle').value || '').trim() || null,
      luogo: String($('shiftFormPlace').value || '').trim() || null,
      numero_richiesto: $('shiftFormRequired').value === '' ? null : Number($('shiftFormRequired').value),
      note: String($('shiftFormNotes').value || '').trim() || null,
      attivo: true
    };
    if (!payload.data || !payload.area_servizio_id) {
      $('shiftFormMessage').textContent = 'Data e area sono obbligatorie.';
      $('shiftFormMessage').className = 'form-message error';
      return;
    }
    if (payload.ora_inizio && payload.ora_fine && payload.ora_fine <= payload.ora_inizio) {
      $('shiftFormMessage').textContent = 'L’ora di fine deve essere successiva all’ora di inizio.';
      $('shiftFormMessage').className = 'form-message error';
      return;
    }

    $('shiftSave').disabled = true;
    $('shiftFormMessage').textContent = 'Salvataggio…';
    $('shiftFormMessage').className = 'form-message';
    const result = editingShiftId
      ? await client.from('turni').update(payload).eq('id', editingShiftId).select().maybeSingle()
      : await client.from('turni').insert(payload).select().single();
    $('shiftSave').disabled = false;
    if (result.error) {
      $('shiftFormMessage').textContent = result.error.message;
      $('shiftFormMessage').className = 'form-message error';
      return;
    }
    currentDate = payload.data;
    $('shiftDate').value = currentDate;
    closeShiftEditor();
    await loadAll({ silent: true });
    showToast(editingShiftId ? 'Turno aggiornato.' : 'Turno creato.', 'success');
  }

  async function deleteShift() {
    if (!editingShiftId) return;
    const shift = shiftById(editingShiftId);
    const linked = linksForShift(editingShiftId).length;
    const message = linked
      ? `Eliminare definitivamente questo turno? Sono collegate ${linked} persone e i relativi collegamenti verranno eliminati.`
      : 'Eliminare definitivamente questo turno?';
    if (!window.confirm(message)) return;
    $('shiftDelete').disabled = true;
    const { error } = await client.from('turni').delete().eq('id', editingShiftId);
    $('shiftDelete').disabled = false;
    if (error) { showToast(`Eliminazione non riuscita: ${error.message}`, 'error'); return; }
    closeShiftEditor();
    await loadAll({ silent: true });
    showToast(`Turno ${shift?.titolo || ''} eliminato.`, 'success');
  }

  function openManageShift(shiftId) {
    selectedShiftId = shiftId;
    renderManageModal();
    $('shiftManageModal').hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => $('shiftCandidateSearch')?.focus(), 30);
  }

  function closeManageShift() {
    $('shiftManageModal').hidden = true;
    selectedShiftId = null;
    if ($('shiftEditModal')?.hidden) document.body.classList.remove('modal-open');
  }

  function renderManageModal() {
    const shift = shiftById(selectedShiftId);
    if (!shift) return;
    const area = areaById(shift.area_servizio_id);
    const stats = shiftStats(shift);
    $('shiftManageTitle').textContent = shift.titolo || area?.nome || 'Gestione turno';
    $('shiftManageSubtitle').textContent = `${formatDate(shift.data)} · ${formatTime(shift.ora_inizio)} – ${formatTime(shift.ora_fine)}`;
    $('shiftManageMeta').innerHTML = [
      area?.nome || area?.codice,
      shift.luogo,
      shift.numero_richiesto != null ? `Richiesti ${shift.numero_richiesto}` : null
    ].filter(Boolean).map(value => `<span class="shift-meta-pill">${escapeHtml(value)}</span>`).join('');
    $('shiftManageSummary').innerHTML = Object.keys(stateLabels).map(state => `<span><small>${stateLabels[state]}</small><strong>${stats.counts[state] || 0}</strong></span>`).join('');
    renderLinkedPeople();
    renderCandidates();
  }

  function renderLinkedPeople() {
    const rows = linksForShift(selectedShiftId).sort((a, b) => fullName(personById(a.persona_id)).localeCompare(fullName(personById(b.persona_id)), 'it'));
    $('shiftLinkedCount').textContent = `${rows.length} ${rows.length === 1 ? 'persona' : 'persone'}`;
    $('shiftLinkedList').innerHTML = rows.map(link => {
      const person = personById(link.persona_id);
      if (!person) return '';
      const options = Object.entries(stateLabels).map(([value, label]) => `<option value="${value}" ${link.stato === value ? 'selected' : ''}>${label}</option>`).join('');
      return `<article class="shift-person-row"><div class="shift-person-top"><div><strong>${escapeHtml(fullName(person))}</strong><small>${escapeHtml([person.comitato, person.numero_badge ? `Badge ${person.numero_badge}` : null].filter(Boolean).join(' · ') || person.codice_fiscale || 'Anagrafica Campo')}</small><span class="shift-source">Fonte: ${escapeHtml(link.fonte || 'manuale')}</span></div><select class="shift-state-select" data-shift-link-state="${link.id}">${options}</select></div><div class="shift-person-note"><input type="text" value="${escapeHtml(link.note || '')}" placeholder="Nota facoltativa" data-shift-note-input="${link.id}"><button type="button" data-save-shift-note="${link.id}">Salva nota</button><button class="shift-remove-person" type="button" data-remove-shift-person="${link.id}">Rimuovi</button></div></article>`;
    }).join('') || '<div class="shift-empty" style="padding:22px 12px">Nessuna persona collegata al turno.</div>';
  }

  function candidateHaystack(person) {
    return normalize([person.nome, person.cognome, person.codice_fiscale, person.comitato, person.numero_badge].filter(Boolean).join(' '));
  }

  function renderCandidates() {
    if (!$('shiftCandidateList')) return;
    const q = normalize($('shiftCandidateSearch').value);
    const linkedIds = new Set(linksForShift(selectedShiftId).map(link => link.persona_id));
    const candidates = people.filter(person => !linkedIds.has(person.id) && (!q || candidateHaystack(person).includes(q))).slice(0, 80);
    $('shiftCandidateList').innerHTML = candidates.map(person => `<div class="shift-candidate-row"><div><strong>${escapeHtml(fullName(person))}</strong><small>${escapeHtml([person.comitato, person.numero_badge ? `Badge ${person.numero_badge}` : null].filter(Boolean).join(' · ') || person.codice_fiscale || 'Anagrafica Campo')}</small></div><button type="button" data-add-shift-person="${person.id}">Aggiungi</button></div>`).join('') || '<div class="shift-empty" style="padding:22px 12px">Nessuna persona disponibile per questa ricerca.</div>';
  }

  async function addPersonToShift(personId) {
    if (!selectedShiftId) return;
    const state = $('shiftCandidateState').value || 'disponibile';
    const { data, error } = await client.rpc('imposta_partecipazione_turno', {
      p_persona_id: personId,
      p_turno_id: selectedShiftId,
      p_stato: state,
      p_fonte: 'manuale',
      p_note: null,
      p_postazione: getStation(),
      p_importazione_id: null
    });
    if (error) { showToast(`Assegnazione non riuscita: ${error.message}`, 'error'); return; }
    if (data?.status !== 'salvato') { showToast('Assegnazione non completata.', 'error'); return; }
    await loadLinks();
    render();
    renderManageModal();
    showToast(`${fullName(personById(personId))} aggiunto al turno.`, 'success');
  }

  function linkById(id) {
    return links.find(link => link.id === id) || null;
  }

  async function updateLinkState(linkId, state) {
    const link = linkById(linkId);
    if (!link) return;
    const { data, error } = await client.rpc('imposta_partecipazione_turno', {
      p_persona_id: link.persona_id,
      p_turno_id: link.turno_id,
      p_stato: state,
      p_fonte: link.fonte || 'manuale',
      p_note: link.note || null,
      p_postazione: getStation(),
      p_importazione_id: link.importazione_id || null
    });
    if (error || data?.status !== 'salvato') {
      showToast(`Stato non aggiornato${error ? `: ${error.message}` : '.'}`, 'error');
      await loadLinks(); renderManageModal(); return;
    }
    await loadLinks();
    render();
    renderManageModal();
    showToast(`Stato aggiornato: ${stateLabels[state] || state}.`, 'success');
  }

  async function saveLinkNote(linkId) {
    const link = linkById(linkId);
    if (!link) return;
    const input = document.querySelector(`[data-shift-note-input="${linkId}"]`);
    const note = String(input?.value || '').trim() || null;
    const { data, error } = await client.rpc('imposta_partecipazione_turno', {
      p_persona_id: link.persona_id,
      p_turno_id: link.turno_id,
      p_stato: link.stato,
      p_fonte: link.fonte || 'manuale',
      p_note: note,
      p_postazione: getStation(),
      p_importazione_id: link.importazione_id || null
    });
    if (error || data?.status !== 'salvato') { showToast(`Nota non salvata${error ? `: ${error.message}` : '.'}`, 'error'); return; }
    await loadLinks();
    renderManageModal();
    showToast('Nota aggiornata.', 'success');
  }

  async function removeLink(linkId) {
    const link = linkById(linkId);
    const person = link ? personById(link.persona_id) : null;
    if (!link) return;
    if (!window.confirm(`Rimuovere ${fullName(person)} da questo turno?`)) return;
    const { data, error } = await client.rpc('rimuovi_partecipazione_turno', {
      p_persona_id: link.persona_id,
      p_turno_id: link.turno_id,
      p_postazione: getStation()
    });
    if (error || data?.status !== 'rimosso') { showToast(`Rimozione non riuscita${error ? `: ${error.message}` : '.'}`, 'error'); return; }
    await loadLinks();
    render();
    renderManageModal();
    showToast('Persona rimossa dal turno.', 'success');
  }

  async function loadAreas() {
    const { data, error } = await client.from('aree_servizio').select('*').eq('attivo', true).order('nome', { ascending: true });
    if (error) throw error;
    areas = data || [];
    renderAreaOptions();
  }

  async function loadShifts() {
    const { data, error } = await client.from('turni').select('*').gte('data', CAMP_START).lte('data', CAMP_END).order('data', { ascending: true }).order('ora_inizio', { ascending: true });
    if (error) throw error;
    shifts = data || [];
  }

  async function loadLinks() {
    const { data, error } = await client.from('persone_turni').select('*').limit(10000);
    if (error) throw error;
    links = data || [];
  }

  async function loadPeople() {
    const { data, error } = await client.from('persone').select('id,nome,cognome,codice_fiscale,numero_badge,comitato,attivo').eq('attivo', true).order('cognome', { ascending: true }).order('nome', { ascending: true }).limit(3000);
    if (error) throw error;
    people = data || [];
  }

  async function loadAll(options = {}) {
    if (!options.silent && $('shiftRefresh')) $('shiftRefresh').disabled = true;
    try {
      await Promise.all([loadAreas(), loadShifts(), loadLinks(), loadPeople()]);
      render();
      if (selectedShiftId) {
        if (shiftById(selectedShiftId)) renderManageModal();
        else closeManageShift();
      }
    } catch (error) {
      showToast(`Modulo Turni non disponibile: ${error.message}`, 'error');
    } finally {
      if (!options.silent && $('shiftRefresh')) $('shiftRefresh').disabled = false;
    }
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadAll({ silent: true }), 180);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-segreteria-turni');
    ['turni', 'persone_turni', 'aree_servizio', 'persone'].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    });
    realtimeChannel.subscribe(status => {
      const el = $('shiftRealtime');
      if (!el) return;
      if (status === 'SUBSCRIBED') {
        el.textContent = '● Realtime collegato';
        el.className = 'shift-realtime';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        el.textContent = 'Realtime da riconnettere';
        el.className = 'shift-realtime warning';
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
    await loadAll();
    connectRealtime();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
