(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let session = null;
  let profile = null;
  let vehicles = [];
  let activations = [];
  let drivers = [];
  let movements = [];
  let people = [];
  let selectedVehicleId = null;
  let selectedVehicleSnapshot = null;
  let editingActivationId = null;
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('it');
  }

  function nullable(value) {
    const text = String(value || '').trim();
    return text || null;
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function fullName(person) {
    return `${person?.nome || ''} ${person?.cognome || ''}`.trim();
  }

  function vehicleById(id) {
    return vehicles.find(item => item.id === id) || null;
  }

  function activationById(id) {
    return activations.find(item => item.id === id) || null;
  }

  function personById(id) {
    return people.find(item => item.id === id) || null;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function toDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function toIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function showToast(message, type = '') {
    const toast = $('vehicleToast') || $('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = toast.id === 'vehicleToast' ? `vehicle-toast${type ? ` ${type}` : ''}` : `toast${type ? ` ${type}` : ''}`;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function currentActivation(vehicleId) {
    return activations
      .filter(item => item.mezzo_id === vehicleId && item.attiva !== false)
      .sort((a, b) => new Date(b.data_inizio) - new Date(a.data_inizio))[0] || null;
  }

  function activationDrivers(activationId) {
    return drivers.filter(item => item.attivazione_mezzo_id === activationId);
  }

  function principalDriver(activationId) {
    const rows = activationDrivers(activationId);
    const row = rows.find(item => item.principale) || rows[0] || null;
    return row ? personById(row.persona_id) : null;
  }

  function latestMovement(vehicleId) {
    return movements.find(item => item.mezzo_id === vehicleId && !item.annullato) || null;
  }

  function injectStyles() {
    if ($('vehicleModuleStyles')) return;
    const style = document.createElement('style');
    style.id = 'vehicleModuleStyles';
    style.textContent = `
      .vehicle-view-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:12px 0 20px}.vehicle-view-head h2{font-size:34px;margin:5px 0}.vehicle-view-head p{margin:0;color:var(--muted)}
      .vehicle-realtime{font-size:11px;font-weight:850;color:#16794f;margin-top:6px}.vehicle-realtime.warning{color:#9a6a00}
      .vehicle-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.vehicle-summary-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}.vehicle-summary-card small{display:block;color:var(--muted);font-weight:750}.vehicle-summary-card strong{display:block;font-size:28px;margin-top:5px}
      .vehicle-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 190px 46px;gap:9px;margin-bottom:12px}.vehicle-search{display:flex;align-items:center;gap:8px;border:1px solid #ccd2d8;background:#fff;border-radius:12px;padding:0 12px}.vehicle-search input{width:100%;height:46px;border:0;outline:0;font:inherit}.vehicle-select{height:46px;border:1px solid #ccd2d8;border-radius:12px;background:#fff;padding:0 11px;font:inherit}.vehicle-refresh{width:46px;height:46px;border:1px solid #ccd2d8;border-radius:12px;background:#fff;font-size:20px;cursor:pointer}
      .vehicle-table-card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}.vehicle-table-wrap{overflow:auto}.vehicle-table{width:100%;border-collapse:collapse;min-width:980px}.vehicle-table th{padding:12px 14px;background:#fafbfc;border-bottom:1px solid var(--line);text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.vehicle-table td{padding:13px 14px;border-bottom:1px solid #eef0f2;font-size:13px;vertical-align:middle}.vehicle-table tbody tr:hover{background:#fffafa}.vehicle-table tr:last-child td{border-bottom:0}.vehicle-name strong{display:block;font-size:14px}.vehicle-name small{display:block;color:var(--muted);margin-top:2px}.vehicle-presence{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:850}.vehicle-presence.in{background:#e8f7ef;color:#16794f}.vehicle-presence.out{background:#f2f3f4;color:#646a70}.vehicle-open{border:1px solid #d6dade;background:#fff;border-radius:9px;padding:7px 10px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.vehicle-open:hover{border-color:#d40000;color:#d40000}
      .vehicle-modal[hidden],.vehicle-toast[hidden]{display:none}.vehicle-modal{position:fixed;inset:0;z-index:280;display:grid;place-items:center;padding:18px}.vehicle-backdrop{position:absolute;inset:0;background:rgba(20,23,26,.6);backdrop-filter:blur(4px)}.vehicle-modal-card{position:relative;width:min(1120px,96vw);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.24)}.vehicle-modal-head{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:flex-start;gap:15px;background:#fff;border-bottom:1px solid var(--line);padding:20px 22px}.vehicle-modal-head h2{margin:4px 0 3px;font-size:27px}.vehicle-modal-head p{margin:0;color:var(--muted);font-size:13px}.vehicle-close{border:0;background:#f2f3f4;width:36px;height:36px;border-radius:10px;font-size:22px;cursor:pointer}.vehicle-modal-body{padding:20px 22px 24px}.vehicle-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:18px}.vehicle-panel{border:1px solid var(--line);border-radius:17px;padding:16px;background:#fff}.vehicle-panel h3{margin:4px 0 12px;font-size:19px}.vehicle-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vehicle-grid label,.activation-form label{font-size:12px;font-weight:800}.vehicle-grid input,.vehicle-grid textarea,.activation-form input,.activation-form textarea{margin-top:6px;width:100%;border:1px solid #ccd2d8;border-radius:10px;padding:10px;font:inherit}.vehicle-grid textarea,.activation-form textarea{resize:vertical}.vehicle-grid .full,.activation-form .full{grid-column:1/-1}.vehicle-save-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.vehicle-primary,.vehicle-secondary,.vehicle-danger{border:0;border-radius:10px;padding:10px 13px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.vehicle-primary{background:var(--cri);color:#fff}.vehicle-secondary{background:#f1f3f5;color:#30353a}.vehicle-danger{background:#b00020;color:#fff}.vehicle-primary:disabled,.vehicle-secondary:disabled,.vehicle-danger:disabled{opacity:.55;cursor:not-allowed}
      .vehicle-state-box{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #dfe3e7;border-radius:13px;padding:12px;margin-top:14px}.vehicle-state-box strong{font-size:14px}.vehicle-state-box small{display:block;color:var(--muted);margin-top:3px}.vehicle-state-actions{display:flex;gap:7px}.vehicle-entry{background:#16794f;color:#fff}.vehicle-exit{background:#b00020;color:#fff}
      .activation-list{display:grid;gap:8px}.activation-item{border:1px solid #e0e4e8;border-radius:12px;padding:11px;display:flex;justify-content:space-between;gap:12px;align-items:center}.activation-item.active{border-color:#c9dfd3;background:#f5fbf7}.activation-item strong{display:block}.activation-item small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.activation-item button{border:1px solid #d6dade;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.activation-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px;padding-top:13px;border-top:1px solid #eef0f2}.activation-switch{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800}.activation-switch input{width:auto;margin:0}.activation-editor-title{display:flex;justify-content:space-between;align-items:center;gap:10px}.activation-editor-title h4{margin:0;font-size:15px}
      .drivers-block{margin-top:16px;padding-top:14px;border-top:1px solid #eef0f2}.drivers-block h4{margin:0 0 8px}.driver-row{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #e2e5e8;border-radius:10px;padding:9px;margin-bottom:7px}.driver-row strong{font-size:12px}.driver-row small{display:block;color:var(--muted);font-size:10px}.driver-actions{display:flex;gap:5px}.driver-actions button{border:1px solid #d6dade;background:#fff;border-radius:8px;padding:6px 8px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.driver-actions .star.active{background:#fff4ce;border-color:#e1b943;color:#775300}.driver-search{display:flex;align-items:center;gap:8px;border:1px solid #ccd2d8;border-radius:10px;padding:0 10px;margin-top:9px}.driver-search input{height:40px;border:0;outline:0;width:100%;font:inherit}.driver-results{display:grid;gap:6px;margin-top:7px;max-height:220px;overflow:auto}.driver-candidate{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid #e5e7e9;border-radius:9px;padding:8px;background:#fafbfc}.driver-candidate strong{font-size:11px}.driver-candidate small{display:block;color:var(--muted);font-size:10px}.driver-candidate button{border:0;background:var(--cri);color:#fff;border-radius:8px;padding:6px 8px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}
      .movement-list{display:grid;gap:7px;max-height:390px;overflow:auto}.movement-row{border:1px solid #e3e6e9;border-radius:10px;padding:9px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center}.movement-row.cancelled{opacity:.62;background:#f6f6f6}.movement-row strong{display:block;font-size:12px}.movement-row small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.movement-row button{border:1px solid #e0c4c4;background:#fff;border-radius:8px;padding:6px 8px;font:inherit;font-size:10px;font-weight:800;color:#9c1b1b;cursor:pointer}.vehicle-empty{text-align:center;color:var(--muted);padding:24px 12px}.vehicle-toast{position:fixed;right:22px;bottom:22px;z-index:500;max-width:430px;background:#22272b;color:#fff;border-radius:12px;padding:12px 15px;font-weight:750;box-shadow:0 14px 38px rgba(0,0,0,.22)}.vehicle-toast.success{background:#16794f}.vehicle-toast.error{background:#b00020}
      @media(max-width:980px){.vehicle-summary{grid-template-columns:repeat(2,1fr)}.vehicle-layout{grid-template-columns:1fr}.vehicle-toolbar{grid-template-columns:1fr 160px 46px}}@media(max-width:620px){.vehicle-view-head{align-items:flex-start;flex-direction:column}.vehicle-summary{grid-template-columns:1fr 1fr}.vehicle-toolbar{grid-template-columns:1fr 1fr}.vehicle-refresh{width:100%}.vehicle-grid,.activation-form{grid-template-columns:1fr}.vehicle-grid .full,.activation-form .full{grid-column:auto}.vehicle-state-box{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('vehicleView')) return;

    const nav = workspace.querySelector('.app-nav');
    if (nav) {
      const button = document.createElement('button');
      button.className = 'app-nav-btn';
      button.type = 'button';
      button.dataset.view = 'mezzi';
      button.textContent = 'Mezzi';
      button.addEventListener('click', activateView);
      nav.appendChild(button);
    }

    const section = document.createElement('section');
    section.id = 'vehicleView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'mezzi';
    section.hidden = true;
    section.innerHTML = `
      <div class="vehicle-view-head">
        <div><div class="kicker">Parco mezzi</div><h2>Mezzi</h2><p>Anagrafica, presenza al Campo, attivazioni e autisti.</p><div id="vehicleRealtime" class="vehicle-realtime">Realtime in attivazione…</div></div>
        <button id="vehicleAddButton" class="btn primary" type="button">＋ Nuovo mezzo</button>
      </div>
      <div class="vehicle-summary">
        <article class="vehicle-summary-card"><small>Mezzi registrati</small><strong id="vehicleMetricTotal">0</strong></article>
        <article class="vehicle-summary-card"><small>Presenti al Campo</small><strong id="vehicleMetricPresent">0</strong></article>
        <article class="vehicle-summary-card"><small>Fuori dal Campo</small><strong id="vehicleMetricOutside">0</strong></article>
        <article class="vehicle-summary-card"><small>Attivazioni attive</small><strong id="vehicleMetricActivations">0</strong></article>
      </div>
      <div class="vehicle-toolbar">
        <div class="vehicle-search"><span>⌕</span><input id="vehicleSearch" type="search" placeholder="Targa, mezzo, Comitato…" autocomplete="off"></div>
        <select id="vehiclePresenceFilter" class="vehicle-select"><option value="">Tutti i mezzi</option><option value="present">Presenti</option><option value="outside">Fuori dal Campo</option></select>
        <button id="vehicleRefresh" class="vehicle-refresh" type="button" title="Aggiorna">↻</button>
      </div>
      <div class="vehicle-table-card"><div class="vehicle-table-wrap"><table class="vehicle-table"><thead><tr><th>Targa / Mezzo</th><th>Tipologia</th><th>Comitato</th><th>Presenza</th><th>Attivazione</th><th>Autista principale</th><th></th></tr></thead><tbody id="vehicleTableBody"></tbody></table></div><div id="vehicleEmpty" class="vehicle-empty" hidden>Nessun mezzo trovato.</div></div>`;
    workspace.appendChild(section);

    const cards = [...workspace.querySelectorAll('.module-card')];
    const card = cards.find(item => item.querySelector('strong')?.textContent.trim() === 'Mezzi');
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
    modal.id = 'vehicleModal';
    modal.className = 'vehicle-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="vehicle-backdrop" data-close-vehicle></div><section class="vehicle-modal-card" role="dialog" aria-modal="true"><header class="vehicle-modal-head"><div><div class="kicker">Gestione mezzo</div><h2 id="vehicleModalTitle">Nuovo mezzo</h2><p id="vehicleModalSubtitle">Inserisci i dati del mezzo.</p></div><button class="vehicle-close" type="button" data-close-vehicle>×</button></header><div id="vehicleModalBody" class="vehicle-modal-body"></div></section>`;
    document.body.appendChild(modal);

    const toast = document.createElement('div');
    toast.id = 'vehicleToast';
    toast.className = 'vehicle-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    $('vehicleAddButton')?.addEventListener('click', openNewVehicle);
    $('vehicleSearch')?.addEventListener('input', renderTable);
    $('vehiclePresenceFilter')?.addEventListener('change', renderTable);
    $('vehicleRefresh')?.addEventListener('click', () => loadAll());
    $('vehicleTableBody')?.addEventListener('click', event => {
      const button = event.target.closest('[data-open-vehicle]');
      if (button) openVehicle(button.dataset.openVehicle);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-close-vehicle]')) closeVehicleModal();
    });
  }

  function activateView() {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'mezzi'));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'mezzi';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    setTimeout(() => $('vehicleSearch')?.focus(), 30);
  }

  function vehicleHaystack(vehicle) {
    return normalize([vehicle.targa, vehicle.marca_modello, vehicle.tipologia, vehicle.comitato, vehicle.regione].filter(Boolean).join(' '));
  }

  function renderSummary() {
    const active = vehicles.filter(item => item.attivo !== false);
    $('vehicleMetricTotal').textContent = active.length;
    $('vehicleMetricPresent').textContent = active.filter(item => item.presente).length;
    $('vehicleMetricOutside').textContent = active.filter(item => !item.presente).length;
    $('vehicleMetricActivations').textContent = activations.filter(item => item.attiva !== false).length;
  }

  function renderTable() {
    const body = $('vehicleTableBody');
    if (!body) return;
    const q = normalize($('vehicleSearch')?.value);
    const presence = $('vehiclePresenceFilter')?.value || '';
    const rows = vehicles.filter(vehicle => {
      if (vehicle.attivo === false) return false;
      if (q && !vehicleHaystack(vehicle).includes(q)) return false;
      if (presence === 'present' && !vehicle.presente) return false;
      if (presence === 'outside' && vehicle.presente) return false;
      return true;
    });

    $('vehicleEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(vehicle => {
      const activation = currentActivation(vehicle.id);
      const driver = activation ? principalDriver(activation.id) : null;
      return `<tr>
        <td class="vehicle-name"><strong>${escapeHtml(vehicle.targa)}</strong><small>${escapeHtml(vehicle.marca_modello || '—')}</small></td>
        <td>${escapeHtml(vehicle.tipologia || '—')}</td>
        <td>${escapeHtml([vehicle.comitato, vehicle.regione].filter(Boolean).join(' · ') || '—')}</td>
        <td><span class="vehicle-presence ${vehicle.presente ? 'in' : 'out'}">${vehicle.presente ? '● Presente' : 'Fuori'}</span></td>
        <td>${activation ? `<strong>${escapeHtml(activation.destinazione || 'Attivazione')}</strong><br><small>${escapeHtml(formatDateTime(activation.data_inizio))}${activation.data_fine ? ` → ${escapeHtml(formatDateTime(activation.data_fine))}` : ''}</small>` : '—'}</td>
        <td>${driver ? escapeHtml(fullName(driver)) : '—'}</td>
        <td><button class="vehicle-open" type="button" data-open-vehicle="${vehicle.id}">Gestisci</button></td>
      </tr>`;
    }).join('');
  }

  function render() {
    renderSummary();
    renderTable();
  }

  async function loadAll(options = {}) {
    if (!client) return;
    if (!options.silent && $('vehicleRefresh')) $('vehicleRefresh').disabled = true;
    try {
      const [v, a, d, m, p] = await Promise.all([
        client.from('mezzi').select('*').order('targa', { ascending: true }).limit(2000),
        client.from('attivazioni_mezzi').select('*').order('data_inizio', { ascending: false }).limit(5000),
        client.from('autisti_mezzi').select('*').limit(10000),
        client.from('movimenti_mezzi').select('*').order('data_ora', { ascending: false }).limit(10000),
        client.from('persone').select('id,nome,cognome,comitato,numero_badge,attivo').eq('attivo', true).order('cognome', { ascending: true }).order('nome', { ascending: true }).limit(3000)
      ]);
      const errors = [v.error, a.error, d.error, m.error, p.error].filter(Boolean);
      if (errors.length) throw errors[0];
      vehicles = v.data || [];
      activations = a.data || [];
      drivers = d.data || [];
      movements = m.data || [];
      people = p.data || [];
      render();
      if (selectedVehicleId) {
        const refreshed = vehicleById(selectedVehicleId);
        if (refreshed) {
          selectedVehicleSnapshot = { ...refreshed };
          renderVehicleModal();
        } else closeVehicleModal();
      }
    } catch (error) {
      showToast(`Modulo Mezzi non disponibile: ${error.message}`, 'error');
    } finally {
      if (!options.silent && $('vehicleRefresh')) $('vehicleRefresh').disabled = false;
    }
  }

  function baseVehicleForm(vehicle = null) {
    return `
      <section class="vehicle-panel">
        <div class="panel-kicker">Anagrafica mezzo</div><h3>${vehicle ? 'Dati del mezzo' : 'Nuovo mezzo'}</h3>
        <form id="vehicleForm">
          <div class="vehicle-grid">
            <label>Targa<input id="vehiclePlate" required value="${escapeHtml(vehicle?.targa || '')}" placeholder="AB123CD"></label>
            <label>Marca e modello<input id="vehicleModel" required value="${escapeHtml(vehicle?.marca_modello || '')}" placeholder="Fiat Ducato"></label>
            <label>Tipologia<input id="vehicleType" value="${escapeHtml(vehicle?.tipologia || '')}" placeholder="Furgone, ambulanza, autovettura…"></label>
            <label>Comitato<input id="vehicleCommittee" value="${escapeHtml(vehicle?.comitato || '')}"></label>
            <label>Regione<input id="vehicleRegion" value="${escapeHtml(vehicle?.regione || '')}"></label>
            <label class="full">Note<textarea id="vehicleNotes" rows="3">${escapeHtml(vehicle?.note || '')}</textarea></label>
          </div>
          <div class="vehicle-save-row"><button id="vehicleSave" class="vehicle-primary" type="submit">${vehicle ? 'Salva modifiche' : 'Crea mezzo'}</button>${vehicle ? '<button id="vehicleDelete" class="vehicle-danger" type="button">Elimina mezzo</button>' : ''}</div>
        </form>
        ${vehicle ? renderVehicleState(vehicle) : ''}
      </section>`;
  }

  function renderVehicleState(vehicle) {
    const movement = latestMovement(vehicle.id);
    return `<div class="vehicle-state-box"><div><strong>${vehicle.presente ? '🟢 Mezzo presente al Campo' : '⚪ Mezzo fuori dal Campo'}</strong><small>${movement ? `${movement.tipo === 'entrata' ? 'Ultima entrata' : 'Ultima uscita'} · ${escapeHtml(formatDateTime(movement.data_ora))}` : 'Nessun movimento registrato'}</small></div><div class="vehicle-state-actions"><button id="vehicleCheckin" class="vehicle-primary vehicle-entry" type="button" ${vehicle.presente ? 'disabled' : ''}>ENTRATA</button><button id="vehicleCheckout" class="vehicle-primary vehicle-exit" type="button" ${vehicle.presente ? '' : 'disabled'}>USCITA</button></div></div>`;
  }

  function renderActivationPanel(vehicle) {
    const rows = activations.filter(item => item.mezzo_id === vehicle.id).sort((a, b) => new Date(b.data_inizio) - new Date(a.data_inizio));
    const selected = editingActivationId ? activationById(editingActivationId) : null;
    return `<section class="vehicle-panel"><div class="activation-editor-title"><div><div class="panel-kicker">Impieghi</div><h3>Attivazioni</h3></div><button id="activationNew" class="vehicle-secondary" type="button">＋ Nuova</button></div>
      <div class="activation-list">${rows.map(item => {
        const principal = principalDriver(item.id);
        return `<article class="activation-item${item.attiva !== false ? ' active' : ''}"><div><strong>${escapeHtml(item.destinazione || 'Attivazione mezzo')}</strong><small>${escapeHtml(formatDateTime(item.data_inizio))}${item.data_fine ? ` → ${escapeHtml(formatDateTime(item.data_fine))}` : ' → aperta'} · ${item.attiva !== false ? 'Attiva' : 'Chiusa'}${principal ? ` · ${escapeHtml(fullName(principal))}` : ''}</small></div><button type="button" data-edit-activation="${item.id}">Gestisci</button></article>`;
      }).join('') || '<div class="vehicle-empty">Nessuna attivazione registrata.</div>'}</div>
      ${selected ? activationEditor(selected) : activationEditor(null)}
    </section>`;
  }

  function activationEditor(activation) {
    const activeId = activation?.id || '';
    return `<div id="activationEditor"><div class="activation-form"><input id="activationId" type="hidden" value="${activeId}">
      <label>Inizio<input id="activationStart" type="datetime-local" required value="${escapeHtml(toDateTimeLocal(activation?.data_inizio))}"></label>
      <label>Fine<input id="activationEnd" type="datetime-local" value="${escapeHtml(toDateTimeLocal(activation?.data_fine))}"></label>
      <label class="full">Destinazione / impiego<input id="activationDestination" value="${escapeHtml(activation?.destinazione || '')}" placeholder="Es. Logistica Campo"></label>
      <label class="full">Note<textarea id="activationNotes" rows="2">${escapeHtml(activation?.note || '')}</textarea></label>
      <label class="activation-switch full"><input id="activationActive" type="checkbox" ${activation?.attiva === false ? '' : 'checked'}> Attivazione attiva</label>
      <div class="vehicle-save-row full"><button id="activationSave" class="vehicle-primary" type="button">${activation ? 'Salva attivazione' : 'Crea attivazione'}</button></div>
    </div>${activation ? renderDrivers(activation) : '<div class="vehicle-empty">Crea l’attivazione per associare gli autisti.</div>'}</div>`;
  }

  function renderDrivers(activation) {
    const rows = activationDrivers(activation.id);
    return `<div class="drivers-block"><h4>Autisti</h4><div id="driverList">${rows.map(row => {
      const person = personById(row.persona_id);
      return `<div class="driver-row"><div><strong>${escapeHtml(fullName(person) || 'Persona non disponibile')}</strong><small>${escapeHtml(person?.comitato || '')}${row.note ? ` · ${escapeHtml(row.note)}` : ''}</small></div><div class="driver-actions"><button class="star${row.principale ? ' active' : ''}" type="button" data-driver-principal="${row.persona_id}" title="Imposta principale">★</button><button type="button" data-driver-remove="${row.persona_id}">Rimuovi</button></div></div>`;
    }).join('') || '<div class="vehicle-empty">Nessun autista associato.</div>'}</div><div class="driver-search"><span>⌕</span><input id="driverSearch" type="search" placeholder="Aggiungi autista…" autocomplete="off"></div><div id="driverResults" class="driver-results"></div></div>`;
  }

  function renderMovementPanel(vehicle) {
    const rows = movements.filter(item => item.mezzo_id === vehicle.id).slice(0, 30);
    return `<section class="vehicle-panel"><div class="panel-kicker">Storico</div><h3>Movimenti</h3><div class="movement-list">${rows.map(row => `<article class="movement-row${row.annullato ? ' cancelled' : ''}"><div><strong>${row.tipo === 'entrata' ? '↘ ENTRATA' : '↗ USCITA'}${row.annullato ? ' · ANNULLATA' : ''}</strong><small>${escapeHtml(formatDateTime(row.data_ora))}${row.postazione ? ` · ${escapeHtml(row.postazione)}` : ''}${row.note ? ` · ${escapeHtml(row.note)}` : ''}${row.annullato && row.motivo_annullamento ? ` · Motivo: ${escapeHtml(row.motivo_annullamento)}` : ''}</small></div>${row.annullato ? '' : `<button type="button" data-cancel-movement="${row.id}">Annulla</button>`}</article>`).join('') || '<div class="vehicle-empty">Nessun movimento registrato.</div>'}</div></section>`;
  }

  function renderVehicleModal() {
    const modal = $('vehicleModal');
    const body = $('vehicleModalBody');
    if (!modal || !body) return;
    const vehicle = selectedVehicleId ? vehicleById(selectedVehicleId) : null;
    $('vehicleModalTitle').textContent = vehicle ? `${vehicle.targa} · ${vehicle.marca_modello}` : 'Nuovo mezzo';
    $('vehicleModalSubtitle').textContent = vehicle ? ([vehicle.tipologia, vehicle.comitato].filter(Boolean).join(' · ') || 'Gestione operativa mezzo') : 'Inserisci i dati principali del mezzo.';
    body.innerHTML = vehicle ? `<div class="vehicle-layout"><div>${baseVehicleForm(vehicle)}${renderMovementPanel(vehicle)}</div><div>${renderActivationPanel(vehicle)}</div></div>` : baseVehicleForm(null);
    bindModalEvents();
  }

  function openNewVehicle() {
    selectedVehicleId = null;
    selectedVehicleSnapshot = null;
    editingActivationId = null;
    renderVehicleModal();
    $('vehicleModal').hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => $('vehiclePlate')?.focus(), 30);
  }

  function openVehicle(id) {
    const vehicle = vehicleById(id);
    if (!vehicle) return;
    selectedVehicleId = id;
    selectedVehicleSnapshot = { ...vehicle };
    editingActivationId = currentActivation(id)?.id || activations.find(item => item.mezzo_id === id)?.id || null;
    renderVehicleModal();
    $('vehicleModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeVehicleModal() {
    if ($('vehicleModal')) $('vehicleModal').hidden = true;
    selectedVehicleId = null;
    selectedVehicleSnapshot = null;
    editingActivationId = null;
    document.body.classList.remove('modal-open');
  }

  function bindModalEvents() {
    $('vehicleForm')?.addEventListener('submit', saveVehicle);
    $('vehicleDelete')?.addEventListener('click', deleteVehicle);
    $('vehicleCheckin')?.addEventListener('click', () => registerMovement('entrata'));
    $('vehicleCheckout')?.addEventListener('click', () => registerMovement('uscita'));
    $('activationNew')?.addEventListener('click', () => { editingActivationId = null; renderVehicleModal(); setTimeout(() => $('activationStart')?.focus(), 20); });
    $('activationSave')?.addEventListener('click', saveActivation);
    $('driverSearch')?.addEventListener('input', renderDriverCandidates);

    $('vehicleModalBody')?.addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-activation]');
      if (edit) { editingActivationId = edit.dataset.editActivation; renderVehicleModal(); return; }
      const principal = event.target.closest('[data-driver-principal]');
      if (principal) { setPrincipalDriver(principal.dataset.driverPrincipal); return; }
      const remove = event.target.closest('[data-driver-remove]');
      if (remove) { removeDriver(remove.dataset.driverRemove); return; }
      const add = event.target.closest('[data-driver-add]');
      if (add) { addDriver(add.dataset.driverAdd); return; }
      const cancel = event.target.closest('[data-cancel-movement]');
      if (cancel) { cancelMovement(cancel.dataset.cancelMovement); }
    });
  }

  async function saveVehicle(event) {
    event.preventDefault();
    const payload = {
      targa: $('vehiclePlate').value.trim(),
      marca_modello: $('vehicleModel').value.trim(),
      tipologia: nullable($('vehicleType').value),
      comitato: nullable($('vehicleCommittee').value),
      regione: nullable($('vehicleRegion').value),
      note: nullable($('vehicleNotes').value),
      fonte: 'area_segreteria'
    };
    if (!payload.targa || !payload.marca_modello) { showToast('Targa e marca/modello sono obbligatori.', 'error'); return; }
    $('vehicleSave').disabled = true;

    let result;
    if (!selectedVehicleId) {
      result = await client.from('mezzi').insert(payload).select().single();
    } else {
      let query = client.from('mezzi').update(payload).eq('id', selectedVehicleId);
      if (selectedVehicleSnapshot?.updated_at) query = query.eq('updated_at', selectedVehicleSnapshot.updated_at);
      result = await query.select().maybeSingle();
    }
    $('vehicleSave').disabled = false;

    if (result.error) {
      showToast(result.error.code === '23505' ? 'Esiste già un mezzo con questa targa.' : result.error.message, 'error');
      return;
    }
    if (selectedVehicleId && !result.data) {
      showToast('Il mezzo è stato modificato da un’altra postazione. Ricarico i dati.', 'error');
      await loadAll({ silent: true });
      return;
    }

    selectedVehicleId = result.data.id;
    selectedVehicleSnapshot = { ...result.data };
    showToast(selectedVehicleSnapshot ? 'Mezzo salvato.' : 'Mezzo creato.', 'success');
    await loadAll({ silent: true });
    editingActivationId = editingActivationId || null;
    renderVehicleModal();
  }

  async function deleteVehicle() {
    const vehicle = vehicleById(selectedVehicleId);
    if (!vehicle) return;
    if (!window.confirm(`Eliminare definitivamente il mezzo ${vehicle.targa} - ${vehicle.marca_modello}? Verranno rimossi anche i dati collegati se previsti dalle relazioni del database.`)) return;
    $('vehicleDelete').disabled = true;
    const { error } = await client.from('mezzi').delete().eq('id', vehicle.id);
    $('vehicleDelete').disabled = false;
    if (error) { showToast(`Eliminazione non riuscita: ${error.message}`, 'error'); return; }
    closeVehicleModal();
    await loadAll({ silent: true });
    showToast('Mezzo eliminato.', 'success');
  }

  async function registerMovement(tipo) {
    if (!selectedVehicleId) return;
    const { data, error } = await client.rpc('registra_movimento_mezzo_sicuro', {
      p_mezzo_id: selectedVehicleId,
      p_tipo: tipo,
      p_fonte: 'area_segreteria',
      p_note: null,
      p_postazione: getStation()
    });
    if (error) { showToast(`Movimento non registrato: ${error.message}`, 'error'); return; }
    if (data?.status === 'registrato') showToast(tipo === 'entrata' ? 'Entrata mezzo registrata.' : 'Uscita mezzo registrata.', 'success');
    else if (data?.status === 'gia_presente') showToast('Il mezzo risulta già presente.', 'error');
    else if (data?.status === 'gia_fuori') showToast('Il mezzo risulta già fuori dal Campo.', 'error');
    else showToast('Movimento non registrato.', 'error');
    await loadAll({ silent: true });
  }

  async function cancelMovement(id) {
    const reason = window.prompt('Motivo dell’annullamento del movimento:');
    if (!reason?.trim()) return;
    const { data, error } = await client.rpc('annulla_movimento_mezzo', {
      p_movimento_id: id,
      p_motivo: reason.trim(),
      p_postazione: getStation()
    });
    if (error) { showToast(`Annullamento non riuscito: ${error.message}`, 'error'); return; }
    if (data?.status === 'annullato') showToast('Movimento annullato e presenza ricalcolata.', 'success');
    else showToast('Movimento non annullato.', 'error');
    await loadAll({ silent: true });
  }

  async function saveActivation() {
    const vehicle = vehicleById(selectedVehicleId);
    if (!vehicle) return;
    const start = toIso($('activationStart').value);
    const end = toIso($('activationEnd').value);
    if (!start) { showToast('Data/ora di inizio obbligatoria.', 'error'); return; }
    $('activationSave').disabled = true;
    const { data, error } = await client.rpc('salva_attivazione_mezzo', {
      p_mezzo_id: vehicle.id,
      p_data_inizio: start,
      p_data_fine: end,
      p_destinazione: nullable($('activationDestination').value),
      p_note: nullable($('activationNotes').value),
      p_attiva: $('activationActive').checked,
      p_fonte: 'area_segreteria',
      p_postazione: getStation(),
      p_attivazione_id: $('activationId').value || null,
      p_importazione_id: null
    });
    $('activationSave').disabled = false;
    if (error) { showToast(`Attivazione non salvata: ${error.message}`, 'error'); return; }
    if (data?.status !== 'salvata') { showToast('Attivazione non salvata.', 'error'); return; }
    editingActivationId = data.attivazione_id;
    showToast('Attivazione salvata.', 'success');
    await loadAll({ silent: true });
  }

  function renderDriverCandidates() {
    const container = $('driverResults');
    const input = $('driverSearch');
    if (!container || !input || !editingActivationId) return;
    const q = normalize(input.value);
    if (q.length < 2) { container.innerHTML = ''; return; }
    const existing = new Set(activationDrivers(editingActivationId).map(row => row.persona_id));
    const rows = people.filter(person => !existing.has(person.id) && normalize([person.nome, person.cognome, person.comitato, person.numero_badge].filter(Boolean).join(' ')).includes(q)).slice(0, 15);
    container.innerHTML = rows.map(person => `<div class="driver-candidate"><div><strong>${escapeHtml(fullName(person))}</strong><small>${escapeHtml([person.comitato, person.numero_badge ? `Badge ${person.numero_badge}` : null].filter(Boolean).join(' · ') || 'Anagrafica Campo')}</small></div><button type="button" data-driver-add="${person.id}">Aggiungi</button></div>`).join('') || '<div class="vehicle-empty">Nessuna persona trovata.</div>';
  }

  async function addDriver(personId) {
    if (!editingActivationId) return;
    const { data, error } = await client.rpc('imposta_autista_mezzo', {
      p_attivazione_id: editingActivationId,
      p_persona_id: personId,
      p_principale: false,
      p_note: null,
      p_fonte: 'area_segreteria',
      p_postazione: getStation(),
      p_importazione_id: null
    });
    if (error || data?.status !== 'salvato') { showToast(`Autista non aggiunto: ${error?.message || 'operazione non completata'}`, 'error'); return; }
    showToast(data.principale ? 'Autista aggiunto come principale.' : 'Autista aggiunto.', 'success');
    await loadAll({ silent: true });
  }

  async function setPrincipalDriver(personId) {
    const row = drivers.find(item => item.attivazione_mezzo_id === editingActivationId && item.persona_id === personId);
    if (!row) return;
    const { data, error } = await client.rpc('imposta_autista_mezzo', {
      p_attivazione_id: editingActivationId,
      p_persona_id: personId,
      p_principale: true,
      p_note: row.note || null,
      p_fonte: row.fonte || 'area_segreteria',
      p_postazione: getStation(),
      p_importazione_id: row.importazione_id || null
    });
    if (error || data?.status !== 'salvato') { showToast(`Autista principale non aggiornato: ${error?.message || 'operazione non completata'}`, 'error'); return; }
    showToast('Autista principale aggiornato.', 'success');
    await loadAll({ silent: true });
  }

  async function removeDriver(personId) {
    const person = personById(personId);
    if (!window.confirm(`Rimuovere ${fullName(person) || 'questa persona'} dagli autisti dell’attivazione?`)) return;
    const { data, error } = await client.rpc('rimuovi_autista_mezzo', {
      p_attivazione_id: editingActivationId,
      p_persona_id: personId,
      p_postazione: getStation()
    });
    if (error || data?.status !== 'rimosso') { showToast(`Autista non rimosso: ${error?.message || 'operazione non completata'}`, 'error'); return; }
    showToast('Autista rimosso.', 'success');
    await loadAll({ silent: true });
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadAll({ silent: true }), 180);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-segreteria-mezzi');
    ['mezzi', 'attivazioni_mezzi', 'autisti_mezzi', 'movimenti_mezzi', 'persone'].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    });
    realtimeChannel.subscribe(status => {
      const el = $('vehicleRealtime');
      if (!el) return;
      if (status === 'SUBSCRIBED') { el.textContent = '● Realtime collegato'; el.className = 'vehicle-realtime'; }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { el.textContent = 'Realtime da riconnettere'; el.className = 'vehicle-realtime warning'; }
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
    await loadAll();
    connectRealtime();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
