(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const INSTANCE_STORAGE_KEY = 'campo_scuola_segreteria_instance';

  const $ = id => document.getElementById(id);
  const els = {
    notice: $('operationNotice'),
    metricPeople: $('metricPeople'), metricPresent: $('metricPresent'), metricBadges: $('metricBadges'), metricGadgets: $('metricGadgets'),
    dashboardPresentLarge: $('dashboardPresentLarge'), dashboardOutside: $('dashboardOutside'), dashboardOvernight: $('dashboardOvernight'),
    dashboardQuickSearch: $('dashboardQuickSearch'), dashboardQuickResults: $('dashboardQuickResults'),
    peopleSearch: $('peopleSearch'), peopleTypeFilter: $('peopleTypeFilter'), peoplePresenceFilter: $('peoplePresenceFilter'), refreshPeopleButton: $('refreshPeopleButton'),
    peopleCount: $('peopleCount'), peopleRealtimeState: $('peopleRealtimeState'), peopleTableBody: $('peopleTableBody'), peopleEmpty: $('peopleEmpty'),
    addPersonButton: $('addPersonButton'),
    accreditSearch: $('accreditSearch'), accreditList: $('accreditList'), accreditEmpty: $('accreditEmpty'), accreditationPresentCount: $('accreditationPresentCount'),
    personModal: $('personModal'), personModalTitle: $('personModalTitle'), personModalSubtitle: $('personModalSubtitle'), personPresencePill: $('personPresencePill'), personWorkNotice: $('personWorkNotice'),
    personForm: $('personForm'), personId: $('personId'), personUpdatedAt: $('personUpdatedAt'), personNome: $('personNome'), personCognome: $('personCognome'), personCf: $('personCf'), personTipologia: $('personTipologia'), personTelefono: $('personTelefono'), personEmail: $('personEmail'), personComitato: $('personComitato'), personRegione: $('personRegione'), personComponente: $('personComponente'), personBadgeNumber: $('personBadgeNumber'), personIceName: $('personIceName'), personIcePhone: $('personIcePhone'), personBadgeDelivered: $('personBadgeDelivered'), personGadgetDelivered: $('personGadgetDelivered'), personPernotto: $('personPernotto'), personArrival: $('personArrival'), personDeparture: $('personDeparture'), personNotes: $('personNotes'), personCourses: $('personCourses'), personFormMessage: $('personFormMessage'), savePersonButton: $('savePersonButton'),
    personPresenceState: $('personPresenceState'), personLastMovement: $('personLastMovement'), checkinButton: $('checkinButton'), checkoutButton: $('checkoutButton'),
    newPersonModal: $('newPersonModal'), newPersonForm: $('newPersonForm'), newNome: $('newNome'), newCognome: $('newCognome'), newCf: $('newCf'), newTipologia: $('newTipologia'), newTelefono: $('newTelefono'), newEmail: $('newEmail'), newComitato: $('newComitato'), newRegione: $('newRegione'), newPersonMessage: $('newPersonMessage'), createPersonButton: $('createPersonButton'),
    toast: $('toast')
  };

  let client = null;
  let session = null;
  let people = [];
  let coursesByPerson = new Map();
  let editingChannel = null;
  let editingEntries = [];
  let dbChannel = null;
  let currentPersonId = null;
  let currentPersonSnapshot = null;
  let currentAccreditFilter = 'all';
  let initialized = false;
  let reloadTimer = null;
  let toastTimer = null;

  const instanceId = sessionStorage.getItem(INSTANCE_STORAGE_KEY) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(INSTANCE_STORAGE_KEY, instanceId);

  const typeLabels = { discente: 'Discente', docente: 'Docente', staff: 'Staff', ospite: 'Ospite', altro: 'Altro' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function normalizeText(value) {
    return String(value || '').trim().toLocaleLowerCase('it');
  }

  function normalizeCf(value) {
    const normalized = String(value || '').toUpperCase().replace(/\s+/g, '');
    return normalized || null;
  }

  function nullable(value) {
    const result = String(value || '').trim();
    return result || null;
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function showToast(message, type = '') {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast${type ? ` ${type}` : ''}`;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3200);
  }

  function showNotice(message = '') {
    els.notice.textContent = message;
    els.notice.hidden = !message;
  }

  function setFormMessage(message = '', type = '') {
    els.personFormMessage.textContent = message;
    els.personFormMessage.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function setNewPersonMessage(message = '', type = '') {
    els.newPersonMessage.textContent = message;
    els.newPersonMessage.className = `form-message${type ? ` ${type}` : ''}`;
  }

  function personHaystack(person) {
    return normalizeText([
      person.nome, person.cognome, person.codice_fiscale, person.telefono,
      person.email, person.comitato, person.regione, person.numero_badge
    ].filter(Boolean).join(' '));
  }

  function matchesSearch(person, query) {
    const q = normalizeText(query);
    return !q || personHaystack(person).includes(q);
  }

  function personFullName(person) {
    return `${person.nome || ''} ${person.cognome || ''}`.trim();
  }

  function getBusyEntry(personId) {
    return editingEntries.find(entry => entry.person_id === personId && entry.instance_id !== instanceId) || null;
  }

  async function logAction(azione, entita, entitaId, dettagli = {}) {
    if (!client || !session) return;
    try {
      await client.from('log_attivita').insert({
        operatore_id: session.user.id,
        azione,
        entita,
        entita_id: entitaId || null,
        dettagli: { postazione: getStation(), ...dettagli }
      });
    } catch (_) {}
  }

  function updateMetrics() {
    const active = people.filter(person => person.attivo !== false);
    const present = active.filter(person => person.presente);
    const badges = active.filter(person => person.badge_consegnato);
    const gadgets = active.filter(person => person.gadget_consegnato);
    const overnight = active.filter(person => person.pernotto);

    els.metricPeople.textContent = active.length;
    els.metricPresent.textContent = present.length;
    els.metricBadges.textContent = badges.length;
    els.metricGadgets.textContent = gadgets.length;
    els.dashboardPresentLarge.textContent = present.length;
    els.dashboardOutside.textContent = active.length - present.length;
    els.dashboardOvernight.textContent = overnight.length;
    els.accreditationPresentCount.textContent = `${present.length} presenti`;
  }

  function renderQuickResults() {
    const q = els.dashboardQuickSearch.value.trim();
    if (q.length < 2) {
      els.dashboardQuickResults.innerHTML = '';
      return;
    }
    const results = people.filter(person => matchesSearch(person, q)).slice(0, 5);
    els.dashboardQuickResults.innerHTML = results.map(person => {
      const busy = getBusyEntry(person.id);
      return `<button class="quick-result" type="button" data-person-id="${person.id}" ${busy ? 'disabled' : ''}><span><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.comitato || person.codice_fiscale || 'Anagrafica Campo')}</small></span><span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? 'Presente' : 'Fuori'}</span></button>`;
    }).join('') || '<div class="empty-state" style="padding:14px">Nessun risultato.</div>';
  }

  function filteredPeople() {
    const query = els.peopleSearch.value;
    const type = els.peopleTypeFilter.value;
    const presence = els.peoplePresenceFilter.value;
    return people.filter(person => {
      if (!matchesSearch(person, query)) return false;
      if (type && person.tipologia !== type) return false;
      if (presence === 'present' && !person.presente) return false;
      if (presence === 'outside' && person.presente) return false;
      return true;
    });
  }

  function renderPeopleTable() {
    const rows = filteredPeople();
    els.peopleCount.textContent = `${rows.length} ${rows.length === 1 ? 'persona' : 'persone'}`;
    els.peopleEmpty.hidden = rows.length > 0;
    els.peopleTableBody.innerHTML = rows.map(person => {
      const busy = getBusyEntry(person.id);
      const badgeText = person.numero_badge ? `#${escapeHtml(person.numero_badge)}` : (person.badge_consegnato ? 'Consegnato' : '—');
      return `<tr>
        <td class="person-cell"><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.codice_fiscale || person.telefono || person.email || '')}</small></td>
        <td><span class="type-pill">${escapeHtml(typeLabels[person.tipologia] || person.tipologia || '—')}</span></td>
        <td>${escapeHtml(person.comitato || '—')}</td>
        <td>${badgeText}</td>
        <td><span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? '● Presente' : 'Fuori'}</span></td>
        <td>${busy ? `<span class="work-pill">${escapeHtml(busy.station_name || 'Altra postazione')}</span>` : '<span style="color:#8a8f95">Libera</span>'}</td>
        <td><button class="row-action" type="button" data-person-id="${person.id}" ${busy ? 'disabled title="Scheda in lavorazione su un’altra postazione"' : ''}>Apri</button></td>
      </tr>`;
    }).join('');
  }

  function renderAccreditation() {
    const query = els.accreditSearch.value;
    const rows = people.filter(person => {
      if (!matchesSearch(person, query)) return false;
      if (currentAccreditFilter === 'present' && !person.presente) return false;
      if (currentAccreditFilter === 'outside' && person.presente) return false;
      return true;
    });

    els.accreditEmpty.hidden = rows.length > 0;
    els.accreditList.innerHTML = rows.map(person => {
      const busy = getBusyEntry(person.id);
      const meta = [typeLabels[person.tipologia] || person.tipologia, person.comitato].filter(Boolean).join(' · ');
      const material = `${person.badge_consegnato ? '✓ Badge' : '○ Badge'} · ${person.gadget_consegnato ? '✓ Gadget' : '○ Gadget'}`;
      return `<article class="accredit-row${busy ? ' busy' : ''}">
        <div class="accredit-person"><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.codice_fiscale || person.telefono || 'Nessun identificativo')}</small></div>
        <div class="accredit-meta">${escapeHtml(meta || '—')}<br>${escapeHtml(material)}</div>
        <div>${busy ? `<span class="work-pill">In lavorazione · ${escapeHtml(busy.station_name || '')}</span>` : `<span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? '● Presente' : 'Da accreditare'}</span>`}</div>
        <div class="accredit-actions"><button class="accredit-open" type="button" data-person-id="${person.id}" ${busy ? 'disabled' : ''}>${person.presente ? 'Apri scheda' : 'Accredita'}</button></div>
      </article>`;
    }).join('');
  }

  function renderAll() {
    updateMetrics();
    renderQuickResults();
    renderPeopleTable();
    renderAccreditation();
  }

  async function loadCourses() {
    const { data, error } = await client
      .from('persone_corsi')
      .select('persona_id, ruolo, corsi(codice,nome)')
      .limit(2000);
    if (error || !data) return;
    coursesByPerson = new Map();
    data.forEach(row => {
      const list = coursesByPerson.get(row.persona_id) || [];
      if (row.corsi) list.push({ ...row.corsi, ruolo: row.ruolo });
      coursesByPerson.set(row.persona_id, list);
    });
  }

  async function loadPeople(options = {}) {
    if (!client) return;
    if (!options.silent) els.refreshPeopleButton.disabled = true;

    const { data, error } = await client
      .from('persone')
      .select('id,nome,cognome,codice_fiscale,telefono,email,comitato,regione,componente_cri,contatto_ice_nome,contatto_ice_telefono,tipologia,numero_badge,badge_consegnato,gadget_consegnato,attivo,note,presente,ultimo_movimento_at,ultimo_movimento_tipo,pernotto,data_arrivo_prevista,data_partenza_prevista,updated_at')
      .eq('attivo', true)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(1000);

    if (!options.silent) els.refreshPeopleButton.disabled = false;

    if (error) {
      showNotice(`Impossibile leggere l'anagrafica: ${error.message}`);
      return;
    }

    showNotice('');
    people = data || [];
    await loadCourses();
    renderAll();
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadPeople({ silent: true }), 180);
  }

  function showView(name) {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (name === 'persone') setTimeout(() => els.peopleSearch.focus(), 30);
    if (name === 'accreditamento') setTimeout(() => els.accreditSearch.focus(), 30);
  }

  function setPersonFields(person) {
    els.personId.value = person.id;
    els.personUpdatedAt.value = person.updated_at || '';
    els.personNome.value = person.nome || '';
    els.personCognome.value = person.cognome || '';
    els.personCf.value = person.codice_fiscale || '';
    els.personTipologia.value = person.tipologia || 'discente';
    els.personTelefono.value = person.telefono || '';
    els.personEmail.value = person.email || '';
    els.personComitato.value = person.comitato || '';
    els.personRegione.value = person.regione || '';
    els.personComponente.value = person.componente_cri || '';
    els.personBadgeNumber.value = person.numero_badge || '';
    els.personIceName.value = person.contatto_ice_nome || '';
    els.personIcePhone.value = person.contatto_ice_telefono || '';
    els.personBadgeDelivered.checked = !!person.badge_consegnato;
    els.personGadgetDelivered.checked = !!person.gadget_consegnato;
    els.personPernotto.checked = !!person.pernotto;
    els.personArrival.value = person.data_arrivo_prevista || '';
    els.personDeparture.value = person.data_partenza_prevista || '';
    els.personNotes.value = person.note || '';

    const fullName = personFullName(person);
    els.personModalTitle.textContent = fullName || 'Scheda persona';
    els.personModalSubtitle.textContent = [typeLabels[person.tipologia] || person.tipologia, person.comitato].filter(Boolean).join(' · ');
    els.personPresencePill.className = `presence-pill ${person.presente ? 'present' : 'outside'}`;
    els.personPresencePill.textContent = person.presente ? '● Presente al Campo' : 'Fuori dal Campo';
    els.personPresenceState.textContent = person.presente ? 'PRESENTE' : 'FUORI DAL CAMPO';
    els.personPresenceState.style.color = person.presente ? '#16794f' : '#646a70';
    els.personLastMovement.textContent = person.ultimo_movimento_at
      ? `${person.ultimo_movimento_tipo === 'entrata' ? 'Ultima entrata' : 'Ultima uscita'} · ${formatDateTime(person.ultimo_movimento_at)}`
      : 'Nessun movimento registrato';
    els.checkinButton.disabled = !!person.presente;
    els.checkoutButton.disabled = !person.presente;

    const courses = coursesByPerson.get(person.id) || [];
    els.personCourses.hidden = courses.length === 0;
    els.personCourses.innerHTML = courses.map(course => `<span class="course-chip">${escapeHtml(course.codice || course.nome)} · ${escapeHtml(course.ruolo || '')}</span>`).join('');
  }

  async function trackEditing(person) {
    if (!editingChannel || !person) return;
    try {
      await editingChannel.track({
        person_id: person.id,
        person_name: personFullName(person),
        station_name: getStation(),
        instance_id: instanceId,
        editing_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  async function clearEditing() {
    if (!editingChannel) return;
    try { await editingChannel.untrack(); } catch (_) {}
  }

  async function openPerson(personId) {
    const person = people.find(item => item.id === personId);
    if (!person) return;
    const busy = getBusyEntry(personId);
    if (busy) {
      showToast(`Scheda già in lavorazione su ${busy.station_name || 'un’altra postazione'}.`, 'error');
      return;
    }

    currentPersonId = person.id;
    currentPersonSnapshot = { ...person };
    setFormMessage();
    els.personWorkNotice.hidden = true;
    setPersonFields(person);
    els.personModal.hidden = false;
    document.body.classList.add('modal-open');
    await trackEditing(person);
  }

  async function closePerson() {
    if (els.personModal.hidden) return;
    await clearEditing();
    currentPersonId = null;
    currentPersonSnapshot = null;
    els.personModal.hidden = true;
    document.body.classList.remove('modal-open');
    renderAll();
  }

  function validateEditingClaim() {
    if (!currentPersonId) return;
    const matches = editingEntries.filter(entry => entry.person_id === currentPersonId);
    const instances = [...new Set(matches.map(entry => entry.instance_id).filter(Boolean))].sort();
    if (instances.length <= 1 || instances[0] === instanceId) return;
    const other = matches.find(entry => entry.instance_id === instances[0]);
    clearEditing();
    currentPersonId = null;
    currentPersonSnapshot = null;
    els.personModal.hidden = true;
    document.body.classList.remove('modal-open');
    showToast(`La scheda è stata presa in carico da ${other?.station_name || 'un’altra postazione'}.`, 'error');
  }

  function collectPersonPayload() {
    return {
      nome: els.personNome.value.trim(),
      cognome: els.personCognome.value.trim(),
      codice_fiscale: normalizeCf(els.personCf.value),
      tipologia: els.personTipologia.value,
      telefono: nullable(els.personTelefono.value),
      email: nullable(els.personEmail.value),
      comitato: nullable(els.personComitato.value),
      regione: nullable(els.personRegione.value),
      componente_cri: nullable(els.personComponente.value),
      numero_badge: nullable(els.personBadgeNumber.value),
      contatto_ice_nome: nullable(els.personIceName.value),
      contatto_ice_telefono: nullable(els.personIcePhone.value),
      badge_consegnato: els.personBadgeDelivered.checked,
      gadget_consegnato: els.personGadgetDelivered.checked,
      pernotto: els.personPernotto.checked,
      data_arrivo_prevista: els.personArrival.value || null,
      data_partenza_prevista: els.personDeparture.value || null,
      note: nullable(els.personNotes.value)
    };
  }

  async function savePerson(event) {
    event.preventDefault();
    if (!currentPersonId || !currentPersonSnapshot) return;
    const payload = collectPersonPayload();
    if (!payload.nome || !payload.cognome) {
      setFormMessage('Nome e cognome sono obbligatori.', 'error');
      return;
    }

    els.savePersonButton.disabled = true;
    setFormMessage('Salvataggio…');

    const query = client.from('persone').update(payload).eq('id', currentPersonId);
    const { data, error } = currentPersonSnapshot.updated_at
      ? await query.eq('updated_at', currentPersonSnapshot.updated_at).select().maybeSingle()
      : await query.select().maybeSingle();

    els.savePersonButton.disabled = false;

    if (error) {
      const duplicate = error.code === '23505';
      setFormMessage(duplicate ? 'Codice fiscale o numero badge già associato a un’altra persona.' : error.message, 'error');
      return;
    }

    if (!data) {
      setFormMessage('La scheda è stata modificata da un’altra postazione. Ricarico i dati prima di salvare.', 'error');
      await loadPeople({ silent: true });
      const refreshed = people.find(item => item.id === currentPersonId);
      if (refreshed) {
        currentPersonSnapshot = { ...refreshed };
        setPersonFields(refreshed);
      }
      return;
    }

    currentPersonSnapshot = { ...data };
    setPersonFields(data);
    setFormMessage('Modifiche salvate.', 'success');
    await logAction('persona_modificata', 'persone', data.id, { persona: personFullName(data) });
    await loadPeople({ silent: true });
    showToast('Scheda aggiornata.', 'success');
  }

  async function registerMovement(tipo) {
    if (!currentPersonId) return;
    const person = people.find(item => item.id === currentPersonId) || currentPersonSnapshot;
    if (!person) return;
    if (tipo === 'entrata' && person.presente) return;
    if (tipo === 'uscita' && !person.presente) return;

    els.checkinButton.disabled = true;
    els.checkoutButton.disabled = true;

    const { error } = await client.from('movimenti_persone').insert({
      persona_id: currentPersonId,
      tipo,
      fonte: 'area_segreteria',
      operatore_id: session.user.id,
      note: `Registrato da ${getStation()}`
    });

    if (error) {
      showToast(`Operazione non riuscita: ${error.message}`, 'error');
      setPersonFields(person);
      return;
    }

    await logAction(tipo === 'entrata' ? 'checkin' : 'checkout', 'movimenti_persone', currentPersonId, { persona: personFullName(person) });
    await loadPeople({ silent: true });
    const refreshed = people.find(item => item.id === currentPersonId);
    if (refreshed) {
      currentPersonSnapshot = { ...refreshed };
      setPersonFields(refreshed);
    }
    showToast(tipo === 'entrata' ? 'Entrata registrata.' : 'Uscita registrata.', 'success');
  }

  function openNewPerson() {
    els.newPersonForm.reset();
    els.newTipologia.value = 'discente';
    setNewPersonMessage();
    els.newPersonModal.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => els.newNome.focus(), 30);
  }

  function closeNewPerson() {
    els.newPersonModal.hidden = true;
    if (els.personModal.hidden) document.body.classList.remove('modal-open');
  }

  async function createPerson(event) {
    event.preventDefault();
    const payload = {
      nome: els.newNome.value.trim(),
      cognome: els.newCognome.value.trim(),
      codice_fiscale: normalizeCf(els.newCf.value),
      tipologia: els.newTipologia.value,
      telefono: nullable(els.newTelefono.value),
      email: nullable(els.newEmail.value),
      comitato: nullable(els.newComitato.value),
      regione: nullable(els.newRegione.value)
    };
    if (!payload.nome || !payload.cognome) {
      setNewPersonMessage('Nome e cognome sono obbligatori.', 'error');
      return;
    }

    els.createPersonButton.disabled = true;
    setNewPersonMessage('Creazione…');
    const { data, error } = await client.from('persone').insert(payload).select().single();
    els.createPersonButton.disabled = false;

    if (error) {
      setNewPersonMessage(error.code === '23505' ? 'Esiste già una persona con questo codice fiscale.' : error.message, 'error');
      return;
    }

    await logAction('persona_creata', 'persone', data.id, { persona: personFullName(data) });
    closeNewPerson();
    await loadPeople({ silent: true });
    showToast('Persona creata.', 'success');
    await openPerson(data.id);
  }

  function editingPresenceState() {
    if (!editingChannel) return [];
    return Object.values(editingChannel.presenceState()).flat().filter(entry => entry && entry.person_id);
  }

  async function connectEditingPresence() {
    editingChannel = client.channel('campo-segreteria-editing', { config: { presence: { key: instanceId } } });
    editingChannel
      .on('presence', { event: 'sync' }, () => {
        editingEntries = editingPresenceState();
        renderAll();
        validateEditingClaim();
      })
      .on('presence', { event: 'join' }, () => {
        editingEntries = editingPresenceState();
        renderAll();
        validateEditingClaim();
      })
      .on('presence', { event: 'leave' }, () => {
        editingEntries = editingPresenceState();
        renderAll();
      })
      .subscribe();
  }

  function connectDatabaseRealtime() {
    dbChannel = client.channel('campo-segreteria-db');
    dbChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persone' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimenti_persone' }, scheduleReload)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          els.peopleRealtimeState.textContent = '● Realtime collegato';
          els.peopleRealtimeState.style.color = '#16794f';
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          els.peopleRealtimeState.textContent = 'Realtime da riconnettere';
          els.peopleRealtimeState.style.color = '#a36b00';
        }
      });
  }

  function bindEvents() {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.openView)));
    document.querySelector('[data-filter-present="true"]')?.addEventListener('click', () => {
      els.peoplePresenceFilter.value = 'present';
      showView('persone');
      renderPeopleTable();
    });

    [els.peopleSearch, els.peopleTypeFilter, els.peoplePresenceFilter].forEach(control => control.addEventListener('input', renderPeopleTable));
    els.refreshPeopleButton.addEventListener('click', () => loadPeople());
    els.addPersonButton.addEventListener('click', openNewPerson);
    els.dashboardQuickSearch.addEventListener('input', renderQuickResults);
    els.accreditSearch.addEventListener('input', renderAccreditation);

    document.querySelectorAll('[data-accredit-filter]').forEach(button => button.addEventListener('click', () => {
      currentAccreditFilter = button.dataset.accreditFilter;
      document.querySelectorAll('[data-accredit-filter]').forEach(item => item.classList.toggle('active', item === button));
      renderAccreditation();
    }));

    document.addEventListener('click', event => {
      const personButton = event.target.closest('[data-person-id]');
      if (personButton && !personButton.disabled) openPerson(personButton.dataset.personId);
      if (event.target.closest('[data-close-person]')) closePerson();
      if (event.target.closest('[data-close-new-person]')) closeNewPerson();
    });

    els.personForm.addEventListener('submit', savePerson);
    els.checkinButton.addEventListener('click', () => registerMovement('entrata'));
    els.checkoutButton.addEventListener('click', () => registerMovement('uscita'));
    els.newPersonForm.addEventListener('submit', createPerson);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!els.personModal.hidden) closePerson();
      else if (!els.newPersonModal.hidden) closeNewPerson();
    });
  }

  async function waitForStation() {
    for (let i = 0; i < 200; i += 1) {
      if (getStation()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async function init() {
    if (initialized || !config || !window.supabase) return;
    initialized = true;

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });

    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;

    bindEvents();
    const stationReady = await waitForStation();
    if (!stationReady) {
      showNotice('Seleziona una postazione per attivare gli strumenti operativi.');
      return;
    }

    await connectEditingPresence();
    connectDatabaseRealtime();
    await loadPeople();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
