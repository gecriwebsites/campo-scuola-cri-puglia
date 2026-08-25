(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let tents = [];
  let beds = [];
  let people = [];
  let typesByPerson = new Map();
  let selectedBed = null;
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;

  const destinationLabels = {
    uomini: 'Uomini',
    donne: 'Donne',
    faculty: 'Faculty',
    da_definire: 'Da definire'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('it');
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function fullName(person) {
    return `${person?.nome || ''} ${person?.cognome || ''}`.trim();
  }

  function showToast(message, type = '') {
    let toast = $('overnightToast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `overnight-toast${type ? ` ${type}` : ''}`;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3400);
  }

  function injectStyles() {
    if ($('overnightModuleStyles')) return;
    const style = document.createElement('style');
    style.id = 'overnightModuleStyles';
    style.textContent = `
      .overnight-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}
      .overnight-summary-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 5px 18px rgba(20,20,20,.035)}
      .overnight-summary-card small{display:block;color:var(--muted);font-weight:750}.overnight-summary-card strong{display:block;font-size:28px;margin-top:5px}
      .overnight-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px;align-items:start}
      .tent-list{display:grid;gap:14px}.tent-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 5px 18px rgba(20,20,20,.035)}
      .tent-card.faculty{border-color:#d8c9ef}.tent-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
      .tent-title{display:flex;gap:12px;align-items:flex-start}.tent-icon{width:42px;height:42px;border-radius:12px;background:#f3f5f7;display:grid;place-items:center;font-size:20px}
      .tent-title h3{margin:0;font-size:19px}.tent-title p{margin:4px 0 0;color:var(--muted);font-size:12px}.tent-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      .tent-destination{height:38px;border:1px solid #ccd2d8;border-radius:10px;background:#fff;padding:0 10px;font:inherit;font-size:12px;font-weight:750}
      .emergency-toggle{border:1px solid #e5c27d;background:#fffaf0;color:#7d5700;border-radius:10px;padding:9px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}
      .emergency-toggle.active{background:#fff0cf;border-color:#d7a73f}.emergency-toggle:disabled,.tent-destination:disabled{opacity:.55;cursor:not-allowed}
      .bed-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.bed-slot{min-height:74px;border:1px solid #dfe3e7;background:#fafbfc;border-radius:12px;padding:9px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;text-align:left;font:inherit;cursor:pointer}
      .bed-slot:hover:not(:disabled){border-color:#d40000;background:#fff8f8}.bed-slot strong{font-size:12px}.bed-slot small{font-size:10px;color:var(--muted);line-height:1.2}.bed-slot.occupied{background:#eef8f3;border-color:#b9dec9}.bed-slot.occupied strong{color:#136a46}.bed-slot.emergency{border-style:dashed;border-color:#e5c27d;background:#fffaf0}.bed-slot.emergency.disabled{background:#f6f6f6;border-color:#ddd;color:#999}.bed-slot:disabled{cursor:not-allowed}
      .bed-badge{display:inline-flex;border-radius:999px;padding:3px 6px;font-size:9px;font-weight:850;background:#f0f2f4;color:#5d646b}.bed-slot.emergency .bed-badge{background:#fff0cf;color:#7d5700}
      .overnight-side{display:grid;gap:14px;position:sticky;top:150px}.overnight-side-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:17px}.overnight-side-card h3{margin:4px 0 6px;font-size:18px}.overnight-side-card>p{margin:0 0 12px;color:var(--muted);font-size:12px}
      .unassigned-list{display:grid;gap:7px;max-height:420px;overflow:auto}.unassigned-person{border:1px solid #e4e7ea;border-radius:10px;padding:9px 10px;background:#fafbfc}.unassigned-person strong{display:block;font-size:12px}.unassigned-person small{display:block;margin-top:2px;color:var(--muted);font-size:10px}.unassigned-person.warn{border-color:#efd79e;background:#fffaf0}
      .overnight-empty{padding:18px;text-align:center;color:var(--muted);font-size:12px}.overnight-realtime{font-size:11px;font-weight:800;color:#16794f;margin:4px 0 0}
      .overnight-modal[hidden],.overnight-toast[hidden]{display:none}.overnight-modal{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:20px}.overnight-backdrop{position:absolute;inset:0;background:rgba(20,23,26,.58);backdrop-filter:blur(4px)}
      .overnight-modal-card{position:relative;width:min(100%,620px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.24)}
      .overnight-modal-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.overnight-modal-head h2{margin:5px 0 4px;font-size:25px}.overnight-modal-head p{margin:0;color:var(--muted);font-size:13px}.overnight-close{border:0;background:#f2f3f4;border-radius:10px;width:36px;height:36px;font-size:22px;cursor:pointer}
      .overnight-search{margin-top:17px;display:flex;align-items:center;gap:8px;border:1px solid #ccd2d8;border-radius:12px;padding:0 12px}.overnight-search input{width:100%;height:46px;border:0;outline:0;font:inherit}
      .overnight-candidates{display:grid;gap:7px;margin-top:10px}.overnight-candidate{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #e0e4e8;background:#fafbfc;border-radius:11px;padding:10px 11px}.overnight-candidate strong{display:block;font-size:13px}.overnight-candidate small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.overnight-candidate button{border:0;background:var(--cri);color:#fff;border-radius:9px;padding:8px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}
      .occupied-person-card{margin-top:17px;border:1px solid #cfe5d9;background:#f2fbf6;border-radius:14px;padding:14px}.occupied-person-card h3{margin:0 0 4px}.occupied-person-card p{margin:0;color:#55605a;font-size:12px}.release-options{margin-top:14px;display:flex;align-items:center;gap:8px;font-size:12px}.release-button{margin-top:12px;border:0;background:#b00020;color:#fff;border-radius:10px;padding:10px 13px;font:inherit;font-weight:850;cursor:pointer}
      .overnight-toast{position:fixed;right:22px;bottom:22px;z-index:400;max-width:420px;background:#1f2327;color:#fff;border-radius:12px;padding:12px 15px;font-weight:750;box-shadow:0 14px 38px rgba(0,0,0,.22)}.overnight-toast.success{background:#16794f}.overnight-toast.error{background:#b00020}
      .overnight-help{margin-top:12px;padding:11px 13px;border-radius:12px;background:#f7f8f9;color:var(--muted);font-size:11px}
      @media(max-width:980px){.overnight-summary{grid-template-columns:repeat(2,1fr)}.overnight-layout{grid-template-columns:1fr}.overnight-side{position:static}.bed-grid{grid-template-columns:repeat(4,1fr)}}
      @media(max-width:620px){.overnight-summary{grid-template-columns:1fr 1fr}.tent-head{flex-direction:column}.tent-controls{justify-content:flex-start}.bed-grid{grid-template-columns:repeat(3,1fr)}.bed-slot{min-height:68px}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('overnightView')) return;

    const nav = workspace.querySelector('.app-nav');
    if (nav) {
      const button = document.createElement('button');
      button.className = 'app-nav-btn';
      button.type = 'button';
      button.dataset.view = 'pernottamenti';
      button.textContent = 'Pernottamenti';
      button.addEventListener('click', () => activateView());
      nav.appendChild(button);
    }

    const section = document.createElement('section');
    section.id = 'overnightView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'pernottamenti';
    section.hidden = true;
    section.innerHTML = `
      <div class="view-heading">
        <div><div class="kicker">Alloggiamento</div><h2>Pernottamenti</h2><p>Gestione delle 5 tende, assegnazione posti letto e disponibilità emergenza.</p><div id="overnightRealtime" class="overnight-realtime">Realtime in attivazione…</div></div>
        <button id="overnightRefresh" class="btn secondary" type="button">↻ Aggiorna</button>
      </div>
      <div class="overnight-summary">
        <article class="overnight-summary-card"><small>Tende operative</small><strong id="overnightTentCount">5</strong></article>
        <article class="overnight-summary-card"><small>Posti ordinari occupati</small><strong id="overnightStandardCount">0/50</strong></article>
        <article class="overnight-summary-card"><small>Posti emergenza attivi</small><strong id="overnightEmergencyCount">0/10</strong></article>
        <article class="overnight-summary-card"><small>Pernottamenti da assegnare</small><strong id="overnightUnassignedCount">0</strong></article>
      </div>
      <div class="overnight-layout">
        <div id="overnightTentList" class="tent-list"></div>
        <aside class="overnight-side">
          <div class="overnight-side-card"><div class="panel-kicker">Da sistemare</div><h3>Pernottamenti senza posto</h3><p>Persone con pernottamento attivo che non hanno ancora un letto assegnato.</p><div id="overnightUnassignedList" class="unassigned-list"></div></div>
          <div class="overnight-side-card"><div class="panel-kicker">Capienza</div><h3>50 + 10 emergenza</h3><p>I posti 01–10 sono ordinari. I posti 11–12 restano bloccati finché non vengono attivati come emergenza.</p></div>
        </aside>
      </div>`;
    workspace.appendChild(section);

    const dashboardCards = [...workspace.querySelectorAll('.module-card')];
    const card = dashboardCards.find(item => item.querySelector('strong')?.textContent.trim() === 'Pernottamenti');
    if (card) {
      card.classList.add('module-button', 'active-module');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const status = card.querySelector('em');
      if (status) status.textContent = 'Operativo';
      const open = () => activateView();
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    }

    const modal = document.createElement('div');
    modal.id = 'overnightModal';
    modal.className = 'overnight-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="overnight-backdrop" data-close-overnight></div><section class="overnight-modal-card" role="dialog" aria-modal="true"><div class="overnight-modal-head"><div><div class="kicker">Posto letto</div><h2 id="overnightModalTitle">Assegna posto</h2><p id="overnightModalSubtitle"></p></div><button class="overnight-close" type="button" data-close-overnight>×</button></div><div id="overnightModalBody"></div></section>`;
    document.body.appendChild(modal);

    const toast = document.createElement('div');
    toast.id = 'overnightToast';
    toast.className = 'overnight-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    $('overnightRefresh')?.addEventListener('click', () => loadData());
    $('overnightTentList')?.addEventListener('click', handleTentClick);
    $('overnightTentList')?.addEventListener('change', handleTentChange);
    document.addEventListener('click', event => {
      if (event.target.closest('[data-close-overnight]')) closeModal();
      const assign = event.target.closest('[data-assign-person]');
      if (assign) assignSelectedBed(assign.dataset.assignPerson);
      if (event.target.closest('#overnightReleaseButton')) releaseSelectedBed();
    });
  }

  function activateView() {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'pernottamenti'));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'pernottamenti';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    setTimeout(() => $('overnightView')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 10);
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (error || !data || !data.attivo) return null;
    return data;
  }

  function personTypeCodes(personId) {
    return typesByPerson.get(personId) || [];
  }

  function assignedBedMap() {
    const map = new Map();
    beds.forEach(bed => { if (bed.persona_id) map.set(bed.persona_id, bed); });
    return map;
  }

  function tentBeds(tentId) {
    return beds.filter(bed => bed.tenda_id === tentId).sort((a, b) => (a.ordine || 999) - (b.ordine || 999) || String(a.codice_posto).localeCompare(String(b.codice_posto), 'it'));
  }

  function tentOccupancy(tentId) {
    return tentBeds(tentId).filter(bed => bed.persona_id).length;
  }

  function isCompatible(person, tent) {
    if (!person || !tent) return false;
    if (tent.destinazione === 'uomini') return person.settore_alloggio === 'uomo';
    if (tent.destinazione === 'donne') return person.settore_alloggio === 'donna';
    if (tent.destinazione === 'faculty') return personTypeCodes(person.id).includes('docente');
    return false;
  }

  function compatibleReason(person, tent) {
    if (tent.destinazione === 'faculty') return personTypeCodes(person.id).includes('docente') ? 'Docente' : 'Non docente';
    if (tent.destinazione === 'uomini') return person.settore_alloggio === 'uomo' ? 'Settore Uomo' : 'Settore non compatibile';
    if (tent.destinazione === 'donne') return person.settore_alloggio === 'donna' ? 'Settore Donna' : 'Settore non compatibile';
    return 'Tenda da configurare';
  }

  function renderSummary() {
    const standardBeds = beds.filter(bed => !bed.emergenza);
    const standardOccupied = standardBeds.filter(bed => bed.persona_id).length;
    const activeEmergency = tents.filter(tent => tent.posti_emergenza_attivi).length * 2;
    const assigned = assignedBedMap();
    const unassigned = people.filter(person => person.pernotto && !assigned.has(person.id));

    $('overnightTentCount').textContent = String(tents.length);
    $('overnightStandardCount').textContent = `${standardOccupied}/50`;
    $('overnightEmergencyCount').textContent = `${activeEmergency}/10`;
    $('overnightUnassignedCount').textContent = String(unassigned.length);

    const list = $('overnightUnassignedList');
    if (!list) return;
    list.innerHTML = unassigned.length ? unassigned.map(person => {
      const undefinedSector = !person.settore_alloggio || person.settore_alloggio === 'da_definire';
      return `<div class="unassigned-person${undefinedSector ? ' warn' : ''}"><strong>${escapeHtml(fullName(person))}</strong><small>${undefinedSector ? '⚠ Settore alloggio da definire' : `Settore: ${person.settore_alloggio === 'uomo' ? 'Uomo' : 'Donna'}`}${person.data_arrivo_prevista || person.data_partenza_prevista ? ` · ${escapeHtml(person.data_arrivo_prevista || '—')} → ${escapeHtml(person.data_partenza_prevista || '—')}` : ''}</small></div>`;
    }).join('') : '<div class="overnight-empty">Tutti i pernottamenti attivi hanno un posto assegnato.</div>';
  }

  function renderTents() {
    const list = $('overnightTentList');
    if (!list) return;
    const peopleMap = new Map(people.map(person => [person.id, person]));

    list.innerHTML = tents.map(tent => {
      const slots = tentBeds(tent.id);
      const occupied = slots.filter(slot => slot.persona_id).length;
      const emergencyOccupied = slots.filter(slot => slot.emergenza && slot.persona_id).length;
      const lockedDestination = tent.codice === 'T05' || occupied > 0;
      const bedsHtml = slots.map(slot => {
        const person = slot.persona_id ? peopleMap.get(slot.persona_id) : null;
        const emergencyLocked = slot.emergenza && !tent.posti_emergenza_attivi && !slot.persona_id;
        const tentNotConfigured = tent.destinazione === 'da_definire';
        const disabled = (!slot.persona_id && (emergencyLocked || tentNotConfigured || slot.attivo === false));
        const classes = ['bed-slot'];
        if (slot.persona_id) classes.push('occupied');
        if (slot.emergenza) classes.push('emergency');
        if (disabled) classes.push('disabled');
        return `<button class="${classes.join(' ')}" type="button" data-bed-id="${slot.id}" ${disabled ? 'disabled' : ''}><span class="bed-badge">${slot.emergenza ? 'EMERGENZA' : 'ORDINARIO'}</span><strong>${escapeHtml(slot.codice_posto)}</strong><small>${person ? escapeHtml(fullName(person)) : (emergencyLocked ? 'Bloccato' : tentNotConfigured ? 'Configura tenda' : 'Libero')}</small></button>`;
      }).join('');

      return `<article class="tent-card${tent.destinazione === 'faculty' ? ' faculty' : ''}">
        <div class="tent-head">
          <div class="tent-title"><div class="tent-icon">⛺</div><div><h3>${escapeHtml(tent.nome || tent.codice)}</h3><p>${escapeHtml(tent.codice)} · ${occupied}/12 occupati${emergencyOccupied ? ` · ${emergencyOccupied} emergenza occupati` : ''}</p></div></div>
          <div class="tent-controls">
            <select class="tent-destination" data-tent-destination="${tent.id}" ${lockedDestination ? 'disabled' : ''} title="${occupied > 0 ? 'Libera la tenda prima di cambiarne la destinazione' : ''}">
              <option value="da_definire" ${tent.destinazione === 'da_definire' ? 'selected' : ''}>Da definire</option>
              <option value="uomini" ${tent.destinazione === 'uomini' ? 'selected' : ''}>Uomini</option>
              <option value="donne" ${tent.destinazione === 'donne' ? 'selected' : ''}>Donne</option>
              <option value="faculty" ${tent.destinazione === 'faculty' ? 'selected' : ''}>Faculty</option>
            </select>
            <button class="emergency-toggle${tent.posti_emergenza_attivi ? ' active' : ''}" type="button" data-toggle-emergency="${tent.id}">${tent.posti_emergenza_attivi ? 'Emergenza attiva' : 'Attiva 2 emergenza'}</button>
          </div>
        </div>
        <div class="bed-grid">${bedsHtml}</div>
        ${tent.codice === 'T05' ? '<div class="overnight-help">Tenda Faculty: il database consente l’assegnazione solo a persone con tipologia Docente. La separazione uomo/donna della Faculty verrà configurata quando sarà definita l’organizzazione reale.</div>' : ''}
      </article>`;
    }).join('');
  }

  function renderAll() {
    renderSummary();
    renderTents();
  }

  async function loadData(options = {}) {
    const refresh = $('overnightRefresh');
    if (refresh && !options.silent) refresh.disabled = true;

    const [tentRes, bedRes, peopleRes, typeRes] = await Promise.all([
      client.from('tende').select('id,codice,nome,capienza,destinazione,solo_docenti,posti_ordinari,posti_emergenza,posti_emergenza_attivi,attiva').in('codice', ['T01','T02','T03','T04','T05']).eq('attiva', true).order('codice'),
      client.from('posti_letto').select('id,tenda_id,codice_posto,persona_id,emergenza,attivo,ordine,assegnato_at,assegnato_postazione').order('ordine'),
      client.from('persone').select('id,nome,cognome,comitato,numero_badge,pernotto,settore_alloggio,data_arrivo_prevista,data_partenza_prevista,attivo').eq('attivo', true).order('cognome').order('nome'),
      client.from('persone_tipologie').select('persona_id,tipologia_codice').limit(5000)
    ]);

    if (refresh) refresh.disabled = false;
    const error = tentRes.error || bedRes.error || peopleRes.error || typeRes.error;
    if (error) {
      showToast(`Pernottamenti non disponibili: ${error.message}`, 'error');
      return;
    }

    tents = tentRes.data || [];
    beds = (bedRes.data || []).filter(bed => tents.some(tent => tent.id === bed.tenda_id));
    people = peopleRes.data || [];
    typesByPerson = new Map();
    (typeRes.data || []).forEach(row => {
      const list = typesByPerson.get(row.persona_id) || [];
      if (!list.includes(row.tipologia_codice)) list.push(row.tipologia_codice);
      typesByPerson.set(row.persona_id, list);
    });
    renderAll();
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadData({ silent: true }), 150);
  }

  async function handleTentChange(event) {
    const select = event.target.closest('[data-tent-destination]');
    if (!select) return;
    const tent = tents.find(item => item.id === select.dataset.tentDestination);
    if (!tent) return;
    if (tentOccupancy(tent.id) > 0) {
      showToast('Non puoi cambiare destinazione a una tenda occupata.', 'error');
      renderTents();
      return;
    }
    const destination = select.value;
    const { error } = await client.from('tende').update({ destinazione: destination, solo_docenti: destination === 'faculty' }).eq('id', tent.id);
    if (error) {
      showToast(`Configurazione non salvata: ${error.message}`, 'error');
      renderTents();
      return;
    }
    showToast(`${tent.codice}: destinazione ${destinationLabels[destination] || destination}.`, 'success');
    await loadData({ silent: true });
  }

  async function handleTentClick(event) {
    const emergencyButton = event.target.closest('[data-toggle-emergency]');
    if (emergencyButton) {
      const tent = tents.find(item => item.id === emergencyButton.dataset.toggleEmergency);
      if (!tent) return;
      emergencyButton.disabled = true;
      const { data, error } = await client.rpc('imposta_posti_emergenza_tenda', { p_tenda_id: tent.id, p_attivi: !tent.posti_emergenza_attivi });
      emergencyButton.disabled = false;
      if (error) { showToast(`Operazione non riuscita: ${error.message}`, 'error'); return; }
      if (data?.status === 'posti_emergenza_occupati') { showToast('Prima di disattivare l’emergenza devi liberare i posti 11–12.', 'error'); return; }
      showToast(tent.posti_emergenza_attivi ? 'Posti emergenza disattivati.' : 'Due posti emergenza attivati.', 'success');
      await loadData({ silent: true });
      return;
    }

    const bedButton = event.target.closest('[data-bed-id]');
    if (!bedButton || bedButton.disabled) return;
    const bed = beds.find(item => item.id === bedButton.dataset.bedId);
    if (!bed) return;
    openBedModal(bed);
  }

  function openBedModal(bed) {
    const tent = tents.find(item => item.id === bed.tenda_id);
    const person = bed.persona_id ? people.find(item => item.id === bed.persona_id) : null;
    if (!tent) return;
    selectedBed = bed;
    $('overnightModalTitle').textContent = person ? fullName(person) : `Assegna ${bed.codice_posto}`;
    $('overnightModalSubtitle').textContent = `${tent.nome || tent.codice} · ${destinationLabels[tent.destinazione] || tent.destinazione}${bed.emergenza ? ' · posto emergenza' : ''}`;

    if (person) {
      $('overnightModalBody').innerHTML = `<div class="occupied-person-card"><h3>${escapeHtml(fullName(person))}</h3><p>${escapeHtml(person.comitato || 'Anagrafica Campo')} · ${escapeHtml(bed.codice_posto)}${bed.assegnato_postazione ? ` · assegnato da ${escapeHtml(bed.assegnato_postazione)}` : ''}</p></div><label class="release-options"><input id="disableOvernightAfterRelease" type="checkbox"> Disattiva anche “Pernottamento” nella scheda persona</label><button id="overnightReleaseButton" class="release-button" type="button">Libera posto letto</button>`;
    } else {
      $('overnightModalBody').innerHTML = `<div class="overnight-search"><span>⌕</span><input id="overnightPersonSearch" type="search" placeholder="Cerca persona da assegnare…" autocomplete="off"></div><div id="overnightCandidates" class="overnight-candidates"></div><div class="overnight-help">Vengono mostrate solo persone compatibili con la destinazione della tenda e non già assegnate a un altro posto.</div>`;
      $('overnightPersonSearch')?.addEventListener('input', renderCandidates);
      renderCandidates();
      setTimeout(() => $('overnightPersonSearch')?.focus(), 30);
    }

    $('overnightModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    const modal = $('overnightModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    selectedBed = null;
    document.body.classList.remove('modal-open');
  }

  function renderCandidates() {
    if (!selectedBed) return;
    const tent = tents.find(item => item.id === selectedBed.tenda_id);
    const container = $('overnightCandidates');
    if (!tent || !container) return;
    const query = normalize($('overnightPersonSearch')?.value);
    const assigned = assignedBedMap();

    const candidates = people.filter(person => {
      if (assigned.has(person.id)) return false;
      if (!isCompatible(person, tent)) return false;
      if (!query) return true;
      return normalize(`${person.nome} ${person.cognome} ${person.comitato || ''} ${person.numero_badge || ''}`).includes(query);
    }).slice(0, 40);

    container.innerHTML = candidates.length ? candidates.map(person => `<div class="overnight-candidate"><span><strong>${escapeHtml(fullName(person))}</strong><small>${escapeHtml(person.comitato || 'Campo')} · ${escapeHtml(compatibleReason(person, tent))}${person.pernotto ? ' · pernottamento già attivo' : ' · pernottamento verrà attivato'}</small></span><button type="button" data-assign-person="${person.id}">Assegna</button></div>`).join('') : '<div class="overnight-empty">Nessuna persona compatibile trovata. Verifica il settore alloggio o la tipologia Docente.</div>';
  }

  async function assignSelectedBed(personId) {
    if (!selectedBed) return;
    const body = $('overnightModalBody');
    if (body) body.style.pointerEvents = 'none';
    const { data, error } = await client.rpc('assegna_posto_letto', { p_persona_id: personId, p_posto_letto_id: selectedBed.id, p_postazione: getStation() });
    if (body) body.style.pointerEvents = '';
    if (error) { showToast(`Assegnazione non riuscita: ${error.message}`, 'error'); return; }

    const messages = {
      settore_alloggio_da_definire: 'Prima devi definire il settore alloggio della persona.',
      posto_occupato: 'Il posto è stato occupato da un’altra postazione.',
      posto_emergenza_non_attivo: 'Questo posto emergenza non è attivo.',
      tenda_da_configurare: 'Prima devi configurare la destinazione della tenda.',
      persona_gia_assegnata: `La persona ha già un posto assegnato${data?.tenda ? ` in ${data.tenda} ${data.posto || ''}` : ''}.`,
      posto_disattivato: 'Il posto letto è disattivato.',
      persona_non_trovata: 'Persona non trovata.'
    };

    if (data?.status !== 'assegnato') {
      showToast(messages[data?.status] || 'Assegnazione non disponibile.', 'error');
      await loadData({ silent: true });
      return;
    }

    showToast(`${data.tenda} ${data.posto}: posto assegnato.`, 'success');
    closeModal();
    await loadData({ silent: true });
  }

  async function releaseSelectedBed() {
    if (!selectedBed?.persona_id) return;
    const person = people.find(item => item.id === selectedBed.persona_id);
    if (!window.confirm(`Liberare il posto di ${fullName(person)}?`)) return;
    const disableOvernight = !!$('disableOvernightAfterRelease')?.checked;
    const button = $('overnightReleaseButton');
    if (button) button.disabled = true;
    const { data, error } = await client.rpc('libera_posto_letto', { p_persona_id: selectedBed.persona_id, p_disattiva_pernotto: disableOvernight, p_postazione: getStation() });
    if (button) button.disabled = false;
    if (error) { showToast(`Posto non liberato: ${error.message}`, 'error'); return; }
    if (data?.status !== 'liberato') { showToast('Nessuna assegnazione trovata.', 'error'); return; }
    showToast(`${data.tenda} ${data.posto}: posto liberato.`, 'success');
    closeModal();
    await loadData({ silent: true });
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-pernottamenti-db');
    ['tende', 'posti_letto', 'persone', 'persone_tipologie'].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    });
    realtimeChannel.subscribe(status => {
      const label = $('overnightRealtime');
      if (!label) return;
      if (status === 'SUBSCRIBED') {
        label.textContent = '● Realtime collegato';
        label.style.color = '#16794f';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        label.textContent = 'Realtime da riconnettere';
        label.style.color = '#a36b00';
      }
    });
  }

  async function init() {
    if (!config || !window.supabase || !$('standardWorkspace')) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    profile = await getProfile();
    if (!profile || !['admin', 'segreteria'].includes(profile.ruolo)) return;

    injectStyles();
    injectUi();
    connectRealtime();
    await loadData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
