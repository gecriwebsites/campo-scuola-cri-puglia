(() => {
  'use strict';
  if (document.getElementById('readabilitySafeV2Styles')) return;

  const style = document.createElement('style');
  style.id = 'readabilitySafeV2Styles';
  style.textContent = `
    /* =====================================================
       READABILITY SAFE V2 — SOLO TIPOGRAFIA/SPAZIATURA
       Nessun overlay, observer o pointer-events.
       ===================================================== */

    /* Barra alta e navigazione */
    #standardWorkspace .app-shell-head h1{font-size:25px!important}
    #standardWorkspace .app-shell-head p{font-size:12px!important;line-height:1.4!important}
    #standardWorkspace .app-nav-btn{font-size:12px!important;min-height:38px!important;padding:7px 12px!important}
    .reserved-brand strong{font-size:14px!important}
    .reserved-brand span,.mini-status-label{font-size:11px!important}
    .mini-status strong{font-size:12px!important}

    /* Dashboard */
    #standardWorkspace [data-view-panel="dashboard"] .metric-card small{font-size:11px!important}
    #standardWorkspace [data-view-panel="dashboard"] .module-card strong{font-size:14px!important}
    #standardWorkspace [data-view-panel="dashboard"] .module-card small{font-size:12px!important;line-height:1.35!important}
    #standardWorkspace [data-view-panel="dashboard"] .module-card em{font-size:11px!important}
    #standardWorkspace [data-view-panel="dashboard"] .dashboard-panel p{font-size:12px!important;line-height:1.45!important}

    /* Persone */
    [data-view-panel="persone"] .people-table th{font-size:11px!important}
    [data-view-panel="persone"] .people-table td{font-size:13px!important;line-height:1.4!important}
    .people-ux-person strong{font-size:14px!important}
    .people-ux-person small,.people-ux-stack small{font-size:11px!important;line-height:1.35!important}
    .people-ux-stack strong,.people-ux-period{font-size:12px!important}
    .people-ux-chip{font-size:11px!important;min-height:25px!important;padding:4px 7px!important}
    .people-ux-open,.people-ux-accredit{font-size:11px!important;min-height:34px!important}
    .people-ux-stat span,.people-ux-stat small{font-size:11px!important}

    /* Scheda persona */
    #personModal.person-ux .person-ux-section-head h3{font-size:17px!important}
    #personModal.person-ux .person-ux-section-head p{font-size:12px!important;line-height:1.45!important}
    #personModal.person-ux .person-ux-grid>label{font-size:12px!important}
    #personModal.person-ux .person-ux-grid .field-input,
    #personModal.person-ux .person-ux-grid .field-textarea{font-size:14px!important}
    #personModal.person-ux .type-check span{font-size:12px!important}
    #personModal.person-ux .course-chip{font-size:11px!important}
    #personModal.person-ux .current-state span,
    #personModal.person-ux .current-state small,
    #personModal.person-ux .accredit-help{font-size:11px!important}
    #personModal.person-ux .big-action{font-size:13px!important;min-height:46px!important}
    #personModal.person-ux .person-ux-side-title strong{font-size:13px!important}
    #personModal.person-ux .person-ux-side-field{font-size:11px!important}
    #personModal.person-ux .person-ux-switches .switch-row b{font-size:12px!important}
    #personModal.person-ux .person-ux-switches .switch-row small{font-size:10px!important}
    #personModal.person-ux .qr-card-head h4{font-size:14px!important}
    #personModal.person-ux .qr-card-head small,#personModal.person-ux .qr-meta{font-size:10px!important}

    /* Accredito */
    [data-view-panel="accreditamento"] .accredit-person strong{font-size:14px!important}
    [data-view-panel="accreditamento"] .accredit-person small,
    [data-view-panel="accreditamento"] .accredit-meta{font-size:11px!important;line-height:1.4!important}
    [data-view-panel="accreditamento"] .status-pill,
    [data-view-panel="accreditamento"] .work-pill,
    [data-view-panel="accreditamento"] .filter-pill{font-size:11px!important}
    [data-view-panel="accreditamento"] .accredit-open,
    [data-view-panel="accreditamento"] .scan-action{font-size:12px!important}
    #personModal.acc-quick-person .acc-quick-head p{font-size:12px!important}
    #personModal.acc-quick-person .acc-quick-grid>label{font-size:12px!important}
    #personModal.acc-quick-person .acc-quick-grid .field-input{font-size:14px!important}
    #personModal.acc-quick-person .acc-quick-material-card h4{font-size:14px!important}
    #personModal.acc-quick-person .acc-quick-material-grid .switch-row b{font-size:12px!important}
    #personModal.acc-quick-person .acc-quick-material-grid .switch-row small{font-size:10px!important}
    #personModal.acc-quick-person .acc-quick-summary-item span{font-size:10px!important}
    #personModal.acc-quick-person .acc-quick-summary-item strong{font-size:12px!important}
    #personModal.acc-quick-person .acc-quick-accommodation strong{font-size:14px!important}
    #personModal.acc-quick-person .acc-quick-accommodation small{font-size:11px!important}

    /* Turni */
    #shiftView .shift-filter-bar label{font-size:11px!important}
    #shiftView .shift-filter-bar input,#shiftView .shift-filter-bar select{font-size:13px!important}
    #shiftView .shift-summary-card small{font-size:11px!important}
    #shiftView .shift-main h4{font-size:14px!important}
    #shiftView .shift-main p{font-size:11px!important;line-height:1.4!important}
    #shiftView .shift-main .shift-area{font-size:10px!important}
    #shiftView .shift-time strong{font-size:14px!important}
    #shiftView .shift-time small{font-size:11px!important}
    #shiftView .shift-count small{font-size:10px!important}
    #shiftView .shift-actions button{font-size:11px!important}
    #shiftManageModal .shift-panel-title h3{font-size:16px!important}
    #shiftManageModal .shift-person-top strong{font-size:12px!important}
    #shiftManageModal .shift-person-top small{font-size:10px!important}
    .turni-state-btn,.turni-initial-state-btn{font-size:11px!important;min-height:32px!important}

    /* Alloggi */
    #overnightView .view-heading p{font-size:12px!important}
    #overnightView .overnight-summary-card small{font-size:11px!important}
    #overnightView .tent-title h3{font-size:16px!important}
    #overnightView .tent-title p{font-size:11px!important}
    #overnightView .bed-slot strong{font-size:13px!important}
    #overnightView .bed-slot small{font-size:10px!important}
    #overnightView .unassigned-person strong{font-size:13px!important}
    #overnightView .unassigned-person small{font-size:11px!important}

    /* Pasti */
    [data-view-panel="pasti"] .meals-admin-head p,
    [data-view-panel="pasti"] .meal-panel-head p{font-size:12px!important;line-height:1.45!important}
    [data-view-panel="pasti"] .meal-person-item strong{font-size:13px!important}
    [data-view-panel="pasti"] .meal-person-item small,
    [data-view-panel="pasti"] .meal-person-item em{font-size:11px!important}
    [data-view-panel="pasti"] .meal-calendar th{font-size:11px!important}
    [data-view-panel="pasti"] .meal-calendar td{font-size:12px!important}
    [data-view-panel="pasti"] .meal-toggle{font-size:11px!important}

    /* Mezzi */
    #vehicleView .vehicle-table th{font-size:11px!important}
    #vehicleView .vehicle-table td{font-size:13px!important;line-height:1.4!important}
    #vehicleView .vehicle-name strong{font-size:14px!important}
    #vehicleView .vehicle-name small{font-size:11px!important}
    #vehicleView .vehicle-presence,#vehicleView .vehicle-open{font-size:11px!important}
    #vehicleModal .vehicle-panel h3{font-size:17px!important}
    #vehicleModal .vehicle-grid label,#vehicleModal .activation-form label{font-size:12px!important}
    #vehicleModal input,#vehicleModal textarea{font-size:13px!important}
    #vehicleModal .activation-item small,#vehicleModal .movement-row small,#vehicleModal .driver-row small{font-size:11px!important}

    /* Situazione Campo */
    #situationView .situation-head p{font-size:12px!important}
    #situationView .situation-kpi small{font-size:11px!important}
    #situationView .situation-kpi em{font-size:11px!important;line-height:1.35!important}
    #situationView .situation-panel h3{font-size:17px!important}
    #situationView .situation-panel>p{font-size:12px!important}
    #situationView .coverage-stat small{font-size:11px!important}
    #situationView .coverage-caption{font-size:11px!important}
    #situationView .shift-situation strong{font-size:13px!important}
    #situationView .shift-situation small{font-size:11px!important}
    #situationView .critical-item strong{font-size:13px!important}
    #situationView .critical-item small{font-size:11px!important}
    #situationView .situation-quicklink{font-size:12px!important}

    /* Cucina mobile */
    body[data-app-role="cucina"] #kitchenWorkspace{font-size:14px!important}
    body[data-app-role="cucina"] #kitchenWorkspace .meal-stat small{font-size:10px!important}
    body[data-app-role="cucina"] #kitchenWorkspace .kitchen-person-head p{font-size:12px!important}
    body[data-app-role="cucina"] #kitchenWorkspace .meal-ticket-copy span{font-size:12px!important}
    body[data-app-role="cucina"] #kitchenWorkspace .meal-use-button{font-size:15px!important}

    @media(max-width:900px){
      #standardWorkspace .app-nav-btn{font-size:13px!important}
      [data-view-panel="persone"] .people-table td,
      #vehicleView .vehicle-table td{font-size:14px!important}
    }
  `;
  document.head.appendChild(style);
})();
