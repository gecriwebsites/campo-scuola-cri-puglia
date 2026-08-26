(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let modalObserver = null;
  let workspaceObserver = null;
  let timer = null;

  function accreditationActive() {
    return document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view === 'accreditamento';
  }

  function injectStyles() {
    if ($('modernGestionaleStyles')) return;
    const style = document.createElement('style');
    style.id = 'modernGestionaleStyles';
    style.textContent = `
      :root{--mg-bg:#eef2f5;--mg-surface:#fff;--mg-ink:#17212b;--mg-muted:#61707d;--mg-line:#cfd8df;--mg-line-soft:#e4e9ed;--mg-navy:#112738;--mg-red:#c8102e;--mg-green:#13734c;--mg-warn:#9a6500;--mg-radius:6px}
      html,body,button,input,select,textarea{font-family:"Segoe UI Variable","Segoe UI",Inter,Arial,sans-serif!important}
      body.reserved-body{background:var(--mg-bg)!important;color:var(--mg-ink)!important}
      .reserved-topbar.app-topbar{background:var(--mg-navy)!important;border:0!important;box-shadow:none!important}
      .reserved-topbar .reserved-brand strong,.reserved-topbar .reserved-brand span,.reserved-public-link{color:#fff!important}
      .reserved-statusbar{background:#0c1c28!important;border-top:1px solid rgba(255,255,255,.08)!important;border-bottom:0!important}
      .mini-status{border:0!important;border-radius:0!important;background:transparent!important;color:#d7e0e6!important;padding:8px 12px!important}
      .mini-status strong{color:#fff!important}.mini-status-label{color:#9fb0bd!important}
      #standardWorkspace.reserved-app.container{max-width:none!important;width:100%!important;padding:0 18px 26px!important}
      #standardWorkspace .app-shell-head{background:#fff!important;border:0!important;border-bottom:1px solid var(--mg-line)!important;border-radius:0!important;padding:18px 0 12px!important;margin:0 0 18px!important;box-shadow:none!important}
      #standardWorkspace .app-shell-head h1{font-size:28px!important;font-weight:700!important;letter-spacing:-.02em!important;color:var(--mg-ink)!important}
      #standardWorkspace .app-shell-head p{font-size:12px!important;color:var(--mg-muted)!important}
      #standardWorkspace .app-nav{background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;gap:2px!important;box-shadow:none!important}
      #standardWorkspace .app-nav-btn{border-radius:4px!important;background:transparent!important;color:#43515d!important;min-height:42px!important;padding:9px 13px!important;font-size:13px!important;font-weight:700!important;border:1px solid transparent!important;box-shadow:none!important}
      #standardWorkspace .app-nav-btn:hover{background:#f2f5f7!important;border-color:#e0e6eb!important}
      #standardWorkspace .app-nav-btn.active{background:var(--mg-navy)!important;border-color:var(--mg-navy)!important;color:#fff!important;box-shadow:none!important}
      .ux-nav-icon{font-size:14px!important}.ux-nav-label{font-size:13px!important}
      .kicker,.panel-kicker{font-size:10px!important;font-weight:800!important;letter-spacing:.08em!important;color:var(--mg-red)!important;text-transform:uppercase!important}

      /* Flat surfaces */
      #standardWorkspace .metric-card,#standardWorkspace .dashboard-panel,#standardWorkspace .ix-panel,#standardWorkspace .vehicle-summary-card,#standardWorkspace .shift-summary-card,#standardWorkspace .overnight-summary-card,#standardWorkspace .overnight-side-card,#standardWorkspace .meal-people-panel,#standardWorkspace .meal-calendar-panel,#standardWorkspace .meals-summary-panel,#standardWorkspace .vehicle-panel,#standardWorkspace .shift-card,#standardWorkspace .tent-card{border:1px solid var(--mg-line)!important;border-radius:var(--mg-radius)!important;box-shadow:none!important;background:#fff!important}
      #standardWorkspace .metric-card{padding:14px 16px!important}.metric-card strong{font-size:25px!important}.metric-card small{font-size:11px!important;color:var(--mg-muted)!important}
      #standardWorkspace .data-toolbar,#standardWorkspace .accredit-search-panel,#standardWorkspace .vehicle-toolbar,#standardWorkspace .shift-filter-bar{border:1px solid var(--mg-line)!important;border-radius:var(--mg-radius)!important;box-shadow:none!important;background:#fff!important;padding:10px!important}
      #standardWorkspace input,#standardWorkspace select,#standardWorkspace textarea{border-radius:4px!important;border-color:#bec9d1!important;box-shadow:none!important}
      #standardWorkspace input:focus,#standardWorkspace select:focus,#standardWorkspace textarea:focus{outline:none!important;border-color:#536f82!important;box-shadow:0 0 0 2px rgba(58,91,113,.12)!important}
      .btn,.row-action,.icon-btn,.scan-action,.filter-pill,.vehicle-open,.shift-actions button,.meal-toggle,.mw-btn{border-radius:4px!important;font-weight:700!important;box-shadow:none!important}
      .btn.primary{background:var(--mg-red)!important;border-color:var(--mg-red)!important}.btn.secondary{background:#fff!important;border-color:#bac6cf!important;color:#2c3a44!important}
      .status-pill,.type-pill,.work-pill,.presence-pill{border-radius:3px!important}

      /* Tables use the whole page */
      #standardWorkspace .table-card,#standardWorkspace .vehicle-table-card,#standardWorkspace .ix-table-wrap,#standardWorkspace .meal-calendar-wrap{border:1px solid var(--mg-line)!important;border-radius:0!important;box-shadow:none!important;width:100%!important}
      #standardWorkspace table{font-size:13px!important}
      #standardWorkspace table th{background:#e9eef2!important;color:#40505c!important;font-size:10px!important;font-weight:800!important;border-bottom:1px solid #c8d2da!important}
      #standardWorkspace table td{border-bottom:1px solid #e5eaee!important}
      #standardWorkspace table tbody tr:hover{background:#f7f9fa!important}

      /* Full width editor, professional layout */
      .person-modal{padding:0!important;place-items:stretch!important;background:#e9eef2!important}
      .person-modal-backdrop{display:none!important}
      .person-panel,.new-person-card{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#e9eef2!important;overflow:auto!important}
      .person-panel-head{position:sticky!important;top:0!important;z-index:700!important;background:var(--mg-navy)!important;color:#fff!important;border:0!important;border-radius:0!important;padding:14px 22px!important;box-shadow:none!important}
      .person-panel-head h2{font-size:23px!important;font-weight:700!important;color:#fff!important}.person-panel-head p{font-size:12px!important;color:#c7d3dc!important}.panel-close{border-radius:4px!important;background:rgba(255,255,255,.08)!important;color:#fff!important}
      .person-panel-body{display:grid!important;grid-template-columns:minmax(0,1fr) 390px!important;gap:14px!important;align-items:start!important;width:100%!important;max-width:none!important;padding:16px 18px 78px!important;box-sizing:border-box!important;background:#e9eef2!important}
      .person-form{width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;background:#fff!important;border:1px solid var(--mg-line)!important;border-radius:var(--mg-radius)!important;padding:18px!important;box-sizing:border-box!important}
      .person-form .form-section-title{font-size:14px!important;font-weight:800!important;color:#25343f!important;border-bottom:1px solid var(--mg-line)!important;padding:0 0 8px!important;margin:18px 0 10px!important;text-transform:uppercase!important;letter-spacing:.04em!important}
      .person-form label{font-size:12px!important;font-weight:700!important;color:#354550!important}.field-input,.field-textarea{font-size:14px!important;min-height:44px!important;border-radius:4px!important}.field-textarea{padding:9px!important}
      .switch-grid{gap:8px!important}.switch-row{border:1px solid var(--mg-line-soft)!important;border-radius:4px!important;background:#f8fafb!important;padding:11px!important}.switch-row b{font-size:12px!important}.switch-row small{font-size:10px!important}
      .qr-card{border:1px solid var(--mg-line)!important;border-radius:4px!important;box-shadow:none!important}
      .danger-zone{border-top:1px solid #ebc7ce!important}.danger-button{border-radius:4px!important}

      /* Right column stays INSIDE person sheet */
      #personModal .accredit-side,#modernPersonSidebar{display:block!important;position:sticky!important;top:88px!important;width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;border:1px solid var(--mg-line)!important;border-radius:var(--mg-radius)!important;background:#fff!important;padding:14px!important;overflow:visible!important;box-shadow:none!important}
      #personModal .accredit-side-head h3{font-size:17px!important;margin:4px 0 10px!important}.current-state{border:1px solid var(--mg-line-soft)!important;border-radius:4px!important;background:#f6f8fa!important;padding:12px!important}.current-state strong{font-size:19px!important}.current-state small{font-size:10px!important}
      #personModal .big-action{border-radius:4px!important;min-height:52px!important;font-size:13px!important}
      .modern-side-check{display:grid;gap:6px;margin:0 0 12px}.modern-side-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 9px;border:1px solid var(--mg-line-soft);background:#fafbfc;font-size:11px}.modern-side-row strong{font-size:11px}.modern-side-state{font-weight:800}.modern-side-state.ok{color:var(--mg-green)}.modern-side-state.warn{color:var(--mg-warn)}.modern-side-state.bad{color:#a82137}
      .modern-side-links{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.modern-side-links button{min-height:38px;border:1px solid #c5d0d8;background:#fff;border-radius:4px;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.modern-side-links button:hover{background:#f3f6f8}

      /* Accreditation: no step wizard, one clear screen */
      #personModal.modern-accredit #accSimpleTop,#personModal.modern-accredit #uxAccreditationWizard,#personModal.modern-accredit #uxWizardFooter,#personModal.modern-accredit #acc10Wizard,#personModal.modern-accredit #acc10Footer,#personModal.modern-accredit #acc10SummaryStage{display:none!important}
      #personModal.modern-accredit .person-panel-body{grid-template-columns:minmax(0,1fr) 390px!important}
      #personModal.modern-accredit #acc10VerifyStage{display:block!important;width:100%!important;max-width:none!important;margin:18px 0 0!important;border:1px solid var(--mg-line)!important;border-radius:var(--mg-radius)!important;padding:16px!important;background:#fff!important;box-shadow:none!important}
      #personModal.modern-accredit #acc10VerifyStage .acc10-stage-head{display:block!important;margin:0 0 12px!important;padding-bottom:10px!important;border-bottom:1px solid var(--mg-line-soft)!important}.acc10-stage-head .eyebrow{font-size:10px!important}.acc10-stage-head h3{font-size:20px!important}.acc10-stage-head p{font-size:12px!important}
      #personModal.modern-accredit #acc10PresenceStage{display:none!important}
      #personModal.modern-accredit #acc10MealEditor{display:block!important;border-top:1px solid var(--mg-line)!important;margin-top:18px!important;padding-top:16px!important}
      #personModal.modern-accredit .person-save-row{display:flex!important;justify-content:flex-end!important;margin-top:18px!important}
      #personModal.modern-accredit .danger-zone{display:none!important}
      #personModal.modern-accredit #excelVerifyPanel{width:100%!important;max-width:none!important;overflow:visible!important;border:0!important;background:transparent!important}
      #personModal.modern-accredit #excelVerifyPanel .excel-verify-panel-head{display:none!important}
      #personModal.modern-accredit #excelVerifyPanel .excel-verify-body{padding:0!important}
      #personModal.modern-accredit #excelVerifyPanel .ux-verify-nav,#personModal.modern-accredit #excelVerifyPanel .xve-nav3{display:none!important}
      #personModal.modern-accredit #excelVerifyPanel .excel-verify-compare,#personModal.modern-accredit #excelVerifyPanel .excel-verify-compare.ux-guided{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
      #personModal.modern-accredit #excelVerifyPanel .excel-verify-row,#personModal.modern-accredit #excelVerifyPanel .excel-verify-compare.ux-guided .excel-verify-row{display:grid!important;grid-template-columns:120px minmax(0,1fr) minmax(0,1fr) auto!important;gap:10px!important;min-height:unset!important;padding:12px!important;border:1px solid var(--mg-line-soft)!important;border-radius:4px!important;background:#fff!important}
      #personModal.modern-accredit #excelVerifyPanel .xve-editor{display:grid!important;grid-column:1/-1!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important}
      #personModal.modern-accredit .xve-guide{border-radius:4px!important;background:#f7f9fa!important}

      /* Normal person sheet: verification stays compact in right column */
      #personModal:not(.modern-accredit) .accredit-side #excelVerifyPanel{max-width:100%!important;overflow:hidden!important}
      #personModal:not(.modern-accredit) .accredit-side #excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important;padding:10px!important;min-height:0!important}.accredit-side #excelVerifyPanel .xve-editor{grid-template-columns:1fr!important}.accredit-side #excelVerifyPanel .excel-verify-panel-head{padding:10px!important}.accredit-side #excelVerifyPanel .excel-verify-panel-head h4{font-size:15px!important}.accredit-side #excelVerifyPanel .excel-verify-panel-head p{font-size:10px!important}

      /* Modules */
      #standardWorkspace .vehicle-modal-card,#standardWorkspace .shift-modal-card,.overnight-modal-card,.admin-tools-card{border-radius:0!important;box-shadow:none!important}
      .vehicle-modal-head,.shift-modal-head,.overnight-modal-head,.admin-tools-head{border-radius:0!important}
      .module-grid{display:none!important}
      .modules-head{display:none!important}

      @media(max-width:1050px){.person-panel-body,#personModal.modern-accredit .person-panel-body{grid-template-columns:1fr!important}#personModal .accredit-side,#modernPersonSidebar{position:static!important}.modern-side-links{grid-template-columns:repeat(4,1fr)}}
      @media(max-width:680px){#standardWorkspace.reserved-app.container{padding-left:10px!important;padding-right:10px!important}.person-panel-body{padding-left:8px!important;padding-right:8px!important}.person-form{padding:12px!important}.person-form .form-grid.two{grid-template-columns:1fr!important}.modern-side-links{grid-template-columns:1fr 1fr}#personModal.modern-accredit #excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important}#personModal.modern-accredit #excelVerifyPanel .xve-editor{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function labelNav() {
    const map = {dashboard:'Panoramica',persone:'Persone',accreditamento:'Accredito',turni:'Turni',pernottamenti:'Alloggi',pasti:'Pasti',mezzi:'Mezzi',situazione:'Situazione','situazione-campo':'Situazione','import-excel':'Import Master'};
    document.querySelectorAll('#standardWorkspace .app-nav-btn').forEach(btn => {
      const name = map[btn.dataset.view]; if (!name) return;
      const label = btn.querySelector('.ux-nav-label'); if (label) label.textContent = name; else btn.textContent = name;
    });
  }

  function removeObsoleteDashboard() {
    document.querySelector('[data-view-panel="dashboard"] .modules-head')?.remove();
    document.querySelector('[data-view-panel="dashboard"] .module-grid')?.remove();
  }

  function ensureSidebarExtras(side) {
    if (!side || $('modernSidebarExtras')) return;
    const box = document.createElement('div');
    box.id = 'modernSidebarExtras';
    box.innerHTML = `<div class="panel-kicker">Controllo rapido</div><div id="modernSideCheck" class="modern-side-check"></div><div class="modern-side-links"><button type="button" data-modern-scroll="personForm">Dati</button><button type="button" data-modern-scroll="acc10VerifyStage">Verifica</button><button type="button" data-modern-scroll="acc10MealEditor">Pasti</button><button type="button" data-modern-scroll="personPresenceState">Presenza</button></div>`;
    side.insertBefore(box, side.firstChild);
    box.addEventListener('click', event => {
      const btn = event.target.closest('[data-modern-scroll]'); if (!btn) return;
      const target = $(btn.dataset.modernScroll) || document.querySelector(`#personModal #${CSS.escape(btn.dataset.modernScroll)}`);
      target?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  function moveVerification(accredit) {
    const panel = $('excelVerifyPanel');
    const form = $('personForm');
    const side = document.querySelector('#personModal .accredit-side');
    const verifyStage = $('acc10VerifyStage');
    if (!panel || !form || !side) return;
    if (accredit) {
      let host = $('modernVerifyHost');
      if (!host) {
        host = document.createElement('section');
        host.id = 'modernVerifyHost';
        host.className = 'acc10-stage';
        host.innerHTML = `<div class="acc10-stage-head"><div><div class="eyebrow">Verifica import</div><h3>Controllo dati importati</h3><p>Correggi qui i dati che non coincidono. I campi mancanti restano sempre modificabili manualmente.</p></div></div><div id="modernVerifyPanelHost"></div>`;
        const campTitle = [...form.querySelectorAll(':scope > .form-section-title')].find(el => /campo/i.test(el.textContent || ''));
        form.insertBefore(host, campTitle || form.querySelector('.person-save-row') || null);
      }
      $('modernVerifyPanelHost')?.appendChild(panel);
      if (verifyStage) verifyStage.hidden = true;
    } else {
      side.insertBefore(panel, side.querySelector('.current-state') || side.firstChild);
      $('modernVerifyHost')?.remove();
    }
  }

  function restorePresence(side) {
    const presenceStage = $('acc10PresenceStage');
    const stagedSide = presenceStage?.querySelector('.accredit-side');
    const body = document.querySelector('#personModal .person-panel-body');
    if (stagedSide && body && stagedSide !== side) side = stagedSide;
    if (side && body && side.parentElement !== body) body.appendChild(side);
    if (presenceStage) presenceStage.hidden = true;
    return side;
  }

  function updateChecklist() {
    const host = $('modernSideCheck'); if (!host) return;
    const nameOk = !!textVal('personNome') && !!textVal('personCognome');
    const verify = $('excelVerifyState')?.textContent || '';
    const verifyNeeded = $('excelVerifyPanel') && !$('excelVerifyPanel').hidden;
    const verifyOk = !verifyNeeded || /verificato/i.test(verify);
    const badge = !!$('personBadgeDelivered')?.checked;
    const present = /PRESENTE/i.test($('personPresenceState')?.textContent || '');
    const rows = [
      ['Anagrafica',nameOk?'OK':'Da completare',nameOk?'ok':'warn'],
      ['Import Excel',verifyOk?'OK':'Da verificare',verifyOk?'ok':'warn'],
      ['Badge',badge?'Consegnato':'Non consegnato',badge?'ok':'warn'],
      ['Presenza',present?'Presente':'Fuori',present?'ok':'warn']
    ];
    host.innerHTML = rows.map(([a,b,c])=>`<div class="modern-side-row"><strong>${a}</strong><span class="modern-side-state ${c}">${b}</span></div>`).join('');
  }

  function textVal(id){return String($(id)?.value || '').trim();}

  function organizePersonModal() {
    const modal = $('personModal');
    const body = modal?.querySelector('.person-panel-body');
    const form = $('personForm');
    let side = modal?.querySelector('.accredit-side');
    if (!modal || !body || !form || modal.hidden) return;
    const accredit = accreditationActive();
    modal.classList.toggle('modern-accredit', accredit);
    modal.classList.remove('acc10-active');
    side = restorePresence(side);
    if (side) ensureSidebarExtras(side);
    moveVerification(accredit);
    if ($('accSimpleTop')) $('accSimpleTop').hidden = true;
    if ($('acc10Wizard')) $('acc10Wizard').hidden = true;
    if ($('uxAccreditationWizard')) $('uxAccreditationWizard').hidden = true;
    if ($('uxWizardFooter')) $('uxWizardFooter').hidden = true;
    if ($('acc10Footer')) $('acc10Footer').hidden = true;
    if ($('acc10SummaryStage')) $('acc10SummaryStage').hidden = true;
    if ($('acc10MealEditor')) $('acc10MealEditor').style.display = accredit ? 'block' : '';
    updateChecklist();
  }

  function scheduleOrganize() {
    clearTimeout(timer);
    timer = setTimeout(() => { labelNav(); removeObsoleteDashboard(); organizePersonModal(); }, 70);
  }

  function bind() {
    const modal = $('personModal');
    if (modal && !modalObserver) {
      modalObserver = new MutationObserver(scheduleOrganize);
      modalObserver.observe(modal,{attributes:true,attributeFilter:['hidden','class'],childList:true,subtree:true});
    }
    const workspace = $('standardWorkspace');
    if (workspace && !workspaceObserver) {
      workspaceObserver = new MutationObserver(scheduleOrganize);
      workspaceObserver.observe(workspace,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    }
    document.addEventListener('click', event => {
      if (event.target.closest('.app-nav-btn,[data-person-id]')) setTimeout(scheduleOrganize,120);
    });
    document.addEventListener('input', event => { if (event.target.closest('#personModal')) updateChecklist(); });
    document.addEventListener('change', event => { if (event.target.closest('#personModal')) updateChecklist(); });
  }

  async function init(){
    injectStyles();
    for(let i=0;i<120;i++){if($('standardWorkspace')&&$('personModal'))break;await new Promise(r=>setTimeout(r,80));}
    labelNav(); removeObsoleteDashboard(); bind(); scheduleOrganize();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
