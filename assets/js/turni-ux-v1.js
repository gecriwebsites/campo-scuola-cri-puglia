(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let listObserver = null;
  let shortageOnly = false;
  let busy = false;

  function injectStyles() {
    if ($('turniUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'turniUxV1Styles';
    style.textContent = `
      /* =====================================================
         TURNI UX V1 — PLANNING OPERATIVO
         ===================================================== */
      #shiftView.turni-ux{max-width:none!important}
      #shiftView.turni-ux .shift-view-head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important;margin:8px 0 14px!important}
      #shiftView.turni-ux .shift-view-head h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      #shiftView.turni-ux .shift-view-head p{margin:0!important;font-size:12px!important;color:#687985!important}
      #shiftView.turni-ux .shift-head-actions{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:wrap!important;justify-content:flex-end!important}
      #shiftView.turni-ux .shift-head-actions .btn{min-height:40px!important;border-radius:5px!important;padding:8px 12px!important;font-size:11px!important;box-shadow:none!important}
      #shiftView.turni-ux .shift-realtime{font-size:9px!important;border:1px solid #d6e5dc!important;background:#f2f9f5!important;border-radius:4px!important;padding:5px 7px!important}

      #shiftView.turni-ux .shift-filter-bar{display:grid!important;grid-template-columns:minmax(180px,220px) minmax(180px,240px) auto auto!important;gap:7px!important;align-items:end!important;margin:0!important;padding:10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #shiftView.turni-ux .shift-filter-bar label{font-size:9px!important;font-weight:850!important;color:#71808b!important;text-transform:uppercase!important;letter-spacing:.065em!important}
      #shiftView.turni-ux .shift-filter-bar input,#shiftView.turni-ux .shift-filter-bar select{height:40px!important;margin-top:5px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;padding:0 9px!important;font:inherit!important;font-size:11px!important;box-shadow:none!important}
      #shiftView.turni-ux .shift-filter-bar button{height:40px!important;border-radius:5px!important;box-shadow:none!important}
      .turni-ux-shortage{height:40px;border:1px solid #c9d2d9;background:#fff;border-radius:5px;padding:0 11px;font:inherit;font-size:10px;font-weight:800;color:#536672;cursor:pointer;white-space:nowrap}
      .turni-ux-shortage.active{border-color:#d5a4ad;background:#fff2f4;color:#9b2f43}

      #shiftView.turni-ux .shift-summary{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:0!important;margin:10px 0!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #shiftView.turni-ux .shift-summary-card{margin:0!important;padding:10px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
      #shiftView.turni-ux .shift-summary-card:last-child{border-right:0!important}
      #shiftView.turni-ux .shift-summary-card small{font-size:9px!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#72818c!important;font-weight:850!important}
      #shiftView.turni-ux .shift-summary-card strong{font-size:21px!important;margin-top:2px!important;color:#1d303d!important}
      #shiftView.turni-ux .shift-summary-card.covered strong{color:#18714d!important}
      #shiftView.turni-ux .shift-summary-card.gap strong{color:#9b2f43!important}

      #shiftView.turni-ux .shift-day-title{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:16px 0 8px!important;padding:0 2px!important}
      #shiftView.turni-ux .shift-day-title h3{margin:0!important;font-size:18px!important;color:#203440!important}
      #shiftView.turni-ux .shift-day-title span{font-size:10px!important;color:#71808b!important}
      #shiftView.turni-ux .shift-list{display:grid!important;gap:6px!important}

      #shiftView.turni-ux .shift-card{display:grid!important;grid-template-columns:minmax(260px,1.5fr) 130px minmax(240px,.9fr) 150px!important;gap:12px!important;align-items:center!important;margin:0!important;padding:11px 12px!important;border:1px solid #d8e0e6!important;border-left:4px solid #8b9aa5!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important;min-width:0!important}
      #shiftView.turni-ux .shift-card.shortage{border-color:#e3c4ca!important;border-left-color:#c33a51!important;background:#fffafb!important}
      #shiftView.turni-ux .shift-card.covered{border-color:#d5e4dc!important;border-left-color:#27815b!important;background:#fbfefc!important}
      #shiftView.turni-ux .shift-main{display:block!important;min-width:0!important}
      #shiftView.turni-ux .shift-area-icon{display:none!important}
      #shiftView.turni-ux .shift-main h4{margin:0!important;font-size:12px!important;line-height:1.25!important;color:#172b38!important;white-space:normal!important;overflow-wrap:anywhere!important}
      #shiftView.turni-ux .shift-main p{margin:3px 0 0!important;font-size:9px!important;line-height:1.35!important;color:#788791!important;white-space:normal!important;overflow-wrap:anywhere!important}
      #shiftView.turni-ux .shift-main .shift-area{display:inline-flex!important;margin-top:6px!important;border:1px solid #d9e2e7!important;border-radius:3px!important;background:#f4f7f9!important;color:#4e6472!important;padding:3px 6px!important;font-size:8px!important;font-weight:850!important;white-space:normal!important}
      #shiftView.turni-ux .shift-time{min-width:0!important}
      #shiftView.turni-ux .shift-time strong{display:block!important;font-size:13px!important;color:#203542!important;white-space:nowrap!important}
      #shiftView.turni-ux .shift-time small{display:block!important;margin-top:3px!important;font-size:9px!important;color:#7b8992!important}
      #shiftView.turni-ux .shift-coverage{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;min-width:0!important}
      #shiftView.turni-ux .shift-count{min-width:0!important;margin:0!important;padding:6px!important;border:1px solid #e0e6ea!important;border-radius:4px!important;background:#fafbfc!important;text-align:center!important}
      #shiftView.turni-ux .shift-count small{font-size:8px!important;white-space:normal!important;color:#788791!important}
      #shiftView.turni-ux .shift-count strong{font-size:13px!important;margin-top:1px!important}
      #shiftView.turni-ux .shift-actions{display:grid!important;grid-template-columns:1fr!important;gap:4px!important;justify-content:stretch!important;min-width:0!important}
      #shiftView.turni-ux .shift-actions button{width:100%!important;min-height:31px!important;margin:0!important;border:1px solid #c4ced5!important;border-radius:4px!important;background:#fff!important;color:#40535f!important;padding:5px 8px!important;font:inherit!important;font-size:9px!important;font-weight:850!important;box-shadow:none!important;white-space:normal!important}
      #shiftView.turni-ux .shift-actions button.primary{border-color:#18374d!important;background:#18374d!important;color:#fff!important}
      #shiftView.turni-ux .shift-empty{border:1px dashed #c9d2d9!important;border-radius:6px!important;background:#fff!important;padding:28px 18px!important;font-size:11px!important;color:#71808b!important}
      #shiftView.turni-ux .turni-ux-hidden{display:none!important}

      /* Editor turno */
      #shiftEditModal.turni-ux-modal,#shiftManageModal.turni-ux-modal{padding:14px!important;background:rgba(18,27,34,.62)!important}
      #shiftEditModal.turni-ux-modal .shift-modal-backdrop,#shiftManageModal.turni-ux-modal .shift-modal-backdrop{backdrop-filter:blur(2px)!important}
      #shiftEditModal.turni-ux-modal .shift-modal-card{width:min(760px,calc(100vw - 28px))!important;max-height:calc(100dvh - 28px)!important;border:1px solid #cfd8df!important;border-radius:8px!important;padding:0!important;background:#fff!important;box-shadow:0 22px 65px rgba(11,22,30,.28)!important}
      #shiftEditModal.turni-ux-modal .shift-modal-head{position:sticky!important;top:0!important;z-index:3!important;margin:0!important;padding:14px 16px!important;border-bottom:1px solid #dde4e8!important;background:#fff!important}
      #shiftEditModal.turni-ux-modal .shift-modal-head h2{font-size:19px!important;margin:3px 0!important}.shift-modal-head p{font-size:10px!important}
      #shiftEditModal.turni-ux-modal #shiftForm{padding:0 16px 16px!important}
      #shiftEditModal.turni-ux-modal .shift-form-grid{gap:9px!important;margin-top:14px!important}
      #shiftEditModal.turni-ux-modal .shift-form-grid label{font-size:10px!important;color:#50636f!important}
      #shiftEditModal.turni-ux-modal .shift-form-grid input,#shiftEditModal.turni-ux-modal .shift-form-grid select{height:40px!important;margin-top:5px!important;border-radius:5px!important;font-size:11px!important}
      #shiftEditModal.turni-ux-modal .shift-form-grid textarea{margin-top:5px!important;border-radius:5px!important;font-size:11px!important}
      #shiftEditModal.turni-ux-modal .shift-form-actions{margin-top:12px!important}
      #shiftEditModal.turni-ux-modal .shift-form-actions .btn,#shiftEditModal.turni-ux-modal .shift-danger{min-height:38px!important;border-radius:4px!important;font-size:10px!important}

      /* Gestione assegnazioni — workspace ampio */
      #shiftManageModal.turni-ux-modal{place-items:stretch!important;padding:0!important}
      #shiftManageModal.turni-ux-modal .shift-modal-card.large{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;padding:0 18px 18px!important;background:#f4f6f8!important;box-shadow:none!important}
      #shiftManageModal.turni-ux-modal .shift-modal-head{position:sticky!important;top:0!important;z-index:5!important;margin:0 -18px!important;padding:13px 18px!important;border-bottom:1px solid #d5dde3!important;background:#fff!important}
      #shiftManageModal.turni-ux-modal .shift-modal-head h2{font-size:20px!important;margin:3px 0!important}.shift-modal-head p{font-size:10px!important}
      #shiftManageModal.turni-ux-modal .shift-manage-meta{margin:10px 0 7px!important;gap:5px!important}
      #shiftManageModal.turni-ux-modal .shift-meta-pill{border-radius:3px!important;padding:5px 7px!important;font-size:9px!important;background:#fff!important}
      #shiftManageModal.turni-ux-modal .shift-manage-summary{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:0!important;margin:0 0 9px!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;overflow:hidden!important}
      #shiftManageModal.turni-ux-modal .shift-manage-summary span{margin:0!important;padding:8px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important}.shift-manage-summary span:last-child{border-right:0!important}
      #shiftManageModal.turni-ux-modal .shift-manage-summary small{font-size:8px!important}.shift-manage-summary strong{font-size:13px!important}
      #shiftManageModal.turni-ux-modal .shift-manage-layout{display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(330px,.75fr)!important;gap:9px!important;align-items:start!important}
      #shiftManageModal.turni-ux-modal .shift-linked,#shiftManageModal.turni-ux-modal .shift-candidates{margin:0!important;padding:12px!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important}
      #shiftManageModal.turni-ux-modal .shift-panel-title{margin-bottom:8px!important}.shift-panel-title h3{font-size:14px!important}.shift-panel-title small{font-size:9px!important}
      #shiftManageModal.turni-ux-modal .shift-person-list{gap:5px!important;max-height:calc(100dvh - 260px)!important}
      #shiftManageModal.turni-ux-modal .shift-person-row{padding:8px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important}
      #shiftManageModal.turni-ux-modal .shift-person-top strong{font-size:10px!important}.shift-person-top small{font-size:8px!important}
      #shiftManageModal.turni-ux-modal .shift-state-select{height:31px!important;border-radius:4px!important;font-size:9px!important}
      #shiftManageModal.turni-ux-modal .shift-person-note{margin-top:6px!important}.shift-person-note input{height:31px!important;border-radius:4px!important;font-size:9px!important}.shift-person-note button,.shift-remove-person{height:31px!important;border-radius:4px!important;font-size:9px!important}
      #shiftManageModal.turni-ux-modal .shift-candidate-search{border-radius:5px!important;padding:0 9px!important}.shift-candidate-search input{height:38px!important;font-size:10px!important}
      #shiftManageModal.turni-ux-modal .shift-add-state{margin:7px 0!important}.shift-add-state label{font-size:9px!important}.shift-add-state select{height:31px!important;border-radius:4px!important;font-size:9px!important}
      #shiftManageModal.turni-ux-modal .shift-candidate-row{padding:8px!important;border-radius:5px!important}.shift-candidate-row strong{font-size:10px!important}.shift-candidate-row small{font-size:8px!important}.shift-candidate-row button{border-radius:4px!important;font-size:9px!important;padding:6px 8px!important}

      @media(max-width:1050px){
        #shiftView.turni-ux .shift-card{grid-template-columns:minmax(220px,1fr) 120px minmax(210px,.9fr)!important}
        #shiftView.turni-ux .shift-actions{grid-column:1/-1!important;grid-template-columns:repeat(2,120px)!important;justify-content:end!important}
        #shiftManageModal.turni-ux-modal .shift-manage-layout{grid-template-columns:1fr!important}
        #shiftManageModal.turni-ux-modal .shift-person-list{max-height:420px!important}
      }
      @media(max-width:720px){
        #shiftView.turni-ux .shift-view-head{align-items:flex-start!important;flex-direction:column!important}
        #shiftView.turni-ux .shift-head-actions{justify-content:flex-start!important}
        #shiftView.turni-ux .shift-filter-bar{grid-template-columns:1fr 1fr!important}
        #shiftView.turni-ux .shift-summary{grid-template-columns:repeat(2,1fr)!important}.shift-summary-card:nth-child(2n){border-right:0!important}.shift-summary-card{border-bottom:1px solid #e3e8ec!important}.shift-summary-card:last-child{grid-column:1/-1;border-bottom:0!important}
        #shiftView.turni-ux .shift-card{grid-template-columns:1fr!important}
        #shiftView.turni-ux .shift-actions{grid-column:auto!important;grid-template-columns:1fr 1fr!important;justify-content:stretch!important}
        #shiftManageModal.turni-ux-modal .shift-manage-summary{grid-template-columns:repeat(2,1fr)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function applyShortageFilter() {
    const list = $('shiftList');
    if (!list) return;
    [...list.querySelectorAll('.shift-card')].forEach(card => {
      card.classList.toggle('turni-ux-hidden', shortageOnly && !card.classList.contains('shortage'));
    });
  }

  function addShortageFilter() {
    const bar = document.querySelector('#shiftView .shift-filter-bar');
    if (!bar || $('turniUxShortage')) return;
    const button = document.createElement('button');
    button.id = 'turniUxShortage';
    button.type = 'button';
    button.className = 'turni-ux-shortage';
    button.textContent = 'Solo turni scoperti';
    button.addEventListener('click', () => {
      shortageOnly = !shortageOnly;
      button.classList.toggle('active', shortageOnly);
      button.textContent = shortageOnly ? '✓ Solo scoperti' : 'Solo turni scoperti';
      applyShortageFilter();
    });
    bar.appendChild(button);
  }

  function polish() {
    if (busy) return;
    busy = true;
    try {
      const view = $('shiftView');
      if (!view) return;
      view.classList.add('turni-ux');
      const subtitle = view.querySelector('.shift-view-head p');
      if (subtitle) subtitle.textContent = 'Planning giornaliero: fabbisogno, copertura e assegnazioni in un’unica vista.';
      addShortageFilter();
      $('shiftEditModal')?.classList.add('turni-ux-modal');
      $('shiftManageModal')?.classList.add('turni-ux-modal');
      applyShortageFilter();
    } finally {
      busy = false;
    }
  }

  function observe() {
    const list = $('shiftList');
    if (list && !listObserver) {
      listObserver = new MutationObserver(() => setTimeout(polish, 15));
      listObserver.observe(list, { childList:true, subtree:false });
    }
  }

  async function init() {
    injectStyles();
    for (let i=0; i<120; i+=1) {
      if ($('shiftView') && $('shiftList') && $('shiftEditModal') && $('shiftManageModal')) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    polish();
    observe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
