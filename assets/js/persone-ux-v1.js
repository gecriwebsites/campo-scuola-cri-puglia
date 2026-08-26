(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let client = null;
  let peopleMeta = new Map();
  let verificationMeta = new Map();
  let bedMeta = new Map();
  let tbodyObserver = null;
  let refreshTimer = null;
  let enriching = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const norm = value => String(value || '').trim().toLocaleLowerCase('it');

  function formatDate(value) {
    if (!value) return '—';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
  }

  function initials(person) {
    const a = String(person?.nome || '').trim().charAt(0);
    const b = String(person?.cognome || '').trim().charAt(0);
    return `${a}${b}`.toUpperCase() || '—';
  }

  function injectStyles() {
    if ($('personeUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'personeUxV1Styles';
    style.textContent = `
      /* =====================================================
         PERSONE UX V1 — LISTA OPERATIVA
         ===================================================== */
      [data-view-panel="persone"].people-ux-view{max-width:none!important}
      [data-view-panel="persone"].people-ux-view .view-heading{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important;margin:8px 0 14px!important;padding:0!important}
      [data-view-panel="persone"].people-ux-view .view-heading h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      [data-view-panel="persone"].people-ux-view .view-heading p{margin:0!important;font-size:12px!important;color:#687985!important}
      [data-view-panel="persone"].people-ux-view #addPersonButton{min-height:42px!important;border-radius:5px!important;padding:8px 14px!important;font-size:12px!important;box-shadow:none!important}

      .people-ux-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #d5dde3;border-radius:7px;background:#fff;margin-bottom:10px;overflow:hidden}
      .people-ux-stat{padding:11px 14px;border-right:1px solid #e3e8ec;min-width:0}
      .people-ux-stat:last-child{border-right:0}
      .people-ux-stat span{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#73828d}
      .people-ux-stat strong{display:block;margin-top:2px;font-size:21px;line-height:1.1;color:#1d303d}
      .people-ux-stat small{display:block;margin-top:3px;font-size:9px;color:#84919a}
      .people-ux-stat.present strong{color:#18714d}.people-ux-stat.action strong{color:#a74323}

      [data-view-panel="persone"].people-ux-view .data-toolbar{display:grid!important;grid-template-columns:minmax(260px,1fr) repeat(5,minmax(135px,auto)) auto!important;gap:7px!important;align-items:center!important;margin:0!important;padding:9px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      [data-view-panel="persone"].people-ux-view .data-search{height:42px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;padding:0 10px!important;box-shadow:none!important}
      [data-view-panel="persone"].people-ux-view .data-search input{height:40px!important;font-size:12px!important}
      [data-view-panel="persone"].people-ux-view .compact-select,.people-ux-select{height:42px!important;min-width:0!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;padding:0 9px!important;font:inherit!important;font-size:11px!important;color:#3b4d59!important;outline:none!important}
      [data-view-panel="persone"].people-ux-view .compact-select:focus,.people-ux-select:focus{border-color:#617b8e!important;box-shadow:0 0 0 2px rgba(72,101,121,.1)!important}
      [data-view-panel="persone"].people-ux-view #refreshPeopleButton{width:42px!important;height:42px!important;border-radius:5px!important;font-size:18px!important}
      .people-ux-reset{height:42px;border:1px solid #c9d2d9;background:#f8fafb;border-radius:5px;padding:0 10px;font:inherit;font-size:10px;font-weight:800;color:#50636f;cursor:pointer;white-space:nowrap}
      .people-ux-reset:hover{background:#eef3f6}

      [data-view-panel="persone"].people-ux-view .data-meta{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;margin:8px 2px!important;font-size:10px!important;color:#71808b!important}
      [data-view-panel="persone"].people-ux-view .table-card{border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      [data-view-panel="persone"].people-ux-view .people-table-wrap{overflow:auto!important}
      [data-view-panel="persone"].people-ux-view .people-table{width:100%!important;min-width:1180px!important;border-collapse:collapse!important;table-layout:fixed!important}
      [data-view-panel="persone"].people-ux-view .people-table th{padding:10px 11px!important;background:#f3f6f8!important;border-bottom:1px solid #d5dde3!important;color:#667783!important;font-size:9px!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.065em!important;text-align:left!important}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(1){width:23%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(2){width:13%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(3){width:14%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(4){width:18%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(5){width:14%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(6){width:10%}
      [data-view-panel="persone"].people-ux-view .people-table th:nth-child(7){width:8%}
      [data-view-panel="persone"].people-ux-view .people-table td{padding:10px 11px!important;border-bottom:1px solid #e8edf0!important;font-size:11px!important;vertical-align:middle!important;color:#2c3e49!important;overflow:hidden!important}
      [data-view-panel="persone"].people-ux-view .people-table tbody tr{cursor:pointer!important;background:#fff!important;transition:background .12s ease}
      [data-view-panel="persone"].people-ux-view .people-table tbody tr:hover{background:#f7fafb!important}
      [data-view-panel="persone"].people-ux-view .people-table tbody tr.people-ux-hidden{display:none!important}
      [data-view-panel="persone"].people-ux-view .people-table tbody tr:last-child td{border-bottom:0!important}

      .people-ux-person{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;min-width:0}
      .people-ux-avatar{width:38px;height:38px;border-radius:5px;background:#17344a;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:850;letter-spacing:.02em}
      .people-ux-person strong{display:block;font-size:12px;color:#172a36;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .people-ux-person small{display:block;margin-top:2px;font-size:9px;color:#788690;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .people-ux-stack{display:grid;gap:3px;min-width:0}.people-ux-stack strong{font-size:10px;color:#314652;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.people-ux-stack small{font-size:9px;color:#7b8992;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .people-ux-chip{display:inline-flex;align-items:center;max-width:100%;min-height:22px;padding:3px 6px;border:1px solid #dce3e7;border-radius:3px;background:#f5f7f9;color:#4d606c;font-size:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .people-ux-chip.good{border-color:#cde4d8;background:#eff8f3;color:#176844}.people-ux-chip.warn{border-color:#ead6a9;background:#fff8e7;color:#826019}.people-ux-chip.bad{border-color:#efcbd2;background:#fff2f4;color:#9b2f43}.people-ux-chip.blue{border-color:#cfdde7;background:#f0f6fa;color:#3a627c}
      .people-ux-inline{display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-width:0}
      .people-ux-period{font-size:10px;font-weight:750;color:#314652}.people-ux-bed{font-size:9px;color:#6d7c86;margin-top:3px}
      .people-ux-actions{display:flex;gap:5px;justify-content:flex-end;align-items:center}
      .people-ux-open,.people-ux-accredit{min-height:31px;border-radius:4px;padding:5px 8px;font:inherit;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}
      .people-ux-open{border:1px solid #bfcbd3;background:#fff;color:#344b59}.people-ux-open:hover{background:#f2f6f8}
      .people-ux-accredit{border:1px solid #c8102e;background:#c8102e;color:#fff}.people-ux-accredit:hover{background:#aa0e27}
      .people-ux-open:disabled,.people-ux-accredit:disabled{opacity:.45;cursor:not-allowed}

      @media(max-width:1250px){
        [data-view-panel="persone"].people-ux-view .data-toolbar{grid-template-columns:minmax(240px,1fr) repeat(3,minmax(135px,1fr));}
        [data-view-panel="persone"].people-ux-view .data-toolbar>*:nth-child(n+5){grid-row:2}
      }
      @media(max-width:780px){
        .people-ux-summary{grid-template-columns:1fr 1fr}.people-ux-stat:nth-child(2){border-right:0}.people-ux-stat:nth-child(-n+2){border-bottom:1px solid #e3e8ec}
        [data-view-panel="persone"].people-ux-view .view-heading{align-items:flex-start!important;flex-direction:column!important}
        [data-view-panel="persone"].people-ux-view .data-toolbar{grid-template-columns:1fr 1fr!important}
        [data-view-panel="persone"].people-ux-view .data-search{grid-column:1/-1!important}
        [data-view-panel="persone"].people-ux-view .data-toolbar>*{grid-row:auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildSummary(view) {
    if ($('peopleUxSummary')) return;
    const box = document.createElement('div');
    box.id = 'peopleUxSummary';
    box.className = 'people-ux-summary';
    box.innerHTML = `
      <div class="people-ux-stat"><span>Persone attive</span><strong id="peopleUxTotal">0</strong><small>anagrafiche disponibili</small></div>
      <div class="people-ux-stat present"><span>Presenti ora</span><strong id="peopleUxPresent">0</strong><small>nel Campo</small></div>
      <div class="people-ux-stat action"><span>Da accreditare</span><strong id="peopleUxOutside">0</strong><small>attualmente fuori</small></div>
      <div class="people-ux-stat"><span>Pernottamento</span><strong id="peopleUxOvernight">0</strong><small>persone previste</small></div>`;
    const toolbar = view.querySelector('.data-toolbar');
    toolbar?.insertAdjacentElement('beforebegin', box);
  }

  function buildFilters(view) {
    const toolbar = view.querySelector('.data-toolbar');
    if (!toolbar || $('peopleUxCommitteeFilter')) return;

    const committee = document.createElement('select');
    committee.id = 'peopleUxCommitteeFilter';
    committee.className = 'people-ux-select';
    committee.innerHTML = '<option value="">Tutti i Comitati</option>';

    const overnight = document.createElement('select');
    overnight.id = 'peopleUxOvernightFilter';
    overnight.className = 'people-ux-select';
    overnight.innerHTML = '<option value="">Tutti gli alloggi</option><option value="yes">Con pernottamento</option><option value="no">Senza pernottamento</option>';

    const accreditation = document.createElement('select');
    accreditation.id = 'peopleUxAccreditationFilter';
    accreditation.className = 'people-ux-select';
    accreditation.innerHTML = '<option value="">Tutti gli accrediti</option><option value="complete">Accredito completo</option><option value="missing">Accredito da completare</option><option value="imported">Importati da Master</option>';

    const reset = document.createElement('button');
    reset.id = 'peopleUxReset';
    reset.type = 'button';
    reset.className = 'people-ux-reset';
    reset.textContent = 'Azzera filtri';

    const refresh = $('refreshPeopleButton');
    if (refresh) {
      toolbar.insertBefore(committee, refresh);
      toolbar.insertBefore(overnight, refresh);
      toolbar.insertBefore(accreditation, refresh);
      toolbar.insertBefore(reset, refresh);
    } else {
      toolbar.append(committee, overnight, accreditation, reset);
    }

    [committee, overnight, accreditation].forEach(el => el.addEventListener('change', applyUxFilters));
    reset.addEventListener('click', () => {
      const search = $('peopleSearch'), type = $('peopleTypeFilter'), presence = $('peoplePresenceFilter');
      if (search) search.value = '';
      if (type) type.value = '';
      if (presence) presence.value = '';
      committee.value = ''; overnight.value = ''; accreditation.value = '';
      search?.dispatchEvent(new Event('input', { bubbles:true }));
      type?.dispatchEvent(new Event('input', { bubbles:true }));
      presence?.dispatchEvent(new Event('input', { bubbles:true }));
      setTimeout(applyUxFilters, 30);
    });
  }

  function updateCommitteeOptions() {
    const select = $('peopleUxCommitteeFilter');
    if (!select) return;
    const selected = select.value;
    const values = [...new Set([...peopleMeta.values()].map(p => String(p.comitato || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,'it'));
    select.innerHTML = '<option value="">Tutti i Comitati</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(selected)) select.value = selected;
  }

  function updateSummary() {
    const people = [...peopleMeta.values()].filter(p => p.attivo !== false);
    if ($('peopleUxTotal')) $('peopleUxTotal').textContent = String(people.length);
    if ($('peopleUxPresent')) $('peopleUxPresent').textContent = String(people.filter(p => p.presente === true).length);
    if ($('peopleUxOutside')) $('peopleUxOutside').textContent = String(people.filter(p => p.presente !== true).length);
    if ($('peopleUxOvernight')) $('peopleUxOvernight').textContent = String(people.filter(p => p.pernotto === true).length);
  }

  async function loadMetadata() {
    if (!client) return;
    const { data: people, error } = await client.from('persone')
      .select('id,nome,cognome,codice_fiscale,telefono,email,comitato,regione,tipologia,settore_alloggio,pernotto,data_arrivo_prevista,data_partenza_prevista,numero_badge,badge_consegnato,gadget_consegnato,qr_attivo,presente,chiave_import,attivo')
      .eq('attivo', true)
      .limit(3000);
    if (!error) peopleMeta = new Map((people || []).map(p => [p.id, p]));

    const ver = await client.from('verifiche_accreditamento_persona').select('persona_id,stato').limit(3000);
    verificationMeta = ver.error ? new Map() : new Map((ver.data || []).map(v => [v.persona_id, v.stato]));

    const beds = await client.from('posti_letto').select('persona_id,codice_posto,tende(codice)').not('persona_id','is',null).limit(500);
    bedMeta = new Map();
    if (!beds.error) {
      (beds.data || []).forEach(b => {
        if (!b.persona_id) return;
        const tent = b.tende?.codice || '';
        bedMeta.set(b.persona_id, [tent, b.codice_posto].filter(Boolean).join(' / '));
      });
    }

    updateCommitteeOptions();
    updateSummary();
    enrichRows();
  }

  function accreditationStatus(person, verifyState) {
    const badgeOk = person.badge_consegnato === true;
    const qrOk = person.qr_attivo === true;
    const verified = !verifyState || verifyState === 'verificato';
    if (badgeOk && qrOk && verified) return { label:'Completo', cls:'good' };
    const missing = [];
    if (!badgeOk) missing.push('badge');
    if (!qrOk) missing.push('QR');
    if (verifyState && verifyState !== 'verificato') missing.push('verifica');
    return { label:`Da completare${missing.length ? ` · ${missing.join(', ')}` : ''}`, cls:'warn' };
  }

  function typeTextFromBase(row) {
    const cell = row.cells?.[1];
    return cell?.textContent?.trim() || '—';
  }

  function busyTextFromBase(row) {
    const cell = row.cells?.[5];
    return cell?.textContent?.trim() || '';
  }

  function enrichRow(row) {
    const originalButton = row.querySelector('[data-person-id]');
    const id = originalButton?.dataset.personId;
    if (!id || !peopleMeta.has(id) || row.cells.length < 7) return;
    const person = peopleMeta.get(id);
    const verifyState = verificationMeta.get(id) || '';
    const bed = bedMeta.get(id) || '';
    const typeText = typeTextFromBase(row);
    const busyText = busyTextFromBase(row);
    const fullName = `${person.nome || ''} ${person.cognome || ''}`.trim();
    const secondary = person.codice_fiscale || person.telefono || person.email || 'Nessun identificativo';
    const imported = !!String(person.chiave_import || '').trim();
    const acc = accreditationStatus(person, verifyState);

    row.dataset.peopleUxId = id;
    row.dataset.peopleUxCommittee = norm(person.comitato);
    row.dataset.peopleUxOvernight = person.pernotto ? 'yes' : 'no';
    row.dataset.peopleUxAccreditation = acc.cls === 'good' ? 'complete' : 'missing';
    row.dataset.peopleUxImported = imported ? 'yes' : 'no';

    row.cells[0].innerHTML = `<div class="people-ux-person"><span class="people-ux-avatar">${esc(initials(person))}</span><div><strong>${esc(fullName)}</strong><small>${esc(secondary)}</small></div></div>`;
    row.cells[1].innerHTML = `<div class="people-ux-inline"><span class="people-ux-chip blue">${esc(typeText)}</span>${imported ? '<span class="people-ux-chip">Master</span>' : ''}</div>`;
    row.cells[2].innerHTML = `<div class="people-ux-stack"><strong>${esc(person.comitato || '—')}</strong><small>${esc(person.regione || '')}</small></div>`;

    const start = formatDate(person.data_arrivo_prevista), end = formatDate(person.data_partenza_prevista);
    const stay = person.data_arrivo_prevista || person.data_partenza_prevista ? `${start} → ${end}` : 'Periodo non indicato';
    const overnight = person.pernotto ? `<span class="people-ux-chip blue">Pernotto</span>` : `<span class="people-ux-chip">No pernottamento</span>`;
    row.cells[3].innerHTML = `<div class="people-ux-stack"><strong class="people-ux-period">${esc(stay)}</strong><div class="people-ux-inline">${overnight}${bed ? `<span class="people-ux-chip good">${esc(bed)}</span>` : ''}</div></div>`;

    const badge = person.numero_badge ? `Badge ${esc(person.numero_badge)}` : (person.badge_consegnato ? 'Badge consegnato' : 'Badge da consegnare');
    row.cells[4].innerHTML = `<div class="people-ux-stack"><div class="people-ux-inline"><span class="people-ux-chip ${acc.cls}">${esc(acc.label)}</span></div><small>${badge}${person.gadget_consegnato ? ' · Gadget ✓' : ''}${person.qr_attivo ? ' · QR ✓' : ''}</small></div>`;

    const presenceClass = person.presente ? 'good' : '';
    const presenceText = person.presente ? '● Presente' : 'Fuori';
    row.cells[5].innerHTML = `<div class="people-ux-stack"><span class="people-ux-chip ${presenceClass}">${presenceText}</span>${busyText && !/^libera$/i.test(busyText) ? `<small>${esc(busyText)}</small>` : '<small>Scheda libera</small>'}</div>`;

    const disabled = originalButton.disabled;
    row.cells[6].innerHTML = `<div class="people-ux-actions"><button class="people-ux-open" type="button" data-people-ux-open="${id}" ${disabled ? 'disabled' : ''}>Apri</button><button class="people-ux-accredit" type="button" data-people-ux-accredit="${id}" ${disabled ? 'disabled' : ''}>Accredita</button></div>`;

    if (row.dataset.peopleUxBound !== '1') {
      row.dataset.peopleUxBound = '1';
      row.addEventListener('click', event => {
        if (event.target.closest('button,a,input,select,label')) return;
        const button = row.querySelector('[data-people-ux-open]');
        if (button && !button.disabled) button.click();
      });
    }
  }

  function applyUxFilters() {
    const committee = norm($('peopleUxCommitteeFilter')?.value);
    const overnight = $('peopleUxOvernightFilter')?.value || '';
    const accreditation = $('peopleUxAccreditationFilter')?.value || '';
    const rows = [...document.querySelectorAll('#peopleTableBody tr')];
    let visible = 0;
    rows.forEach(row => {
      let show = true;
      if (committee && row.dataset.peopleUxCommittee !== committee) show = false;
      if (overnight && row.dataset.peopleUxOvernight !== overnight) show = false;
      if (accreditation === 'complete' && row.dataset.peopleUxAccreditation !== 'complete') show = false;
      if (accreditation === 'missing' && row.dataset.peopleUxAccreditation !== 'missing') show = false;
      if (accreditation === 'imported' && row.dataset.peopleUxImported !== 'yes') show = false;
      row.classList.toggle('people-ux-hidden', !show);
      if (show) visible += 1;
    });
    const count = $('peopleCount');
    if (count) count.textContent = `${visible} ${visible === 1 ? 'persona visualizzata' : 'persone visualizzate'}`;
  }

  function enrichRows() {
    if (enriching) return;
    const body = $('peopleTableBody');
    if (!body) return;
    enriching = true;
    try {
      [...body.querySelectorAll('tr')].forEach(enrichRow);
      applyUxFilters();
    } finally {
      enriching = false;
    }
  }

  function bindActionDelegation() {
    const body = $('peopleTableBody');
    if (!body || body.dataset.peopleUxActions === '1') return;
    body.dataset.peopleUxActions = '1';
    body.addEventListener('click', event => {
      const open = event.target.closest('[data-people-ux-open]');
      if (open) {
        event.preventDefault(); event.stopPropagation();
        const id = open.dataset.peopleUxOpen;
        const proxy = document.createElement('button');
        proxy.type = 'button'; proxy.dataset.personId = id; proxy.hidden = true;
        document.body.appendChild(proxy); proxy.click(); proxy.remove();
        return;
      }
      const accredit = event.target.closest('[data-people-ux-accredit]');
      if (accredit) {
        event.preventDefault(); event.stopPropagation();
        const person = peopleMeta.get(accredit.dataset.peopleUxAccredit);
        document.querySelector('.app-nav-btn[data-view="accreditamento"]')?.click();
        setTimeout(() => {
          const search = $('accreditSearch');
          if (!search || !person) return;
          search.value = `${person.nome || ''} ${person.cognome || ''}`.trim();
          search.dispatchEvent(new Event('input', { bubbles:true }));
          search.focus();
        }, 40);
      }
    }, true);
  }

  function transformView() {
    const view = document.querySelector('[data-view-panel="persone"]');
    if (!view || view.dataset.peopleUx === '1') return;
    view.dataset.peopleUx = '1';
    view.classList.add('people-ux-view');

    const heading = view.querySelector('.view-heading p');
    if (heading) heading.textContent = 'Archivio operativo unico: stato, permanenza, accredito e apertura rapida della scheda individuale.';

    const tableHead = view.querySelector('.people-table thead tr');
    if (tableHead) tableHead.innerHTML = '<th>Persona</th><th>Profilo</th><th>Comitato</th><th>Permanenza / Alloggio</th><th>Accredito</th><th>Presenza</th><th>Azioni</th>';

    buildSummary(view);
    buildFilters(view);
    bindActionDelegation();

    const body = $('peopleTableBody');
    if (body && !tbodyObserver) {
      tbodyObserver = new MutationObserver(() => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(enrichRows, 20);
      });
      tbodyObserver.observe(body, { childList:true, subtree:false });
    }
  }

  function connectRealtime() {
    if (!client) return;
    const channel = client.channel('people-ux-v1-meta');
    ['persone','posti_letto','verifiche_accreditamento_persona'].forEach(table => {
      channel.on('postgres_changes', { event:'*', schema:'public', table }, () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(loadMetadata, 120);
      });
    });
    channel.subscribe();
    document.addEventListener('campo-master-import-complete', () => setTimeout(loadMetadata, 150));
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if (document.querySelector('[data-view-panel="persone"]') && $('peopleTableBody')) break;
      await sleep(80);
    }
    transformView();
    if (config && window.supabase) {
      client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
      await loadMetadata();
      connectRealtime();
    }
    enrichRows();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
