(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const MEALS = ['colazione', 'pranzo', 'cena'];
  const mealLabels = { colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena' };

  const els = {
    view: document.querySelector('[data-view-panel="pasti"]'),
    realtime: $('mealsRealtimeState'),
    summaryDate: $('mealsSummaryDate'),
    personSearch: $('mealPersonSearch'),
    personList: $('mealPersonList'),
    personCount: $('mealPersonCount'),
    emptySelection: $('mealEmptySelection'),
    selectedPanel: $('mealSelectedPanel'),
    selectedName: $('mealSelectedPersonName'),
    selectedMeta: $('mealSelectedPersonMeta'),
    dietary: $('mealSelectedDietary'),
    rangeFrom: $('mealRangeFrom'),
    rangeTo: $('mealRangeTo'),
    usePersonPeriod: $('mealUsePersonPeriod'),
    assignRange: $('mealAssignRange'),
    removeRange: $('mealRemoveRange'),
    bulkState: $('mealBulkState'),
    calendarBody: $('mealCalendarBody'),
    toast: $('toast'),
    bPrev: $('mealAdminBreakfastExpected'), bUsed: $('mealAdminBreakfastUsed'), bRemain: $('mealAdminBreakfastRemaining'),
    lPrev: $('mealAdminLunchExpected'), lUsed: $('mealAdminLunchUsed'), lRemain: $('mealAdminLunchRemaining'),
    dPrev: $('mealAdminDinnerExpected'), dUsed: $('mealAdminDinnerUsed'), dRemain: $('mealAdminDinnerRemaining')
  };

  let client = null;
  let session = null;
  let profile = null;
  let people = [];
  let services = [];
  let servicesByKey = new Map();
  let servicesById = new Map();
  let ticketsByKey = new Map();
  let currentPersonId = null;
  let currentDietary = null;
  let realtimeChannel = null;
  let reloadTimer = null;
  let toastTimer = null;
  let bulkInProgress = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalize(value) { return String(value || '').trim().toLocaleLowerCase('it'); }
  function fullName(person) { return `${person?.nome || ''} ${person?.cognome || ''}`.trim(); }
  function keyFor(data, tipo) { return `${data}|${tipo}`; }
  function clampDate(value, fallback) { return value && value >= CAMP_START && value <= CAMP_END ? value : fallback; }
  function personById(id) { return people.find(person => person.id === id) || null; }

  function formatDate(value) {
    if (!value) return '—';
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function initialSummaryDate() {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return today >= CAMP_START && today <= CAMP_END ? today : CAMP_START;
  }

  function showToast(message, type = '') {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast${type ? ` ${type}` : ''}`;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3400);
  }

  function setBulkState(message = '', type = '') {
    if (!els.bulkState) return;
    els.bulkState.textContent = message;
    els.bulkState.dataset.state = type;
  }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    return error || !data || !data.attivo ? null : data;
  }

  function resetSummary() {
    [els.bPrev, els.bUsed, els.bRemain, els.lPrev, els.lUsed, els.lRemain, els.dPrev, els.dUsed, els.dRemain].forEach(el => { if (el) el.textContent = '0'; });
  }

  function applySummary(tipo, row) {
    const map = {
      colazione: [els.bPrev, els.bUsed, els.bRemain],
      pranzo: [els.lPrev, els.lUsed, els.lRemain],
      cena: [els.dPrev, els.dUsed, els.dRemain]
    };
    const targets = map[tipo];
    if (!targets) return;
    targets[0].textContent = String(row.previsti ?? 0);
    targets[1].textContent = String(row.consumati ?? 0);
    targets[2].textContent = String(row.restanti ?? 0);
  }

  async function loadSummary() {
    resetSummary();
    const { data, error } = await client.rpc('cucina_dashboard', { p_data: els.summaryDate.value || CAMP_START });
    if (error) {
      showToast(`Riepilogo pasti non disponibile: ${error.message}`, 'error');
      return;
    }
    (data || []).forEach(row => applySummary(row.tipo, row));
  }

  async function loadServices() {
    const { data, error } = await client.from('servizi_pasto')
      .select('id,data,tipo,attivo')
      .gte('data', CAMP_START)
      .lte('data', CAMP_END)
      .order('data', { ascending: true });
    if (error) throw error;
    services = (data || []).filter(item => item.attivo !== false).sort((a, b) => {
      const dateCmp = String(a.data).localeCompare(String(b.data));
      if (dateCmp) return dateCmp;
      return MEALS.indexOf(a.tipo) - MEALS.indexOf(b.tipo);
    });
    servicesByKey = new Map(services.map(service => [keyFor(service.data, service.tipo), service]));
    servicesById = new Map(services.map(service => [service.id, service]));
  }

  async function loadPeople() {
    const { data, error } = await client.from('persone')
      .select('id,nome,cognome,codice_fiscale,numero_badge,comitato,data_arrivo_prevista,data_partenza_prevista,attivo')
      .eq('attivo', true)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(2000);
    if (error) throw error;
    people = data || [];
    renderPeople();
    if (currentPersonId && !personById(currentPersonId)) clearSelection();
  }

  function personHaystack(person) {
    return normalize([person.nome, person.cognome, person.codice_fiscale, person.numero_badge, person.comitato].filter(Boolean).join(' '));
  }

  function renderPeople() {
    if (!els.personList) return;
    const q = normalize(els.personSearch.value);
    const filtered = people.filter(person => !q || personHaystack(person).includes(q));
    els.personCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'persona' : 'persone'}`;
    els.personList.innerHTML = filtered.slice(0, 200).map(person => `
      <button class="meal-person-item${person.id === currentPersonId ? ' active' : ''}" type="button" data-meal-person="${person.id}">
        <span><strong>${escapeHtml(fullName(person))}</strong><small>${escapeHtml([person.comitato, person.numero_badge ? `Badge ${person.numero_badge}` : ''].filter(Boolean).join(' · ') || 'Anagrafica Campo')}</small></span>
        <em>${person.data_arrivo_prevista || person.data_partenza_prevista ? `${escapeHtml(person.data_arrivo_prevista || '…')} → ${escapeHtml(person.data_partenza_prevista || '…')}` : 'Apri'}</em>
      </button>`).join('') || '<div class="empty-state" style="padding:24px 10px">Nessuna persona trovata.</div>';
  }

  async function loadDietary(personId) {
    currentDietary = null;
    const { data, error } = await client.from('esigenze_alimentari').select('presente,descrizione').eq('persona_id', personId).maybeSingle();
    if (!error && data) currentDietary = data;
    renderDietary();
  }

  function renderDietary() {
    if (!els.dietary) return;
    if (!currentDietary?.presente) {
      els.dietary.hidden = true;
      els.dietary.innerHTML = '';
      return;
    }
    els.dietary.hidden = false;
    els.dietary.innerHTML = `<span>⚠️</span><div><strong>Esigenza alimentare segnalata</strong><div>${escapeHtml(currentDietary.descrizione || 'Dettaglio non specificato')}</div></div>`;
  }

  async function loadTickets(personId) {
    ticketsByKey = new Map();
    const { data, error } = await client.from('persone_pasti')
      .select('id,servizio_pasto_id,previsto,consumato,consumato_at,consumato_postazione,ticket_attivo')
      .eq('persona_id', personId)
      .limit(200);
    if (error) throw error;
    (data || []).forEach(ticket => {
      const service = servicesById.get(ticket.servizio_pasto_id);
      if (service) ticketsByKey.set(keyFor(service.data, service.tipo), ticket);
    });
    renderCalendar();
  }

  function mealState(data, tipo) {
    const ticket = ticketsByKey.get(keyFor(data, tipo));
    if (!ticket || ticket.previsto !== true || ticket.ticket_attivo === false) return { state: 'off', label: 'Non previsto', disabled: false, ticket: ticket || null };
    if (ticket.consumato === true) return { state: 'used', label: '✓ Utilizzato', disabled: true, ticket };
    return { state: 'assigned', label: '✓ Previsto', disabled: false, ticket };
  }

  function renderCalendar() {
    if (!els.calendarBody || !currentPersonId) return;
    const dates = [...new Set(services.map(service => service.data))];
    els.calendarBody.innerHTML = dates.map(data => {
      const cells = MEALS.map(tipo => {
        const state = mealState(data, tipo);
        const detail = state.ticket?.consumato_at ? ` title="Utilizzato ${escapeHtml(formatDateTime(state.ticket.consumato_at))}"` : '';
        return `<td><button class="meal-toggle ${tipo} ${state.state}" type="button" data-meal-date="${data}" data-meal-type="${tipo}" ${state.disabled ? 'disabled' : ''}${detail}>${state.label}</button></td>`;
      }).join('');
      return `<tr><td class="meal-calendar-date"><strong>${escapeHtml(formatDate(data))}</strong><small>${escapeHtml(data)}</small></td>${cells}</tr>`;
    }).join('');
  }

  function clearSelection() {
    currentPersonId = null;
    currentDietary = null;
    ticketsByKey = new Map();
    els.emptySelection.hidden = false;
    els.selectedPanel.hidden = true;
    renderPeople();
  }

  async function selectPerson(personId) {
    const person = personById(personId);
    if (!person) return;
    currentPersonId = person.id;
    els.emptySelection.hidden = true;
    els.selectedPanel.hidden = false;
    els.selectedName.textContent = fullName(person);
    els.selectedMeta.textContent = [person.comitato, person.numero_badge ? `Badge ${person.numero_badge}` : null].filter(Boolean).join(' · ') || 'Anagrafica Campo';
    els.rangeFrom.value = clampDate(person.data_arrivo_prevista, CAMP_START);
    els.rangeTo.value = clampDate(person.data_partenza_prevista, CAMP_END);
    if (els.rangeFrom.value > els.rangeTo.value) {
      els.rangeFrom.value = CAMP_START;
      els.rangeTo.value = CAMP_END;
    }
    renderPeople();
    setBulkState('');
    await Promise.all([loadTickets(person.id), loadDietary(person.id)]);
  }

  async function setMeal(data, tipo, previsto, button = null) {
    if (!currentPersonId || bulkInProgress) return;
    if (button) button.classList.add('loading');
    const { data: result, error } = await client.rpc('imposta_ticket_pasto', {
      p_persona_id: currentPersonId,
      p_data: data,
      p_tipo: tipo,
      p_previsto: previsto,
      p_fonte: 'area_segreteria'
    });
    if (button) button.classList.remove('loading');
    if (error) {
      showToast(`Modifica ticket non riuscita: ${error.message}`, 'error');
      return;
    }
    if (result?.status === 'ticket_gia_utilizzato') {
      showToast(`${mealLabels[tipo]} del ${formatDate(data)} già utilizzato: non può essere rimosso.`, 'error');
    } else if (!['assegnato', 'rimosso', 'gia_non_previsto'].includes(result?.status)) {
      showToast('Operazione ticket non completata.', 'error');
    }
    await Promise.all([loadTickets(currentPersonId), loadSummary()]);
  }

  function datesInRange(from, to) {
    const dates = [...new Set(services.map(service => service.data))];
    return dates.filter(date => date >= from && date <= to);
  }

  async function runBatches(tasks, size = 6) {
    const results = [];
    for (let i = 0; i < tasks.length; i += size) {
      const batch = tasks.slice(i, i + size);
      results.push(...await Promise.all(batch.map(task => task())));
    }
    return results;
  }

  async function setRange(previsto) {
    if (!currentPersonId || bulkInProgress) return;
    const from = els.rangeFrom.value;
    const to = els.rangeTo.value;
    if (!from || !to || from > to) {
      showToast('Controlla le date del periodo.', 'error');
      return;
    }
    const dates = datesInRange(from, to);
    if (!dates.length) {
      showToast('Nessun servizio pasto nel periodo selezionato.', 'error');
      return;
    }
    if (!previsto && !window.confirm(`Rimuovere tutti i ticket non ancora utilizzati dal ${from} al ${to}?`)) return;

    bulkInProgress = true;
    els.assignRange.disabled = true;
    els.removeRange.disabled = true;
    setBulkState(previsto ? 'Assegnazione ticket in corso…' : 'Rimozione ticket in corso…', 'working');

    const tasks = [];
    dates.forEach(data => MEALS.forEach(tipo => tasks.push(async () => {
      const { data: result, error } = await client.rpc('imposta_ticket_pasto', {
        p_persona_id: currentPersonId,
        p_data: data,
        p_tipo: tipo,
        p_previsto: previsto,
        p_fonte: 'area_segreteria_bulk'
      });
      return { result, error, data, tipo };
    })));

    const results = await runBatches(tasks);
    const errors = results.filter(item => item.error);
    const blocked = results.filter(item => item.result?.status === 'ticket_gia_utilizzato');

    bulkInProgress = false;
    els.assignRange.disabled = false;
    els.removeRange.disabled = false;

    if (errors.length) {
      setBulkState(`${errors.length} operazioni non completate.`, 'error');
      showToast('Alcuni ticket non sono stati aggiornati.', 'error');
    } else if (blocked.length) {
      setBulkState(`Operazione completata. ${blocked.length} ticket già utilizzati sono rimasti invariati.`, 'warning');
    } else {
      setBulkState(previsto ? 'Tutti i pasti del periodo sono stati assegnati.' : 'Ticket del periodo rimossi.', 'success');
    }

    await Promise.all([loadTickets(currentPersonId), loadSummary()]);
  }

  function usePersonPeriod() {
    const person = personById(currentPersonId);
    if (!person) return;
    els.rangeFrom.value = clampDate(person.data_arrivo_prevista, CAMP_START);
    els.rangeTo.value = clampDate(person.data_partenza_prevista, CAMP_END);
    if (els.rangeFrom.value > els.rangeTo.value) {
      els.rangeFrom.value = CAMP_START;
      els.rangeTo.value = CAMP_END;
    }
    setBulkState('Periodo impostato dalle date di arrivo/partenza della persona. Verifica e poi assegna i pasti.');
  }

  function scheduleRealtime(table) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      try {
        if (table === 'persone') await loadPeople();
        if (table === 'servizi_pasto') await loadServices();
        await loadSummary();
        if (currentPersonId) {
          await loadTickets(currentPersonId);
          if (table === 'esigenze_alimentari') await loadDietary(currentPersonId);
        }
      } catch (_) {}
    }, 180);
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-segreteria-pasti');
    ['persone_pasti', 'servizi_pasto', 'esigenze_alimentari', 'persone'].forEach(table => {
      realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, () => scheduleRealtime(table));
    });
    realtimeChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        els.realtime.textContent = '● Realtime collegato';
        els.realtime.className = 'meals-realtime online';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        els.realtime.textContent = 'Realtime da riconnettere';
        els.realtime.className = 'meals-realtime warning';
      }
    });
  }

  function bindEvents() {
    els.summaryDate.addEventListener('change', loadSummary);
    els.personSearch.addEventListener('input', renderPeople);
    els.personList.addEventListener('click', event => {
      const button = event.target.closest('[data-meal-person]');
      if (button) selectPerson(button.dataset.mealPerson);
    });
    els.calendarBody.addEventListener('click', event => {
      const button = event.target.closest('[data-meal-date][data-meal-type]');
      if (!button || button.disabled) return;
      const state = mealState(button.dataset.mealDate, button.dataset.mealType);
      setMeal(button.dataset.mealDate, button.dataset.mealType, state.state !== 'assigned', button);
    });
    els.usePersonPeriod.addEventListener('click', usePersonPeriod);
    els.assignRange.addEventListener('click', () => setRange(true));
    els.removeRange.addEventListener('click', () => setRange(false));
  }

  async function init() {
    if (!config || !window.supabase || !els.view) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    profile = await getProfile();
    if (!profile || !['admin', 'segreteria'].includes(profile.ruolo)) return;

    els.summaryDate.value = initialSummaryDate();
    els.rangeFrom.value = CAMP_START;
    els.rangeTo.value = CAMP_END;
    bindEvents();

    try {
      await Promise.all([loadServices(), loadPeople(), loadSummary()]);
      connectRealtime();
    } catch (errorValue) {
      showToast(`Modulo Pasti non disponibile: ${errorValue.message}`, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();