(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const CAMP_START = '2026-09-16';
  const CAMP_END = '2026-09-30';
  const MEALS = ['colazione', 'pranzo', 'cena'];
  const MEAL_LABELS = { colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena' };

  const STEPS = [
    { id: 1, title: 'Anagrafica', subtitle: 'Identifica la persona e completa i dati disponibili.' },
    { id: 2, title: 'Verifica dati', subtitle: 'Controlla in modo chiaro ciò che proviene dall’Excel.' },
    { id: 3, title: 'Servizi al Campo', subtitle: 'Badge, permanenza, alloggio, QR e pasti.' },
    { id: 4, title: 'Presenza', subtitle: 'Registra entrata o uscita dal Campo.' },
    { id: 5, title: 'Riepilogo', subtitle: 'Controllo finale prima di chiudere l’accreditamento.' }
  ];

  let client = null;
  let active = false;
  let step = 1;
  let currentPersonId = null;
  let services = [];
  let servicesById = new Map();
  let tickets = [];
  let ticketByKey = new Map();
  let mealBusy = false;
  let modalObserver = null;
  let formObserver = null;
  let verifyObserver = null;
  let guardTimer = null;

  const keyFor = (date, type) => `${date}|${type}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function activeView() {
    return document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view || '';
  }

  function personName() {
    return `${$('personNome')?.value || ''} ${$('personCognome')?.value || ''}`.trim() || $('personModalTitle')?.textContent || 'Persona';
  }

  function toast(message, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3200);
  }

  function injectStyles() {
    if ($('acc10Styles')) return;
    const style = document.createElement('style');
    style.id = 'acc10Styles';
    style.textContent = `
      /* =====================================================
         ACCREDITAMENTO V4 - WORKFLOW GESTIONALE FULL WIDTH
         ===================================================== */
      #personModal.acc10-active{background:#eef1f4!important}
      #personModal.acc10-active .person-modal-backdrop{display:none!important}
      #personModal.acc10-active .person-panel{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#eef1f4!important;overflow:auto!important}
      #personModal.acc10-active .person-panel-head{position:sticky!important;top:0!important;z-index:420!important;min-height:74px!important;padding:14px clamp(18px,2vw,34px)!important;background:#122230!important;color:#fff!important;border:0!important;box-shadow:0 2px 10px rgba(0,0,0,.16)!important}
      #personModal.acc10-active .person-panel-head h2{font-size:24px!important;line-height:1.15!important;margin:4px 0 3px!important;color:#fff!important}
      #personModal.acc10-active .person-panel-head p{font-size:13px!important;color:#cbd5dd!important;margin:0!important}
      #personModal.acc10-active .person-panel-head .panel-close{width:44px!important;height:44px!important;font-size:27px!important;background:rgba(255,255,255,.12)!important;color:#fff!important;border:1px solid rgba(255,255,255,.15)!important}
      #personModal.acc10-active #personPresencePill{font-size:11px!important;padding:5px 9px!important}
      #personModal.acc10-active #personWorkNotice{margin:0!important;border-radius:0!important}

      /* Spegne definitivamente il vecchio wizard quando è attivo quello nuovo */
      #personModal.acc10-active #uxAccreditationWizard,
      #personModal.acc10-active #uxWizardFooter{display:none!important}
      #personModal.acc10-active .person-panel-body.ux-wizard-active .person-form,
      #personModal.acc10-active .person-panel-body.ux-wizard-active .accredit-side{display:block!important}
      #personModal.acc10-active .person-panel-body.ux-wizard-active .ux-step-item,
      #personModal.acc10-active .person-panel-body.ux-wizard-active .ux-side-step{display:block!important}

      #acc10Wizard{position:sticky;top:74px;z-index:410;background:#fff;border-bottom:1px solid #d8dee4;padding:12px clamp(18px,2vw,34px);box-shadow:0 2px 8px rgba(18,34,48,.06)}
      #acc10Wizard[hidden]{display:none!important}
      .acc10-progress{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:8px;max-width:1500px;margin:0 auto}
      .acc10-step{border:1px solid #dce2e7;background:#f7f9fb;color:#66727c;border-radius:12px;padding:10px 12px;min-height:58px;display:flex;gap:10px;align-items:center;text-align:left;font:inherit;cursor:pointer;transition:.15s ease}
      .acc10-step:hover{border-color:#aebbc5;background:#fff}
      .acc10-step .n{width:30px;height:30px;border-radius:9px;background:#e6ebef;color:#58656f;display:grid;place-items:center;font-size:13px;font-weight:900;flex:0 0 auto}
      .acc10-step strong{display:block;font-size:13px;color:#26323b;line-height:1.15}.acc10-step small{display:block;font-size:10px;color:#78838c;margin-top:3px;line-height:1.2}
      .acc10-step.active{border-color:#c8102e;background:#fff4f5;box-shadow:0 0 0 2px rgba(200,16,46,.06)}.acc10-step.active .n{background:#c8102e;color:#fff}.acc10-step.active strong{color:#9f0d25}
      .acc10-step.done{border-color:#c9dfd4;background:#f3faf6}.acc10-step.done .n{background:#16794f;color:#fff}.acc10-step.done strong{color:#176744}

      #personModal.acc10-active .person-panel-body{display:block!important;width:100%!important;max-width:none!important;padding:22px clamp(18px,2.4vw,42px) 104px!important;box-sizing:border-box!important;background:#eef1f4!important}
      #personModal.acc10-active .person-form,
      #personModal.acc10-active .acc10-stage{width:min(100%,1500px)!important;max-width:1500px!important;margin:0 auto!important;background:#fff!important;border:1px solid #dce2e7!important;border-radius:16px!important;padding:24px!important;box-sizing:border-box!important;box-shadow:0 5px 20px rgba(18,34,48,.05)!important}
      #personModal.acc10-active .person-form[hidden],#personModal.acc10-active .acc10-stage[hidden]{display:none!important}
      #personModal.acc10-active .person-form{display:block!important}
      #personModal.acc10-active .person-form>*.acc10-form-node{display:none!important}
      #personModal.acc10-active .person-form>*.acc10-form-node.acc10-show{display:block!important}
      #personModal.acc10-active .person-form>.form-grid.acc10-show,
      #personModal.acc10-active .person-form>.switch-grid.acc10-show{display:grid!important}
      #personModal.acc10-active .person-form>.person-save-row,
      #personModal.acc10-active .person-form>.danger-zone{display:none!important}
      #personModal.acc10-active .form-section-title{font-size:15px!important;letter-spacing:.02em!important;margin:18px 0 10px!important;padding-bottom:8px!important;border-bottom:1px solid #e7ebee!important;color:#24323b!important}
      #personModal.acc10-active .person-form label{font-size:13px!important;font-weight:800!important;color:#34414a!important}
      #personModal.acc10-active .field-input,#personModal.acc10-active .field-textarea{font-size:15px!important;min-height:48px!important;border:1px solid #cbd4db!important;border-radius:10px!important;padding:10px 12px!important;background:#fff!important}
      #personModal.acc10-active .field-input:focus,#personModal.acc10-active .field-textarea:focus{outline:none!important;border-color:#758a99!important;box-shadow:0 0 0 3px rgba(72,101,122,.1)!important}
      #personModal.acc10-active .form-grid.two{gap:14px!important}
      #personModal.acc10-active .switch-grid{gap:10px!important}
      #personModal.acc10-active .switch-row{padding:14px!important;border:1px solid #dfe5e9!important;border-radius:11px!important;background:#f9fafb!important}
      #personModal.acc10-active .switch-row b{font-size:13px!important}.switch-row small{font-size:11px!important}
      #personModal.acc10-active .qr-card{border:1px solid #dfe5e9!important;border-radius:13px!important;padding:16px!important}

      .acc10-stage-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #e6eaed}
      .acc10-stage-head .eyebrow{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#c8102e}.acc10-stage-head h3{margin:4px 0 4px;font-size:25px;color:#21303a}.acc10-stage-head p{margin:0;color:#66747e;font-size:14px;line-height:1.45}
      .acc10-help{margin:0 0 18px;padding:13px 15px;border-radius:11px;background:#f3f7fa;border-left:4px solid #57778e;color:#43545f;font-size:13px;line-height:1.5}
      .acc10-help strong{color:#24333d}

      /* Verifica Excel: niente colonna laterale e niente carosello 1-5 */
      #personModal.acc10-active #acc10VerifyHost{width:100%;min-width:0}
      #personModal.acc10-active #excelVerifyPanel{display:block!important;width:100%!important;max-width:none!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important}
      #personModal.acc10-active #excelVerifyPanel[hidden]{display:none!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-panel-head{display:none!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-body{padding:0!important}
      #personModal.acc10-active #excelVerifyPanel .ux-verify-nav,
      #personModal.acc10-active #excelVerifyPanel .xve-nav3,
      #personModal.acc10-active #excelVerifyPanel [class*="verify-nav"]{display:none!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-compare,
      #personModal.acc10-active #excelVerifyPanel .excel-verify-compare.ux-guided{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-compare.ux-guided .excel-verify-row,
      #personModal.acc10-active #excelVerifyPanel .excel-verify-row{display:grid!important;grid-template-columns:120px minmax(0,1fr) minmax(0,1fr) auto!important;gap:12px!important;align-items:start!important;min-width:0!important;min-height:unset!important;padding:16px!important;border:1px solid #dce3e8!important;border-radius:13px!important;background:#fff!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-row:nth-child(5){grid-column:1/-1}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-row>strong{font-size:14px!important;color:#25333d!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-value{font-size:14px!important;overflow-wrap:anywhere!important}.excel-verify-value small{font-size:10px!important}
      #personModal.acc10-active #excelVerifyPanel .xve-editor{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;margin-top:8px!important;padding-top:12px!important}
      #personModal.acc10-active #excelVerifyPanel .xve-editor input,
      #personModal.acc10-active #excelVerifyPanel .xve-editor select,
      #personModal.acc10-active #excelVerifyPanel .xve-editor textarea{font-size:15px!important;min-height:46px!important}
      #personModal.acc10-active #excelVerifyPanel .xve-btn,
      #personModal.acc10-active #excelVerifyPanel .excel-verify-button{font-size:13px!important;min-height:44px!important;padding:9px 13px!important}
      #personModal.acc10-active #excelVerifyPanel .excel-verify-details.ux-unreviewed{display:grid!important}
      #acc10NoExcel{padding:28px;border:1px dashed #cfd8df;border-radius:13px;background:#f8fafb;color:#5d6972;font-size:14px;line-height:1.55;text-align:center}

      /* Presenza a tutta larghezza */
      #personModal.acc10-active #acc10PresenceHost .accredit-side{display:grid!important;width:100%!important;max-width:none!important;grid-template-columns:minmax(0,1fr) repeat(2,minmax(220px,.35fr))!important;gap:14px!important;align-items:stretch!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important}
      #personModal.acc10-active #acc10PresenceHost .accredit-side-head{grid-column:1/-1;display:none!important}
      #personModal.acc10-active #acc10PresenceHost .current-state{margin:0!important;border:1px solid #dbe3e8!important;border-radius:13px!important;padding:18px!important;background:#f8fafb!important}
      #personModal.acc10-active #acc10PresenceHost .current-state span{font-size:11px!important}.current-state strong{font-size:22px!important}.current-state small{font-size:12px!important}
      #personModal.acc10-active #acc10PresenceHost .big-action{min-height:82px!important;border-radius:13px!important;font-size:15px!important;font-weight:900!important}
      #personModal.acc10-active #acc10PresenceHost .accredit-help{grid-column:1/-1;font-size:12px!important;margin:0!important}

      /* Pasti integrati */
      .acc10-meals{margin-top:20px;border-top:1px solid #e4e9ed;padding-top:18px}
      .acc10-meal-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.acc10-meal-head h4{font-size:19px;margin:2px 0 3px}.acc10-meal-head p{font-size:12px;color:#6d7881;margin:0}
      .acc10-meal-tools{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-bottom:12px;padding:12px;background:#f7f9fb;border:1px solid #dfe5e9;border-radius:11px}.acc10-meal-tools label{font-size:11px;font-weight:850;color:#54616b}.acc10-meal-tools input{display:block;margin-top:5px;height:40px;border:1px solid #cbd4db;border-radius:9px;padding:0 9px;font:inherit}.acc10-meal-tools button{height:40px;border:1px solid #cbd4db;border-radius:9px;background:#fff;padding:0 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.acc10-meal-tools button.primary{background:#c8102e;border-color:#c8102e;color:#fff}
      .acc10-meal-table-wrap{overflow:auto;border:1px solid #dfe5e9;border-radius:11px}.acc10-meal-table{width:100%;border-collapse:collapse;min-width:760px}.acc10-meal-table th{padding:10px 12px;background:#f7f9fb;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#65717a;border-bottom:1px solid #dfe5e9}.acc10-meal-table td{padding:10px 12px;border-bottom:1px solid #edf0f2;font-size:12px}.acc10-meal-table tr:last-child td{border-bottom:0}.acc10-meal-date strong{display:block;font-size:13px}.acc10-meal-date small{display:block;color:#77828b;margin-top:2px}
      .acc10-meal-toggle{width:100%;min-height:38px;border:1px solid #d6dde2;border-radius:9px;background:#fff;color:#5e6972;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.acc10-meal-toggle.on{background:#e9f7ef;border-color:#bfe0cf;color:#176744}.acc10-meal-toggle.used{background:#eef2f5;border-color:#d3dbe1;color:#59646d;cursor:not-allowed}.acc10-meal-toggle.loading{opacity:.55}.acc10-meal-state{font-size:12px;font-weight:800;min-height:17px;color:#64717a}.acc10-meal-state.error{color:#a0001d}.acc10-meal-state.success{color:#16794f}

      /* Riepilogo */
      .acc10-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.acc10-summary-card{border:1px solid #dce3e8;border-radius:12px;background:#f9fafb;padding:15px}.acc10-summary-card h4{margin:0 0 10px;font-size:15px;color:#26343e}.acc10-summary-list{display:grid;gap:7px}.acc10-summary-row{display:flex;justify-content:space-between;gap:18px;font-size:12px}.acc10-summary-row span{color:#6a7580}.acc10-summary-row strong{text-align:right;color:#26343e}.acc10-summary-card.full{grid-column:1/-1}
      .acc10-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}.acc10-status.ok{background:#e7f6ed;color:#176744}.acc10-status.warn{background:#fff3cf;color:#7a5800}.acc10-status.info{background:#edf3f7;color:#486274}

      #acc10Footer{position:fixed;left:0;right:0;bottom:0;z-index:430;background:rgba(255,255,255,.97);border-top:1px solid #d6dde2;box-shadow:0 -4px 16px rgba(18,34,48,.06);padding:11px clamp(18px,2vw,34px);display:flex;align-items:center;justify-content:space-between;gap:14px;backdrop-filter:blur(8px)}
      #acc10Footer[hidden]{display:none!important}.acc10-footer-info strong{display:block;font-size:13px;color:#27343e}.acc10-footer-info span{display:block;font-size:11px;color:#73808a;margin-top:2px}.acc10-footer-actions{display:flex;gap:8px}.acc10-btn{min-height:46px;border:1px solid #cbd4db;border-radius:10px;background:#fff;color:#34414b;padding:9px 16px;font:inherit;font-size:13px;font-weight:900;cursor:pointer}.acc10-btn.primary{background:#c8102e;border-color:#c8102e;color:#fff}.acc10-btn.dark{background:#172734;border-color:#172734;color:#fff}.acc10-btn:disabled{opacity:.45;cursor:not-allowed}

      @media(max-width:1050px){.acc10-progress{grid-template-columns:repeat(5,minmax(110px,1fr))}.acc10-step small{display:none}#personModal.acc10-active #excelVerifyPanel .excel-verify-compare,#personModal.acc10-active #excelVerifyPanel .excel-verify-compare.ux-guided{grid-template-columns:1fr!important}#personModal.acc10-active #excelVerifyPanel .excel-verify-row:nth-child(5){grid-column:auto}#personModal.acc10-active #acc10PresenceHost .accredit-side{grid-template-columns:1fr 1fr}.current-state{grid-column:1/-1}.acc10-summary-grid{grid-template-columns:1fr}.acc10-summary-card.full{grid-column:auto}}
      @media(max-width:760px){#acc10Wizard{overflow:auto}.acc10-progress{display:flex;min-width:max-content}.acc10-step{min-width:155px}.acc10-step small{display:block}#personModal.acc10-active .person-panel-body{padding-left:10px!important;padding-right:10px!important}#personModal.acc10-active .person-form,#personModal.acc10-active .acc10-stage{padding:16px!important;border-radius:12px!important}#personModal.acc10-active .form-grid.two{grid-template-columns:1fr!important}#personModal.acc10-active #excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important}#personModal.acc10-active #excelVerifyPanel .xve-editor{grid-template-columns:1fr!important}#personModal.acc10-active #acc10PresenceHost .accredit-side{grid-template-columns:1fr}.current-state{grid-column:auto}.acc10-footer-info{display:none}.acc10-footer-actions{width:100%}.acc10-btn{flex:1;padding:9px 10px}.acc10-meal-head{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function buildUi() {
    const modal = $('personModal');
    const panel = modal?.querySelector('.person-panel');
    const body = panel?.querySelector('.person-panel-body');
    const form = $('personForm');
    const side = body?.querySelector('.accredit-side');
    if (!modal || !panel || !body || !form || !side || $('acc10Wizard')) return;

    const wizard = document.createElement('div');
    wizard.id = 'acc10Wizard';
    wizard.hidden = true;
    wizard.innerHTML = `<div class="acc10-progress">${STEPS.map(s => `<button class="acc10-step" type="button" data-acc10-step="${s.id}"><span class="n">${s.id}</span><span><strong>${esc(s.title)}</strong><small>${esc(s.subtitle)}</small></span></button>`).join('')}</div>`;
    panel.insertBefore(wizard, body);

    const verifyStage = document.createElement('section');
    verifyStage.id = 'acc10VerifyStage';
    verifyStage.className = 'acc10-stage';
    verifyStage.hidden = true;
    verifyStage.innerHTML = `<div class="acc10-stage-head"><div><div class="eyebrow">Passo 2 · Controllo dati</div><h3>Verifica dei dati importati</h3><p>Tutti i controlli sono visibili insieme. Correggi direttamente ciò che serve, senza cambiare pagina.</p></div></div><div class="acc10-help"><strong>Come leggerla:</strong> verde = dato già corretto; giallo = Excel e gestionale sono diversi; rosso = manca un dato e puoi compilarlo se disponibile. Nessun campo rosso blocca da solo l’accreditamento.</div><div id="acc10VerifyHost"></div><div id="acc10NoExcel" hidden>Questa persona non ha dati Excel da confrontare. Puoi compilare manualmente i dati disponibili e proseguire.</div>`;
    body.appendChild(verifyStage);

    const presenceStage = document.createElement('section');
    presenceStage.id = 'acc10PresenceStage';
    presenceStage.className = 'acc10-stage';
    presenceStage.hidden = true;
    presenceStage.innerHTML = `<div class="acc10-stage-head"><div><div class="eyebrow">Passo 4 · Movimento</div><h3>Presenza al Campo</h3><p>Registra l’ingresso o l’uscita. Il movimento viene sincronizzato immediatamente su tutte le postazioni.</p></div></div><div id="acc10PresenceHost"></div>`;
    body.appendChild(presenceStage);

    const summaryStage = document.createElement('section');
    summaryStage.id = 'acc10SummaryStage';
    summaryStage.className = 'acc10-stage';
    summaryStage.hidden = true;
    summaryStage.innerHTML = `<div class="acc10-stage-head"><div><div class="eyebrow">Passo 5 · Controllo finale</div><h3>Riepilogo accredito</h3><p>Controlla rapidamente le informazioni principali. Puoi tornare a qualunque passaggio prima di chiudere.</p></div></div><div id="acc10Summary"></div>`;
    body.appendChild(summaryStage);

    const footer = document.createElement('div');
    footer.id = 'acc10Footer';
    footer.hidden = true;
    footer.innerHTML = `<div class="acc10-footer-info"><strong id="acc10FooterTitle">Passo 1 di 5</strong><span id="acc10FooterSubtitle">Completa i dati disponibili</span></div><div class="acc10-footer-actions"><button id="acc10Back" class="acc10-btn" type="button">← Indietro</button><button id="acc10Next" class="acc10-btn primary" type="button">Salva e continua →</button></div>`;
    panel.appendChild(footer);

    wizard.addEventListener('click', event => {
      const button = event.target.closest('[data-acc10-step]');
      if (button) goStep(Number(button.dataset.acc10Step));
    });
    $('acc10Back')?.addEventListener('click', () => goStep(step - 1));
    $('acc10Next')?.addEventListener('click', nextStep);

    formObserver = new MutationObserver(() => {
      if (!active) return;
      classifyFormNodes();
      syncVerifyPanel();
      applyStep();
    });
    formObserver.observe(form, { childList:true, subtree:false });

    verifyObserver = new MutationObserver(() => {
      if (!active) return;
      syncVerifyPanel();
      if (step === 5) renderSummary();
    });
    verifyObserver.observe(body, { childList:true, subtree:true });
  }

  function classifyFormNodes() {
    const form = $('personForm');
    if (!form) return;
    [...form.children].forEach(node => {
      if (node.matches('input[type="hidden"]')) return;
      node.classList.add('acc10-form-node');
      if (node.classList.contains('person-save-row') || node.classList.contains('danger-zone')) {
        node.dataset.acc10Step = 'hidden';
        return;
      }
      if (node.id === 'personFormMessage') {
        node.dataset.acc10Step = 'both';
        return;
      }
      const text = (node.textContent || '').toLocaleLowerCase('it');
      const ids = [...node.querySelectorAll('[id]')].map(el => el.id).join(' ');
      const serviceIds = /personBadgeNumber|personBadgeDelivered|personGadgetDelivered|personPernotto|personQrActive|personArrival|personDeparture|personNotes|personCourses|personQrBox|personDietaryPresent|personDietaryDescription/i;
      if (serviceIds.test(ids) || /^campo$/i.test((node.textContent || '').trim()) || /esigenze alimentari|qr personale|identificativo operativo/.test(text)) node.dataset.acc10Step = '3';
      else node.dataset.acc10Step = '1';
    });
  }

  function syncVerifyPanel() {
    const host = $('acc10VerifyHost');
    const side = document.querySelector('#personModal .accredit-side');
    const panel = $('excelVerifyPanel');
    if (!host || !side) return;
    if (panel && panel.parentElement !== host) host.appendChild(panel);
    const noExcel = $('acc10NoExcel');
    if (noExcel) noExcel.hidden = !!(panel && !panel.hidden);
  }

  function movePresenceIntoStage() {
    const side = document.querySelector('#personModal .accredit-side');
    const host = $('acc10PresenceHost');
    if (side && host && side.parentElement !== host) host.appendChild(side);
  }

  function restoreOriginalStructure() {
    const body = document.querySelector('#personModal .person-panel-body');
    const form = $('personForm');
    const side = document.querySelector('#personModal .accredit-side');
    const panel = $('excelVerifyPanel');
    if (body && form && side && side.parentElement !== body) body.insertBefore(side, $('acc10VerifyStage') || null);
    if (side && panel && panel.parentElement !== side) {
      const state = side.querySelector('.current-state');
      side.insertBefore(panel, state || side.firstChild);
    }
    form?.removeAttribute('hidden');
    [...(form?.children || [])].forEach(node => {
      node.classList.remove('acc10-show');
      if (node.classList.contains('acc10-form-node')) node.style.removeProperty('display');
    });
  }

  function disableOldWizard() {
    const body = document.querySelector('#personModal .person-panel-body');
    body?.classList.remove('ux-wizard-active');
    if ($('uxAccreditationWizard')) $('uxAccreditationWizard').hidden = true;
    if ($('uxWizardFooter')) $('uxWizardFooter').hidden = true;
  }

  function enable() {
    const modal = $('personModal');
    if (!modal || modal.hidden || activeView() !== 'accreditamento') return;
    active = true;
    currentPersonId = $('personId')?.value || null;
    step = 1;
    modal.classList.add('acc10-active');
    disableOldWizard();
    $('acc10Wizard').hidden = false;
    $('acc10Footer').hidden = false;
    classifyFormNodes();
    syncVerifyPanel();
    movePresenceIntoStage();
    applyStep();
    guardOldWizard();
  }

  function disable() {
    if (!active) return;
    active = false;
    clearTimeout(guardTimer);
    $('personModal')?.classList.remove('acc10-active');
    if ($('acc10Wizard')) $('acc10Wizard').hidden = true;
    if ($('acc10Footer')) $('acc10Footer').hidden = true;
    ['acc10VerifyStage','acc10PresenceStage','acc10SummaryStage'].forEach(id => { if ($(id)) $(id).hidden = true; });
    restoreOriginalStructure();
  }

  function guardOldWizard() {
    if (!active) return;
    disableOldWizard();
    guardTimer = setTimeout(guardOldWizard, 180);
  }

  function goStep(next) {
    if (!active) return;
    step = Math.max(1, Math.min(STEPS.length, Number(next) || 1));
    applyStep();
    const panel = document.querySelector('#personModal .person-panel');
    if (panel) panel.scrollTo({ top: 0, behavior:'smooth' });
  }

  function applyStep() {
    if (!active) return;
    disableOldWizard();
    syncVerifyPanel();
    movePresenceIntoStage();

    const form = $('personForm');
    const verify = $('acc10VerifyStage');
    const presence = $('acc10PresenceStage');
    const summary = $('acc10SummaryStage');

    if (form) {
      form.hidden = ![1,3].includes(step);
      [...form.children].forEach(node => {
        if (!node.classList.contains('acc10-form-node')) return;
        const target = node.dataset.acc10Step;
        const show = target === String(step) || (target === 'both' && [1,3].includes(step));
        node.classList.toggle('acc10-show', show);
      });
      let help = $('acc10FormHelp');
      if (!help) {
        help = document.createElement('div');
        help.id = 'acc10FormHelp';
        help.className = 'acc10-help';
        form.insertBefore(help, form.querySelector(':scope > .acc10-form-node') || null);
      }
      if ([1,3].includes(step)) {
        help.hidden = false;
        help.innerHTML = step === 1
          ? '<strong>Cosa fare ora:</strong> controlla l’identità della persona e completa solo i dati che conosci. I campi non disponibili possono restare vuoti.'
          : '<strong>Cosa fare ora:</strong> imposta materiale consegnato, permanenza e QR. Subito sotto trovi anche i pasti della persona, senza uscire dall’accreditamento.';
      } else help.hidden = true;
    }

    if (verify) verify.hidden = step !== 2;
    if (presence) presence.hidden = step !== 4;
    if (summary) summary.hidden = step !== 5;

    document.querySelectorAll('#acc10Wizard .acc10-step').forEach(button => {
      const n = Number(button.dataset.acc10Step);
      button.classList.toggle('active', n === step);
      button.classList.toggle('done', n < step);
    });

    const meta = STEPS[step - 1];
    if ($('acc10FooterTitle')) $('acc10FooterTitle').textContent = `Passo ${step} di ${STEPS.length} · ${meta.title}`;
    if ($('acc10FooterSubtitle')) $('acc10FooterSubtitle').textContent = meta.subtitle;
    if ($('acc10Back')) $('acc10Back').disabled = step === 1;
    if ($('acc10Next')) {
      $('acc10Next').className = `acc10-btn ${step === 5 ? 'dark' : 'primary'}`;
      $('acc10Next').textContent = step === 5 ? 'Chiudi accredito ✓' : ([1,3].includes(step) ? 'Salva e continua →' : 'Continua →');
    }

    if (step === 3) loadMealEditor();
    if (step === 5) renderSummary();
  }

  async function saveFormAndWait() {
    const form = $('personForm');
    const message = $('personFormMessage');
    if (!form) return true;
    const oldText = message?.textContent || '';
    form.requestSubmit();
    for (let i = 0; i < 35; i += 1) {
      await sleep(100);
      const text = message?.textContent || '';
      if (/modifiche salvate|scheda aggiornata/i.test(text)) return true;
      if (/obbligatori|seleziona almeno|non riusc|già associato|modificata da un'altra|errore/i.test(text)) {
        toast(text || 'Controlla i dati prima di continuare.', 'error');
        return false;
      }
      if (text && text !== oldText && !/salvataggio/i.test(text)) return true;
    }
    return true;
  }

  async function nextStep() {
    if (!active) return;
    const button = $('acc10Next');
    if (button) button.disabled = true;
    try {
      if (step === 5) {
        document.querySelector('#personModal [data-close-person]')?.click();
        return;
      }
      if ([1,3].includes(step)) {
        const ok = await saveFormAndWait();
        if (!ok) return;
      }
      goStep(step + 1);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function loadServices() {
    if (services.length) return;
    const { data, error } = await client.from('servizi_pasto')
      .select('id,data,tipo,attivo')
      .gte('data', CAMP_START)
      .lte('data', CAMP_END)
      .order('data', { ascending:true });
    if (error) throw error;
    services = (data || []).filter(row => row.attivo !== false).sort((a,b) => String(a.data).localeCompare(String(b.data)) || MEALS.indexOf(a.tipo) - MEALS.indexOf(b.tipo));
    servicesById = new Map(services.map(row => [row.id, row]));
  }

  async function loadTickets() {
    ticketByKey = new Map();
    tickets = [];
    if (!currentPersonId) return;
    const { data, error } = await client.from('persone_pasti')
      .select('id,servizio_pasto_id,previsto,consumato,ticket_attivo,consumato_at')
      .eq('persona_id', currentPersonId)
      .limit(300);
    if (error) throw error;
    tickets = data || [];
    tickets.forEach(ticket => {
      const service = servicesById.get(ticket.servizio_pasto_id);
      if (service) ticketByKey.set(keyFor(service.data, service.tipo), ticket);
    });
  }

  function formatDate(date) {
    const [y,m,d] = String(date).split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', { weekday:'short', day:'2-digit', month:'2-digit' }).format(new Date(y,m-1,d,12));
  }

  function mealState(date, type) {
    const ticket = ticketByKey.get(keyFor(date, type));
    if (!ticket || ticket.previsto !== true || ticket.ticket_attivo === false) return { state:'off', label:'Non previsto', disabled:false };
    if (ticket.consumato === true) return { state:'used', label:'✓ Utilizzato', disabled:true };
    return { state:'on', label:'✓ Previsto', disabled:false };
  }

  function ensureMealEditor() {
    const form = $('personForm');
    if (!form) return null;
    let block = $('acc10MealEditor');
    if (!block) {
      block = document.createElement('section');
      block.id = 'acc10MealEditor';
      block.className = 'acc10-meals acc10-form-node';
      block.dataset.acc10Step = '3';
      block.innerHTML = `<div class="acc10-meal-head"><div><div class="panel-kicker">Pasti della persona</div><h4>Ticket Colazione · Pranzo · Cena</h4><p>Gestisci i pasti direttamente qui. Non uscirai più dal flusso di accreditamento.</p></div><div id="acc10MealState" class="acc10-meal-state"></div></div><div class="acc10-meal-tools"><label>Dal<input id="acc10MealFrom" type="date" min="${CAMP_START}" max="${CAMP_END}"></label><label>Al<input id="acc10MealTo" type="date" min="${CAMP_START}" max="${CAMP_END}"></label><button id="acc10MealUsePeriod" type="button">Usa periodo persona</button><button id="acc10MealAssign" class="primary" type="button">Assegna tutti i pasti</button><button id="acc10MealRemove" type="button">Rimuovi non utilizzati</button></div><div id="acc10MealTable" class="acc10-meal-table-wrap"></div>`;
      form.appendChild(block);
      block.querySelector('#acc10MealUsePeriod')?.addEventListener('click', () => {
        $('acc10MealFrom').value = $('personArrival')?.value || CAMP_START;
        $('acc10MealTo').value = $('personDeparture')?.value || CAMP_END;
      });
      block.querySelector('#acc10MealAssign')?.addEventListener('click', () => setMealRange(true));
      block.querySelector('#acc10MealRemove')?.addEventListener('click', () => setMealRange(false));
      block.querySelector('#acc10MealTable')?.addEventListener('click', event => {
        const button = event.target.closest('[data-acc10-meal]');
        if (!button || button.disabled) return;
        toggleMeal(button.dataset.date, button.dataset.type, button);
      });
    }
    return block;
  }

  async function loadMealEditor() {
    const block = ensureMealEditor();
    if (!block || !client || !currentPersonId) return;
    block.classList.add('acc10-show');
    $('acc10MealState').textContent = 'Caricamento pasti…';
    $('acc10MealState').className = 'acc10-meal-state';
    try {
      await loadServices();
      await loadTickets();
      $('acc10MealFrom').value = $('personArrival')?.value || CAMP_START;
      $('acc10MealTo').value = $('personDeparture')?.value || CAMP_END;
      renderMeals();
      $('acc10MealState').textContent = `${tickets.filter(t => t.previsto && t.ticket_attivo !== false).length} ticket attivi`;
    } catch (error) {
      $('acc10MealState').textContent = `Pasti non disponibili: ${error.message}`;
      $('acc10MealState').className = 'acc10-meal-state error';
    }
  }

  function renderMeals() {
    const host = $('acc10MealTable');
    if (!host) return;
    const dates = [...new Set(services.map(row => row.data))];
    host.innerHTML = `<table class="acc10-meal-table"><thead><tr><th>Data</th>${MEALS.map(m => `<th>${MEAL_LABELS[m]}</th>`).join('')}</tr></thead><tbody>${dates.map(date => `<tr><td class="acc10-meal-date"><strong>${esc(formatDate(date))}</strong><small>${esc(date)}</small></td>${MEALS.map(type => { const s = mealState(date,type); return `<td><button class="acc10-meal-toggle ${s.state}" type="button" data-acc10-meal data-date="${date}" data-type="${type}" ${s.disabled ? 'disabled' : ''}>${s.label}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  }

  async function toggleMeal(date, type, button) {
    if (mealBusy || !currentPersonId) return;
    const current = mealState(date, type);
    const previsto = current.state !== 'on';
    mealBusy = true;
    button.classList.add('loading');
    const { data, error } = await client.rpc('imposta_ticket_pasto', {
      p_persona_id: currentPersonId,
      p_data: date,
      p_tipo: type,
      p_previsto: previsto,
      p_fonte: 'accreditamento'
    });
    mealBusy = false;
    button.classList.remove('loading');
    if (error) { toast(`Pasto non aggiornato: ${error.message}`, 'error'); return; }
    if (data?.status === 'ticket_gia_utilizzato') { toast('Il ticket è già stato utilizzato e non può essere rimosso.', 'error'); return; }
    await loadTickets();
    renderMeals();
    $('acc10MealState').textContent = `${tickets.filter(t => t.previsto && t.ticket_attivo !== false).length} ticket attivi`;
    $('acc10MealState').className = 'acc10-meal-state success';
  }

  function datesInRange(from, to) {
    return [...new Set(services.map(row => row.data))].filter(date => date >= from && date <= to);
  }

  async function setMealRange(previsto) {
    if (mealBusy || !currentPersonId) return;
    const from = $('acc10MealFrom')?.value;
    const to = $('acc10MealTo')?.value;
    if (!from || !to || from > to) { toast('Controlla il periodo dei pasti.', 'error'); return; }
    const dates = datesInRange(from, to);
    if (!dates.length) { toast('Nessun servizio pasto nel periodo selezionato.', 'error'); return; }
    if (!previsto && !window.confirm('Rimuovere i ticket non ancora utilizzati nel periodo selezionato?')) return;
    mealBusy = true;
    $('acc10MealAssign').disabled = true;
    $('acc10MealRemove').disabled = true;
    $('acc10MealState').textContent = previsto ? 'Assegnazione pasti…' : 'Rimozione pasti…';
    try {
      const tasks = [];
      dates.forEach(date => MEALS.forEach(type => tasks.push({ date, type })));
      for (let i = 0; i < tasks.length; i += 6) {
        const batch = tasks.slice(i, i + 6);
        await Promise.all(batch.map(item => client.rpc('imposta_ticket_pasto', {
          p_persona_id: currentPersonId,
          p_data: item.date,
          p_tipo: item.type,
          p_previsto: previsto,
          p_fonte: 'accreditamento'
        })));
      }
      await loadTickets();
      renderMeals();
      $('acc10MealState').textContent = previsto ? 'Pasti assegnati nel periodo.' : 'Ticket non utilizzati rimossi.';
      $('acc10MealState').className = 'acc10-meal-state success';
    } catch (error) {
      $('acc10MealState').textContent = `Operazione non completata: ${error.message}`;
      $('acc10MealState').className = 'acc10-meal-state error';
    } finally {
      mealBusy = false;
      $('acc10MealAssign').disabled = false;
      $('acc10MealRemove').disabled = false;
    }
  }

  function renderSummary() {
    const host = $('acc10Summary');
    if (!host) return;
    const types = [...document.querySelectorAll('#personTypes input:checked')].map(i => i.nextElementSibling?.textContent || i.value).filter(Boolean).join(' + ') || '—';
    const verifyState = $('excelVerifyState')?.textContent?.trim() || ($('excelVerifyPanel')?.hidden ? 'Non necessaria' : 'Da verificare');
    const present = $('personPresenceState')?.textContent?.trim() || '—';
    const activeMealCount = tickets.filter(t => t.previsto === true && t.ticket_attivo !== false).length;
    const badge = $('personBadgeDelivered')?.checked ? 'Consegnato' : 'Non consegnato';
    const gadget = $('personGadgetDelivered')?.checked ? 'Consegnato' : 'Non consegnato';
    const overnight = $('personPernotto')?.checked ? 'Sì' : 'No';
    const qr = $('personQrActive')?.checked ? 'Attivo' : 'Disattivato';
    host.innerHTML = `<div class="acc10-summary-grid">
      <section class="acc10-summary-card"><h4>Anagrafica</h4><div class="acc10-summary-list"><div class="acc10-summary-row"><span>Persona</span><strong>${esc(personName())}</strong></div><div class="acc10-summary-row"><span>Codice fiscale</span><strong>${esc($('personCf')?.value || '—')}</strong></div><div class="acc10-summary-row"><span>Tipologia</span><strong>${esc(types)}</strong></div><div class="acc10-summary-row"><span>Comitato</span><strong>${esc($('personComitato')?.value || '—')}</strong></div></div></section>
      <section class="acc10-summary-card"><h4>Controlli</h4><div class="acc10-summary-list"><div class="acc10-summary-row"><span>Verifica Excel</span><strong><span class="acc10-status ${/verificato/i.test(verifyState) ? 'ok' : 'warn'}">${esc(verifyState)}</span></strong></div><div class="acc10-summary-row"><span>Presenza</span><strong>${esc(present)}</strong></div><div class="acc10-summary-row"><span>QR</span><strong>${esc(qr)}</strong></div></div></section>
      <section class="acc10-summary-card"><h4>Permanenza e materiale</h4><div class="acc10-summary-list"><div class="acc10-summary-row"><span>Arrivo</span><strong>${esc($('personArrival')?.value || '—')}</strong></div><div class="acc10-summary-row"><span>Partenza</span><strong>${esc($('personDeparture')?.value || '—')}</strong></div><div class="acc10-summary-row"><span>Pernottamento</span><strong>${overnight}</strong></div><div class="acc10-summary-row"><span>Badge</span><strong>${badge}</strong></div><div class="acc10-summary-row"><span>Gadget</span><strong>${gadget}</strong></div></div></section>
      <section class="acc10-summary-card"><h4>Pasti</h4><div class="acc10-summary-list"><div class="acc10-summary-row"><span>Ticket attivi</span><strong>${activeMealCount}</strong></div><div class="acc10-summary-row"><span>Gestione</span><strong><span class="acc10-status info">Integrata nell’accredito</span></strong></div></div></section>
      <section class="acc10-summary-card full"><h4>Prima di chiudere</h4><div style="font-size:13px;line-height:1.55;color:#5d6972">Se qualcosa non è corretto, usa i passaggi in alto per tornare direttamente alla sezione da modificare. La chiusura dell’accreditamento non cancella né blocca successive correzioni.</div></section>
    </div>`;
  }

  function interceptMealsNavigation() {
    document.addEventListener('click', event => {
      if (!active) return;
      const target = event.target.closest('#excelVerifyMeals,.xve-btn.meals,[data-open-view="pasti"]');
      if (!target || !target.closest('#personModal')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      goStep(3);
      setTimeout(() => $('acc10MealEditor')?.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
    }, true);
  }

  function watchModal() {
    const modal = $('personModal');
    if (!modal) return;
    const sync = () => {
      if (modal.hidden) { disable(); return; }
      setTimeout(() => {
        if (activeView() === 'accreditamento') enable();
        else disable();
      }, 80);
    };
    modalObserver = new MutationObserver(sync);
    modalObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });
    document.addEventListener('click', event => {
      if (event.target.closest('.app-nav-btn')) setTimeout(sync, 80);
      if (event.target.closest('[data-person-id]')) setTimeout(sync, 140);
    });
  }

  async function init() {
    if (!config || !window.supabase) return;
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if ($('personModal') && $('personForm')) break;
      await sleep(80);
    }
    if (!$('personModal') || !$('personForm')) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    buildUi();
    interceptMealsNavigation();
    watchModal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
