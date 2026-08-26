(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let sidebarObserver = null;
  let formObserver = null;
  let reorderBusy = false;

  function injectStyles() {
    if ($('personaUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'personaUxV1Styles';
    style.textContent = `
      /* =====================================================
         PERSONA UX V1 — SCHEDA OPERATIVA PULITA
         ===================================================== */
      #personModal.person-ux{padding:0!important;place-items:stretch!important;background:rgba(20,28,35,.62)!important}
      #personModal.person-ux .person-modal-backdrop{display:block!important;backdrop-filter:blur(2px)!important}
      #personModal.person-ux .person-panel{position:relative!important;width:min(1440px,calc(100vw - 40px))!important;height:calc(100dvh - 40px)!important;max-width:none!important;max-height:none!important;margin:20px auto!important;border:1px solid #cfd7de!important;border-radius:10px!important;background:#f4f6f8!important;box-shadow:0 24px 70px rgba(10,20,28,.28)!important;overflow:auto!important}
      #personModal.person-ux .person-panel-head{position:sticky!important;top:0!important;z-index:30!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;min-height:86px!important;padding:14px 20px!important;background:#fff!important;border-bottom:1px solid #d7dee4!important;border-radius:10px 10px 0 0!important;box-sizing:border-box!important}
      #personModal.person-ux .person-panel-head>div:first-of-type{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:'avatar status' 'avatar title' 'avatar sub' 'avatar meta'!important;column-gap:14px!important;align-items:center!important;min-width:0!important}
      #personModal.person-ux .person-ux-avatar{grid-area:avatar;width:52px;height:52px;border-radius:7px;background:#162f43;color:#fff;display:grid;place-items:center;font-size:16px;font-weight:800;letter-spacing:.03em}
      #personModal.person-ux #personPresencePill{grid-area:status;justify-self:start;margin:0 0 2px!important;padding:3px 7px!important;border-radius:3px!important;font-size:10px!important}
      #personModal.person-ux #personModalTitle{grid-area:title;margin:0!important;font-size:22px!important;line-height:1.12!important;letter-spacing:-.02em!important;color:#16232e!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #personModal.person-ux #personModalSubtitle{grid-area:sub;margin:3px 0 0!important;font-size:12px!important;color:#60717f!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #personModal.person-ux .person-ux-header-meta{grid-area:meta;display:flex;gap:7px;flex-wrap:wrap;margin-top:6px}
      #personModal.person-ux .person-ux-header-meta span{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;background:#f2f5f7;border:1px solid #e0e6ea;border-radius:3px;color:#526573;font-size:10px;font-weight:700}
      #personModal.person-ux .panel-close{width:38px!important;height:38px!important;border:1px solid #d5dce2!important;border-radius:5px!important;background:#f7f9fa!important;color:#344653!important;font-size:22px!important;cursor:pointer!important}
      #personModal.person-ux .panel-close:hover{background:#eef2f5!important}
      #personModal.person-ux #personWorkNotice{margin:0!important;border-radius:0!important;border-left:0!important;border-right:0!important}

      #personModal.person-ux .person-panel-body{display:block!important;width:100%!important;max-width:none!important;padding:14px 16px 82px!important;box-sizing:border-box!important;background:#f4f6f8!important}
      #personModal.person-ux #personForm.person-ux-form{display:grid!important;grid-template-columns:minmax(0,1fr) 340px!important;gap:14px!important;align-items:start!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #personModal.person-ux #personForm>input[type=hidden]{display:none!important}
      #personModal.person-ux .person-ux-main{display:grid;gap:12px;min-width:0}
      #personModal.person-ux .person-ux-section{background:#fff;border:1px solid #d7dee4;border-radius:7px;padding:16px 17px;min-width:0}
      #personModal.person-ux .person-ux-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:0 0 14px;padding:0 0 10px;border-bottom:1px solid #e7ecef}
      #personModal.person-ux .person-ux-section-head h3{margin:0;font-size:15px;line-height:1.2;color:#1c2c38;letter-spacing:-.01em}
      #personModal.person-ux .person-ux-section-head p{margin:3px 0 0;font-size:11px;line-height:1.35;color:#74828c}
      #personModal.person-ux .person-ux-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 12px;min-width:0}
      #personModal.person-ux .person-ux-grid>label{display:block!important;margin:0!important;min-width:0;font-size:11px!important;font-weight:750!important;color:#465966!important}
      #personModal.person-ux .person-ux-grid>label.person-ux-wide,#personModal.person-ux .person-ux-grid>.person-ux-wide{grid-column:1/-1}
      #personModal.person-ux .person-ux-grid .field-input,#personModal.person-ux .person-ux-grid .field-textarea{width:100%!important;box-sizing:border-box!important;margin-top:5px!important;border:1px solid #cbd4db!important;border-radius:5px!important;background:#fff!important;color:#1d2a34!important;font-size:13px!important;box-shadow:none!important}
      #personModal.person-ux .person-ux-grid .field-input{height:42px!important;padding:0 10px!important}
      #personModal.person-ux .person-ux-grid .field-textarea{min-height:82px!important;padding:9px 10px!important;resize:vertical!important}
      #personModal.person-ux .person-ux-grid .field-input:focus,#personModal.person-ux .person-ux-grid .field-textarea:focus{outline:none!important;border-color:#617b8e!important;box-shadow:0 0 0 2px rgba(72,101,121,.12)!important}
      #personModal.person-ux .type-checks{display:flex!important;gap:6px!important;flex-wrap:wrap!important;margin-top:6px!important}
      #personModal.person-ux .type-check{margin:0!important}
      #personModal.person-ux .type-check span{border-radius:4px!important;font-size:11px!important;padding:7px 9px!important}
      #personModal.person-ux .course-chips{display:flex!important;gap:6px!important;flex-wrap:wrap!important;margin-top:2px!important}
      #personModal.person-ux .course-chips[hidden]{display:none!important}
      #personModal.person-ux .course-chip{border-radius:3px!important;font-size:10px!important}
      #personModal.person-ux .person-ux-pernotto{grid-column:1/-1!important;margin:0!important;border:1px solid #dce3e8!important;border-radius:5px!important;background:#f8fafb!important;padding:10px 11px!important}
      #personModal.person-ux .person-ux-pernotto span{display:flex!important;flex-direction:column!important;gap:2px!important}
      #personModal.person-ux .person-ux-pernotto b{font-size:12px!important}.person-ux-pernotto small{font-size:10px!important;color:#71808b!important}

      /* Colonna destra realmente interna alla scheda */
      #personModal.person-ux .accredit-side.person-ux-side{position:sticky!important;top:102px!important;display:block!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;align-self:start!important}
      #personModal.person-ux .person-ux-side-card{background:#fff;border:1px solid #d7dee4;border-radius:7px;padding:13px;margin-bottom:10px}
      #personModal.person-ux .accredit-side-head{margin:0!important;padding:0 0 9px!important;border-bottom:1px solid #e7ecef!important}
      #personModal.person-ux .accredit-side-head .panel-kicker{font-size:9px!important;letter-spacing:.07em!important}
      #personModal.person-ux .accredit-side-head h3{font-size:15px!important;margin:3px 0 0!important;color:#1f303c!important}
      #personModal.person-ux .current-state{margin:0 0 8px!important;padding:11px!important;border:1px solid #dce3e8!important;border-radius:5px!important;background:#f7f9fa!important}
      #personModal.person-ux .current-state span{font-size:9px!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#74828c!important;font-weight:800!important}
      #personModal.person-ux .current-state strong{display:block!important;margin:3px 0!important;font-size:17px!important;color:#1f303c!important}.current-state small{font-size:10px!important;color:#71808b!important}
      #personModal.person-ux .big-action{width:100%!important;min-height:44px!important;margin:6px 0 0!important;border-radius:5px!important;font-size:11px!important;font-weight:850!important;box-shadow:none!important}
      #personModal.person-ux .accredit-help{margin-top:8px!important;font-size:10px!important;line-height:1.4!important;color:#74828c!important}
      #personModal.person-ux .person-ux-side-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid #e7ecef}
      #personModal.person-ux .person-ux-side-title strong{font-size:12px;color:#263944}.person-ux-side-title span{font-size:9px;color:#7b8993;text-transform:uppercase;letter-spacing:.06em;font-weight:800}
      #personModal.person-ux .person-ux-side-field{display:block!important;margin:0 0 9px!important;font-size:10px!important;font-weight:750!important;color:#526572!important}
      #personModal.person-ux .person-ux-side-field .field-input{height:39px!important;margin-top:5px!important;border-radius:5px!important;font-size:12px!important}
      #personModal.person-ux .person-ux-switches{display:grid;gap:6px}
      #personModal.person-ux .person-ux-switches .switch-row{display:flex!important;align-items:center!important;gap:9px!important;margin:0!important;padding:9px 10px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important}
      #personModal.person-ux .person-ux-switches .switch-row b{font-size:11px!important}.person-ux-switches .switch-row small{font-size:9px!important;color:#7b8993!important}
      #personModal.person-ux .qr-card{margin:0!important;padding:12px!important;border:1px solid #d7dee4!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #personModal.person-ux .qr-card-head{margin-bottom:9px!important}.qr-card-head h4{font-size:13px!important;margin:2px 0!important}.qr-card-head small{font-size:9px!important}.qr-card-head .row-action{font-size:10px!important;padding:6px 8px!important;border-radius:4px!important}
      #personModal.person-ux .qr-preview{display:grid!important;grid-template-columns:104px minmax(0,1fr)!important;gap:10px!important;align-items:center!important}.qr-box{width:104px!important;min-height:104px!important}.qr-box canvas,.qr-box img{max-width:100%!important;height:auto!important}.qr-meta{font-size:9px!important;line-height:1.35!important;color:#73818c!important}

      /* Verifica import in sidebar: leggibile ma non dominante */
      #personModal.person-ux #excelVerifyPanel{width:100%!important;max-width:none!important;margin:0 0 10px!important;border:1px solid #d7dee4!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important;box-shadow:none!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-panel-head{padding:11px 12px!important;background:#fff!important;border-bottom:1px solid #e7ecef!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-panel-head h4{font-size:13px!important;margin:2px 0!important}.excel-verify-panel-head p{font-size:9px!important;line-height:1.3!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-state{font-size:9px!important;padding:4px 6px!important;border-radius:3px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-body{padding:10px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-sources{margin-bottom:7px!important}.excel-verify-source{font-size:8px!important;padding:3px 5px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-compare{display:grid!important;gap:5px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-row{display:grid!important;grid-template-columns:1fr auto!important;gap:4px 7px!important;padding:7px!important;min-height:0!important;border-radius:4px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-row>strong{font-size:9px!important;grid-column:1!important}.excel-verify-match{grid-column:2!important;grid-row:1!important;font-size:8px!important;padding:3px 5px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-value{grid-column:1/-1!important;font-size:9px!important}.excel-verify-value small{font-size:7px!important;margin-bottom:1px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-details{font-size:9px!important}.excel-verify-detail{font-size:9px!important}.excel-verify-warning{font-size:9px!important;padding:7px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-note{font-size:10px!important;min-height:52px!important;border-radius:4px!important}.excel-verify-button{font-size:9px!important;padding:6px 7px!important;border-radius:4px!important}
      #personModal.person-ux .person-verify-toggle{width:calc(100% - 20px);margin:0 10px 10px;border:1px solid #d8e0e6;border-radius:4px;background:#f7f9fa;padding:7px 9px;font:inherit;font-size:9px;font-weight:800;color:#4a5e6d;cursor:pointer}

      /* Footer azioni: unico punto di salvataggio */
      #personModal.person-ux .person-ux-actions{position:sticky;bottom:0;z-index:25;grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:rgba(255,255,255,.97);border:1px solid #d7dee4;border-radius:7px;box-shadow:0 -5px 18px rgba(24,38,49,.06);backdrop-filter:blur(8px)}
      #personModal.person-ux .person-ux-actions-left{min-width:0}.person-ux-actions-left .form-message{margin:0!important;min-height:0!important;font-size:10px!important}
      #personModal.person-ux .person-ux-actions-right{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      #personModal.person-ux .person-ux-actions .btn{min-height:38px!important;padding:8px 13px!important;border-radius:4px!important;font-size:11px!important;font-weight:800!important}
      #personModal.person-ux .person-ux-close{border:1px solid #cbd4db;background:#fff;color:#40535f}
      #personModal.person-ux .danger-zone{margin:10px 0 0!important;padding:9px 0 0!important;border-top:1px solid #e7ecef!important}.danger-button{width:100%!important;border-radius:4px!important;font-size:9px!important;padding:7px!important;background:#fff!important;color:#a02a3c!important;border:1px solid #efcbd1!important}

      /* Rimuove involucri rimasti vuoti dalla vecchia impaginazione */
      #personModal.person-ux .person-form>.form-section-title,#personModal.person-ux .person-form>.form-grid,#personModal.person-ux .person-form>label,#personModal.person-ux .person-form>.switch-grid,#personModal.person-ux .person-form>.qr-card,#personModal.person-ux .person-form>.course-chips,#personModal.person-ux .person-form>.person-save-row,#personModal.person-ux .person-form>.danger-zone,#personModal.person-ux .person-form>.form-message{display:none!important}
      #personModal.person-ux .person-ux-main .form-grid,#personModal.person-ux .person-ux-main label,#personModal.person-ux .person-ux-main .switch-grid,#personModal.person-ux .person-ux-side label,#personModal.person-ux .person-ux-side .switch-row,#personModal.person-ux .person-ux-side .qr-card,#personModal.person-ux .person-ux-actions .form-message{display:block!important}
      #personModal.person-ux .person-ux-side .switch-row{display:flex!important}

      @media(max-width:1050px){
        #personModal.person-ux .person-panel{width:100vw!important;height:100dvh!important;margin:0!important;border-radius:0!important;border:0!important}
        #personModal.person-ux .person-panel-head{border-radius:0!important}
        #personModal.person-ux #personForm.person-ux-form{grid-template-columns:1fr!important}
        #personModal.person-ux .accredit-side.person-ux-side{position:static!important}
      }
      @media(max-width:680px){
        #personModal.person-ux .person-panel-head{padding:11px 12px!important}.person-ux-avatar{width:44px!important;height:44px!important}
        #personModal.person-ux #personModalTitle{font-size:18px!important}.person-ux-header-meta{display:none!important}
        #personModal.person-ux .person-panel-body{padding:9px 8px 76px!important}
        #personModal.person-ux .person-ux-grid{grid-template-columns:1fr!important}.person-ux-grid>label.person-ux-wide{grid-column:auto!important}
        #personModal.person-ux .person-ux-section{padding:12px!important}
        #personModal.person-ux .person-ux-actions{align-items:flex-start!important;flex-direction:column!important}.person-ux-actions-right{width:100%!important}.person-ux-actions .btn{flex:1!important}
      }
    `;
    document.head.appendChild(style);
  }

  function labelFor(id) {
    return $(id)?.closest('label') || null;
  }

  function switchFor(id) {
    return $(id)?.closest('.switch-row') || $(id)?.closest('label') || null;
  }

  function section(id, title, subtitle) {
    const el = document.createElement('section');
    el.id = id;
    el.className = 'person-ux-section';
    el.innerHTML = `<div class="person-ux-section-head"><div><h3>${title}</h3><p>${subtitle}</p></div></div><div class="person-ux-grid"></div>`;
    return el;
  }

  function moveLabel(grid, id, wide = false) {
    const label = labelFor(id);
    if (!label || grid.contains(label)) return;
    if (wide) label.classList.add('person-ux-wide');
    grid.appendChild(label);
  }

  function renameLabel(id, text) {
    const label = labelFor(id);
    if (!label) return;
    const firstText = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (firstText) firstText.textContent = text;
  }

  function createHeaderUx(modal) {
    const titleWrap = modal.querySelector('.person-panel-head>div:first-child');
    if (!titleWrap || titleWrap.querySelector('.person-ux-avatar')) return;
    const avatar = document.createElement('div');
    avatar.className = 'person-ux-avatar';
    avatar.textContent = '—';
    titleWrap.prepend(avatar);
    const meta = document.createElement('div');
    meta.className = 'person-ux-header-meta';
    meta.innerHTML = '<span data-person-meta="cf">CF —</span><span data-person-meta="phone">Tel —</span><span data-person-meta="badge">Badge —</span>';
    titleWrap.appendChild(meta);
  }

  function updateHeaderUx() {
    const modal = $('personModal');
    if (!modal) return;
    const name = String($('personNome')?.value || '').trim();
    const surname = String($('personCognome')?.value || '').trim();
    const initials = `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase() || '—';
    const avatar = modal.querySelector('.person-ux-avatar');
    if (avatar) avatar.textContent = initials;
    const cf = modal.querySelector('[data-person-meta="cf"]');
    const phone = modal.querySelector('[data-person-meta="phone"]');
    const badge = modal.querySelector('[data-person-meta="badge"]');
    if (cf) cf.textContent = `CF ${$('personCf')?.value || '—'}`;
    if (phone) phone.textContent = `Tel ${$('personTelefono')?.value || '—'}`;
    if (badge) badge.textContent = `Badge ${$('personBadgeNumber')?.value || '—'}`;
  }

  function createActionBar(form, message, saveRow) {
    if ($('personUxActions')) return $('personUxActions');
    const bar = document.createElement('div');
    bar.id = 'personUxActions';
    bar.className = 'person-ux-actions';
    const left = document.createElement('div');
    left.className = 'person-ux-actions-left';
    if (message) left.appendChild(message);
    const right = document.createElement('div');
    right.className = 'person-ux-actions-right';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn person-ux-close';
    close.dataset.closePerson = '';
    close.textContent = 'Chiudi';
    right.appendChild(close);
    if (saveRow) {
      const save = saveRow.querySelector('#savePersonButton');
      if (save) right.appendChild(save);
    }
    bar.append(left, right);
    form.appendChild(bar);
    return bar;
  }

  function buildSideGroups(side) {
    if (!side || side.querySelector('#personUxAccreditoGroup')) return;

    const operational = document.createElement('section');
    operational.id = 'personUxOperationalCard';
    operational.className = 'person-ux-side-card';
    const head = side.querySelector('.accredit-side-head');
    const current = side.querySelector('.current-state');
    const entry = $('checkinButton');
    const exit = $('checkoutButton');
    const help = side.querySelector('.accredit-help');
    [head,current,entry,exit,help].forEach(node => { if (node) operational.appendChild(node); });

    const accredito = document.createElement('section');
    accredito.id = 'personUxAccreditoGroup';
    accredito.className = 'person-ux-side-card';
    accredito.innerHTML = '<div class="person-ux-side-title"><strong>Accredito e materiale</strong><span>Operativo</span></div>';
    const badgeLabel = labelFor('personBadgeNumber');
    if (badgeLabel) { badgeLabel.classList.add('person-ux-side-field'); accredito.appendChild(badgeLabel); }
    const switches = document.createElement('div');
    switches.className = 'person-ux-switches';
    ['personBadgeDelivered','personGadgetDelivered','personQrActive'].forEach(id => {
      const row = switchFor(id);
      if (row) switches.appendChild(row);
    });
    accredito.appendChild(switches);

    const qr = document.querySelector('#personForm .qr-card');
    if (qr) qr.classList.add('person-ux-side-card');

    side.appendChild(operational);
    side.appendChild(accredito);
    if (qr) side.appendChild(qr);
  }

  function orderSidebar() {
    if (reorderBusy) return;
    reorderBusy = true;
    requestAnimationFrame(() => {
      const side = document.querySelector('#personModal .accredit-side');
      if (!side) { reorderBusy = false; return; }
      const operational = $('personUxOperationalCard');
      const accredito = $('personUxAccreditoGroup');
      const qr = side.querySelector('.qr-card');
      const verify = $('excelVerifyPanel');
      const danger = side.querySelector('.danger-zone');
      [operational, accredito, qr, verify, danger].forEach(node => { if (node && node.parentElement === side) side.appendChild(node); });
      enhanceVerification();
      reorderBusy = false;
    });
  }

  function enhanceVerification() {
    const panel = $('excelVerifyPanel');
    const body = $('excelVerifyBody');
    if (!panel || !body) return;
    let toggle = panel.querySelector('.person-verify-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'person-verify-toggle';
      const stateText = $('excelVerifyState')?.textContent || '';
      const shouldOpen = /da verificare|errore/i.test(stateText);
      body.hidden = !shouldOpen;
      toggle.textContent = shouldOpen ? 'Nascondi dettaglio verifica' : 'Apri dettaglio verifica';
      toggle.addEventListener('click', () => {
        body.hidden = !body.hidden;
        toggle.textContent = body.hidden ? 'Apri dettaglio verifica' : 'Nascondi dettaglio verifica';
      });
      const head = panel.querySelector('.excel-verify-panel-head');
      head?.insertAdjacentElement('afterend', toggle);
    }
  }

  function moveDynamicDietary() {
    const form = $('personForm');
    const grid = $('personUxContactGrid');
    const control = $('personDietaryPresent');
    if (!form || !grid || !control || grid.contains(control)) return;
    let node = control;
    while (node.parentElement && node.parentElement !== form) node = node.parentElement;
    if (node.parentElement === form) {
      node.classList.add('person-ux-wide');
      grid.appendChild(node);
    }
  }

  function transformPersonSheet() {
    const modal = $('personModal');
    const form = $('personForm');
    const side = modal?.querySelector('.accredit-side');
    if (!modal || !form || !side || form.dataset.personUxReady === '1') return;

    form.dataset.personUxReady = '1';
    modal.classList.add('person-ux');
    form.classList.add('person-ux-form');
    side.classList.add('person-ux-side');
    createHeaderUx(modal);

    renameLabel('personHousingSector', 'Destinazione alloggio');
    renameLabel('personTypes', 'Ruolo / tipologia');

    const main = document.createElement('div');
    main.className = 'person-ux-main';
    main.id = 'personUxMain';

    const profile = section('personUxProfile', 'Dati personali', 'Identità, appartenenza CRI e classificazione della persona.');
    const profileGrid = profile.querySelector('.person-ux-grid');
    profileGrid.id = 'personUxProfileGrid';
    ['personNome','personCognome','personCf','personComitato','personRegione','personComponente'].forEach(id => moveLabel(profileGrid,id));
    moveLabel(profileGrid,'personTypes',true);

    const contacts = section('personUxContacts', 'Contatti e sicurezza', 'Recapiti personali, contatto ICE ed eventuali informazioni utili alla permanenza.');
    const contactGrid = contacts.querySelector('.person-ux-grid');
    contactGrid.id = 'personUxContactGrid';
    ['personTelefono','personEmail','personIceName','personIcePhone'].forEach(id => moveLabel(contactGrid,id));

    const stay = section('personUxStay', 'Permanenza al Campo', 'Alloggio, periodo previsto e note operative della persona.');
    const stayGrid = stay.querySelector('.person-ux-grid');
    stayGrid.id = 'personUxStayGrid';
    ['personHousingSector','personArrival','personDeparture'].forEach(id => moveLabel(stayGrid,id));
    const pernotto = switchFor('personPernotto');
    if (pernotto) { pernotto.classList.add('person-ux-pernotto'); stayGrid.appendChild(pernotto); }
    moveLabel(stayGrid,'personNotes',true);
    const courses = $('personCourses');
    if (courses) { courses.classList.add('person-ux-wide'); stayGrid.appendChild(courses); }

    main.append(profile, contacts, stay);
    form.appendChild(main);

    buildSideGroups(side);
    form.appendChild(side);

    const message = $('personFormMessage');
    const saveRow = $('savePersonButton')?.closest('.person-save-row');
    createActionBar(form, message, saveRow);

    const danger = $('deletePersonButton')?.closest('.danger-zone');
    if (danger) side.appendChild(danger);

    // Rimuove contenitori della vecchia impaginazione rimasti completamente vuoti.
    [...form.children].forEach(node => {
      if (node === main || node === side || node.id === 'personUxActions' || node.matches('input[type=hidden]')) return;
      if ((node.classList.contains('form-grid') || node.classList.contains('switch-grid') || node.classList.contains('form-section-title')) && !node.querySelector('input,select,textarea,button,[id]')) node.remove();
    });

    ['personNome','personCognome','personCf','personTelefono','personBadgeNumber'].forEach(id => $(id)?.addEventListener('input', updateHeaderUx));
    updateHeaderUx();
    moveDynamicDietary();
    orderSidebar();

    formObserver = new MutationObserver(() => {
      moveDynamicDietary();
      orderSidebar();
    });
    formObserver.observe(form, { childList:true, subtree:false });

    sidebarObserver = new MutationObserver(orderSidebar);
    sidebarObserver.observe(side, { childList:true, subtree:false });

    const visibilityObserver = new MutationObserver(() => {
      if (!modal.hidden) setTimeout(() => { updateHeaderUx(); orderSidebar(); }, 40);
    });
    visibilityObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 100; i += 1) {
      if ($('personModal') && $('personForm')) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    transformPersonSheet();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
