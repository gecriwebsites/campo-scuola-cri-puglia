(() => {
  'use strict';

  const STYLE_ID = 'readabilityUxV1Styles';

  function mount() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =====================================================
         READABILITY UX V1 — SCALA TIPOGRAFICA OPERATIVA
         ===================================================== */
      body.reserved-body{font-size:15px!important;line-height:1.45!important}
      #standardWorkspace,#kitchenWorkspace{font-size:14px!important}

      /* Barra alta / navigazione */
      .reserved-brand strong{font-size:14px!important}
      .reserved-brand span,.mini-status-label{font-size:11px!important}
      .mini-status strong{font-size:12px!important}
      #standardWorkspace .app-shell-head h1{font-size:25px!important}
      #standardWorkspace .app-shell-head p{font-size:12px!important}
      #standardWorkspace .app-nav-btn{font-size:12px!important;min-height:38px!important;padding:7px 12px!important}

      /* Titoli e testi di supporto */
      .view-heading h2,.shift-view-head h2,.vehicle-view-head h2,.situation-head h2{font-size:30px!important}
      .view-heading p,.shift-view-head p,.vehicle-view-head p,.situation-head p,.panel-kicker,.kicker{font-size:12px!important;line-height:1.4!important}
      .form-message,.operation-notice{font-size:12px!important}

      /* Campi e pulsanti generali */
      input,select,textarea,button{font-size:13px!important}
      input,select{min-height:40px}
      .btn,.row-action,.icon-btn{font-size:13px!important}

      /* Dashboard */
      .metric-card small,.summary-row span,.module-card small,.module-card em{font-size:12px!important}
      .metric-card strong{font-size:24px!important}
      .module-card strong{font-size:14px!important}

      /* Persone */
      [data-view-panel="persone"].people-ux-view .people-table th{font-size:11px!important}
      [data-view-panel="persone"].people-ux-view .people-table td{font-size:13px!important}
      .people-ux-person strong{font-size:14px!important}
      .people-ux-person small,.people-ux-stack small{font-size:11px!important;line-height:1.35!important}
      .people-ux-stack strong,.people-ux-period{font-size:12px!important}
      .people-ux-chip{font-size:11px!important;min-height:25px!important;padding:4px 7px!important}
      .people-ux-open,.people-ux-accredit{font-size:11px!important;min-height:34px!important}
      .people-ux-stat span,.people-ux-stat small{font-size:11px!important}

      /* Scheda persona */
      #personModal.person-ux .person-ux-section-head h3{font-size:17px!important}
      #personModal.person-ux .person-ux-section-head p{font-size:12px!important}
      #personModal.person-ux .person-ux-grid>label{font-size:12px!important}
      #personModal.person-ux .person-ux-grid .field-input,
      #personModal.person-ux .person-ux-grid .field-textarea{font-size:14px!important}
      #personModal.person-ux .type-check span{font-size:12px!important}
      #personModal.person-ux .course-chip{font-size:11px!important}
      #personModal.person-ux .person-ux-pernotto b{font-size:13px!important}
      #personModal.person-ux .person-ux-pernotto small{font-size:11px!important}
      #personModal.person-ux .accredit-side-head .panel-kicker{font-size:11px!important}
      #personModal.person-ux .accredit-side-head h3{font-size:16px!important}
      #personModal.person-ux .current-state span{font-size:11px!important}
      #personModal.person-ux .current-state small{font-size:11px!important}
      #personModal.person-ux .big-action{font-size:13px!important;min-height:46px!important}
      #personModal.person-ux .accredit-help{font-size:11px!important}
      #personModal.person-ux .person-ux-side-title strong{font-size:13px!important}
      #personModal.person-ux .person-ux-side-title span{font-size:10px!important}
      #personModal.person-ux .person-ux-side-field{font-size:11px!important}
      #personModal.person-ux .person-ux-side-field .field-input{font-size:13px!important}
      #personModal.person-ux .person-ux-switches .switch-row b{font-size:12px!important}
      #personModal.person-ux .person-ux-switches .switch-row small{font-size:10px!important}
      #personModal.person-ux .qr-card-head h4{font-size:14px!important}
      #personModal.person-ux .qr-card-head small,#personModal.person-ux .qr-meta{font-size:10px!important}
      #personModal.person-ux .person-ux-actions .btn{font-size:12px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-panel-head h4{font-size:14px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-panel-head p{font-size:11px!important}
      #personModal.person-ux #excelVerifyPanel .excel-verify-state,
      #personModal.person-ux #excelVerifyPanel .excel-verify-row>strong,
      #personModal.person-ux #excelVerifyPanel .excel-verify-value,
      #personModal.person-ux #excelVerifyPanel .excel-verify-details,
      #personModal.person-ux #excelVerifyPanel .excel-verify-detail,
      #personModal.person-ux .person-verify-toggle{font-size:10px!important}

      /* Accredito rapido */
      #personModal.acc-quick-person .acc-quick-head h3{font-size:17px!important}
      #personModal.acc-quick-person .acc-quick-head p{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-grid>label{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-grid .field-input{font-size:14px!important}
      #personModal.acc-quick-person .acc-quick-course>span{font-size:11px!important}
      #personModal.acc-quick-person .acc-quick-material-card h4{font-size:14px!important}
      #personModal.acc-quick-person .acc-quick-material-grid .switch-row b{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-material-grid .switch-row small{font-size:10px!important}
      #personModal.acc-quick-person .acc-quick-print strong{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-print small{font-size:10px!important}
      #personModal.acc-quick-person .acc-quick-summary>button:first-child{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-summary-item span{font-size:10px!important}
      #personModal.acc-quick-person .acc-quick-summary-item strong{font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-full{font-size:11px!important}
      #personModal.acc-quick-person .acc-quick-accommodation span{font-size:10px!important}
      #personModal.acc-quick-person .acc-quick-accommodation strong{font-size:14px!important}
      #personModal.acc-quick-person .acc-quick-accommodation small{font-size:11px!important}

      /* Accreditamento lista */
      [data-view-panel="accreditamento"].accredit-ux-view .accreditation-heading p{font-size:12px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-person strong{font-size:14px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-person small,
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-meta{font-size:11px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .status-pill,
      [data-view-panel="accreditamento"].accredit-ux-view .work-pill,
      [data-view-panel="accreditamento"].accredit-ux-view .filter-pill{font-size:11px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-open,
      [data-view-panel="accreditamento"].accredit-ux-view .scan-action{font-size:12px!important}

      /* Turni */
      #shiftView.turni-ux .shift-filter-bar label{font-size:11px!important}
      #shiftView.turni-ux .shift-filter-bar input,#shiftView.turni-ux .shift-filter-bar select{font-size:13px!important}
      #shiftView.turni-ux .shift-summary-card small{font-size:11px!important}
      #shiftView.turni-ux .shift-main h4{font-size:14px!important}
      #shiftView.turni-ux .shift-main p{font-size:11px!important}
      #shiftView.turni-ux .shift-main .shift-area{font-size:10px!important}
      #shiftView.turni-ux .shift-time strong{font-size:14px!important}
      #shiftView.turni-ux .shift-time small{font-size:11px!important}
      #shiftView.turni-ux .shift-count small{font-size:10px!important}
      #shiftView.turni-ux .shift-actions button{font-size:11px!important}
      #shiftManageModal.turni-ux-modal .shift-panel-title h3{font-size:16px!important}
      #shiftManageModal.turni-ux-modal .shift-person-top strong{font-size:12px!important}
      #shiftManageModal.turni-ux-modal .shift-person-top small{font-size:10px!important}
      #shiftManageModal.turni-ux-modal .shift-person-note input,
      #shiftManageModal.turni-ux-modal .shift-person-note button,
      #shiftManageModal.turni-ux-modal .shift-remove-person,
      #shiftManageModal.turni-ux-modal .shift-candidate-row button{font-size:11px!important}
      .turni-state-btn,.turni-initial-state-btn{font-size:11px!important;min-height:32px!important}

      /* Alloggi */
      #overnightView .view-heading p{font-size:12px!important}
      #overnightView .overnight-summary-card small{font-size:11px!important}
      #overnightView .tent-title h3{font-size:16px!important}
      #overnightView .tent-title p{font-size:11px!important}
      #overnightView .bed-slot strong{font-size:13px!important}
      #overnightView .bed-slot small{font-size:10px!important}
      #overnightView .bed-badge{font-size:9px!important}
      #overnightView .unassigned-person strong{font-size:13px!important}
      #overnightView .unassigned-person small{font-size:11px!important}

      /* Pasti segreteria */
      [data-view-panel="pasti"] .meals-admin-head p,[data-view-panel="pasti"] .meal-panel-head p{font-size:12px!important}
      [data-view-panel="pasti"] .meal-admin-summary small,
      [data-view-panel="pasti"] .meal-admin-summary-values em{font-size:10px!important}
      [data-view-panel="pasti"] .meal-person-item strong{font-size:13px!important}
      [data-view-panel="pasti"] .meal-person-item small,[data-view-panel="pasti"] .meal-person-item em{font-size:11px!important}
      [data-view-panel="pasti"] .meal-calendar th{font-size:11px!important}
      [data-view-panel="pasti"] .meal-calendar td{font-size:12px!important}
      [data-view-panel="pasti"] .meal-toggle{font-size:11px!important}

      /* Mezzi */
      #vehicleView.vehicle-ux .vehicle-table th{font-size:11px!important}
      #vehicleView.vehicle-ux .vehicle-table td{font-size:13px!important}
      #vehicleView.vehicle-ux .vehicle-name strong{font-size:14px!important}
      #vehicleView.vehicle-ux .vehicle-name small{font-size:11px!important}
      #vehicleView.vehicle-ux .vehicle-presence{font-size:11px!important}
      #vehicleView.vehicle-ux .vehicle-open{font-size:11px!important}
      #vehicleModal.vehicle-ux-modal .vehicle-panel h3{font-size:17px!important}
      #vehicleModal.vehicle-ux-modal .vehicle-grid label,#vehicleModal.vehicle-ux-modal .activation-form label{font-size:12px!important}
      #vehicleModal.vehicle-ux-modal input,#vehicleModal.vehicle-ux-modal textarea{font-size:13px!important}
      #vehicleModal.vehicle-ux-modal .activation-item small,#vehicleModal.vehicle-ux-modal .movement-row small,#vehicleModal.vehicle-ux-modal .driver-row small{font-size:11px!important}

      /* Situazione Campo */
      #situationView.situation-ux .situation-kpi small{font-size:11px!important}
      #situationView.situation-ux .situation-kpi em{font-size:11px!important}
      #situationView.situation-ux .situation-panel h3{font-size:17px!important}
      #situationView.situation-ux .situation-panel>p{font-size:12px!important}
      #situationView.situation-ux .coverage-stat small{font-size:11px!important}
      #situationView.situation-ux .coverage-caption{font-size:11px!important}
      #situationView.situation-ux .shift-situation strong{font-size:13px!important}
      #situationView.situation-ux .shift-situation small{font-size:11px!important}
      #situationView.situation-ux .critical-item strong{font-size:13px!important}
      #situationView.situation-ux .critical-item small{font-size:11px!important}
      #situationView.situation-ux .meal-situation-values em{font-size:10px!important}
      #situationView.situation-ux .situation-quicklink{font-size:12px!important}

      /* Cucina telefono/desktop */
      body[data-app-role="cucina"] .reserved-brand strong{font-size:14px!important}
      body[data-app-role="cucina"] .mini-status-label{font-size:10px!important}
      body[data-app-role="cucina"] .mini-status strong{font-size:12px!important}
      #kitchenWorkspace.kitchen-ux .meal-label{font-size:10px!important}
      #kitchenWorkspace.kitchen-ux .meal-stat small{font-size:10px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-box>label{font-size:11px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result strong{font-size:13px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result small{font-size:11px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head h2{font-size:22px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head p{font-size:12px!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy small{font-size:10px!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy strong{font-size:18px!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy span{font-size:12px!important}
      #kitchenWorkspace.kitchen-ux .meal-use-button{font-size:15px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-privacy-note{font-size:10px!important}

      @media(max-width:900px){
        body.reserved-body{font-size:16px!important}
        input,select,textarea,button{font-size:14px!important}
        #standardWorkspace .app-nav-btn{font-size:13px!important}
      }
      @media(max-width:620px){
        body.reserved-body{font-size:16px!important}
        #kitchenWorkspace.kitchen-ux .meal-stat small{font-size:11px!important}
        #kitchenWorkspace.kitchen-ux .meal-ticket-copy strong{font-size:19px!important}
        #kitchenWorkspace.kitchen-ux .meal-ticket-copy span{font-size:13px!important}
        #kitchenWorkspace.kitchen-ux .meal-use-button{font-size:16px!important;min-height:54px!important}
        #kitchenWorkspace.kitchen-ux .kitchen-search-result strong{font-size:14px!important}
        #kitchenWorkspace.kitchen-ux .kitchen-search-result small{font-size:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  mount();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mount();
      setTimeout(mount, 250);
      setTimeout(mount, 900);
    });
  } else {
    setTimeout(mount, 0);
    setTimeout(mount, 500);
  }
  window.addEventListener('load', () => setTimeout(mount, 80), { once:true });
})();
