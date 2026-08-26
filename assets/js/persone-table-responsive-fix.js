(() => {
  'use strict';
  if (document.getElementById('peopleResponsiveFixStyles')) return;
  const style = document.createElement('style');
  style.id = 'peopleResponsiveFixStyles';
  style.textContent = `
    /* PERSONE — correzione tagli e responsive desktop */
    [data-view-panel="persone"].people-ux-view .data-toolbar{
      display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:7px!important
    }
    [data-view-panel="persone"].people-ux-view .data-search{flex:1 1 270px!important;min-width:230px!important}
    [data-view-panel="persone"].people-ux-view .compact-select,
    [data-view-panel="persone"].people-ux-view .people-ux-select{flex:1 1 128px!important;min-width:118px!important;max-width:180px!important}
    [data-view-panel="persone"].people-ux-view .people-ux-reset{flex:0 0 auto!important}
    [data-view-panel="persone"].people-ux-view #refreshPeopleButton{flex:0 0 42px!important}

    [data-view-panel="persone"].people-ux-view .people-table-wrap{overflow-x:hidden!important;width:100%!important}
    [data-view-panel="persone"].people-ux-view .people-table{
      width:100%!important;min-width:0!important;table-layout:fixed!important
    }
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(1){width:21%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(2){width:10%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(3){width:10%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(4){width:18%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(5){width:19%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(6){width:10%!important}
    [data-view-panel="persone"].people-ux-view .people-table th:nth-child(7){width:12%!important}

    [data-view-panel="persone"].people-ux-view .people-table td{
      overflow:visible!important;white-space:normal!important;word-break:normal!important;overflow-wrap:anywhere!important
    }
    [data-view-panel="persone"].people-ux-view .people-ux-chip{
      white-space:normal!important;line-height:1.25!important;height:auto!important;min-height:22px!important;overflow:visible!important;text-overflow:clip!important
    }
    [data-view-panel="persone"].people-ux-view .people-ux-stack strong,
    [data-view-panel="persone"].people-ux-view .people-ux-stack small{
      white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.25!important
    }
    [data-view-panel="persone"].people-ux-view .people-ux-person strong,
    [data-view-panel="persone"].people-ux-view .people-ux-person small{
      white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.25!important
    }
    [data-view-panel="persone"].people-ux-view .people-ux-actions{
      width:100%!important;display:grid!important;grid-template-columns:1fr!important;gap:4px!important
    }
    [data-view-panel="persone"].people-ux-view .people-ux-open,
    [data-view-panel="persone"].people-ux-view .people-ux-accredit{
      width:100%!important;min-width:0!important;padding:5px 4px!important
    }

    @media(max-width:1050px){
      [data-view-panel="persone"].people-ux-view .people-table-wrap{overflow-x:auto!important}
      [data-view-panel="persone"].people-ux-view .people-table{min-width:920px!important}
    }
    @media(max-width:700px){
      [data-view-panel="persone"].people-ux-view .data-search{flex-basis:100%!important;max-width:none!important}
      [data-view-panel="persone"].people-ux-view .compact-select,
      [data-view-panel="persone"].people-ux-view .people-ux-select{max-width:none!important;flex:1 1 calc(50% - 7px)!important}
    }
  `;
  document.head.appendChild(style);
})();
