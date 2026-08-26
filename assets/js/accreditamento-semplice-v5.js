(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let modalObserver = null;
  let navObserver = null;
  let preparing = false;

  function accreditationActive() {
    return document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view === 'accreditamento';
  }

  function injectStyles() {
    if ($('accSimpleV5Styles')) return;
    const style = document.createElement('style');
    style.id = 'accSimpleV5Styles';
    style.textContent = `
      /* =====================================================
         ACCREDITO V5 — UNA SOLA PAGINA, NIENTE WIZARD
         ===================================================== */
      #personModal.acc-simple-v5{background:#edf1f4!important}
      #personModal.acc-simple-v5 .person-modal-backdrop{display:none!important}
      #personModal.acc-simple-v5 .person-panel{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#edf1f4!important;overflow:auto!important}
      #personModal.acc-simple-v5 .person-panel-head{position:sticky!important;top:0!important;z-index:510!important;background:#142633!important;color:#fff!important;border:0!important;padding:14px clamp(18px,2vw,34px)!important;box-shadow:0 2px 12px rgba(0,0,0,.16)!important}
      #personModal.acc-simple-v5 .person-panel-head h2{font-size:25px!important;color:#fff!important;margin:4px 0!important}
      #personModal.acc-simple-v5 .person-panel-head p{font-size:13px!important;color:#c9d4dc!important}
      #personModal.acc-simple-v5 .panel-close{width:44px!important;height:44px!important;font-size:26px!important;color:#fff!important;background:rgba(255,255,255,.1)!important;border:1px solid rgba(255,255,255,.16)!important}

      /* Nasconde definitivamente tutti i vecchi step/wizard */
      #personModal.acc-simple-v5 #uxAccreditationWizard,
      #personModal.acc-simple-v5 #uxWizardFooter,
      #personModal.acc-simple-v5 #acc10Wizard,
      #personModal.acc-simple-v5 #acc10Footer,
      #personModal.acc-simple-v5 #acc10SummaryStage{display:none!important}

      #accSimpleTop{position:sticky;top:74px;z-index:500;background:#fff;border-bottom:1px solid #d9e0e5;padding:12px clamp(18px,2vw,34px);box-shadow:0 2px 8px rgba(20,38,51,.05)}
      #accSimpleTop[hidden]{display:none!important}
      .acc-simple-top-inner{max-width:1540px;margin:0 auto;display:flex;align-items:center;gap:14px;justify-content:space-between}
      .acc-simple-title strong{display:block;font-size:17px;color:#1e303b}.acc-simple-title span{display:block;margin-top:3px;font-size:12px;color:#65737d}
      .acc-simple-nav{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .acc-simple-nav button{border:1px solid #d3dce2;background:#f7f9fa;color:#344650;border-radius:10px;min-height:42px;padding:8px 12px;font:inherit;font-size:13px;font-weight:850;cursor:pointer}
      .acc-simple-nav button:hover{background:#fff;border-color:#879aa7}

      #personModal.acc-simple-v5 .person-panel-body{display:grid!important;grid-template-columns:1fr!important;gap:16px!important;width:100%!important;max-width:none!important;padding:18px clamp(18px,2.4vw,42px) 94px!important;box-sizing:border-box!important;background:#edf1f4!important}
      #personModal.acc-simple-v5 .person-form,
      #personModal.acc-simple-v5 #acc10VerifyStage,
      #personModal.acc-simple-v5 #acc10PresenceStage{display:block!important;width:min(100%,1540px)!important;max-width:1540px!important;margin:0 auto!important;box-sizing:border-box!important;background:#fff!important;border:1px solid #d9e1e6!important;border-radius:15px!important;padding:22px!important;box-shadow:0 4px 18px rgba(20,38,51,.04)!important}

      /* Mostra TUTTO il form: nessun campo sparisce per colpa dei vecchi step */
      #personModal.acc-simple-v5 .person-form[hidden],
      #personModal.acc-simple-v5 #acc10VerifyStage[hidden],
      #personModal.acc-simple-v5 #acc10PresenceStage[hidden]{display:block!important}
      #personModal.acc-simple-v5 .person-form>.acc10-form-node,
      #personModal.acc-simple-v5 .person-form>.ux-step-item{display:block!important}
      #personModal.acc-simple-v5 .person-form>.form-grid.acc10-form-node,
      #personModal.acc-simple-v5 .person-form>.form-grid.ux-step-item,
      #personModal.acc-simple-v5 .person-form>.switch-grid.acc10-form-node,
      #personModal.acc-simple-v5 .person-form>.switch-grid.ux-step-item{display:grid!important}
      #personModal.acc-simple-v5 .person-save-row{display:none!important}
      #personModal.acc-simple-v5 .danger-zone{display:none!important}
      #personModal.acc-simple-v5 #acc10FormHelp{display:none!important}

      #personModal.acc-simple-v5 .form-section-title{font-size:17px!important;font-weight:900!important;color:#243640!important;margin:22px 0 12px!important;padding-bottom:9px!important;border-bottom:1px solid #e3e8eb!important}
      #personModal.acc-simple-v5 .person-form label{font-size:14px!important;font-weight:800!important;color:#344650!important}
      #personModal.acc-simple-v5 .field-input,#personModal.acc-simple-v5 .field-textarea{min-height:49px!important;font-size:15px!important;border:1px solid #c7d2d9!important;border-radius:10px!important;padding:10px 12px!important;background:#fff!important}
      #personModal.acc-simple-v5 .form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
      #personModal.acc-simple-v5 .switch-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}
      #personModal.acc-simple-v5 .switch-row{padding:14px!important;border:1px solid #dce4e8!important;border-radius:11px!important;background:#f8fafb!important}

      .acc-simple-section-head{margin:-2px 0 16px;padding-bottom:13px;border-bottom:1px solid #e4e9ec}
      .acc-simple-section-head small{display:block;color:#c8102e;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .acc-simple-section-head h3{margin:4px 0 4px;font-size:23px;color:#20323d}.acc-simple-section-head p{margin:0;font-size:13px;color:#687680;line-height:1.45}

      /* Verifica Excel tutta centrale, senza carosello */
      #personModal.acc-simple-v5 #acc10VerifyStage .acc10-stage-head,
      #personModal.acc-simple-v5 #acc10VerifyStage>.acc10-help{display:none!important}
      #personModal.acc-simple-v5 #excelVerifyPanel{display:block!important;width:100%!important;max-width:none!important;border:0!important;margin:0!important;background:transparent!important;overflow:visible!important}
      #personModal.acc-simple-v5 #excelVerifyPanel[hidden]{display:none!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-panel-head{display:none!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-body{padding:0!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .ux-verify-nav,
      #personModal.acc-simple-v5 #excelVerifyPanel .xve-nav3,
      #personModal.acc-simple-v5 #excelVerifyPanel [class*="verify-nav"]{display:none!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-compare,
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-compare.ux-guided{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-row,
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-compare.ux-guided .excel-verify-row{display:grid!important;grid-template-columns:115px minmax(0,1fr) minmax(0,1fr) auto!important;gap:10px!important;min-height:unset!important;padding:15px!important;border:1px solid #dce4e8!important;border-radius:12px!important;background:#fff!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-row:nth-child(5){grid-column:1/-1}
      #personModal.acc-simple-v5 #excelVerifyPanel .xve-editor{display:grid!important;grid-column:1/-1!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important}
      #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-details.ux-unreviewed{display:grid!important}

      /* Presenza grande, non colonna stretta */
      #personModal.acc-simple-v5 #acc10PresenceStage .acc10-stage-head{display:none!important}
      #personModal.acc-simple-v5 #acc10PresenceHost .accredit-side{display:grid!important;grid-template-columns:minmax(0,1fr) repeat(2,minmax(220px,.32fr))!important;gap:12px!important;width:100%!important;max-width:none!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important}
      #personModal.acc-simple-v5 #acc10PresenceHost .accredit-side-head{display:none!important}
      #personModal.acc-simple-v5 #acc10PresenceHost .current-state{margin:0!important;padding:17px!important;border:1px solid #dce4e8!important;border-radius:12px!important;background:#f8fafb!important}
      #personModal.acc-simple-v5 #acc10PresenceHost .big-action{min-height:78px!important;font-size:15px!important;border-radius:12px!important}
      #personModal.acc-simple-v5 #acc10PresenceHost .accredit-help{grid-column:1/-1!important}

      /* Pasti del V4 sempre dentro la pagina */
      #personModal.acc-simple-v5 #acc10MealEditor{display:block!important;margin-top:22px!important;padding-top:20px!important;border-top:1px solid #e2e8ec!important}

      #accSimpleFooter{position:fixed;left:0;right:0;bottom:0;z-index:520;background:rgba(255,255,255,.97);border-top:1px solid #d7dfe4;padding:10px clamp(18px,2vw,34px);backdrop-filter:blur(8px)}
      #accSimpleFooter[hidden]{display:none!important}
      .acc-simple-footer-inner{max-width:1540px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .acc-simple-footer-info strong{display:block;font-size:13px;color:#253641}.acc-simple-footer-info span{display:block;font-size:11px;color:#6b7881;margin-top:2px}
      .acc-simple-footer-actions{display:flex;gap:8px}.acc-simple-footer-actions button{min-height:44px;border-radius:10px;padding:9px 15px;font:inherit;font-size:13px;font-weight:900;cursor:pointer}
      .acc-simple-save{background:#fff;border:1px solid #cbd6dc;color:#30434e}.acc-simple-close{background:#c8102e;border:1px solid #c8102e;color:#fff}

      /* =====================================================
         SCHEDA PERSONALE NORMALE — COLONNA DESTRA INTERNA
         ===================================================== */
      #personModal:not(.acc-simple-v5):not(.acc10-active) .person-panel-body{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(310px,360px)!important;gap:18px!important;align-items:start!important;max-width:none!important;padding-left:clamp(16px,2vw,30px)!important;padding-right:clamp(16px,2vw,30px)!important}
      #personModal:not(.acc-simple-v5):not(.acc10-active) .person-form{min-width:0!important;max-width:none!important;width:100%!important}
      #personModal:not(.acc-simple-v5):not(.acc10-active) .accredit-side{display:block!important;position:sticky!important;top:90px!important;width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;overflow:hidden!important;border:1px solid #dce3e8!important;border-radius:14px!important;background:#fff!important;padding:14px!important}
      #personModal:not(.acc-simple-v5):not(.acc10-active) .accredit-side #excelVerifyPanel{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important}
      #personModal:not(.acc-simple-v5):not(.acc10-active) .accredit-side #excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important;min-width:0!important}
      #personModal:not(.acc-simple-v5):not(.acc10-active) .accredit-side #excelVerifyPanel .excel-verify-value{overflow-wrap:anywhere!important}

      @media(max-width:1050px){
        .acc-simple-top-inner{align-items:flex-start;flex-direction:column}.acc-simple-nav{justify-content:flex-start}
        #personModal.acc-simple-v5 .switch-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-compare,#personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-compare.ux-guided{grid-template-columns:1fr!important}
        #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-row:nth-child(5){grid-column:auto}
        #personModal:not(.acc-simple-v5):not(.acc10-active) .person-panel-body{grid-template-columns:1fr!important}
        #personModal:not(.acc-simple-v5):not(.acc10-active) .accredit-side{position:static!important}
      }
      @media(max-width:760px){
        #personModal.acc-simple-v5 .person-panel-body{padding-left:10px!important;padding-right:10px!important}
        #personModal.acc-simple-v5 .person-form,#personModal.acc-simple-v5 #acc10VerifyStage,#personModal.acc-simple-v5 #acc10PresenceStage{padding:15px!important;border-radius:11px!important}
        #personModal.acc-simple-v5 .form-grid.two,#personModal.acc-simple-v5 .switch-grid{grid-template-columns:1fr!important}
        #personModal.acc-simple-v5 #excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important}
        #personModal.acc-simple-v5 #excelVerifyPanel .xve-editor{grid-template-columns:1fr!important}
        #personModal.acc-simple-v5 #acc10PresenceHost .accredit-side{grid-template-columns:1fr!important}
        .acc-simple-footer-info{display:none}.acc-simple-footer-actions{width:100%}.acc-simple-footer-actions button{flex:1}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTop() {
    const panel = document.querySelector('#personModal .person-panel');
    const body = panel?.querySelector('.person-panel-body');
    if (!panel || !body) return;
    let top = $('accSimpleTop');
    if (!top) {
      top = document.createElement('div');
      top.id = 'accSimpleTop';
      top.hidden = true;
      top.innerHTML = `<div class="acc-simple-top-inner"><div class="acc-simple-title"><strong>Accreditamento rapido</strong><span>Tutto in un’unica schermata: compila, verifica, assegna i servizi e registra la presenza.</span></div><div class="acc-simple-nav"><button type="button" data-acc-simple-target="personForm">1 · Dati persona</button><button type="button" data-acc-simple-target="acc10VerifyStage">2 · Verifica import</button><button type="button" data-acc-simple-target="acc10MealEditor">3 · Servizi e pasti</button><button type="button" data-acc-simple-target="acc10PresenceStage">4 · Presenza</button></div></div>`;
      panel.insertBefore(top, body);
      top.addEventListener('click', event => {
        const button = event.target.closest('[data-acc-simple-target]');
        if (!button) return;
        const target = $(button.dataset.accSimpleTarget);
        if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    }

    let footer = $('accSimpleFooter');
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'accSimpleFooter';
      footer.hidden = true;
      footer.innerHTML = `<div class="acc-simple-footer-inner"><div class="acc-simple-footer-info"><strong>Accreditamento in corso</strong><span>Puoi modificare qualunque dato e salvare quando vuoi.</span></div><div class="acc-simple-footer-actions"><button id="accSimpleSave" class="acc-simple-save" type="button">Salva modifiche</button><button id="accSimpleSaveClose" class="acc-simple-close" type="button">Salva e chiudi accredito ✓</button></div></div>`;
      panel.appendChild(footer);
      $('accSimpleSave')?.addEventListener('click', () => $('personForm')?.requestSubmit());
      $('accSimpleSaveClose')?.addEventListener('click', async event => {
        const btn = event.currentTarget;
        btn.disabled = true;
        $('personForm')?.requestSubmit();
        await sleep(420);
        const msg = $('personFormMessage')?.textContent || '';
        if (/obbligatori|seleziona almeno|non riusc|già associato|errore/i.test(msg)) {
          btn.disabled = false;
          return;
        }
        document.querySelector('#personModal [data-close-person]')?.click();
        btn.disabled = false;
      });
    }
  }

  function addSectionHeaders() {
    const verify = $('acc10VerifyStage');
    if (verify && !verify.querySelector('.acc-simple-section-head')) {
      const head = document.createElement('div');
      head.className = 'acc-simple-section-head';
      head.innerHTML = `<small>Controllo import</small><h3>Verifica dati Excel</h3><p>Controlla solo ciò che serve. I dati mancanti possono essere compilati manualmente oppure lasciati vuoti se non disponibili.</p>`;
      verify.prepend(head);
    }
    const presence = $('acc10PresenceStage');
    if (presence && !presence.querySelector('.acc-simple-section-head')) {
      const head = document.createElement('div');
      head.className = 'acc-simple-section-head';
      head.innerHTML = `<small>Ultima operazione</small><h3>Presenza al Campo</h3><p>Registra l’ingresso o l’uscita solo quando necessario.</p>`;
      presence.prepend(head);
    }
  }

  function restoreRightColumn() {
    const modal = $('personModal');
    const body = modal?.querySelector('.person-panel-body');
    const form = $('personForm');
    const side = modal?.querySelector('.accredit-side');
    if (!body || !form || !side || accreditationActive()) return;
    if (form.parentElement !== body) body.insertBefore(form, body.firstChild);
    if (side.parentElement !== body) body.appendChild(side);
    const excel = $('excelVerifyPanel');
    if (excel && excel.parentElement !== side) {
      const state = side.querySelector('.current-state');
      side.insertBefore(excel, state || side.firstChild);
    }
  }

  async function activateSimple() {
    const modal = $('personModal');
    if (!modal || modal.hidden || !accreditationActive() || preparing) return;
    preparing = true;
    ensureTop();

    /* Lasciamo al V4 il solo compito di creare l'editor pasti integrato. */
    const step3 = document.querySelector('#acc10Wizard [data-acc10-step="3"]');
    if (!$('acc10MealEditor') && step3) {
      step3.click();
      await sleep(220);
    }

    modal.classList.add('acc-simple-v5');
    if ($('accSimpleTop')) $('accSimpleTop').hidden = false;
    if ($('accSimpleFooter')) $('accSimpleFooter').hidden = false;
    addSectionHeaders();

    /* Il vecchio V4 può impostare hidden: il CSS V5 mostra comunque tutte le sezioni. */
    const form = $('personForm');
    if (form) form.hidden = false;
    preparing = false;
  }

  function deactivateSimple() {
    const modal = $('personModal');
    if (!modal) return;
    modal.classList.remove('acc-simple-v5');
    if ($('accSimpleTop')) $('accSimpleTop').hidden = true;
    if ($('accSimpleFooter')) $('accSimpleFooter').hidden = true;
    setTimeout(restoreRightColumn, 80);
  }

  function sync() {
    const modal = $('personModal');
    if (!modal || modal.hidden) {
      deactivateSimple();
      return;
    }
    if (accreditationActive()) activateSimple();
    else deactivateSimple();
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if ($('personModal') && $('standardWorkspace')) break;
      await sleep(80);
    }
    ensureTop();
    const modal = $('personModal');
    if (modal) {
      modalObserver = new MutationObserver(sync);
      modalObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });
    }
    const nav = document.querySelector('#standardWorkspace .app-nav');
    if (nav) {
      navObserver = new MutationObserver(sync);
      navObserver.observe(nav, { attributes:true, subtree:true, attributeFilter:['class'] });
    }
    document.addEventListener('click', event => {
      if (event.target.closest('[data-person-id],.app-nav-btn')) setTimeout(sync, 120);
    });
    setInterval(() => {
      if ($('personModal')?.hidden) return;
      if (accreditationActive()) {
        const modal = $('personModal');
        if (!modal?.classList.contains('acc-simple-v5')) activateSimple();
      } else restoreRightColumn();
    }, 700);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
