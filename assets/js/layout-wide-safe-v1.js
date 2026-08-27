(() => {
  'use strict';
  if (document.getElementById('layoutWideSafeV1Styles')) return;
  const style = document.createElement('style');
  style.id = 'layoutWideSafeV1Styles';
  style.textContent = `
    /* =====================================================
       LAYOUT WIDE SAFE V1 — SOLO LARGHEZZE/IMPAGINAZIONE
       Nessun JS dinamico, observer o overlay.
       ===================================================== */

    body.reserved-body .reserved-topbar .container,
    body.reserved-body .reserved-statusbar .container,
    body.reserved-body main.reserved-main > .container,
    body.reserved-body #standardWorkspace.container,
    body.reserved-body #kitchenWorkspace.container{
      width:min(calc(100% - 40px),2100px)!important;
      max-width:none!important;
      margin-left:auto!important;
      margin-right:auto!important;
    }

    body.reserved-body #standardWorkspace{
      padding-left:0!important;
      padding-right:0!important;
    }

    body.reserved-body #standardWorkspace .app-view,
    body.reserved-body #shiftView,
    body.reserved-body #overnightView,
    body.reserved-body #vehicleView,
    body.reserved-body #situationView{
      width:100%!important;
      max-width:none!important;
    }

    /* Mantieni i contenuti editoriali leggibili, ma usa lo spazio per strumenti e tabelle. */
    body.reserved-body .people-table-wrap,
    body.reserved-body .vehicle-table-wrap,
    body.reserved-body .meal-calendar-wrap{
      width:100%!important;
    }

    body.reserved-body [data-view-panel="persone"] .people-table,
    body.reserved-body #vehicleView .vehicle-table{
      width:100%!important;
    }

    /* Scheda persona: quasi tutto schermo, senza aderire ai bordi. */
    #personModal.person-ux .person-panel{
      width:min(1680px,calc(100vw - 32px))!important;
      height:calc(100dvh - 32px)!important;
      margin:16px auto!important;
    }
    #personModal.person-ux #personForm.person-ux-form{
      grid-template-columns:minmax(0,1fr) 370px!important;
      gap:16px!important;
    }

    /* Accredito rapido: un po' più ampio, ma ancora concentrato. */
    #personModal.acc-quick-person .person-panel{
      width:min(1380px,calc(100vw - 32px))!important;
    }

    /* Pasti: sfrutta meglio la larghezza per lista persone + calendario. */
    [data-view-panel="pasti"] .meals-admin-grid{
      grid-template-columns:minmax(300px,360px) minmax(0,1fr)!important;
      gap:16px!important;
    }

    /* Alloggi: più spazio ai letti, laterale comunque leggibile. */
    #overnightView .overnight-layout{
      grid-template-columns:minmax(0,1fr) 340px!important;
      gap:16px!important;
    }

    /* Situazione: quadro operativo più arioso su desktop. */
    #situationView .situation-grid{
      grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr)!important;
      gap:16px!important;
    }

    @media(max-width:1200px){
      body.reserved-body .reserved-topbar .container,
      body.reserved-body .reserved-statusbar .container,
      body.reserved-body main.reserved-main > .container,
      body.reserved-body #standardWorkspace.container,
      body.reserved-body #kitchenWorkspace.container{
        width:calc(100% - 28px)!important;
      }
      #personModal.person-ux #personForm.person-ux-form{grid-template-columns:minmax(0,1fr) 340px!important}
      [data-view-panel="pasti"] .meals-admin-grid{grid-template-columns:300px minmax(0,1fr)!important}
      #situationView .situation-grid{grid-template-columns:1fr!important}
    }

    @media(max-width:900px){
      #personModal.person-ux .person-panel{width:calc(100vw - 18px)!important;height:calc(100dvh - 18px)!important;margin:9px auto!important}
      #personModal.person-ux #personForm.person-ux-form{grid-template-columns:1fr!important}
      [data-view-panel="pasti"] .meals-admin-grid{grid-template-columns:1fr!important}
      #overnightView .overnight-layout{grid-template-columns:1fr!important}
    }

    @media(max-width:640px){
      body.reserved-body .reserved-topbar .container,
      body.reserved-body .reserved-statusbar .container,
      body.reserved-body main.reserved-main > .container,
      body.reserved-body #standardWorkspace.container,
      body.reserved-body #kitchenWorkspace.container{
        width:calc(100% - 18px)!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
