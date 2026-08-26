(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';
  const $ = id => document.getElementById(id);

  let client = null;
  let profile = null;
  let verificationMap = new Map();
  let currentPersonId = null;
  let realtimeChannel = null;
  let listObserver = null;
  let modalObserver = null;
  let loadToken = 0;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function getStation() {
    return sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  }

  function formatDate(value) {
    if (!value) return '—';
    const text = String(value).slice(0, 10);
    const parts = text.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return esc(text);
    return new Intl.DateTimeFormat('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(parts[0], parts[1] - 1, parts[2], 12));
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'
    }).format(date);
  }

  function yesNo(value) {
    if (value === true || String(value).toLowerCase() === 'true') return 'Sì';
    if (value === false || String(value).toLowerCase() === 'false') return 'No';
    if (value == null || value === '') return '—';
    return String(value);
  }

  function notify(message, type = '') {
    const status = $('excelVerifyActionStatus');
    if (status) {
      status.textContent = message;
      status.className = `excel-verify-action-status${type ? ` ${type}` : ''}`;
    }
    const toast = $('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = `toast${type ? ` ${type}` : ''}`;
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 3200);
    }
  }

  function injectStyles() {
    if ($('excelVerifyStyles')) return;
    const style = document.createElement('style');
    style.id = 'excelVerifyStyles';
    style.textContent = `
      .excel-verify-list-badge{display:inline-flex;align-items:center;gap:4px;margin-top:5px;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;white-space:nowrap}
      .excel-verify-list-badge.pending{background:#fff2cc;color:#7d5900;border:1px solid #efd48b}.excel-verify-list-badge.done{background:#e8f7ef;color:#116b45;border:1px solid #c8e8d7}
      .excel-verify-panel{margin:0 0 14px;border:1px solid #e2e6e9;border-radius:15px;background:#fff;overflow:hidden}.excel-verify-panel[hidden]{display:none}
      .excel-verify-panel-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:14px 14px 12px;background:#fafbfc;border-bottom:1px solid #edf0f2}.excel-verify-panel-head h4{margin:2px 0 3px;font-size:15px}.excel-verify-panel-head p{margin:0;color:var(--muted);font-size:10px;line-height:1.35}
      .excel-verify-state{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;white-space:nowrap}.excel-verify-state.pending{background:#fff2cc;color:#7d5900}.excel-verify-state.done{background:#e8f7ef;color:#116b45}.excel-verify-state.loading{background:#edf1f4;color:#5f6870}
      .excel-verify-body{padding:13px}.excel-verify-sources{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.excel-verify-source{display:inline-flex;border-radius:999px;background:#f0f2f4;padding:4px 7px;font-size:9px;font-weight:800;color:#555e65}
      .excel-verify-compare{display:grid;gap:6px}.excel-verify-row{display:grid;grid-template-columns:92px minmax(0,1fr) minmax(0,1fr) auto;gap:7px;align-items:center;border:1px solid #edf0f2;border-radius:10px;padding:8px}.excel-verify-row>strong{font-size:9px;text-transform:uppercase;letter-spacing:.03em;color:#6c747b}.excel-verify-value{min-width:0;font-size:10px;line-height:1.3;overflow-wrap:anywhere}.excel-verify-value small{display:block;color:var(--muted);font-size:8px;font-weight:800;margin-bottom:2px}.excel-verify-match{border-radius:999px;padding:3px 6px;font-size:8px;font-weight:900;white-space:nowrap}.excel-verify-match.ok{background:#e8f7ef;color:#116b45}.excel-verify-match.check{background:#fff2cc;color:#7d5900}.excel-verify-match.info{background:#eaf2fb;color:#155f9b}
      .excel-verify-details{margin-top:10px;border-top:1px solid #edf0f2;padding-top:10px;display:grid;gap:7px}.excel-verify-detail{font-size:10px;line-height:1.45}.excel-verify-detail strong{display:block;font-size:9px;text-transform:uppercase;color:#687078;margin-bottom:2px}.excel-verify-warning{padding:8px 9px;border-radius:9px;background:#fff8e9;border:1px solid #f1dca6;color:#785800;font-size:9px;line-height:1.4}
      .excel-verify-actions{display:grid;gap:7px;margin-top:11px}.excel-verify-note{width:100%;min-height:60px;resize:vertical;border:1px solid #d5dade;border-radius:9px;padding:8px 9px;font:inherit;font-size:10px;box-sizing:border-box}.excel-verify-buttons{display:flex;gap:6px;flex-wrap:wrap}.excel-verify-button{border:1px solid #d7dce0;background:#fff;border-radius:9px;padding:8px 9px;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.excel-verify-button.primary{background:#16794f;border-color:#16794f;color:#fff}.excel-verify-button.warning{color:#815b00;border-color:#e7cf8e;background:#fffaf0}.excel-verify-button.meals{color:#8a4c00;border-color:#ead2b4;background:#fff9f2}.excel-verify-button:disabled{opacity:.5;cursor:not-allowed}.excel-verify-action-status{min-height:13px;font-size:9px;font-weight:800}.excel-verify-action-status.success{color:#16794f}.excel-verify-action-status.error{color:#a0001d}
      @media(max-width:700px){.excel-verify-row{grid-template-columns:84px 1fr}.excel-verify-match{grid-column:2}.excel-verify-value:nth-of-type(2){grid-column:2}}
    `;
    document.head.appendChild(style);
  }

  function injectPanel() {
    if ($('excelVerifyPanel')) return;
    const side = document.querySelector('#personModal .accredit-side');
    if (!side) return;
    const panel = document.createElement('section');
    panel.id = 'excelVerifyPanel';
    panel.className = 'excel-verify-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="excel-verify-panel-head">
        <div><div class="panel-kicker">Controllo post-import</div><h4>Dati importati</h4><p>Confronta i dati Excel con quelli operativi prima di chiudere la verifica.</p></div>
        <span id="excelVerifyState" class="excel-verify-state loading">Caricamento…</span>
      </div>
      <div id="excelVerifyBody" class="excel-verify-body"></div>`;
    const currentState = side.querySelector('.current-state');
    side.insertBefore(panel, currentState || side.firstChild);
  }

  async function loadVerificationMap() {
    const { data, error } = await client.from('verifiche_accreditamento_persona').select('persona_id,stato,verificato_at');
    if (error) return;
    verificationMap = new Map((data || []).map(row => [row.persona_id, row]));
    enhanceAccreditationList();
  }

  function enhanceAccreditationList() {
    const list = $('accreditList');
    if (!list) return;
    list.querySelectorAll('.accredit-row').forEach(row => {
      const button = row.querySelector('[data-person-id]');
      const personId = button?.dataset.personId;
      if (!personId) return;
      row.querySelectorAll('.excel-verify-list-badge').forEach(el => el.remove());
      const state = verificationMap.get(personId);
      if (!state) return;
      const badge = document.createElement('span');
      badge.className = `excel-verify-list-badge ${state.stato === 'verificato' ? 'done' : 'pending'}`;
      badge.textContent = state.stato === 'verificato' ? '✓ Excel verificato' : '⚠ Dati Excel da verificare';
      const target = row.querySelector('.accredit-person') || row.querySelector('.accredit-meta');
      target?.appendChild(badge);
    });
  }

  function lastValue(imports, field) {
    for (let i = imports.length - 1; i >= 0; i -= 1) {
      const value = imports[i]?.dati?.[field];
      if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length)) return value;
    }
    return null;
  }

  function collectValues(imports, field) {
    const values = [];
    imports.forEach(item => {
      const value = item?.dati?.[field];
      if (Array.isArray(value)) value.forEach(v => { if (v != null && String(v).trim()) values.push(String(v).trim()); });
      else if (value != null && String(value).trim()) values.push(String(value).trim());
    });
    return [...new Set(values)];
  }

  function equivalent(a, b, kind = 'text') {
    if (a == null || a === '') return true;
    if (kind === 'bool') return yesNo(a) === yesNo(b);
    if (kind === 'date') return String(a).slice(0, 10) === String(b || '').slice(0, 10);
    return String(a).trim().toLocaleLowerCase('it') === String(b ?? '').trim().toLocaleLowerCase('it');
  }

  function compareRow(label, currentValue, excelValue, kind = 'text') {
    const excelPresent = excelValue !== null && excelValue !== undefined && excelValue !== '';
    const currentText = kind === 'date' ? formatDate(currentValue) : kind === 'bool' ? yesNo(currentValue) : (currentValue || '—');
    const excelText = kind === 'date' ? formatDate(excelValue) : kind === 'bool' ? yesNo(excelValue) : (Array.isArray(excelValue) ? excelValue.join(', ') : (excelValue || '—'));
    const ok = !excelPresent || equivalent(excelValue, currentValue, kind);
    return `<div class="excel-verify-row"><strong>${esc(label)}</strong><div class="excel-verify-value"><small>Gestionale</small>${esc(currentText)}</div><div class="excel-verify-value"><small>Excel</small>${esc(excelText)}</div><span class="excel-verify-match ${excelPresent ? (ok ? 'ok' : 'check') : 'info'}">${excelPresent ? (ok ? 'Coincide' : 'Verifica') : 'N/D'}</span></div>`;
  }

  async function loadPersonPanel(personId) {
    const token = ++loadToken;
    currentPersonId = personId;
    injectPanel();
    const panel = $('excelVerifyPanel');
    const body = $('excelVerifyBody');
    const stateEl = $('excelVerifyState');
    if (!panel || !body || !stateEl) return;
    panel.hidden = false;
    stateEl.className = 'excel-verify-state loading';
    stateEl.textContent = 'Caricamento…';
    body.innerHTML = '<div class="excel-verify-detail">Recupero dati di provenienza…</div>';

    const [detailRes, personRes, dietaryRes, ticketRes] = await Promise.all([
      client.rpc('dettaglio_verifica_accreditamento', { p_persona_id: personId }),
      client.from('persone').select('id,nome,cognome,data_arrivo_prevista,data_partenza_prevista,pernotto,comitato,regione').eq('id', personId).maybeSingle(),
      client.from('esigenze_alimentari').select('presente,descrizione').eq('persona_id', personId).maybeSingle(),
      client.from('persone_pasti').select('id,previsto,consumato,ticket_attivo').eq('persona_id', personId)
    ]);

    if (token !== loadToken || currentPersonId !== personId) return;
    if (detailRes.error || detailRes.data?.status !== 'ok') {
      stateEl.className = 'excel-verify-state pending';
      stateEl.textContent = 'Errore';
      body.innerHTML = `<div class="excel-verify-warning">Impossibile leggere i dati importati: ${esc(detailRes.error?.message || detailRes.data?.status || 'errore')}</div>`;
      return;
    }

    const detail = detailRes.data;
    if (detail.origine !== 'excel') {
      panel.hidden = true;
      return;
    }

    const person = personRes.data || {};
    const dietary = dietaryRes.data || null;
    const tickets = ticketRes.data || [];
    const imports = Array.isArray(detail.importazioni) ? detail.importazioni : [];
    const state = detail.stato_verifica || 'da_verificare';

    stateEl.className = `excel-verify-state ${state === 'verificato' ? 'done' : 'pending'}`;
    stateEl.textContent = state === 'verificato' ? '✓ Verificato' : '⚠ Da verificare';

    const files = [...new Set(imports.map(item => item.nome_file).filter(Boolean))];
    const arrival = lastValue(imports, 'arrivo');
    const departure = lastValue(imports, 'partenza');
    const overnight = lastValue(imports, 'pernotto');
    const importedDietary = lastValue(imports, 'esigenze_alimentari');
    const courses = collectValues(imports, 'corsi');
    const shifts = collectValues(imports, 'turni');
    const areas = collectValues(imports, 'aree');
    const qualifications = collectValues(imports, 'qualifiche');
    const meals = (Array.isArray(detail.pasti_excel) ? detail.pasti_excel : []).flatMap(item => Array.isArray(item.valore) ? item.valore : (item.valore != null ? [item.valore] : [])).map(String);
    const warnings = (Array.isArray(detail.avvisi) ? detail.avvisi : []).flatMap(item => Array.isArray(item.avvisi) ? item.avvisi : []);
    const activeTickets = tickets.filter(t => t.previsto === true && t.ticket_attivo !== false).length;

    let html = `<div class="excel-verify-sources">${files.map(file => `<span class="excel-verify-source">📄 ${esc(file)}</span>`).join('')}<span class="excel-verify-source">${imports.length} ${imports.length === 1 ? 'riga' : 'righe'} importate</span></div>`;
    html += `<div class="excel-verify-compare">
      ${compareRow('Arrivo', person.data_arrivo_prevista, arrival, 'date')}
      ${compareRow('Partenza', person.data_partenza_prevista, departure, 'date')}
      ${compareRow('Pernotto', person.pernotto, overnight, 'bool')}
      ${compareRow('Allergie', dietary?.presente ? (dietary.descrizione || 'Presente') : 'Nessuna', importedDietary, 'text')}
      ${compareRow('Pasti', `${activeTickets} ticket operativi`, meals.length ? meals.join(' · ') : null, 'text')}
    </div>`;

    const details = [];
    if (courses.length) details.push(`<div class="excel-verify-detail"><strong>Corsi Excel</strong>${esc(courses.join(' · '))}</div>`);
    if (areas.length) details.push(`<div class="excel-verify-detail"><strong>Aree / servizi Excel</strong>${esc(areas.join(' · '))}</div>`);
    if (shifts.length) details.push(`<div class="excel-verify-detail"><strong>Turni / disponibilità Excel</strong>${esc(shifts.join(' · '))}</div>`);
    if (qualifications.length) details.push(`<div class="excel-verify-detail"><strong>Qualifiche Excel</strong>${esc(qualifications.join(' · '))}</div>`);
    if (warnings.length) details.push(`<div class="excel-verify-warning"><strong>⚠ Avvisi importazione</strong><br>${warnings.map(w => esc(w.messaggio || w.tipo || w)).join('<br>')}</div>`);
    if (details.length) html += `<div class="excel-verify-details">${details.join('')}</div>`;

    html += `<div class="excel-verify-actions">
      <textarea id="excelVerifyNote" class="excel-verify-note" placeholder="Note di verifica (facoltative)">${esc(detail.note_verifica || '')}</textarea>
      <div class="excel-verify-buttons">
        <button id="excelVerifyMeals" class="excel-verify-button meals" type="button">🍽️ Apri Pasti</button>
        ${state === 'verificato'
          ? '<button id="excelVerifyReopen" class="excel-verify-button warning" type="button">Riapri verifica</button>'
          : '<button id="excelVerifyConfirm" class="excel-verify-button primary" type="button">✓ Verifica completata</button>'}
      </div>
      <div id="excelVerifyActionStatus" class="excel-verify-action-status">${state === 'verificato' && detail.verificato_at ? `Verificato ${esc(formatDateTime(detail.verificato_at))}${detail.verificato_postazione ? ` · ${esc(detail.verificato_postazione)}` : ''}` : ''}</div>
    </div>`;

    body.innerHTML = html;
    bindPanelActions(personId, `${person.nome || ''} ${person.cognome || ''}`.trim(), meals.length > 0);
  }

  function bindPanelActions(personId, fullName, hasExcelMeals) {
    $('excelVerifyMeals')?.addEventListener('click', () => openMeals(personId, fullName));
    $('excelVerifyConfirm')?.addEventListener('click', async () => {
      const extra = hasExcelMeals ? '\n\nSono presenti indicazioni pasti provenienti dall’Excel: assicurati di averle controllate nel modulo Pasti.' : '';
      if (!window.confirm(`Confermare che i dati importati per questa persona sono stati verificati?${extra}`)) return;
      const button = $('excelVerifyConfirm');
      button.disabled = true;
      notify('Salvataggio verifica…');
      const { data, error } = await client.rpc('conferma_verifica_accreditamento', {
        p_persona_id: personId,
        p_note: $('excelVerifyNote')?.value?.trim() || null,
        p_postazione: getStation() || null
      });
      if (error || data?.status !== 'verificato') {
        button.disabled = false;
        notify(`Verifica non salvata: ${error?.message || data?.status || 'errore'}`, 'error');
        return;
      }
      notify('Verifica completata.', 'success');
      await loadVerificationMap();
      await loadPersonPanel(personId);
    });
    $('excelVerifyReopen')?.addEventListener('click', async () => {
      if (!window.confirm('Riaprire la verifica dei dati Excel per questa persona?')) return;
      const button = $('excelVerifyReopen');
      button.disabled = true;
      const { data, error } = await client.rpc('riapri_verifica_accreditamento', { p_persona_id: personId });
      if (error || data?.status !== 'riaperta') {
        button.disabled = false;
        notify(`Impossibile riaprire la verifica: ${error?.message || data?.status || 'errore'}`, 'error');
        return;
      }
      notify('Verifica riaperta.', 'success');
      await loadVerificationMap();
      await loadPersonPanel(personId);
    });
  }

  function openMeals(personId, fullName) {
    document.querySelector('#personModal [data-close-person]')?.click();
    const nav = document.querySelector('.app-nav-btn[data-view="pasti"]');
    nav?.click();
    setTimeout(() => {
      const search = $('mealPersonSearch');
      if (search) {
        search.value = fullName;
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTimeout(() => {
        const target = document.querySelector(`[data-meal-person="${CSS.escape(personId)}"]`);
        target?.click();
        $('mealSelectedPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 180);
    }, 120);
  }

  function watchModal() {
    const modal = $('personModal');
    if (!modal) return;
    const load = () => {
      if (modal.hidden) {
        currentPersonId = null;
        loadToken += 1;
        if ($('excelVerifyPanel')) $('excelVerifyPanel').hidden = true;
        return;
      }
      setTimeout(() => {
        const personId = $('personId')?.value;
        if (personId) loadPersonPanel(personId);
      }, 80);
    };
    modalObserver = new MutationObserver(load);
    modalObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-person-id]')) setTimeout(load, 120);
    });
  }

  function watchAccreditationList() {
    const list = $('accreditList');
    if (!list) return;
    listObserver = new MutationObserver(() => enhanceAccreditationList());
    listObserver.observe(list, { childList:true, subtree:false });
    enhanceAccreditationList();
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-verifica-accreditamento-excel');
    realtimeChannel.on('postgres_changes', {
      event:'*', schema:'public', table:'verifiche_accreditamento_persona'
    }, async payload => {
      await loadVerificationMap();
      const changedId = payload.new?.persona_id || payload.old?.persona_id;
      if (currentPersonId && (!changedId || changedId === currentPersonId) && !$('personModal')?.hidden) {
        await loadPersonPanel(currentPersonId);
      }
    });
    realtimeChannel.subscribe();
  }

  async function waitForUi() {
    for (let i = 0; i < 120; i += 1) {
      if ($('personModal') && $('accreditList')) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async function init() {
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false }
    });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data, error: profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo || !['admin','segreteria'].includes(data.ruolo)) return;
    profile = data;
    if (!await waitForUi()) return;
    injectStyles();
    injectPanel();
    await loadVerificationMap();
    watchAccreditationList();
    watchModal();
    connectRealtime();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
