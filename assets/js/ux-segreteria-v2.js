(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const NAV_META = {
    dashboard: ['⌂', 'Home'],
    persone: ['👥', 'Persone'],
    accreditamento: ['✓', 'Accredita'],
    turni: ['🗓', 'Turni'],
    pasti: ['🍽', 'Pasti'],
    pernottamenti: ['⛺', 'Alloggi'],
    mezzi: ['🚑', 'Mezzi'],
    situazione: ['▦', 'Situazione'],
    'situazione-campo': ['▦', 'Situazione'],
    'import-excel': ['⇩', 'Import Excel']
  };

  const WIZARD_STEPS = [
    { id: 1, label: 'Dati persona', short: 'Dati' },
    { id: 2, label: 'Verifica Excel', short: 'Verifica' },
    { id: 3, label: 'Badge, alloggio e pasti', short: 'Servizi' },
    { id: 4, label: 'Entrata / uscita', short: 'Presenza' }
  ];

  let wizardStep = 1;
  let formObserver = null;
  let modalObserver = null;
  let verificationObserver = null;
  let verifyEnhanceTimer = null;

  function injectStyles() {
    if ($('uxSegreteriaV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'uxSegreteriaV2Styles';
    style.textContent = `
      /* =====================================================
         UX V2 - PIU SPAZIO, MENO CARD, NAVIGAZIONE UNICA
         ===================================================== */
      :root{--ux-page-pad:clamp(12px,1.7vw,28px);--ux-soft:#f6f7f8;--ux-border:#e4e7ea;--ux-text:#202428}
      .reserved-main.app-main{padding-left:0!important;padding-right:0!important}
      #standardWorkspace.reserved-app.container{width:100%!important;max-width:none!important;margin:0!important;padding-left:var(--ux-page-pad)!important;padding-right:var(--ux-page-pad)!important;box-sizing:border-box}
      #standardWorkspace .app-view{width:100%;max-width:none;margin:0}

      /* Menu alto: barra compatta, non card duplicate */
      #standardWorkspace .app-shell-head{display:grid!important;grid-template-columns:minmax(180px,auto) minmax(0,1fr)!important;gap:22px!important;align-items:end!important;margin-bottom:16px!important}
      #standardWorkspace .app-shell-head>div:first-child h1{font-size:clamp(24px,2.3vw,34px)!important;margin:2px 0!important}
      #standardWorkspace .app-shell-head>div:first-child p{margin:2px 0 0!important;font-size:11px!important}
      #standardWorkspace .app-nav{display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:2px!important;background:#eef0f2!important;border:1px solid #e0e3e6!important;border-radius:13px!important;padding:4px!important;box-shadow:none!important;overflow-x:auto!important;white-space:nowrap!important;scrollbar-width:none}
      #standardWorkspace .app-nav::-webkit-scrollbar{display:none}
      #standardWorkspace .app-nav-btn{display:inline-flex!important;align-items:center!important;gap:6px!important;min-height:38px!important;padding:7px 10px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:#555d64!important;font-size:10px!important;font-weight:850!important;box-shadow:none!important;flex:0 0 auto!important}
      #standardWorkspace .app-nav-btn:hover{background:#fff!important;color:#222!important}
      #standardWorkspace .app-nav-btn.active{background:#fff!important;color:#b40000!important;box-shadow:0 1px 4px rgba(20,20,20,.08)!important}
      .ux-nav-icon{font-size:13px;line-height:1}.ux-nav-label{line-height:1}

      /* Dashboard: niente seconda griglia che replica il menu */
      #standardWorkspace [data-view-panel="dashboard"] .modules-head,
      #standardWorkspace [data-view-panel="dashboard"] .module-grid{display:none!important}
      #standardWorkspace [data-view-panel="dashboard"] .metric-grid{margin-bottom:12px!important}
      #standardWorkspace [data-view-panel="dashboard"] .metric-card{border:0!important;border-left:3px solid #e4e7ea!important;border-radius:8px!important;box-shadow:none!important;background:#fff!important;padding:13px 15px!important}
      #standardWorkspace [data-view-panel="dashboard"] .metric-card.live{border-left-color:#1a7c53!important}
      #standardWorkspace [data-view-panel="dashboard"] .dashboard-action-grid{grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr)!important;gap:12px!important}
      #standardWorkspace [data-view-panel="dashboard"] .dashboard-panel{border:0!important;border-radius:10px!important;box-shadow:none!important;background:#fff!important;padding:18px!important}

      /* Titoli / toolbar piu lineari */
      #standardWorkspace .view-heading,
      #standardWorkspace .vehicle-view-head,
      #standardWorkspace .shift-view-head,
      #standardWorkspace .meals-admin-head,
      #standardWorkspace .ix-head{margin:8px 0 14px!important;padding:0!important}
      #standardWorkspace .view-heading h2,
      #standardWorkspace .vehicle-view-head h2,
      #standardWorkspace .shift-view-head h2,
      #standardWorkspace .meals-admin-head h2,
      #standardWorkspace .ix-head h2{font-size:clamp(25px,2.6vw,36px)!important}

      /* Tabelle a piena larghezza */
      #standardWorkspace .table-card,
      #standardWorkspace .vehicle-table-card,
      #standardWorkspace .ix-table-wrap{width:100%!important;max-width:none!important;border-left:0!important;border-right:0!important;border-radius:0!important;box-shadow:none!important}
      #standardWorkspace .people-table-wrap,
      #standardWorkspace .vehicle-table-wrap,
      #standardWorkspace .ix-table-wrap{width:100%!important;overflow:auto!important}
      #standardWorkspace .people-table,
      #standardWorkspace .vehicle-table,
      #standardWorkspace .ix-table{width:100%!important}
      #standardWorkspace .data-toolbar,
      #standardWorkspace .vehicle-toolbar,
      #standardWorkspace .shift-filter-bar{border-left:0!important;border-right:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important}

      /* Moduli: sfrutta tutta la pagina, bordi solo dove servono */
      #standardWorkspace .meals-summary-panel,
      #standardWorkspace .meal-people-panel,
      #standardWorkspace .meal-calendar-panel,
      #standardWorkspace .shift-card,
      #standardWorkspace .tent-card,
      #standardWorkspace .overnight-side-card,
      #standardWorkspace .vehicle-panel,
      #standardWorkspace .ix-panel{box-shadow:none!important}
      #standardWorkspace .meals-admin-grid{grid-template-columns:minmax(260px,.28fr) minmax(0,.72fr)!important;gap:12px!important}
      #standardWorkspace .overnight-layout{grid-template-columns:minmax(0,1fr) 280px!important}
      #standardWorkspace .ix-layout{grid-template-columns:minmax(0,1fr) 265px!important}

      /* Editor/modal a pagina intera */
      .person-modal,
      .shift-modal,
      .vehicle-modal,
      .overnight-modal,
      .admin-tools-modal{padding:0!important;place-items:stretch!important}
      .person-panel,
      .new-person-card,
      .shift-modal-card,
      .shift-modal-card.large,
      .vehicle-modal-card,
      .overnight-modal-card,
      .admin-tools-card{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;box-sizing:border-box!important}
      .person-panel,.new-person-card,.shift-modal-card,.overnight-modal-card,.admin-tools-card{overflow:auto!important}
      .vehicle-modal-card{overflow:auto!important}
      .person-panel-head,.vehicle-modal-head,.shift-modal-head,.overnight-modal-head,.admin-tools-head{position:sticky!important;top:0!important;z-index:20!important;background:#fff!important;border-bottom:1px solid var(--ux-border)!important;padding:14px var(--ux-page-pad)!important}
      .person-panel-body{padding:0 var(--ux-page-pad) 88px!important;max-width:none!important}
      .person-form{max-width:none!important}
      .person-form .form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
      .person-form .field-input,.person-form .field-textarea{box-sizing:border-box}

      /* Wizard accredito */
      .ux-wizard-bar{position:sticky;top:68px;z-index:18;background:#fff;border-bottom:1px solid var(--ux-border);padding:8px var(--ux-page-pad);display:flex;align-items:center;gap:7px;overflow-x:auto;scrollbar-width:none}
      .ux-wizard-bar::-webkit-scrollbar{display:none}
      .ux-wizard-step{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:#7a8187;padding:7px 10px;border-radius:9px;font:inherit;font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}
      .ux-wizard-step .num{width:21px;height:21px;border-radius:50%;display:grid;place-items:center;background:#e9ecef;color:#667078;font-size:9px}
      .ux-wizard-step.active{background:#fff1f1;color:#a50000}.ux-wizard-step.active .num{background:#c90000;color:#fff}
      .ux-wizard-step.done{color:#176b47}.ux-wizard-step.done .num{background:#dff3e8;color:#176b47}
      .ux-wizard-sep{width:18px;height:1px;background:#dfe3e6;flex:0 0 18px}
      .ux-wizard-context{margin-left:auto;font-size:9px;font-weight:800;color:#7a8187;white-space:nowrap}
      .person-panel-body.ux-wizard-active{display:block!important}
      .person-panel-body.ux-wizard-active .person-form{display:block!important}
      .person-panel-body.ux-wizard-active .accredit-side{display:none!important}
      .person-panel-body.ux-wizard-active .ux-step-item{display:none!important}
      .person-panel-body.ux-wizard-active .ux-step-item.ux-step-active{display:grid!important}
      .person-panel-body.ux-wizard-active label.ux-step-item.ux-step-active{display:block!important}
      .person-panel-body.ux-wizard-active .form-section-title.ux-step-active{display:block!important}
      .person-panel-body.ux-wizard-active .qr-card.ux-step-active{display:block!important}
      .person-panel-body.ux-wizard-active .danger-zone.ux-step-active{display:block!important}
      .person-panel-body.ux-wizard-active .person-save-row{display:none!important}
      .person-panel-body.ux-wizard-active .accredit-side.ux-side-active{display:block!important;width:100%!important;max-width:none!important;padding:0!important;margin:0!important}
      .person-panel-body.ux-wizard-active .accredit-side .ux-side-step{display:none!important}
      .person-panel-body.ux-wizard-active .accredit-side .ux-side-step.ux-step-active{display:block!important}
      .ux-wizard-manual{padding:22px;border:1px dashed #d6dade;border-radius:12px;background:#fafbfc;color:#656d74;font-size:12px;line-height:1.5}
      .ux-wizard-footer{position:fixed;left:0;right:0;bottom:0;z-index:310;background:rgba(255,255,255,.97);border-top:1px solid var(--ux-border);padding:10px var(--ux-page-pad);display:flex;align-items:center;justify-content:space-between;gap:10px;backdrop-filter:blur(8px)}
      .ux-wizard-footer[hidden]{display:none!important}
      .ux-wizard-footer .ux-step-info{font-size:10px;color:#6b737a;font-weight:800}
      .ux-wizard-footer .ux-actions{display:flex;gap:8px;align-items:center}
      .ux-wizard-btn{border:1px solid #d6dade;background:#fff;border-radius:10px;padding:9px 13px;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      .ux-wizard-btn.primary{background:#c90000;border-color:#c90000;color:#fff}.ux-wizard-btn:disabled{opacity:.4;cursor:not-allowed}

      /* Verifica Excel step-by-step */
      .excel-verify-panel{border-radius:10px!important;box-shadow:none!important;width:100%!important}
      .excel-verify-body{padding:16px!important}
      .excel-verify-compare.ux-guided .excel-verify-row{display:none!important;grid-template-columns:120px minmax(0,1fr) minmax(0,1fr) auto!important;padding:15px!important;min-height:90px!important}
      .excel-verify-compare.ux-guided .excel-verify-row.ux-verify-current{display:grid!important}
      .ux-verify-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 2px;padding:9px 0;border-top:1px solid #edf0f2}
      .ux-verify-nav span{font-size:10px;font-weight:850;color:#677078}
      .ux-verify-nav div{display:flex;gap:6px}
      .ux-verify-nav button{border:1px solid #d6dade;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:9px;font-weight:900;cursor:pointer}
      .ux-verify-nav button.primary{background:#202428;color:#fff;border-color:#202428}
      .excel-verify-details.ux-unreviewed{display:none!important}

      /* Accreditamento lista piu leggibile */
      .accredit-search-panel{border-left:0!important;border-right:0!important;border-radius:0!important;box-shadow:none!important}
      .accredit-row{border-left:0!important;border-right:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}

      @media(max-width:1000px){
        #standardWorkspace .app-shell-head{grid-template-columns:1fr!important;align-items:start!important}
        #standardWorkspace .app-nav{justify-content:flex-start!important}
        #standardWorkspace [data-view-panel="dashboard"] .dashboard-action-grid{grid-template-columns:1fr!important}
        #standardWorkspace .meals-admin-grid,#standardWorkspace .overnight-layout,#standardWorkspace .ix-layout{grid-template-columns:1fr!important}
      }
      @media(max-width:700px){
        :root{--ux-page-pad:10px}
        #standardWorkspace .app-nav-btn{padding:7px 9px!important}.ux-nav-label{font-size:9px}
        .ux-wizard-context{display:none}.ux-wizard-sep{width:7px;flex-basis:7px}
        .ux-wizard-step{padding:6px}.ux-wizard-step .label{display:none}.ux-wizard-step.active .label{display:inline}
        .person-form .form-grid.two{grid-template-columns:1fr!important}
        .excel-verify-compare.ux-guided .excel-verify-row{grid-template-columns:1fr!important}.excel-verify-match{justify-self:start}
        .ux-wizard-footer{align-items:flex-start}.ux-wizard-footer .ux-actions{flex-wrap:wrap;justify-content:flex-end}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceNav() {
    const nav = document.querySelector('#standardWorkspace .app-nav');
    if (!nav) return;
    nav.querySelectorAll('.app-nav-btn').forEach(button => {
      const view = button.dataset.view || '';
      const meta = NAV_META[view] || ['•', button.textContent.trim() || view];
      if (button.dataset.uxNavEnhanced === '1') return;
      button.dataset.uxNavEnhanced = '1';
      button.title = meta[1];
      button.innerHTML = `<span class="ux-nav-icon" aria-hidden="true">${meta[0]}</span><span class="ux-nav-label">${meta[1]}</span>`;
    });
  }

  function simplifyDashboard() {
    const dashboard = document.querySelector('[data-view-panel="dashboard"]');
    if (!dashboard) return;
    dashboard.querySelector('.modules-head')?.setAttribute('aria-hidden', 'true');
    dashboard.querySelector('.module-grid')?.setAttribute('aria-hidden', 'true');
  }

  function assignFormSteps() {
    const form = $('personForm');
    if (!form) return;

    const children = [...form.children];
    let current = 1;
    children.forEach(child => {
      if (child.matches('input[type="hidden"]')) return;
      if (child.classList.contains('form-section-title')) {
        const title = (child.textContent || '').trim().toLocaleLowerCase('it');
        if (title.includes('campo')) current = 3;
        else current = 1;
      }
      if (child.classList.contains('person-save-row')) return;
      if (child.classList.contains('danger-zone')) current = 4;
      child.classList.add('ux-step-item');
      child.dataset.uxStep = String(current);
    });

    // Elementi alimentari aggiunti dinamicamente: mettili nei servizi.
    children.forEach(child => {
      const text = (child.textContent || '').toLocaleLowerCase('it');
      const ids = [...child.querySelectorAll('[id]')].map(el => el.id.toLocaleLowerCase('it')).join(' ');
      if (/allerg|intoller|aliment|diet/.test(`${text} ${ids}`)) child.dataset.uxStep = '3';
    });
  }

  function assignSideSteps() {
    const side = document.querySelector('#personModal .accredit-side');
    if (!side) return;
    [...side.children].forEach(child => {
      child.classList.add('ux-side-step');
      if (child.id === 'excelVerifyPanel') child.dataset.uxStep = '2';
      else child.dataset.uxStep = '4';
    });

    let manual = $('uxManualVerification');
    if (!manual) {
      manual = document.createElement('div');
      manual.id = 'uxManualVerification';
      manual.className = 'ux-wizard-manual ux-side-step';
      manual.dataset.uxStep = '2';
      manual.textContent = 'Se questa persona è stata inserita manualmente, non ci sono dati Excel da confrontare. Puoi passare direttamente al passo successivo.';
      side.insertBefore(manual, side.firstChild);
    }
  }

  function buildWizard() {
    const modal = $('personModal');
    const panel = modal?.querySelector('.person-panel');
    const body = panel?.querySelector('.person-panel-body');
    if (!panel || !body || $('uxAccreditationWizard')) return;

    const bar = document.createElement('div');
    bar.id = 'uxAccreditationWizard';
    bar.className = 'ux-wizard-bar';
    bar.hidden = true;
    bar.innerHTML = WIZARD_STEPS.map((step, index) => `${index ? '<span class="ux-wizard-sep" aria-hidden="true"></span>' : ''}<button type="button" class="ux-wizard-step" data-ux-go-step="${step.id}"><span class="num">${step.id}</span><span class="label">${step.label}</span></button>`).join('') + '<span class="ux-wizard-context">Accreditamento guidato</span>';
    panel.insertBefore(bar, body);

    const footer = document.createElement('div');
    footer.id = 'uxWizardFooter';
    footer.className = 'ux-wizard-footer';
    footer.hidden = true;
    footer.innerHTML = `<span id="uxWizardStepInfo" class="ux-step-info">Passo 1 di 4</span><div class="ux-actions"><button id="uxWizardBack" class="ux-wizard-btn" type="button">← Indietro</button><button id="uxWizardNext" class="ux-wizard-btn primary" type="button">Salva e avanti →</button></div>`;
    panel.appendChild(footer);

    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-ux-go-step]');
      if (!button) return;
      goWizardStep(Number(button.dataset.uxGoStep));
    });
    $('uxWizardBack')?.addEventListener('click', () => goWizardStep(wizardStep - 1));
    $('uxWizardNext')?.addEventListener('click', handleWizardNext);

    assignFormSteps();
    assignSideSteps();

    formObserver = new MutationObserver(() => {
      assignFormSteps();
      assignSideSteps();
      applyWizardStep();
    });
    formObserver.observe($('personForm'), { childList: true, subtree: false });

    modalObserver = new MutationObserver(() => onModalVisibilityChanged());
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  function accreditationIsActive() {
    return document.querySelector('.app-nav-btn.active')?.dataset.view === 'accreditamento';
  }

  function onModalVisibilityChanged() {
    const modal = $('personModal');
    if (!modal || modal.hidden) {
      disableWizard();
      return;
    }
    if (accreditationIsActive()) enableWizard();
    else disableWizard();
  }

  function enableWizard() {
    const body = $('personModal')?.querySelector('.person-panel-body');
    if (!body) return;
    body.classList.add('ux-wizard-active');
    $('uxAccreditationWizard').hidden = false;
    $('uxWizardFooter').hidden = false;
    wizardStep = 1;
    assignFormSteps();
    assignSideSteps();
    applyWizardStep();
  }

  function disableWizard() {
    const body = $('personModal')?.querySelector('.person-panel-body');
    body?.classList.remove('ux-wizard-active');
    if ($('uxAccreditationWizard')) $('uxAccreditationWizard').hidden = true;
    if ($('uxWizardFooter')) $('uxWizardFooter').hidden = true;
    document.querySelectorAll('#personModal .ux-step-item,#personModal .ux-side-step').forEach(el => el.classList.remove('ux-step-active'));
    document.querySelector('#personModal .accredit-side')?.classList.remove('ux-side-active');
  }

  function goWizardStep(step) {
    wizardStep = Math.max(1, Math.min(WIZARD_STEPS.length, step));
    applyWizardStep();
    $('personModal')?.querySelector('.person-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyWizardStep() {
    const body = $('personModal')?.querySelector('.person-panel-body');
    if (!body?.classList.contains('ux-wizard-active')) return;

    document.querySelectorAll('#personModal .ux-step-item').forEach(el => {
      el.classList.toggle('ux-step-active', Number(el.dataset.uxStep) === wizardStep);
    });

    const side = document.querySelector('#personModal .accredit-side');
    let sideVisible = false;
    side?.querySelectorAll(':scope > .ux-side-step').forEach(el => {
      const shouldShow = Number(el.dataset.uxStep) === wizardStep;
      // Nel passo verifica, il placeholder compare solo se il pannello Excel non è visibile.
      let visible = shouldShow;
      if (el.id === 'uxManualVerification') {
        const excel = $('excelVerifyPanel');
        visible = shouldShow && (!excel || excel.hidden);
      }
      el.classList.toggle('ux-step-active', visible);
      if (visible) sideVisible = true;
    });
    side?.classList.toggle('ux-side-active', sideVisible);

    document.querySelectorAll('#uxAccreditationWizard .ux-wizard-step').forEach(button => {
      const step = Number(button.dataset.uxGoStep);
      button.classList.toggle('active', step === wizardStep);
      button.classList.toggle('done', step < wizardStep);
    });

    const info = $('uxWizardStepInfo');
    if (info) info.textContent = `Passo ${wizardStep} di ${WIZARD_STEPS.length} · ${WIZARD_STEPS[wizardStep - 1].label}`;
    const back = $('uxWizardBack');
    if (back) back.disabled = wizardStep === 1;
    const next = $('uxWizardNext');
    if (next) next.textContent = wizardStep === WIZARD_STEPS.length ? 'Termina e chiudi ✓' : (wizardStep === 2 ? 'Avanti →' : 'Salva e avanti →');

    if (wizardStep === 2) setTimeout(enhanceVerificationGuide, 80);
  }

  function handleWizardNext() {
    if (wizardStep === WIZARD_STEPS.length) {
      $('personModal')?.querySelector('[data-close-person]')?.click();
      return;
    }

    if (wizardStep === 2) {
      const state = $('excelVerifyState');
      if (state && !state.closest('[hidden]') && state.textContent.includes('Da verificare')) {
        if (!window.confirm('La verifica dei dati Excel risulta ancora aperta. Vuoi passare comunque al passo successivo? Potrai tornare indietro.')) return;
      }
      goWizardStep(3);
      return;
    }

    // Salva i dati correnti usando la logica già esistente del gestionale.
    $('savePersonButton')?.click();
    setTimeout(() => goWizardStep(wizardStep + 1), 220);
  }

  function enhanceVerificationGuide() {
    const compare = document.querySelector('#excelVerifyBody .excel-verify-compare');
    if (!compare) return;
    const rows = [...compare.querySelectorAll(':scope > .excel-verify-row')];
    if (!rows.length) return;

    let nav = compare.parentElement?.querySelector(':scope > .ux-verify-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'ux-verify-nav';
      compare.insertAdjacentElement('afterend', nav);
    }

    compare.classList.add('ux-guided');
    let index = Math.min(Number(compare.dataset.uxVerifyIndex || 0), rows.length - 1);

    function render() {
      rows.forEach((row, i) => row.classList.toggle('ux-verify-current', i === index));
      compare.dataset.uxVerifyIndex = String(index);
      nav.innerHTML = `<span>Controllo ${index + 1} di ${rows.length}</span><div><button type="button" data-ux-verify-prev ${index === 0 ? 'disabled' : ''}>← Indietro</button><button type="button" class="primary" data-ux-verify-next>${index === rows.length - 1 ? 'Riepilogo ✓' : 'Dato successivo →'}</button></div>`;
      const details = compare.parentElement?.querySelector('.excel-verify-details');
      details?.classList.toggle('ux-unreviewed', index < rows.length - 1);
    }

    if (nav.dataset.uxBound !== '1') {
      nav.dataset.uxBound = '1';
      nav.addEventListener('click', event => {
        if (event.target.closest('[data-ux-verify-prev]')) index = Math.max(0, index - 1);
        if (event.target.closest('[data-ux-verify-next]')) index = Math.min(rows.length - 1, index + 1);
        render();
      });
    }
    render();
  }

  function watchVerificationPanel() {
    const target = $('excelVerifyBody');
    if (!target || verificationObserver) return;
    verificationObserver = new MutationObserver(() => {
      clearTimeout(verifyEnhanceTimer);
      verifyEnhanceTimer = setTimeout(() => {
        assignSideSteps();
        applyWizardStep();
        enhanceVerificationGuide();
      }, 50);
    });
    verificationObserver.observe(target, { childList: true, subtree: true });
  }

  function globalEnhanceObserver() {
    const workspace = $('standardWorkspace');
    if (!workspace) return;
    const observer = new MutationObserver(() => {
      enhanceNav();
      simplifyDashboard();
      if (!$('uxAccreditationWizard')) buildWizard();
      if (!verificationObserver) watchVerificationPanel();
    });
    observer.observe(workspace, { childList: true, subtree: true });
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 100; i += 1) {
      if ($('standardWorkspace') && $('personModal')) break;
      await sleep(80);
    }
    enhanceNav();
    simplifyDashboard();
    buildWizard();
    watchVerificationPanel();
    globalEnhanceObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
