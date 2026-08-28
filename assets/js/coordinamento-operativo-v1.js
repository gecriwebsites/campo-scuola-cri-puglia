(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';

  let client = null;
  let session = null;
  let profile = null;
  let currentDate = CAMP_START;
  let criticalities = [];
  let handovers = [];
  let dayRow = null;
  let channel = null;
  let setupMissing = false;
  let loading = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function romeToday() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(p => [p.type,p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function initialDate() {
    const today = romeToday();
    return today >= CAMP_START && today <= CAMP_END ? today : CAMP_START;
  }

  function formatDate(value) {
    if (!value) return '—';
    const [y,m,d] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', { weekday:'long', day:'2-digit', month:'long', timeZone:'Europe/Rome' }).format(new Date(Date.UTC(y,m-1,d,12)));
  }

  function formatTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', { timeZone:'Europe/Rome', hour:'2-digit', minute:'2-digit' }).format(date);
  }

  function station() { return sessionStorage.getItem(STATION_STORAGE_KEY) || ''; }
  function canSee() { return profile?.ruolo === 'admin' || (profile?.ruolo === 'segreteria' && station() === 'Referente Segreteria'); }

  function injectStyles() {
    if ($('coordOpsV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'coordOpsV1Styles';
    style.textContent = `
      #coordinationView{max-width:none!important}.coord-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.coord-head h2{margin:3px 0 4px;font-size:28px;color:#1d3340}.coord-head p{margin:0;color:#6f7f89;font-size:13px}.coord-datebar{display:flex;gap:7px;align-items:center}.coord-datebar input{height:42px;border:1px solid #cad4da;border-radius:6px;padding:0 10px;font:inherit;font-size:13px;background:#fff}.coord-refresh{height:42px;border:1px solid #cad4da;border-radius:6px;background:#fff;padding:0 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .coord-setup{margin-bottom:12px;padding:11px 12px;border:1px solid #efc7ce;background:#fff7f8;border-radius:6px;color:#8b2435;font-size:12px;line-height:1.45}.coord-top{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}.coord-kpi{border:1px solid #dbe2e7;background:#fff;border-radius:7px;padding:13px 14px}.coord-kpi small{display:block;font-size:11px;color:#71808a;font-weight:750}.coord-kpi strong{display:block;margin-top:4px;font-size:23px;line-height:1.05;color:#213945}.coord-kpi em{display:block;margin-top:4px;font-style:normal;font-size:10px;color:#7c8991}.coord-kpi.alert{border-color:#efc5cb;background:#fff9fa}.coord-kpi.good{border-color:#cfe6da;background:#f8fcfa}
      .coord-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(360px,.8fr);gap:12px;align-items:start}.coord-stack{display:grid;gap:12px}.coord-panel{border:1px solid #dbe2e7;background:#fff;border-radius:7px;padding:14px}.coord-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.coord-panel-head h3{margin:2px 0 0;font-size:17px;color:#263d49}.coord-panel-head p{margin:3px 0 0;font-size:11px;color:#74828b}.coord-panel-head select{height:34px;border:1px solid #ccd5db;border-radius:5px;background:#fff;padding:0 8px;font:inherit;font-size:11px}
      .coord-critical-list,.coord-handover-list{display:grid;gap:7px}.coord-critical{display:grid;grid-template-columns:6px minmax(0,1fr) auto;gap:10px;border:1px solid #e2e6e9;border-radius:5px;background:#fafbfc;padding:10px}.coord-critical-bar{border-radius:999px;background:#87949c}.coord-critical[data-priority="alta"] .coord-critical-bar{background:#d27b16}.coord-critical[data-priority="critica"] .coord-critical-bar{background:#b21f37}.coord-critical[data-priority="bassa"] .coord-critical-bar{background:#5f8ba4}.coord-critical strong{font-size:13px;color:#324955}.coord-critical small{display:block;margin-top:3px;font-size:10px;color:#74818a;line-height:1.4}.coord-critical-desc{margin-top:5px;font-size:11px;color:#4b5d67;line-height:1.45;white-space:pre-wrap}.coord-critical-actions{display:flex;align-items:flex-start;gap:5px;flex-wrap:wrap;justify-content:flex-end}.coord-mini-btn{border:1px solid #cfd7dc;background:#fff;border-radius:4px;padding:6px 7px;font:inherit;font-size:9px;font-weight:850;cursor:pointer}.coord-mini-btn.primary{border-color:#173b52;background:#173b52;color:#fff}.coord-mini-btn.success{border-color:#168454;background:#168454;color:#fff}.coord-state{display:inline-flex;margin-top:5px;border-radius:999px;padding:3px 6px;font-size:9px;font-weight:900;background:#eef1f3;color:#5d6c75}.coord-state.in_gestione{background:#fff3d8;color:#8b6200}.coord-state.risolta{background:#eaf7ef;color:#16794f}.coord-empty{padding:15px;border:1px dashed #ced7dd;border-radius:5px;color:#74828a;font-size:11px;text-align:center}
      .coord-form{display:grid;grid-template-columns:minmax(0,1fr) 150px 130px;gap:7px;margin-bottom:8px}.coord-form input,.coord-form select,.coord-form textarea,.coord-handover-form textarea{width:100%;box-sizing:border-box;border:1px solid #cad4da;border-radius:5px;background:#fff;padding:8px 9px;font:inherit;font-size:12px}.coord-form input,.coord-form select{height:39px}.coord-form textarea{grid-column:1/-1;min-height:64px;resize:vertical}.coord-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end}.coord-add{min-height:37px;border:0;border-radius:5px;background:#173b52;color:#fff;padding:7px 11px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.coord-add:disabled{opacity:.5;cursor:not-allowed}
      .coord-handover{border:1px solid #e1e6e9;border-radius:5px;padding:9px 10px;background:#fafbfc}.coord-handover p{margin:0;font-size:11px;line-height:1.45;color:#40545f;white-space:pre-wrap}.coord-handover small{display:block;margin-top:6px;font-size:9px;color:#7a8790}.coord-handover-form textarea{min-height:80px;resize:vertical}.coord-handover-actions{display:flex;justify-content:flex-end;margin-top:7px}.coord-day-note{padding:10px 11px;border-left:4px solid #647b89;background:#f5f8fa;border-radius:4px;font-size:11px;line-height:1.45;color:#40545f;white-space:pre-wrap}.coord-day-note.empty{color:#7b8891;font-style:italic}.coord-quicklinks{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.coord-quicklink{min-height:40px;border:1px solid #d6dee3;border-radius:5px;background:#fff;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.coord-quicklink:hover{border-color:#173b52;color:#173b52;background:#f6fafc}.coord-message{min-height:16px;margin-top:7px;font-size:10px;font-weight:750;color:#687781}.coord-message.error{color:#a0001d}.coord-message.success{color:#16794f}
      @media(max-width:1050px){.coord-top{grid-template-columns:repeat(2,1fr)}.coord-grid{grid-template-columns:1fr}.coord-form{grid-template-columns:1fr 1fr}.coord-form input{grid-column:1/-1}.coord-quicklinks{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:650px){.coord-head{flex-direction:column}.coord-datebar{width:100%}.coord-datebar input{flex:1;min-width:0}.coord-top{grid-template-columns:1fr 1fr}.coord-form{grid-template-columns:1fr}.coord-form textarea,.coord-form input{grid-column:auto}.coord-form-actions{grid-column:auto}.coord-add{width:100%}.coord-critical{grid-template-columns:5px minmax(0,1fr)}.coord-critical-actions{grid-column:2;justify-content:flex-start}.coord-quicklinks{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    const workspace = $('standardWorkspace');
    if (!workspace || $('coordinationView')) return false;
    const nav = workspace.querySelector('.app-nav');
    if (!nav) return false;

    const button = document.createElement('button');
    button.id = 'coordinationNavButton';
    button.className = 'app-nav-btn';
    button.type = 'button';
    button.dataset.view = 'coordinamento';
    button.textContent = 'Coordinamento';
    button.hidden = true;
    button.addEventListener('click', activateView);
    nav.appendChild(button);

    const section = document.createElement('section');
    section.id = 'coordinationView';
    section.className = 'app-view';
    section.dataset.viewPanel = 'coordinamento';
    section.hidden = true;
    section.innerHTML = `
      <div class="coord-head"><div><div class="kicker">Referente Segreteria</div><h2>Coordinamento operativo</h2><p>Criticità, passaggio consegne e quadro sintetico della giornata in un’unica schermata.</p></div><div class="coord-datebar"><input id="coordDate" type="date" min="${CAMP_START}" max="${CAMP_END}" value="${currentDate}"><button id="coordRefresh" class="coord-refresh" type="button">↻ Aggiorna</button></div></div>
      <div id="coordSetup" class="coord-setup" hidden>Modulo database non ancora installato. Esegui <strong>supabase/step-coordinamento-operativo.sql</strong> nel SQL Editor di Supabase e ricarica la pagina.</div>
      <div class="coord-top">
        <article class="coord-kpi"><small>Giornata</small><strong id="coordDayState">—</strong><em id="coordDayDate">—</em></article>
        <article class="coord-kpi good"><small>Persone presenti</small><strong id="coordPresent">—</strong><em id="coordPeopleTotal">—</em></article>
        <article id="coordCriticalKpi" class="coord-kpi"><small>Criticità aperte</small><strong id="coordCriticalCount">—</strong><em id="coordCriticalMeta">—</em></article>
        <article class="coord-kpi"><small>Passaggi consegne</small><strong id="coordHandoverCount">—</strong><em>note della giornata</em></article>
      </div>
      <div class="coord-grid">
        <div class="coord-stack">
          <section class="coord-panel"><div class="coord-panel-head"><div><h3>Criticità operative</h3><p>Registra, prendi in gestione e risolvi le criticità senza perdere lo storico.</p></div><select id="coordCriticalFilter"><option value="attive">Aperte / in gestione</option><option value="tutte">Tutte</option><option value="risolte">Risolte</option></select></div>
            <div class="coord-form"><input id="coordCriticalTitle" type="text" maxlength="160" placeholder="Titolo criticità"><select id="coordCriticalArea"><option value="generale">Generale</option><option value="accredito">Accredito</option><option value="turni">Turni</option><option value="alloggi">Alloggi</option><option value="pasti">Pasti / Cucina</option><option value="mezzi">Mezzi</option><option value="logistica">Logistica</option><option value="tlc">TLC</option></select><select id="coordCriticalPriority"><option value="bassa">Bassa</option><option value="media" selected>Media</option><option value="alta">Alta</option><option value="critica">Critica</option></select><textarea id="coordCriticalDescription" maxlength="1600" placeholder="Dettaglio / azioni da intraprendere…"></textarea><div class="coord-form-actions"><button id="coordCriticalAdd" class="coord-add" type="button">Aggiungi criticità</button></div></div>
            <div id="coordCriticalList" class="coord-critical-list"></div><div id="coordCriticalMessage" class="coord-message"></div>
          </section>
          <section class="coord-panel"><div class="coord-panel-head"><div><h3>Passaggio consegne</h3><p>Note cronologiche condivise tra Referente e Admin.</p></div></div><div class="coord-handover-form"><textarea id="coordHandoverText" maxlength="2400" placeholder="Scrivi una nota per il turno o referente successivo…"></textarea><div class="coord-handover-actions"><button id="coordHandoverAdd" class="coord-add" type="button">Aggiungi al passaggio consegne</button></div></div><div id="coordHandoverList" class="coord-handover-list" style="margin-top:10px"></div><div id="coordHandoverMessage" class="coord-message"></div></section>
        </div>
        <div class="coord-stack">
          <section class="coord-panel"><div class="coord-panel-head"><div><h3>Nota giornata</h3><p>Nota ufficiale salvata nella Gestione giornata operativa.</p></div></div><div id="coordDayNote" class="coord-day-note empty">Nessuna nota registrata.</div></section>
          <section class="coord-panel"><div class="coord-panel-head"><div><h3>Accessi rapidi</h3><p>Vai direttamente ai moduli di gestione.</p></div></div><div class="coord-quicklinks"><button class="coord-quicklink" data-coord-open="situazione" type="button">Situazione</button><button class="coord-quicklink" data-coord-open="turni" type="button">Turni</button><button class="coord-quicklink" data-coord-open="pernottamenti" type="button">Alloggi</button><button class="coord-quicklink" data-coord-open="pasti" type="button">Pasti</button><button class="coord-quicklink" data-coord-open="mezzi" type="button">Mezzi</button></div></section>
          <section class="coord-panel"><div class="coord-panel-head"><div><h3>Uso consigliato</h3><p>Schermata di riferimento per il coordinamento della Segreteria.</p></div></div><div style="font-size:11px;line-height:1.55;color:#4c606b">Mantieni qui solo ciò che richiede attenzione o passaggio di informazioni. Le attività ordinarie restano nei rispettivi moduli. Quando una criticità è chiusa, marcala come <strong>Risolta</strong> invece di cancellarla.</div></section>
        </div>
      </div>`;
    workspace.appendChild(section);

    $('coordDate')?.addEventListener('change', event => { currentDate = event.target.value; void loadAll(); });
    $('coordRefresh')?.addEventListener('click', loadAll);
    $('coordCriticalFilter')?.addEventListener('change', renderCriticalities);
    $('coordCriticalAdd')?.addEventListener('click', addCriticality);
    $('coordHandoverAdd')?.addEventListener('click', addHandover);
    section.addEventListener('click', event => {
      const action = event.target.closest('[data-critical-action]');
      if (action) void updateCriticality(action.dataset.criticalId, action.dataset.criticalAction);
      const quick = event.target.closest('[data-coord-open]');
      if (quick) openModule(quick.dataset.coordOpen);
    });
    return true;
  }

  function activateView() {
    if (!canSee()) return;
    document.querySelectorAll('#standardWorkspace .app-nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === 'coordinamento'));
    document.querySelectorAll('#standardWorkspace [data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === 'coordinamento';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    void loadAll();
  }

  function openModule(view) {
    document.querySelector(`#standardWorkspace .app-nav-btn[data-view="${view}"]`)?.click();
  }

  function updateAccess() {
    const allowed = canSee();
    const button = $('coordinationNavButton');
    if (button) button.hidden = !allowed;
    if (!allowed && !$('coordinationView')?.hidden) document.querySelector('#standardWorkspace .app-nav-btn[data-view="dashboard"]')?.click();
  }

  function setMessage(id, message='', type='') {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = `coord-message${type ? ` ${type}` : ''}`;
  }

  async function countPeople() {
    const [{ count:present, error:presentError }, { count:total, error:totalError }] = await Promise.all([
      client.from('persone').select('*', { count:'exact', head:true }).eq('presente', true),
      client.from('persone').select('*', { count:'exact', head:true })
    ]);
    return { present:presentError ? null : Number(present || 0), total:totalError ? null : Number(total || 0) };
  }

  async function loadAll() {
    if (loading || !client || !canSee()) return;
    loading = true;
    try {
      const [dayResult, critResult, handResult, people] = await Promise.all([
        client.from('giornate_operative').select('*').eq('data', currentDate).maybeSingle(),
        client.from('criticita_operative').select('*').eq('data', currentDate).order('created_at', { ascending:false }).limit(200),
        client.from('passaggi_consegne').select('*').eq('data', currentDate).order('created_at', { ascending:false }).limit(100),
        countPeople()
      ]);

      const missingError = [critResult.error, handResult.error].find(error => error && (String(error.message || '').toLowerCase().includes('criticita_operative') || String(error.message || '').toLowerCase().includes('passaggi_consegne') || error.code === '42P01'));
      setupMissing = !!missingError;
      if ($('coordSetup')) $('coordSetup').hidden = !setupMissing;
      if (setupMissing) return;

      dayRow = dayResult.error ? null : dayResult.data;
      criticalities = critResult.error ? [] : (critResult.data || []);
      handovers = handResult.error ? [] : (handResult.data || []);

      const state = dayRow?.stato || 'da_aprire';
      if ($('coordDayState')) $('coordDayState').textContent = state === 'operativa' ? 'Operativa' : state === 'chiusa' ? 'Chiusa' : 'Da aprire';
      if ($('coordDayDate')) $('coordDayDate').textContent = formatDate(currentDate);
      if ($('coordPresent')) $('coordPresent').textContent = people.present == null ? '—' : people.present;
      if ($('coordPeopleTotal')) $('coordPeopleTotal').textContent = people.total == null ? 'totale non disponibile' : `${people.total} anagrafiche totali`;
      const active = criticalities.filter(item => item.stato !== 'risolta');
      const urgent = active.filter(item => item.priorita === 'alta' || item.priorita === 'critica').length;
      if ($('coordCriticalCount')) $('coordCriticalCount').textContent = active.length;
      if ($('coordCriticalMeta')) $('coordCriticalMeta').textContent = urgent ? `${urgent} ad alta priorità` : 'nessuna alta priorità';
      $('coordCriticalKpi')?.classList.toggle('alert', urgent > 0);
      if ($('coordHandoverCount')) $('coordHandoverCount').textContent = handovers.length;
      const note = String(dayRow?.note || '').trim();
      const noteBox = $('coordDayNote');
      if (noteBox) { noteBox.textContent = note || 'Nessuna nota registrata.'; noteBox.classList.toggle('empty', !note); }
      renderCriticalities();
      renderHandovers();
    } finally { loading = false; }
  }

  function renderCriticalities() {
    const box = $('coordCriticalList');
    if (!box) return;
    const filter = $('coordCriticalFilter')?.value || 'attive';
    let rows = criticalities;
    if (filter === 'attive') rows = rows.filter(item => item.stato !== 'risolta');
    if (filter === 'risolte') rows = rows.filter(item => item.stato === 'risolta');
    const priorityRank = { critica:0, alta:1, media:2, bassa:3 };
    rows = [...rows].sort((a,b) => (priorityRank[a.priorita] ?? 9) - (priorityRank[b.priorita] ?? 9) || String(b.created_at).localeCompare(String(a.created_at)));
    if (!rows.length) { box.innerHTML = '<div class="coord-empty">Nessuna criticità per questo filtro.</div>'; return; }
    box.innerHTML = rows.map(item => `
      <article class="coord-critical" data-priority="${esc(item.priorita)}"><span class="coord-critical-bar"></span><div><strong>${esc(item.titolo)}</strong><small>${esc(item.area)} · priorità ${esc(item.priorita)} · ${formatTime(item.created_at)}${item.created_postazione ? ` · ${esc(item.created_postazione)}` : ''}</small><span class="coord-state ${esc(item.stato)}">${item.stato === 'in_gestione' ? 'IN GESTIONE' : item.stato === 'risolta' ? 'RISOLTA' : 'APERTA'}</span>${item.descrizione ? `<div class="coord-critical-desc">${esc(item.descrizione)}</div>` : ''}</div><div class="coord-critical-actions">${item.stato === 'aperta' ? `<button class="coord-mini-btn primary" type="button" data-critical-id="${item.id}" data-critical-action="in_gestione">Prendi in gestione</button>` : ''}${item.stato !== 'risolta' ? `<button class="coord-mini-btn success" type="button" data-critical-id="${item.id}" data-critical-action="risolta">Risolvi</button>` : ''}</div></article>`).join('');
  }

  function renderHandovers() {
    const box = $('coordHandoverList');
    if (!box) return;
    if (!handovers.length) { box.innerHTML = '<div class="coord-empty">Nessuna nota di passaggio consegne per questa giornata.</div>'; return; }
    box.innerHTML = handovers.slice(0,30).map(item => `<article class="coord-handover"><p>${esc(item.testo)}</p><small>${formatTime(item.created_at)}${item.created_postazione ? ` · ${esc(item.created_postazione)}` : ''}</small></article>`).join('');
  }

  async function addCriticality() {
    if (setupMissing || !canSee()) return;
    const title = String($('coordCriticalTitle')?.value || '').trim();
    const description = String($('coordCriticalDescription')?.value || '').trim();
    if (!title) { setMessage('coordCriticalMessage', 'Inserisci il titolo della criticità.', 'error'); return; }
    const button = $('coordCriticalAdd');
    if (button) button.disabled = true;
    const { error } = await client.from('criticita_operative').insert({
      data:currentDate,
      titolo:title,
      descrizione:description || null,
      area:$('coordCriticalArea')?.value || 'generale',
      priorita:$('coordCriticalPriority')?.value || 'media',
      stato:'aperta',
      created_by:session.user.id,
      updated_by:session.user.id,
      created_postazione:station() || null
    });
    if (button) button.disabled = false;
    if (error) { setMessage('coordCriticalMessage', `Salvataggio non riuscito: ${error.message}`, 'error'); return; }
    if ($('coordCriticalTitle')) $('coordCriticalTitle').value = '';
    if ($('coordCriticalDescription')) $('coordCriticalDescription').value = '';
    setMessage('coordCriticalMessage', 'Criticità registrata.', 'success');
    await loadAll();
  }

  async function updateCriticality(id, action) {
    if (!id || !['in_gestione','risolta'].includes(action) || !canSee()) return;
    const payload = { stato:action, updated_at:new Date().toISOString(), updated_by:session.user.id };
    if (action === 'risolta') { payload.risolta_at = new Date().toISOString(); payload.risolta_da = session.user.id; }
    const { error } = await client.from('criticita_operative').update(payload).eq('id', id);
    if (error) { setMessage('coordCriticalMessage', `Aggiornamento non riuscito: ${error.message}`, 'error'); return; }
    setMessage('coordCriticalMessage', action === 'risolta' ? 'Criticità risolta.' : 'Criticità presa in gestione.', 'success');
    await loadAll();
  }

  async function addHandover() {
    if (setupMissing || !canSee()) return;
    const text = String($('coordHandoverText')?.value || '').trim();
    if (!text) { setMessage('coordHandoverMessage', 'Scrivi prima la nota da condividere.', 'error'); return; }
    const button = $('coordHandoverAdd');
    if (button) button.disabled = true;
    const { error } = await client.from('passaggi_consegne').insert({ data:currentDate, testo:text, created_by:session.user.id, created_postazione:station() || null });
    if (button) button.disabled = false;
    if (error) { setMessage('coordHandoverMessage', `Salvataggio non riuscito: ${error.message}`, 'error'); return; }
    if ($('coordHandoverText')) $('coordHandoverText').value = '';
    setMessage('coordHandoverMessage', 'Nota aggiunta al passaggio consegne.', 'success');
    await loadAll();
  }

  function subscribeRealtime() {
    if (!client || channel) return;
    channel = client.channel('coordinamento-operativo-ui')
      .on('postgres_changes', { event:'*', schema:'public', table:'criticita_operative' }, payload => { const row = payload.new || payload.old; if (row?.data === currentDate && canSee()) void loadAll(); })
      .on('postgres_changes', { event:'*', schema:'public', table:'passaggi_consegne' }, payload => { const row = payload.new || payload.old; if (row?.data === currentDate && canSee()) void loadAll(); })
      .on('postgres_changes', { event:'*', schema:'public', table:'giornate_operative' }, payload => { const row = payload.new || payload.old; if (row?.data === currentDate && canSee()) void loadAll(); })
      .subscribe();
  }

  async function init() {
    injectStyles();
    currentDate = initialDate();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session:currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    const { data, error:profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo) return;
    profile = data;

    for (let i=0;i<80;i+=1) {
      if (injectUi()) break;
      await new Promise(resolve => setTimeout(resolve,75));
    }
    if ($('coordDate')) $('coordDate').value = currentDate;
    updateAccess();
    window.addEventListener('campo:station-changed', () => { updateAccess(); if (canSee()) void loadAll(); });
    subscribeRealtime();
    if (canSee()) await loadAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
