(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const NAV_ORDER = ['dashboard','accreditamento','persone','turni','pernottamenti','pasti','mezzi','situazione','situazione-campo','import-excel'];
  const NAV_LABELS = {
    dashboard:['⌂','Panoramica'], accreditamento:['✓','Accredito'], persone:['👥','Persone'], turni:['🗓','Turni'],
    pernottamenti:['⛺','Alloggi'], pasti:['🍽','Pasti'], mezzi:['🚑','Mezzi'], situazione:['▦','Situazione'],
    'situazione-campo':['▦','Situazione'], 'import-excel':['⇩','Import Excel']
  };
  const STEP_COPY = {
    1:['1 · Identifica e completa la persona','Controlla i dati essenziali. Se qualcosa non era presente nell’Excel, inseriscilo manualmente: puoi sempre tornare indietro e correggerlo.'],
    2:['2 · Controlla i dati importati','Intervieni solo sulle voci “Da controllare” o “Da compilare”. Le voci verdi non richiedono alcuna azione.'],
    3:['3 · Servizi, materiali e permanenza','Conferma badge, gadget, QR, pernottamento, arrivo/partenza e pasti. I dati mancanti possono essere compilati direttamente.'],
    4:['4 · Registra la presenza','Ultimo passaggio: registra entrata o uscita. Se serve correggere qualcosa usa “Indietro” senza perdere il lavoro.']
  };
  let timer = null;

  function injectStyles() {
    if ($('uxSegreteriaV3Styles')) return;
    const style = document.createElement('style');
    style.id = 'uxSegreteriaV3Styles';
    style.textContent = `
      :root{--ops-bg:#f2f5f7;--ops-surface:#fff;--ops-ink:#18232d;--ops-muted:#66727d;--ops-line:#dce2e7;--ops-dark:#16212b;--ops-dark2:#202d38;--ops-red:#c8102e;--ops-green:#17734d}
      body.reserved-body{background:var(--ops-bg)!important;color:var(--ops-ink)!important}
      .reserved-topbar.app-topbar{background:var(--ops-dark)!important;border:0!important;box-shadow:0 2px 14px rgba(10,20,30,.16)}
      .reserved-topbar .reserved-brand strong,.reserved-topbar .reserved-brand span{color:#fff!important}.reserved-topbar .reserved-public-link{color:#eef3f6!important;border-color:#53616d!important;background:#202d38!important}.reserved-topbar #logoutButton{background:#fff!important;color:#26333d!important;border-color:#fff!important}
      .reserved-statusbar{background:var(--ops-dark2)!important;border-top:1px solid rgba(255,255,255,.08)!important}.reserved-statusbar .mini-status{background:transparent!important;border:0!important;color:#dce5eb!important;padding:7px 12px!important}.reserved-statusbar .mini-status-label{color:#9fb0bc!important;font-size:10px!important}.reserved-statusbar .mini-status strong{color:#fff!important;font-size:12px!important}
      #standardWorkspace.reserved-app.container{padding-top:18px!important;padding-bottom:34px!important;width:100%!important;max-width:none!important}
      #standardWorkspace .app-shell-head{background:#fff!important;border:1px solid var(--ops-line)!important;border-radius:10px!important;padding:14px 16px!important;align-items:center!important;box-shadow:0 4px 14px rgba(22,33,43,.035)!important}
      #standardWorkspace .app-shell-head h1{font-size:25px!important;font-weight:850!important;color:var(--ops-ink)!important}#standardWorkspace .app-shell-head p{font-size:12px!important;color:var(--ops-muted)!important}
      #standardWorkspace .app-nav{background:#f3f5f7!important;border:1px solid #e2e7eb!important;border-radius:9px!important;padding:4px!important;gap:3px!important}
      #standardWorkspace .app-nav-btn{min-height:46px!important;padding:9px 13px!important;font-size:13px!important;font-weight:850!important;color:#4d5963!important;border-radius:7px!important}.ux-nav-icon{font-size:16px!important}.ux-nav-label{font-size:13px!important}.app-nav-btn.active{background:#fff!important;color:var(--ops-red)!important;box-shadow:0 2px 6px rgba(20,30,40,.1)!important}
      #standardWorkspace .view-heading,#standardWorkspace .vehicle-view-head,#standardWorkspace .shift-view-head,#standardWorkspace .meals-admin-head,#standardWorkspace .ix-head{align-items:center!important;border-bottom:1px solid var(--ops-line)!important;padding:16px 2px 13px!important;margin:8px 0 14px!important}
      #standardWorkspace .view-heading h2,#standardWorkspace .vehicle-view-head h2,#standardWorkspace .shift-view-head h2,#standardWorkspace .meals-admin-head h2,#standardWorkspace .ix-head h2{font-size:29px!important;font-weight:850!important;color:var(--ops-ink)!important}#standardWorkspace .view-heading p,#standardWorkspace .vehicle-view-head p,#standardWorkspace .shift-view-head p,#standardWorkspace .meals-admin-head p,#standardWorkspace .ix-head p{font-size:13px!important;line-height:1.45!important;color:var(--ops-muted)!important}
      #standardWorkspace .btn,#standardWorkspace button.btn{min-height:44px!important;padding:10px 15px!important;font-size:13px!important;font-weight:850!important;border-radius:7px!important}.btn.primary{background:var(--ops-red)!important;border-color:var(--ops-red)!important}
      #standardWorkspace input,#standardWorkspace select,#standardWorkspace textarea,.person-panel input,.person-panel select,.person-panel textarea,.vehicle-modal input,.vehicle-modal select,.vehicle-modal textarea,.shift-modal input,.shift-modal select,.shift-modal textarea{font-size:14px!important}.person-form label,.new-person-form label,.vehicle-grid label,.activation-form label,.shift-form-grid label{font-size:13px!important;color:#35414b!important}.person-form .form-section-title{font-size:17px!important;font-weight:850!important;color:#24313b!important;margin-top:22px!important;padding-bottom:7px!important;border-bottom:1px solid #e4e9ed!important}
      #standardWorkspace .metric-card{background:#fff!important;border:1px solid var(--ops-line)!important;border-left:4px solid #96a2ac!important;border-radius:8px!important;padding:15px 17px!important}.metric-card.live{border-left-color:var(--ops-green)!important}.metric-card small{font-size:11px!important}.metric-card strong{font-size:27px!important}.dashboard-panel{border:1px solid var(--ops-line)!important;border-radius:9px!important}
      #standardWorkspace .data-toolbar,#standardWorkspace .vehicle-toolbar,#standardWorkspace .shift-filter-bar,#standardWorkspace .accredit-search-panel{background:#fff!important;border:1px solid var(--ops-line)!important;border-radius:8px!important;padding:11px!important}.table-card,.vehicle-table-card,.ix-table-wrap{background:#fff!important;border:1px solid var(--ops-line)!important;border-radius:8px!important;overflow:auto!important}.people-table th,.vehicle-table th,.ix-table th{background:#edf1f4!important;color:#52606b!important;font-size:11px!important;padding:12px 13px!important}.people-table td,.vehicle-table td,.ix-table td{font-size:13px!important;padding:12px 13px!important}
      .accredit-row{background:#fff!important;border:1px solid var(--ops-line)!important;border-radius:8px!important;margin-bottom:7px!important;padding:13px 14px!important}.accredit-person strong{font-size:15px!important}.accredit-person small,.accredit-meta{font-size:12px!important;line-height:1.45!important}.excel-verify-list-badge{font-size:10px!important;padding:5px 8px!important}
      .person-panel,.new-person-card,.shift-modal-card,.vehicle-modal-card,.overnight-modal-card,.admin-tools-card{background:var(--ops-bg)!important}.person-panel-head,.vehicle-modal-head,.shift-modal-head,.overnight-modal-head,.admin-tools-head{background:#fff!important;min-height:68px!important;align-items:center!important}.person-panel-head h2,.vehicle-modal-head h2,.shift-modal-head h2,.overnight-modal-head h2,.admin-tools-head h2{font-size:27px!important}.person-panel-body{max-width:1500px!important;margin:0 auto!important;width:100%!important;box-sizing:border-box!important;padding-top:18px!important}.person-form,.accredit-side,.vehicle-panel,.shift-linked,.shift-candidates,.overnight-side-card{background:#fff!important;border:1px solid var(--ops-line)!important;border-radius:9px!important}.person-form{padding:20px!important}.accredit-side{padding:18px!important}
      .ux-wizard-bar{top:0!important;background:#fff!important;padding:12px clamp(14px,2vw,28px)!important;border-bottom:1px solid var(--ops-line)!important;gap:8px!important}.ux-wizard-step{min-height:46px!important;padding:9px 12px!important;font-size:13px!important;border-radius:7px!important}.ux-wizard-step .num{width:28px!important;height:28px!important;font-size:12px!important}.ux-wizard-step .label{font-size:13px!important;font-weight:850!important}.ux-wizard-step.active{background:#fff0f2!important;color:#9f0821!important}.ux-wizard-step.active .num{background:var(--ops-red)!important}.ux-wizard-step.done{background:#eef8f3!important;color:#126543!important}.ux-wizard-context{font-size:11px!important}
      .ux-step-guide{max-width:1500px;margin:14px auto 0;padding:14px 16px;background:#eaf0f5;border-left:4px solid #52738d;border-radius:7px;color:#314653}.ux-step-guide strong{display:block;font-size:15px;margin-bottom:4px}.ux-step-guide span{display:block;font-size:13px;line-height:1.5}.ux-wizard-footer{padding:12px clamp(14px,2vw,28px)!important;min-height:66px!important}.ux-wizard-footer .ux-step-info{font-size:13px!important}.ux-wizard-btn{min-height:44px!important;padding:10px 17px!important;font-size:13px!important;border-radius:7px!important}.ux-wizard-btn.primary{background:var(--ops-red)!important;border-color:var(--ops-red)!important}
      .excel-verify-panel{border:1px solid var(--ops-line)!important;background:#fff!important}.excel-verify-panel-head{padding:15px 16px!important;background:#f5f7f9!important}.excel-verify-panel-head h4{font-size:18px!important}.excel-verify-panel-head p{font-size:12px!important}.excel-verify-state{font-size:11px!important;padding:6px 9px!important}.excel-verify-body{padding:16px!important}.excel-verify-row{padding:13px!important;grid-template-columns:125px minmax(0,1fr) minmax(0,1fr) auto!important;gap:10px!important}.excel-verify-row>strong{font-size:11px!important}.excel-verify-value{font-size:13px!important}.excel-verify-value small{font-size:10px!important}.excel-verify-match{font-size:10px!important;padding:5px 8px!important}.excel-verify-button{min-height:39px!important;padding:9px 11px!important;font-size:12px!important}.excel-verify-note{font-size:13px!important}
      .ops-verify-help{margin:0 0 12px;padding:13px 14px;border:1px solid #cfdbe4;border-left:4px solid #52738d;border-radius:7px;background:#f0f5f8}.ops-verify-help strong{display:block;font-size:14px;margin-bottom:4px}.ops-verify-help p{margin:0;font-size:12px;line-height:1.5;color:#405563}.ops-verify-help-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.ops-verify-help-actions button,.ops-inline-edit{border:1px solid #cdd5db;background:#fff;border-radius:6px;padding:7px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.ops-inline-edit{display:block;margin-top:7px}.excel-verify-match.check{background:#fff0cf!important;color:#775000!important}.excel-verify-match.manual{background:#eaf0f5!important;color:#35556b!important}
      .ops-next-day{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;background:#eef2f5;color:#5b6670;font-size:9px;font-weight:850}.ops-import-auto-note{margin:10px 0 0;padding:10px 12px;border-radius:7px;background:#eef8f3;border:1px solid #d2e9dd;color:#245f45;font-size:11px;line-height:1.45}
      @media(max-width:980px){#standardWorkspace .app-nav-btn{min-height:43px!important;padding:8px 11px!important}.ux-nav-label{font-size:12px!important}.excel-verify-row{grid-template-columns:105px 1fr!important}.excel-verify-row .excel-verify-match{grid-column:2}}
      @media(max-width:700px){#standardWorkspace .app-shell-head{padding:12px!important}.ux-wizard-footer{display:grid!important;grid-template-columns:1fr!important}.ux-wizard-footer .ux-actions button{flex:1}.excel-verify-row{grid-template-columns:1fr!important}.excel-verify-row .excel-verify-match{grid-column:auto!important}}
    `;
    document.head.appendChild(style);
  }

  function navKey(button) { return `${button.dataset.view || ''}|${button.textContent.trim()}`; }

  function reorderNavigation() {
    const nav = document.querySelector('#standardWorkspace .app-nav');
    if (!nav) return;
    const buttons = [...nav.querySelectorAll('.app-nav-btn')];
    const desired = [...buttons].sort((a,b) => {
      const ai = NAV_ORDER.indexOf(a.dataset.view), bi = NAV_ORDER.indexOf(b.dataset.view);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    const currentIds = buttons.map(b => b.dataset.view).join('|');
    const desiredIds = desired.map(b => b.dataset.view).join('|');
    if (currentIds !== desiredIds) desired.forEach(b => nav.appendChild(b));

    desired.forEach(button => {
      const meta = NAV_LABELS[button.dataset.view];
      if (!meta) return;
      const marker = `${button.dataset.view}:${meta[1]}`;
      if (button.dataset.opsV3Nav === marker) return;
      button.dataset.opsV3Nav = marker;
      button.title = meta[1];
      button.innerHTML = `<span class="ux-nav-icon" aria-hidden="true">${meta[0]}</span><span class="ux-nav-label">${meta[1]}</span>`;
    });
  }

  function activeWizardStep() {
    const buttons = [...document.querySelectorAll('.ux-wizard-step')];
    const idx = buttons.findIndex(b => b.classList.contains('active'));
    return idx >= 0 ? idx + 1 : 1;
  }
  function clickWizardStep(step) { [...document.querySelectorAll('.ux-wizard-step')][step-1]?.click(); }

  function ensureStepGuide() {
    const bar = document.querySelector('.ux-wizard-bar');
    const body = document.querySelector('#personModal .person-panel-body');
    if (!bar || !body?.classList.contains('ux-wizard-active')) return;
    let guide = $('uxStepGuide');
    if (!guide) {
      guide = document.createElement('div'); guide.id = 'uxStepGuide'; guide.className = 'ux-step-guide'; bar.insertAdjacentElement('afterend',guide);
    }
    const step = activeWizardStep();
    if (guide.dataset.step !== String(step)) {
      guide.dataset.step = String(step);
      guide.innerHTML = `<strong>${STEP_COPY[step][0]}</strong><span>${STEP_COPY[step][1]}</span>`;
    }
    const footer = document.querySelector('.ux-wizard-footer');
    if (!footer) return;
    const info = footer.querySelector('.ux-step-info');
    if (info && info.textContent !== `Passaggio ${step} di 4`) info.textContent = `Passaggio ${step} di 4`;
    const actions = [...footer.querySelectorAll('button')];
    const back = actions.find(b => /indietro/i.test(b.textContent));
    const next = actions.find(b => /avanti|continua|conclud|completa/i.test(b.textContent));
    if (back && back.textContent !== '← Indietro') back.textContent = '← Indietro';
    const nextLabel = step < 4 ? 'Salva e continua →' : 'Completa accreditamento';
    if (next && next.textContent !== nextLabel) next.textContent = nextLabel;
  }

  function valueText(row,index) {
    const el = row.querySelectorAll('.excel-verify-value')[index];
    if (!el) return '';
    const clone = el.cloneNode(true); clone.querySelectorAll('small,button').forEach(x => x.remove());
    return clone.textContent.trim();
  }

  function enhanceVerification() {
    const body = $('excelVerifyBody'), panel = $('excelVerifyPanel');
    if (!body || !panel || panel.hidden) return;
    if (!body.querySelector('.ops-verify-help')) {
      const help = document.createElement('div'); help.className = 'ops-verify-help';
      help.innerHTML = `<strong>Cosa devi fare?</strong><p>Controlla soltanto le voci gialle. Se un dato manca nell’Excel o nel gestionale puoi inserirlo manualmente durante l’accreditamento. Le voci verdi sono già corrette.</p><div class="ops-verify-help-actions"><button type="button" data-ops-edit-person>Modifica dati persona</button><button type="button" data-ops-edit-services>Servizi e permanenza</button></div>`;
      body.prepend(help);
      help.querySelector('[data-ops-edit-person]')?.addEventListener('click',()=>clickWizardStep(1));
      help.querySelector('[data-ops-edit-services]')?.addEventListener('click',()=>clickWizardStep(3));
    }
    body.querySelectorAll('.excel-verify-row').forEach(row => {
      if (row.dataset.opsEnhanced === '1') return;
      row.dataset.opsEnhanced = '1';
      const label = row.querySelector('strong')?.textContent?.trim() || 'Dato';
      const match = row.querySelector('.excel-verify-match'); if (!match) return;
      const current = valueText(row,0), excel = valueText(row,1);
      const currentMissing = !current || current === '—', excelMissing = !excel || excel === '—';
      if (match.classList.contains('ok')) match.textContent = '✓ OK';
      else if (match.classList.contains('check')) match.textContent = '⚠ Da controllare';
      else if (match.classList.contains('info')) {
        if (currentMissing && excelMissing) { match.textContent = '＋ Da compilare'; match.classList.add('manual'); }
        else if (excelMissing) match.textContent = 'Excel non disponibile';
      }
      if (match.classList.contains('check') || (match.classList.contains('manual') && currentMissing)) {
        const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'ops-inline-edit'; edit.textContent = currentMissing ? 'Compila manualmente' : 'Modifica / correggi';
        edit.addEventListener('click',()=>{
          const l = label.toLocaleLowerCase('it');
          const step = /arrivo|partenza|pernott|pasti|alloggio/.test(l) ? 3 : 1; clickWizardStep(step);
          setTimeout(()=>{
            const target = /arrivo/.test(l) ? $('personArrival') : /partenza/.test(l) ? $('personDeparture') : /pernott/.test(l) ? $('personPernotto') : null;
            target?.scrollIntoView({behavior:'smooth',block:'center'}); target?.focus?.();
          },120);
        });
        row.querySelectorAll('.excel-verify-value')[1]?.appendChild(edit);
      }
    });
    const pending = body.querySelectorAll('.excel-verify-match.check,.excel-verify-match.manual').length;
    const state = $('excelVerifyState');
    if (state && /da verificare|verifica finale|da controllare/i.test(state.textContent || '')) {
      const label = pending ? `⚠ ${pending} da controllare` : '⚠ Verifica finale';
      if (state.textContent !== label) state.textContent = label;
    }
    const confirm = body.querySelector('.excel-verify-button.primary');
    if (confirm && confirm.dataset.opsLabel !== '1') { confirm.dataset.opsLabel='1'; confirm.textContent='✓ Ho controllato: verifica completata'; }
  }

  function enhanceImportArea() {
    const mapping = $('importMapping'); if (!mapping || $('opsImportAutoNote')) return;
    const note = document.createElement('div'); note.id='opsImportAutoNote'; note.className='ops-import-auto-note';
    note.innerHTML='<strong>Turni automatici:</strong> le disponibilità separate da virgola vengono trasformate automaticamente in turni del relativo servizio (Logistica, Cucina, Safety/Security) e la persona viene collegata come <strong>Disponibile</strong>.';
    mapping.appendChild(note);
  }

  function enhanceNightShifts() {
    document.querySelectorAll('.shift-card .shift-time').forEach(box=>{
      if (box.dataset.opsNightChecked === '1') return; box.dataset.opsNightChecked='1';
      const m=(box.textContent||'').match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/); if(!m)return;
      const start=Number(m[1])*60+Number(m[2]), end=Number(m[3])*60+Number(m[4]);
      if(end<=start){const badge=document.createElement('span');badge.className='ops-next-day';badge.textContent='+1 giorno';box.appendChild(badge);}
    });
  }

  function enhance() {
    document.body.classList.add('ops-console-v3');
    reorderNavigation(); ensureStepGuide(); enhanceVerification(); enhanceImportArea(); enhanceNightShifts();
  }

  async function init() {
    injectStyles();
    for(let i=0;i<80;i+=1){if($('standardWorkspace'))break;await sleep(100);}
    enhance();
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,120);});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
