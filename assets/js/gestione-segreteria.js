(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const INSTANCE_STORAGE_KEY = 'campo_scuola_segreteria_instance';
  const $ = id => document.getElementById(id);

  const els = {
    workspace: $('standardWorkspace'), notice: $('operationNotice'),
    metricPeople: $('metricPeople'), metricPresent: $('metricPresent'), metricBadges: $('metricBadges'), metricGadgets: $('metricGadgets'),
    dashboardPresentLarge: $('dashboardPresentLarge'), dashboardOutside: $('dashboardOutside'), dashboardOvernight: $('dashboardOvernight'),
    dashboardQuickSearch: $('dashboardQuickSearch'), dashboardQuickResults: $('dashboardQuickResults'),
    peopleSearch: $('peopleSearch'), peopleTypeFilter: $('peopleTypeFilter'), peoplePresenceFilter: $('peoplePresenceFilter'), refreshPeopleButton: $('refreshPeopleButton'),
    peopleCount: $('peopleCount'), peopleRealtimeState: $('peopleRealtimeState'), peopleTableBody: $('peopleTableBody'), peopleEmpty: $('peopleEmpty'), addPersonButton: $('addPersonButton'),
    accreditSearch: $('accreditSearch'), accreditList: $('accreditList'), accreditEmpty: $('accreditEmpty'), accreditationPresentCount: $('accreditationPresentCount'), scanEntryButton: $('scanEntryButton'), scanExitButton: $('scanExitButton'),
    personModal: $('personModal'), personModalTitle: $('personModalTitle'), personModalSubtitle: $('personModalSubtitle'), personPresencePill: $('personPresencePill'), personWorkNotice: $('personWorkNotice'),
    personForm: $('personForm'), personId: $('personId'), personUpdatedAt: $('personUpdatedAt'), personNome: $('personNome'), personCognome: $('personCognome'), personCf: $('personCf'), personTypes: $('personTypes'), personHousingSector: $('personHousingSector'), personTelefono: $('personTelefono'), personEmail: $('personEmail'), personComitato: $('personComitato'), personRegione: $('personRegione'), personComponente: $('personComponente'), personBadgeNumber: $('personBadgeNumber'), personIceName: $('personIceName'), personIcePhone: $('personIcePhone'), personBadgeDelivered: $('personBadgeDelivered'), personGadgetDelivered: $('personGadgetDelivered'), personPernotto: $('personPernotto'), personQrActive: $('personQrActive'), personArrival: $('personArrival'), personDeparture: $('personDeparture'), personNotes: $('personNotes'), personCourses: $('personCourses'), personFormMessage: $('personFormMessage'), savePersonButton: $('savePersonButton'), deletePersonButton: $('deletePersonButton'), personQrBox: $('personQrBox'), personQrStatus: $('personQrStatus'), printQrButton: $('printQrButton'),
    personPresenceState: $('personPresenceState'), personLastMovement: $('personLastMovement'), checkinButton: $('checkinButton'), checkoutButton: $('checkoutButton'),
    newPersonModal: $('newPersonModal'), newPersonForm: $('newPersonForm'), newNome: $('newNome'), newCognome: $('newCognome'), newCf: $('newCf'), newPersonTypes: $('newPersonTypes'), newHousingSector: $('newHousingSector'), newTelefono: $('newTelefono'), newEmail: $('newEmail'), newComitato: $('newComitato'), newRegione: $('newRegione'), newPersonMessage: $('newPersonMessage'), createPersonButton: $('createPersonButton'),
    toast: $('toast')
  };

  let client = null;
  let session = null;
  let profile = null;
  let people = [];
  let coursesByPerson = new Map();
  let typesByPerson = new Map();
  let availableTypes = [];
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

  const fallbackTypeLabels = { discente: 'Discente', docente: 'Docente', staff: 'Staff', ospite: 'Ospite', altro: 'Altro' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function normalizeText(value) { return String(value || '').trim().toLocaleLowerCase('it'); }
  function normalizeCf(value) { const normalized = String(value || '').toUpperCase().replace(/\s+/g, ''); return normalized || null; }
  function nullable(value) { const result = String(value || '').trim(); return result || null; }
  function getStation() { return sessionStorage.getItem(STATION_STORAGE_KEY) || ''; }
  function personFullName(person) { return `${person.nome || ''} ${person.cognome || ''}`.trim(); }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function showToast(message, type = '') {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast${type ? ` ${type}` : ''}`;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3400);
  }

  function showNotice(message = '') { els.notice.textContent = message; els.notice.hidden = !message; }
  function setFormMessage(message = '', type = '') { els.personFormMessage.textContent = message; els.personFormMessage.className = `form-message${type ? ` ${type}` : ''}`; }
  function setNewPersonMessage(message = '', type = '') { els.newPersonMessage.textContent = message; els.newPersonMessage.className = `form-message${type ? ` ${type}` : ''}`; }

  function typeLabel(code) {
    return availableTypes.find(item => item.codice === code)?.nome || fallbackTypeLabels[code] || code || '—';
  }

  function personTypeCodes(person) {
    const list = typesByPerson.get(person.id) || [];
    return list.length ? list : (person.tipologia ? [person.tipologia] : []);
  }

  function personTypeText(person) {
    const codes = personTypeCodes(person);
    return codes.length ? codes.map(typeLabel).join(' + ') : '—';
  }

  function personHaystack(person) {
    return normalizeText([
      person.nome, person.cognome, person.codice_fiscale, person.telefono, person.email,
      person.comitato, person.regione, person.numero_badge, personTypeText(person)
    ].filter(Boolean).join(' '));
  }

  function matchesSearch(person, query) { const q = normalizeText(query); return !q || personHaystack(person).includes(q); }
  function getBusyEntry(personId) { return editingEntries.find(entry => entry.person_id === personId && entry.instance_id !== instanceId) || null; }

  async function getProfile() {
    const { data, error } = await client.from('utenti_segreteria').select('ruolo,attivo,nome_visualizzato').eq('user_id', session.user.id).maybeSingle();
    if (error || !data || !data.attivo) return null;
    return data;
  }

  async function logAction(azione, entita, entitaId, dettagli = {}) {
    if (!client || !session) return;
    try {
      await client.from('log_attivita').insert({ operatore_id: session.user.id, azione, entita, entita_id: entitaId || null, dettagli: { postazione: getStation(), ...dettagli } });
    } catch (_) {}
  }

  function renderTypeChecks(container, selectedCodes = []) {
    if (!container) return;
    const selected = new Set(selectedCodes);
    container.innerHTML = availableTypes.map(item => `
      <label class="type-check"><input type="checkbox" value="${escapeHtml(item.codice)}" ${selected.has(item.codice) ? 'checked' : ''}><span>${escapeHtml(item.nome)}</span></label>
    `).join('');
  }

  function selectedTypes(container) {
    return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
  }

  async function syncPersonTypes(personId, desiredTypes) {
    const desired = [...new Set(desiredTypes)];
    const current = typesByPerson.get(personId) || [];
    const toAdd = desired.filter(code => !current.includes(code));
    const toRemove = current.filter(code => !desired.includes(code));

    if (toAdd.length) {
      const { error } = await client.from('persone_tipologie').insert(toAdd.map(code => ({ persona_id: personId, tipologia_codice: code })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await client.from('persone_tipologie').delete().eq('persona_id', personId).in('tipologia_codice', toRemove);
      if (error) throw error;
    }
    typesByPerson.set(personId, desired);
  }

  function updateMetrics() {
    const active = people.filter(person => person.attivo !== false);
    const present = active.filter(person => person.presente);
    els.metricPeople.textContent = active.length;
    els.metricPresent.textContent = present.length;
    els.metricBadges.textContent = active.filter(person => person.badge_consegnato).length;
    els.metricGadgets.textContent = active.filter(person => person.gadget_consegnato).length;
    els.dashboardPresentLarge.textContent = present.length;
    els.dashboardOutside.textContent = active.length - present.length;
    els.dashboardOvernight.textContent = active.filter(person => person.pernotto).length;
    els.accreditationPresentCount.textContent = `${present.length} presenti`;
  }

  function renderQuickResults() {
    const q = els.dashboardQuickSearch.value.trim();
    if (q.length < 2) { els.dashboardQuickResults.innerHTML = ''; return; }
    const results = people.filter(person => matchesSearch(person, q)).slice(0, 5);
    els.dashboardQuickResults.innerHTML = results.map(person => {
      const busy = getBusyEntry(person.id);
      return `<button class="quick-result" type="button" data-person-id="${person.id}" ${busy ? 'disabled' : ''}><span><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.comitato || person.codice_fiscale || personTypeText(person))}</small></span><span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? 'Presente' : 'Fuori'}</span></button>`;
    }).join('') || '<div class="empty-state" style="padding:14px">Nessun risultato.</div>';
  }

  function filteredPeople() {
    const query = els.peopleSearch.value;
    const type = els.peopleTypeFilter.value;
    const presence = els.peoplePresenceFilter.value;
    return people.filter(person => {
      if (!matchesSearch(person, query)) return false;
      if (type && !personTypeCodes(person).includes(type)) return false;
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
      return `<tr><td class="person-cell"><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.codice_fiscale || person.telefono || person.email || '')}</small></td><td><span class="type-pill">${escapeHtml(personTypeText(person))}</span></td><td>${escapeHtml(person.comitato || '—')}</td><td>${badgeText}</td><td><span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? '● Presente' : 'Fuori'}</span></td><td>${busy ? `<span class="work-pill">${escapeHtml(busy.station_name || 'Altra postazione')}</span>` : '<span style="color:#8a8f95">Libera</span>'}</td><td><button class="row-action" type="button" data-person-id="${person.id}" ${busy ? 'disabled title="Scheda in lavorazione su un’altra postazione"' : ''}>Apri</button></td></tr>`;
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
      const meta = [personTypeText(person), person.comitato].filter(Boolean).join(' · ');
      const material = `${person.badge_consegnato ? '✓ Badge' : '○ Badge'} · ${person.gadget_consegnato ? '✓ Gadget' : '○ Gadget'} · ${person.qr_attivo ? '✓ QR' : '○ QR'}`;
      return `<article class="accredit-row${busy ? ' busy' : ''}"><div class="accredit-person"><strong>${escapeHtml(personFullName(person))}</strong><small>${escapeHtml(person.codice_fiscale || person.telefono || 'Nessun identificativo')}</small></div><div class="accredit-meta">${escapeHtml(meta || '—')}<br>${escapeHtml(material)}</div><div>${busy ? `<span class="work-pill">In lavorazione · ${escapeHtml(busy.station_name || '')}</span>` : `<span class="status-pill ${person.presente ? 'present' : 'outside'}">${person.presente ? '● Presente' : 'Da accreditare'}</span>`}</div><div class="accredit-actions"><button class="accredit-open" type="button" data-person-id="${person.id}" ${busy ? 'disabled' : ''}>${person.presente ? 'Apri scheda' : 'Accredita'}</button></div></article>`;
    }).join('');
  }

  function renderAll() { updateMetrics(); renderQuickResults(); renderPeopleTable(); renderAccreditation(); }

  async function loadCourses() {
    const { data, error } = await client.from('persone_corsi').select('persona_id, ruolo, corsi(codice,nome)').limit(3000);
    if (error || !data) return;
    coursesByPerson = new Map();
    data.forEach(row => {
      const list = coursesByPerson.get(row.persona_id) || [];
      if (row.corsi) list.push({ ...row.corsi, ruolo: row.ruolo });
      coursesByPerson.set(row.persona_id, list);
    });
  }

  async function loadTypes() {
    const [{ data: defs, error: defsError }, { data: links, error: linksError }] = await Promise.all([
      client.from('tipologie_persona').select('codice,nome,ordine,attiva').eq('attiva', true).order('ordine'),
      client.from('persone_tipologie').select('persona_id,tipologia_codice').limit(5000)
    ]);
    if (!defsError && defs) availableTypes = defs;
    if (!availableTypes.length) availableTypes = Object.entries(fallbackTypeLabels).map(([codice, nome], index) => ({ codice, nome, ordine: index }));
    if (!linksError && links) {
      typesByPerson = new Map();
      links.forEach(row => {
        const list = typesByPerson.get(row.persona_id) || [];
        if (!list.includes(row.tipologia_codice)) list.push(row.tipologia_codice);
        typesByPerson.set(row.persona_id, list);
      });
    }
  }

  async function loadPeople(options = {}) {
    if (!client) return;
    if (!options.silent) els.refreshPeopleButton.disabled = true;
    const { data, error } = await client.from('persone')
      .select('id,nome,cognome,codice_fiscale,telefono,email,comitato,regione,componente_cri,contatto_ice_nome,contatto_ice_telefono,tipologia,numero_badge,badge_consegnato,gadget_consegnato,attivo,note,presente,ultimo_movimento_at,ultimo_movimento_tipo,pernotto,data_arrivo_prevista,data_partenza_prevista,updated_at,qr_token,qr_attivo,settore_alloggio')
      .eq('attivo', true).order('cognome', { ascending: true }).order('nome', { ascending: true }).limit(1500);
    if (!options.silent) els.refreshPeopleButton.disabled = false;
    if (error) { showNotice(`Impossibile leggere l'anagrafica: ${error.message}`); return; }
    showNotice('');
    people = data || [];
    await Promise.all([loadCourses(), loadTypes()]);
    renderAll();
  }

  function scheduleReload() { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => loadPeople({ silent: true }), 160); }

  function showView(name) {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    document.querySelectorAll('[data-view-panel]').forEach(panel => { const active = panel.dataset.viewPanel === name; panel.hidden = !active; panel.classList.toggle('active', active); });
    if (name === 'persone') setTimeout(() => els.peopleSearch.focus(), 30);
    if (name === 'accreditamento') setTimeout(() => els.accreditSearch.focus(), 30);
  }

  function renderQr(person) {
    els.personQrBox.innerHTML = '';
    els.personQrStatus.textContent = person.qr_attivo ? 'QR attivo' : 'QR disattivato';
    if (!person.qr_token || !window.QRCode) {
      els.personQrBox.textContent = 'QR non disponibile';
      return;
    }
    new window.QRCode(els.personQrBox, { text: person.qr_token, width: 116, height: 116, correctLevel: window.QRCode.CorrectLevel.M });
  }

  function setPersonFields(person) {
    els.personId.value = person.id;
    els.personUpdatedAt.value = person.updated_at || '';
    els.personNome.value = person.nome || '';
    els.personCognome.value = person.cognome || '';
    els.personCf.value = person.codice_fiscale || '';
    els.personHousingSector.value = person.settore_alloggio || 'da_definire';
    renderTypeChecks(els.personTypes, personTypeCodes(person));
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
    els.personQrActive.checked = person.qr_attivo !== false;
    els.personArrival.value = person.data_arrivo_prevista || '';
    els.personDeparture.value = person.data_partenza_prevista || '';
    els.personNotes.value = person.note || '';

    els.personModalTitle.textContent = personFullName(person) || 'Scheda persona';
    els.personModalSubtitle.textContent = [personTypeText(person), person.comitato].filter(Boolean).join(' · ');
    els.personPresencePill.className = `presence-pill ${person.presente ? 'present' : 'outside'}`;
    els.personPresencePill.textContent = person.presente ? '● Presente al Campo' : 'Fuori dal Campo';
    els.personPresenceState.textContent = person.presente ? 'PRESENTE' : 'FUORI DAL CAMPO';
    els.personPresenceState.style.color = person.presente ? '#16794f' : '#646a70';
    els.personLastMovement.textContent = person.ultimo_movimento_at ? `${person.ultimo_movimento_tipo === 'entrata' ? 'Ultima entrata' : 'Ultima uscita'} · ${formatDateTime(person.ultimo_movimento_at)}` : 'Nessun movimento registrato';
    els.checkinButton.disabled = !!person.presente;
    els.checkoutButton.disabled = !person.presente;

    const courses = coursesByPerson.get(person.id) || [];
    els.personCourses.hidden = courses.length === 0;
    els.personCourses.innerHTML = courses.map(course => `<span class="course-chip">${escapeHtml(course.codice || course.nome)} · ${escapeHtml(course.ruolo || '')}</span>`).join('');
    renderQr(person);
  }

  async function trackEditing(person) {
    if (!editingChannel || !person) return;
    try { await editingChannel.track({ person_id: person.id, person_name: personFullName(person), station_name: getStation(), instance_id: instanceId, editing_at: new Date().toISOString() }); } catch (_) {}
  }
  async function clearEditing() { if (!editingChannel) return; try { await editingChannel.untrack(); } catch (_) {} }

  async function openPerson(personId) {
    const person = people.find(item => item.id === personId);
    if (!person) return;
    const busy = getBusyEntry(personId);
    if (busy) { showToast(`Scheda già in lavorazione su ${busy.station_name || 'un’altra postazione'}.`, 'error'); return; }
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
    clearEditing(); currentPersonId = null; currentPersonSnapshot = null; els.personModal.hidden = true; document.body.classList.remove('modal-open');
    showToast(`La scheda è stata presa in carico da ${other?.station_name || 'un’altra postazione'}.`, 'error');
  }

  function collectPersonPayload(types) {
    return {
      nome: els.personNome.value.trim(), cognome: els.personCognome.value.trim(), codice_fiscale: normalizeCf(els.personCf.value),
      tipologia: types[0], settore_alloggio: els.personHousingSector.value || 'da_definire', telefono: nullable(els.personTelefono.value), email: nullable(els.personEmail.value),
      comitato: nullable(els.personComitato.value), regione: nullable(els.personRegione.value), componente_cri: nullable(els.personComponente.value), numero_badge: nullable(els.personBadgeNumber.value),
      contatto_ice_nome: nullable(els.personIceName.value), contatto_ice_telefono: nullable(els.personIcePhone.value), badge_consegnato: els.personBadgeDelivered.checked,
      gadget_consegnato: els.personGadgetDelivered.checked, pernotto: els.personPernotto.checked, qr_attivo: els.personQrActive.checked,
      data_arrivo_prevista: els.personArrival.value || null, data_partenza_prevista: els.personDeparture.value || null, note: nullable(els.personNotes.value)
    };
  }

  async function savePerson(event) {
    event.preventDefault();
    if (!currentPersonId || !currentPersonSnapshot) return;
    const types = selectedTypes(els.personTypes);
    if (!types.length) { setFormMessage('Seleziona almeno una tipologia.', 'error'); return; }
    const payload = collectPersonPayload(types);
    if (!payload.nome || !payload.cognome) { setFormMessage('Nome e cognome sono obbligatori.', 'error'); return; }

    els.savePersonButton.disabled = true;
    setFormMessage('Salvataggio…');
    const query = client.from('persone').update(payload).eq('id', currentPersonId);
    const { data, error } = currentPersonSnapshot.updated_at ? await query.eq('updated_at', currentPersonSnapshot.updated_at).select().maybeSingle() : await query.select().maybeSingle();

    if (error) {
      els.savePersonButton.disabled = false;
      setFormMessage(error.code === '23505' ? 'Codice fiscale o numero badge già associato a un’altra persona.' : error.message, 'error');
      return;
    }
    if (!data) {
      els.savePersonButton.disabled = false;
      setFormMessage('La scheda è stata modificata da un’altra postazione. Ricarico i dati.', 'error');
      await loadPeople({ silent: true });
      const refreshed = people.find(item => item.id === currentPersonId);
      if (refreshed) { currentPersonSnapshot = { ...refreshed }; setPersonFields(refreshed); }
      return;
    }

    try { await syncPersonTypes(data.id, types); }
    catch (typeError) { els.savePersonButton.disabled = false; setFormMessage(`Anagrafica salvata, ma tipologie non aggiornate: ${typeError.message}`, 'error'); await loadPeople({ silent: true }); return; }

    els.savePersonButton.disabled = false;
    await loadPeople({ silent: true });
    const refreshed = people.find(item => item.id === data.id) || data;
    currentPersonSnapshot = { ...refreshed };
    setPersonFields(refreshed);
    setFormMessage('Modifiche salvate.', 'success');
    await logAction('persona_modificata', 'persone', data.id, { persona: personFullName(data), tipologie: types });
    showToast('Scheda aggiornata.', 'success');
  }

  async function registerMovement(tipo) {
    if (!currentPersonId) return;
    const person = people.find(item => item.id === currentPersonId) || currentPersonSnapshot;
    if (!person) return;
    els.checkinButton.disabled = true; els.checkoutButton.disabled = true;
    const { data, error } = await client.rpc('registra_movimento_persona_sicuro', { p_persona_id: currentPersonId, p_tipo: tipo, p_postazione: getStation() });
    if (error) { showToast(`Operazione non riuscita: ${error.message}`, 'error'); setPersonFields(person); return; }
    if (data?.status !== 'registrato') {
      showToast(data?.status === 'gia_presente' ? 'La persona risulta già presente.' : data?.status === 'gia_fuori' ? 'La persona risulta già fuori dal Campo.' : 'Movimento non registrato.', 'error');
    } else {
      await logAction(tipo === 'entrata' ? 'checkin' : 'checkout', 'movimenti_persone', currentPersonId, { persona: personFullName(person) });
      showToast(tipo === 'entrata' ? 'Entrata registrata.' : 'Uscita registrata.', 'success');
    }
    await loadPeople({ silent: true });
    const refreshed = people.find(item => item.id === currentPersonId);
    if (refreshed) { currentPersonSnapshot = { ...refreshed }; setPersonFields(refreshed); }
  }

  async function registerQrMovement(tipo, token) {
    const uuid = String(token || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) { showToast('QR non riconosciuto.', 'error'); return; }
    const { data, error } = await client.rpc('registra_movimento_persona_qr', { p_qr_token: uuid, p_tipo: tipo, p_postazione: getStation() });
    if (error) { showToast(`Scansione non registrata: ${error.message}`, 'error'); return; }
    if (data?.status === 'registrato') showToast(`${data.nome || ''} ${data.cognome || ''}: ${tipo === 'entrata' ? 'ENTRATA' : 'USCITA'} registrata.`, 'success');
    else if (data?.status === 'gia_presente') showToast('QR valido: persona già presente.', 'error');
    else if (data?.status === 'gia_fuori') showToast('QR valido: persona già fuori dal Campo.', 'error');
    else showToast('QR non valido o disattivato.', 'error');
    await loadPeople({ silent: true });
  }

  async function openMovementScanner(tipo) {
    try {
      await window.CampoQrScanner.open({ title: tipo === 'entrata' ? 'QR Entrata' : 'QR Uscita', subtitle: `Inquadra il QR personale per registrare ${tipo === 'entrata' ? 'l’ingresso' : 'l’uscita'} dal Campo.`, onScan: token => registerQrMovement(tipo, token) });
    } catch (error) { showToast(error.message, 'error'); }
  }

  function openNewPerson() {
    els.newPersonForm.reset();
    els.newHousingSector.value = 'da_definire';
    renderTypeChecks(els.newPersonTypes, ['discente']);
    setNewPersonMessage();
    els.newPersonModal.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => els.newNome.focus(), 30);
  }

  function closeNewPerson() { els.newPersonModal.hidden = true; if (els.personModal.hidden) document.body.classList.remove('modal-open'); }

  async function createPerson(event) {
    event.preventDefault();
    const types = selectedTypes(els.newPersonTypes);
    if (!types.length) { setNewPersonMessage('Seleziona almeno una tipologia.', 'error'); return; }
    const payload = {
      nome: els.newNome.value.trim(), cognome: els.newCognome.value.trim(), codice_fiscale: normalizeCf(els.newCf.value), tipologia: types[0], settore_alloggio: els.newHousingSector.value || 'da_definire',
      telefono: nullable(els.newTelefono.value), email: nullable(els.newEmail.value), comitato: nullable(els.newComitato.value), regione: nullable(els.newRegione.value)
    };
    if (!payload.nome || !payload.cognome) { setNewPersonMessage('Nome e cognome sono obbligatori.', 'error'); return; }
    els.createPersonButton.disabled = true; setNewPersonMessage('Creazione…');
    const { data, error } = await client.from('persone').insert(payload).select().single();
    if (error) { els.createPersonButton.disabled = false; setNewPersonMessage(error.code === '23505' ? 'Esiste già una persona con questo codice fiscale.' : error.message, 'error'); return; }
    try { await syncPersonTypes(data.id, types); }
    catch (typeError) { els.createPersonButton.disabled = false; setNewPersonMessage(`Persona creata, ma tipologie non completate: ${typeError.message}`, 'error'); return; }
    els.createPersonButton.disabled = false;
    await logAction('persona_creata', 'persone', data.id, { persona: personFullName(data), tipologie: types });
    closeNewPerson(); await loadPeople({ silent: true }); showToast('Persona creata.', 'success'); await openPerson(data.id);
  }

  async function deleteCurrentPerson() {
    if (!currentPersonId || !currentPersonSnapshot) return;
    const name = personFullName(currentPersonSnapshot);
    if (!window.confirm(`Eliminare definitivamente ${name}? Verranno rimossi anche i dati collegati alla persona.`)) return;
    els.deletePersonButton.disabled = true;
    await logAction('persona_eliminata', 'persone', currentPersonId, { persona: name, confermata: true });
    const { error } = await client.from('persone').delete().eq('id', currentPersonId);
    els.deletePersonButton.disabled = false;
    if (error) { showToast(`Eliminazione non riuscita: ${error.message}`, 'error'); return; }
    await closePerson(); await loadPeople({ silent: true }); showToast('Persona eliminata.', 'success');
  }

  function printCurrentQr() {
    const person = currentPersonSnapshot;
    if (!person?.qr_token) { showToast('QR non disponibile.', 'error'); return; }
    const canvas = els.personQrBox.querySelector('canvas');
    const img = els.personQrBox.querySelector('img');
    const src = canvas ? canvas.toDataURL('image/png') : img?.src;
    if (!src) { showToast('QR non disponibile.', 'error'); return; }
    const popup = window.open('', '_blank', 'width=520,height=650');
    if (!popup) { showToast('Il browser ha bloccato la finestra di stampa.', 'error'); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR ${escapeHtml(personFullName(person))}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:36px}img{width:280px;height:280px}h1{font-size:24px;margin-bottom:4px}p{color:#555}</style></head><body><h1>${escapeHtml(personFullName(person))}</h1><p>${person.numero_badge ? `Badge ${escapeHtml(person.numero_badge)}` : 'Campo Scuola CRI Puglia 2026'}</p><img src="${src}" alt="QR"><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function editingPresenceState() { if (!editingChannel) return []; return Object.values(editingChannel.presenceState()).flat().filter(entry => entry && entry.person_id); }

  async function connectEditingPresence() {
    editingChannel = client.channel('campo-segreteria-editing', { config: { presence: { key: instanceId } } });
    const sync = () => { editingEntries = editingPresenceState(); renderAll(); validateEditingClaim(); };
    editingChannel.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, () => { editingEntries = editingPresenceState(); renderAll(); }).subscribe();
  }

  function connectDatabaseRealtime() {
    dbChannel = client.channel('campo-segreteria-db');
    ['persone', 'persone_tipologie', 'movimenti_persone'].forEach(table => dbChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload));
    dbChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') { els.peopleRealtimeState.textContent = '● Realtime collegato'; els.peopleRealtimeState.style.color = '#16794f'; }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { els.peopleRealtimeState.textContent = 'Realtime da riconnettere'; els.peopleRealtimeState.style.color = '#a36b00'; }
    });
  }

  function bindEvents() {
    document.querySelectorAll('.app-nav-btn').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.openView)));
    document.querySelector('[data-filter-present="true"]')?.addEventListener('click', () => { els.peoplePresenceFilter.value = 'present'; showView('persone'); renderPeopleTable(); });
    [els.peopleSearch, els.peopleTypeFilter, els.peoplePresenceFilter].forEach(control => control.addEventListener('input', renderPeopleTable));
    els.refreshPeopleButton.addEventListener('click', () => loadPeople());
    els.addPersonButton.addEventListener('click', openNewPerson);
    els.dashboardQuickSearch.addEventListener('input', renderQuickResults);
    els.accreditSearch.addEventListener('input', renderAccreditation);
    els.scanEntryButton.addEventListener('click', () => openMovementScanner('entrata'));
    els.scanExitButton.addEventListener('click', () => openMovementScanner('uscita'));

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
    els.deletePersonButton.addEventListener('click', deleteCurrentPerson);
    els.printQrButton.addEventListener('click', printCurrentQr);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!els.personModal.hidden) closePerson();
      else if (!els.newPersonModal.hidden) closeNewPerson();
    });
  }

  async function waitForStation() {
    for (let i = 0; i < 200; i += 1) { if (getStation()) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
    return false;
  }

  async function init() {
    if (initialized || !config || !window.supabase || !els.workspace) return;
    initialized = true;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session: currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    profile = await getProfile();
    if (!profile || !['admin', 'segreteria'].includes(profile.ruolo)) return;

    els.workspace.hidden = false;
    await loadTypes();
    renderTypeChecks(els.newPersonTypes, ['discente']);
    bindEvents();
    const stationReady = await waitForStation();
    if (!stationReady) { showNotice('Seleziona una postazione per attivare gli strumenti operativi.'); return; }
    await connectEditingPresence();
    connectDatabaseRealtime();
    await loadPeople();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
