(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let observer = null;
  let filterMode = 'all';

  function injectStyles() {
    if ($('mezziUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'mezziUxV1Styles';
    style.textContent = `
      /* =====================================================
         MEZZI UX V1 — GESTIONE OPERATIVA
         ===================================================== */
      #vehicleView.mezzi-ux{max-width:none!important}
      #vehicleView.mezzi-ux .vehicle-view-head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important;margin:8px 0 14px!important}
      #vehicleView.mezzi-ux .vehicle-view-head h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      #vehicleView.mezzi-ux .vehicle-view-head p{margin:0!important;font-size:12px!important;color:#687985!important}
      #vehicleView.mezzi-ux .vehicle-realtime{display:inline-flex!important;width:auto!important;margin-top:5px!important;padding:5px 7px!important;border:1px solid #d6e5dc!important;border-radius:4px!important;background:#f2f9f5!important;font-size:9px!important}
      #vehicleView.mezzi-ux #vehicleAddButton{min-height:40px!important;border-radius:5px!important;padding:8px 12px!important;font-size:11px!important;box-shadow:none!important}

      #vehicleView.mezzi-ux .vehicle-summary{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;margin:0 0 10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #vehicleView.mezzi-ux .vehicle-summary-card{margin:0!important;padding:10px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
      #vehicleView.mezzi-ux .vehicle-summary-card:last-child{border-right:0!important}
      #vehicleView.mezzi-ux .vehicle-summary-card small{font-size:9px!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#72818c!important}.vehicle-summary-card strong{font-size:21px!important;margin-top:2px!important;color:#1d303d!important}

      #vehicleView.mezzi-ux .vehicle-toolbar{display:grid!important;grid-template-columns:minmax(260px,1fr) 170px auto auto!important;gap:7px!important;align-items:center!important;margin:0 0 9px!important;padding:9px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #vehicleView.mezzi-ux .vehicle-search{height:42px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;padding:0 10px!important;box-shadow:none!important}.vehicle-search input{height:40px!important;font-size:12px!important}
      #vehicleView.mezzi-ux .vehicle-select{height:42px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;padding:0 9px!important;font-size:11px!important}
      #vehicleView.mezzi-ux .vehicle-refresh{width:42px!important;height:42px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;box-shadow:none!important}
      .mezzi-ux-filter{height:42px;border:1px solid #c9d2d9;background:#fff;border-radius:5px;padding:0 10px;font:inherit;font-size:10px;font-weight:800;color:#526572;cursor:pointer;white-space:nowrap}.mezzi-ux-filter.active{border-color:#aac2d2;background:#edf5f9;color:#274f66}

      #vehicleView.mezzi-ux .vehicle-table-card{border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      #vehicleView.mezzi-ux .vehicle-table-wrap{overflow:auto!important}
      #vehicleView.mezzi-ux .vehicle-table{width:100%!important;min-width:1120px!important;table-layout:auto!important;border-collapse:collapse!important}
      #vehicleView.mezzi-ux .vehicle-table th{padding:9px 10px!important;background:#f3f6f8!important;border-bottom:1px solid #d5dde3!important;font-size:9px!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#667783!important;white-space:normal!important}
      #vehicleView.mezzi-ux .vehicle-table td{padding:10px!important;border-bottom:1px solid #e8edf0!important;font-size:10px!important;vertical-align:middle!important;white-space:normal!important;overflow-wrap:anywhere!important}
      #vehicleView.mezzi-ux .vehicle-table tbody tr{cursor:pointer!important;background:#fff!important}.vehicle-table tbody tr:hover{background:#f8fafb!important}.vehicle-table tbody tr.mezzi-ux-hidden{display:none!important}
      #vehicleView.mezzi-ux .vehicle-name strong{font-size:12px!important;color:#172b38!important}.vehicle-name small{font-size:9px!important;color:#788791!important}
      #vehicleView.mezzi-ux .vehicle-presence{border-radius:3px!important;padding:4px 6px!important;font-size:9px!important;white-space:normal!important}.vehicle-presence.in{background:#eef8f3!important;color:#176844!important}.vehicle-presence.out{background:#f2f4f5!important;color:#69757d!important}
      #vehicleView.mezzi-ux .vehicle-open{min-height:31px!important;border:1px solid #bdc9d1!important;border-radius:4px!important;background:#fff!important;padding:5px 8px!important;font-size:9px!important;font-weight:850!important;box-shadow:none!important;white-space:normal!important}.vehicle-open:hover{background:#eef3f6!important;border-color:#9fb3c0!important;color:#294758!important}

      /* Scheda mezzo */
      #vehicleModal.mezzi-ux-modal{place-items:stretch!important;padding:0!important;background:rgba(18,27,34,.62)!important}
      #vehicleModal.mezzi-ux-modal .vehicle-backdrop{display:none!important}
      #vehicleModal.mezzi-ux-modal .vehicle-modal-card{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;background:#f4f6f8!important;box-shadow:none!important}
      #vehicleModal.mezzi-ux-modal .vehicle-modal-head{position:sticky!important;top:0!important;z-index:6!important;padding:13px 18px!important;border-bottom:1px solid #d5dde3!important;background:#fff!important}
      #vehicleModal.mezzi-ux-modal .vehicle-modal-head h2{margin:2px 0!important;font-size:21px!important;color:#172c39!important}.vehicle-modal-head p{font-size:10px!important}.vehicle-close{width:36px!important;height:36px!important;border:1px solid #d2dae0!important;border-radius:4px!important;background:#f7f9fa!important}
      #vehicleModal.mezzi-ux-modal .vehicle-modal-body{padding:12px 16px 20px!important}
      #vehicleModal.mezzi-ux-modal .vehicle-layout{display:grid!important;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;gap:9px!important;align-items:start!important}
      #vehicleModal.mezzi-ux-modal .vehicle-panel{margin:0 0 9px!important;padding:13px!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important}
      #vehicleModal.mezzi-ux-modal .vehicle-panel h3{margin:3px 0 10px!important;font-size:15px!important;color:#263a46!important}.vehicle-panel .panel-kicker{font-size:8px!important}
      #vehicleModal.mezzi-ux-modal .vehicle-grid,#vehicleModal.mezzi-ux-modal .activation-form{gap:8px!important}.vehicle-grid label,.activation-form label{font-size:9px!important;color:#526572!important}
      #vehicleModal.mezzi-ux-modal .vehicle-grid input,#vehicleModal.mezzi-ux-modal .activation-form input{height:39px!important;margin-top:4px!important;border:1px solid #cbd4db!important;border-radius:4px!important;padding:0 9px!important;font-size:10px!important}.vehicle-grid textarea,.activation-form textarea{margin-top:4px!important;border-radius:4px!important;font-size:10px!important}
      #vehicleModal.mezzi-ux-modal .vehicle-primary,#vehicleModal.mezzi-ux-modal .vehicle-secondary,#vehicleModal.mezzi-ux-modal .vehicle-danger{min-height:35px!important;border-radius:4px!important;padding:7px 10px!important;font-size:9px!important;box-shadow:none!important}
      #vehicleModal.mezzi-ux-modal .vehicle-state-box{margin-top:10px!important;padding:10px!important;border:1px solid #dce3e8!important;border-radius:5px!important;background:#f8fafb!important}.vehicle-state-box strong{font-size:11px!important}.vehicle-state-box small{font-size:9px!important}.vehicle-state-actions{gap:5px!important}
      #vehicleModal.mezzi-ux-modal .activation-item{padding:9px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important}.activation-item.active{background:#f1f8f4!important;border-color:#cee1d7!important}.activation-item strong{font-size:10px!important}.activation-item small{font-size:8px!important;line-height:1.35!important}.activation-item button{border-radius:4px!important;font-size:9px!important}
      #vehicleModal.mezzi-ux-modal .drivers-block{margin-top:12px!important;padding-top:10px!important}.drivers-block h4{font-size:12px!important}.driver-row{padding:8px!important;border-radius:4px!important}.driver-row strong{font-size:10px!important}.driver-row small{font-size:8px!important}.driver-actions button{border-radius:4px!important;font-size:8px!important}.driver-search{border-radius:4px!important}.driver-search input{height:36px!important;font-size:9px!important}.driver-candidate{padding:7px!important;border-radius:4px!important}.driver-candidate strong{font-size:9px!important}.driver-candidate small{font-size:8px!important}.driver-candidate button{border-radius:4px!important;font-size:8px!important}
      #vehicleModal.mezzi-ux-modal .movement-list{max-height:330px!important}.movement-row{padding:8px!important;border-radius:4px!important}.movement-row strong{font-size:9px!important}.movement-row small{font-size:8px!important;line-height:1.35!important}.movement-row button{border-radius:4px!important;font-size:8px!important}

      @media(max-width:980px){#vehicleView.mezzi-ux .vehicle-toolbar{grid-template-columns:1fr 160px auto!important}#vehicleModal.mezzi-ux-modal .vehicle-layout{grid-template-columns:1fr!important}}
      @media(max-width:680px){#vehicleView.mezzi-ux .vehicle-view-head{align-items:flex-start!important;flex-direction:column!important}#vehicleView.mezzi-ux .vehicle-summary{grid-template-columns:1fr 1fr!important}.vehicle-summary-card:nth-child(2){border-right:0!important}.vehicle-summary-card:nth-child(-n+2){border-bottom:1px solid #e3e8ec!important}#vehicleView.mezzi-ux .vehicle-toolbar{grid-template-columns:1fr 1fr!important}.vehicle-search{grid-column:1/-1!important}}
    `;
    document.head.appendChild(style);
  }

  function addActivationFilter() {
    const toolbar = document.querySelector('#vehicleView .vehicle-toolbar');
    if (!toolbar || $('mezziUxActivationFilter')) return;
    const button = document.createElement('button');
    button.id = 'mezziUxActivationFilter';
    button.type = 'button';
    button.className = 'mezzi-ux-filter';
    button.textContent = 'Solo con attivazione';
    const refresh = $('vehicleRefresh');
    if (refresh) toolbar.insertBefore(button, refresh); else toolbar.appendChild(button);
    button.addEventListener('click', () => {
      filterMode = filterMode === 'active' ? 'all' : 'active';
      button.classList.toggle('active', filterMode === 'active');
      applyActivationFilter();
    });
  }

  function applyActivationFilter() {
    const rows = [...document.querySelectorAll('#vehicleTableBody tr')];
    rows.forEach(row => {
      if (filterMode !== 'active') { row.classList.remove('mezzi-ux-hidden'); return; }
      const activationCell = row.cells?.[4];
      const hasActivation = !!activationCell && activationCell.textContent.trim() !== '—';
      row.classList.toggle('mezzi-ux-hidden', !hasActivation);
    });
  }

  function bindRowClick() {
    const body = $('vehicleTableBody');
    if (!body || body.dataset.mezziUxRow === '1') return;
    body.dataset.mezziUxRow = '1';
    body.addEventListener('click', event => {
      if (event.target.closest('button,a,input,select,label')) return;
      const row = event.target.closest('tr');
      row?.querySelector('[data-open-vehicle]')?.click();
    });
  }

  function polishModal() {
    const modal = $('vehicleModal');
    if (!modal) return;
    modal.classList.add('mezzi-ux-modal');
  }

  function polish() {
    const view = $('vehicleView');
    if (!view) return;
    view.classList.add('mezzi-ux');
    const p = view.querySelector('.vehicle-view-head p');
    if (p) p.textContent = 'Presenza mezzi, attivazioni, autisti e movimenti in un’unica vista operativa.';
    addActivationFilter();
    bindRowClick();
    polishModal();
    applyActivationFilter();
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if ($('vehicleView')) {
        polish();
        observer = new MutationObserver(() => setTimeout(() => { polishModal(); applyActivationFilter(); }, 20));
        if ($('vehicleTableBody')) observer.observe($('vehicleTableBody'), { childList:true, subtree:true });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
