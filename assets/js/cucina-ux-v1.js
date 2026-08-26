(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let observer = null;

  function injectStyles() {
    if ($('cucinaUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'cucinaUxV1Styles';
    style.textContent = `
      body[data-app-role="cucina"]{background:#f3f5f6!important}
      body[data-app-role="cucina"] .reserved-topbar{position:sticky;top:0;z-index:100;background:#fff!important;border-bottom:1px solid #d9e0e5!important;box-shadow:none!important}
      body[data-app-role="cucina"] .reserved-topbar-inner{min-height:48px!important;padding-top:5px!important;padding-bottom:5px!important}
      body[data-app-role="cucina"] .reserved-brand img{width:34px!important;height:auto!important}
      body[data-app-role="cucina"] .reserved-brand div span{display:none!important}
      body[data-app-role="cucina"] #reservedAreaTitle{font-size:13px!important}
      body[data-app-role="cucina"] .reserved-public-link{display:none!important}
      body[data-app-role="cucina"] #logoutButton{min-height:32px!important;padding:5px 9px!important;font-size:10px!important;border-radius:4px!important}
      body[data-app-role="cucina"] .reserved-statusbar{background:#fff!important;border-top:1px solid #edf0f2!important}
      body[data-app-role="cucina"] .reserved-statusbar-inner{padding-top:4px!important;padding-bottom:4px!important;min-height:34px!important}
      body[data-app-role="cucina"] #onlineBadge,body[data-app-role="cucina"] #systemBadge,body[data-app-role="cucina"] #accessRole{display:none!important}
      body[data-app-role="cucina"] #stationBadge{width:100%!important;justify-content:center!important;min-height:28px!important;border:0!important;background:#f2f6f8!important;border-radius:4px!important;font-size:10px!important}
      body[data-app-role="cucina"] #stationBadge .mini-status-label{display:none!important}
      body[data-app-role="cucina"] .reserved-main{padding-top:0!important}

      #kitchenWorkspace.kitchen-ux{width:100%!important;max-width:580px!important;margin:0 auto!important;padding:8px 10px 92px!important;box-sizing:border-box!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;margin:0 0 7px!important;padding:0!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head .kicker,#kitchenWorkspace.kitchen-ux .kitchen-head p{display:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head h1{margin:0!important;font-size:20px!important;line-height:1.1!important;color:#182d3a!important;letter-spacing:-.02em!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head-controls{display:flex!important;gap:4px!important;align-items:center!important}
      #kitchenWorkspace.kitchen-ux .kitchen-date{width:132px!important;height:34px!important;border:1px solid #cbd4da!important;border-radius:4px!important;padding:0 6px!important;font-size:10px!important;background:#fff!important}
      #kitchenWorkspace.kitchen-ux .kitchen-refresh{width:34px!important;height:34px!important;border:1px solid #cbd4da!important;border-radius:4px!important;background:#fff!important;font-size:16px!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-realtime{display:none!important}
      .kitchen-mobile-station{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 7px;padding:7px 9px;border:1px solid #d5dde3;border-radius:5px;background:#fff}
      .kitchen-mobile-station span{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#788791;font-weight:850}
      .kitchen-mobile-station strong{font-size:11px;color:#173b52}
      .kitchen-mobile-station button{border:0;background:#eef3f6;border-radius:3px;padding:5px 7px;font:inherit;font-size:8px;font-weight:850;color:#465c69}

      #kitchenWorkspace.kitchen-ux .meal-dashboard{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;margin:0 0 7px!important;border:0!important;background:transparent!important;overflow:visible!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card{position:relative!important;margin:0!important;padding:8px 6px!important;border:1px solid #d8e0e5!important;border-radius:5px!important;background:#fff!important;box-shadow:none!important;text-align:center!important;min-width:0!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card .meal-label{display:none!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card h2{margin:0 0 5px!important;font-size:10px!important;color:#314854!important;white-space:nowrap!important}
      #kitchenWorkspace.kitchen-ux .meal-stat-row{display:grid!important;grid-template-columns:1fr 1fr!important;gap:2px!important}
      #kitchenWorkspace.kitchen-ux .meal-stat{padding:0!important;border:0!important;background:transparent!important}
      #kitchenWorkspace.kitchen-ux .meal-stat:nth-child(1){display:none!important}
      #kitchenWorkspace.kitchen-ux .meal-stat small{display:block!important;font-size:6px!important;text-transform:uppercase!important;letter-spacing:.04em!important;color:#8a969e!important}
      #kitchenWorkspace.kitchen-ux .meal-stat strong{display:block!important;margin-top:1px!important;font-size:17px!important;line-height:1!important;color:#203744!important}
      #kitchenWorkspace.kitchen-ux .meal-stat:nth-child(3) strong{color:#16714c!important}

      .kitchen-ux-scan-zone{margin:0 0 7px!important}
      .kitchen-ux-scan-primary{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;width:100%!important;min-height:68px!important;margin:0!important;padding:10px 12px!important;border:0!important;border-radius:6px!important;background:#173b52!important;color:#fff!important;box-shadow:none!important;cursor:pointer!important}
      .kitchen-ux-scan-primary .icon{font-size:25px!important;line-height:1!important}
      .kitchen-ux-scan-primary strong{display:block!important;font-size:16px!important;color:#fff!important;line-height:1.1!important}
      .kitchen-ux-scan-primary .scan-sub{display:block!important;margin-top:2px!important;font-size:8px!important;color:#d8e5ec!important;font-weight:600!important}

      #kitchenWorkspace.kitchen-ux .kitchen-tools{display:block!important;margin:0 0 7px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux #kitchenScanButton{display:none!important}
      .kitchen-manual-toggle{width:100%;min-height:34px;border:1px solid #d5dde3;border-radius:4px;background:#fff;padding:6px 9px;font:inherit;font-size:9px;font-weight:800;color:#586b76;text-align:left;cursor:pointer}
      .kitchen-manual-wrap{display:none;margin-top:5px}.kitchen-manual-wrap.open{display:block}
      #kitchenWorkspace.kitchen-ux .kitchen-search-box>label{display:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-input{height:39px!important;border:1px solid #c9d2d9!important;border-radius:4px!important;background:#fff!important;padding:0 9px!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-input input{height:37px!important;font-size:12px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-results{display:grid!important;grid-template-columns:1fr!important;gap:4px!important;margin-top:4px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result{min-height:48px!important;padding:7px 9px!important;border:1px solid #dfe5e9!important;border-radius:4px!important;background:#fff!important;box-shadow:none!important;text-align:left!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result strong{font-size:11px!important}.kitchen-search-result small{font-size:8px!important}.dietary-mini,.muted-mini{font-size:8px!important}

      #kitchenWorkspace.kitchen-ux .kitchen-person-panel{margin:0!important;padding:0!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:10px 11px!important;border-bottom:1px solid #e2e8ec!important;background:#fff!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head .panel-kicker{display:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head h2{margin:0!important;font-size:18px!important;line-height:1.1!important;color:#182d3a!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head p{margin:3px 0 0!important;font-size:9px!important;color:#70808b!important}
      .kitchen-ux-next{min-height:32px!important;border:1px solid #c8d2d9!important;background:#f7f9fa!important;border-radius:4px!important;padding:6px 8px!important;font:inherit!important;font-size:8px!important;font-weight:850!important;color:#40545f!important;white-space:nowrap!important}
      #kitchenWorkspace.kitchen-ux .dietary-alert{display:block!important;margin:8px!important;padding:12px!important;border:2px solid #c88a08!important;border-radius:5px!important;background:#fff3c9!important;color:#5e4708!important;text-align:center!important}
      #kitchenWorkspace.kitchen-ux .dietary-alert strong{display:block!important;font-size:13px!important;text-transform:uppercase!important;line-height:1.15!important}
      #kitchenWorkspace.kitchen-ux .dietary-alert span{display:block!important;margin-top:4px!important;font-size:11px!important;line-height:1.3!important;font-weight:700!important}
      #kitchenWorkspace.kitchen-ux .kitchen-tickets{display:grid!important;grid-template-columns:1fr!important;gap:5px!important;padding:8px!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket{display:grid!important;grid-template-columns:minmax(0,1fr) 118px!important;gap:8px!important;align-items:center!important;min-height:68px!important;margin:0!important;padding:8px 9px!important;border:1px solid #dce3e7!important;border-left:4px solid #607d90!important;border-radius:5px!important;background:#fafcfd!important;box-shadow:none!important;text-align:left!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket.colazione{border-left-color:#b98520!important}.meal-ticket.pranzo{border-left-color:#287454!important}.meal-ticket.cena{border-left-color:#415c84!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket.used{background:#f0f4f2!important;border-left-color:#6b8b78!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-icon{display:none!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy small{display:none!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy strong{display:block!important;margin:0!important;font-size:15px!important;color:#1c303d!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-copy span{display:block!important;margin-top:3px!important;font-size:8px!important;line-height:1.25!important;color:#6d7e89!important}
      #kitchenWorkspace.kitchen-ux .meal-use-button{width:100%!important;min-height:48px!important;margin:0!important;border:0!important;border-radius:4px!important;background:#173b52!important;color:#fff!important;font:inherit!important;font-size:11px!important;font-weight:900!important;box-shadow:none!important;cursor:pointer!important}
      #kitchenWorkspace.kitchen-ux .meal-use-button:disabled{background:#dce2e5!important;color:#75828a!important}
      #kitchenWorkspace.kitchen-ux .kitchen-privacy-note{display:none!important}

      .kitchen-bottom-scan{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;width:min(calc(100% - 20px),560px);height:58px;border:0;border-radius:7px;background:#173b52;color:#fff;font:inherit;font-size:14px;font-weight:900;box-shadow:0 8px 24px rgba(20,44,60,.22)}
      .kitchen-bottom-scan span{font-size:19px;margin-right:7px}

      @media(min-width:700px){
        #kitchenWorkspace.kitchen-ux{padding-top:12px!important}
        .kitchen-bottom-scan{position:sticky;left:auto;bottom:10px;transform:none;width:100%;margin-top:8px}
      }
    `;
    document.head.appendChild(style);
  }

  function stationName() {
    return sessionStorage.getItem('campo_scuola_segreteria_postazione') || 'Cucina';
  }

  function buildStationLine() {
    const workspace = $('kitchenWorkspace');
    const head = workspace?.querySelector('.kitchen-head');
    if (!workspace || !head || $('kitchenMobileStation')) return;
    const line = document.createElement('div');
    line.id = 'kitchenMobileStation';
    line.className = 'kitchen-mobile-station';
    line.innerHTML = `<div><span>Postazione attiva</span><strong id="kitchenMobileStationName">${stationName()}</strong></div><button type="button" id="kitchenChangeStation">Cambia</button>`;
    head.insertAdjacentElement('afterend', line);
    $('kitchenChangeStation')?.addEventListener('click', () => $('stationBadge')?.click());
  }

  function buildScanZone() {
    const workspace = $('kitchenWorkspace');
    const tools = workspace?.querySelector('.kitchen-tools');
    if (!workspace || !tools || $('kitchenUxScanZone')) return;
    const zone = document.createElement('div');
    zone.id = 'kitchenUxScanZone';
    zone.className = 'kitchen-ux-scan-zone';
    zone.innerHTML = `<button id="kitchenUxScan" class="kitchen-ux-scan-primary" type="button"><span class="icon">▣</span><span><strong>SCANSIONA QR</strong><span class="scan-sub">Badge volontario</span></span></button>`;
    tools.insertAdjacentElement('beforebegin', zone);
    $('kitchenUxScan')?.addEventListener('click', () => $('kitchenScanButton')?.click());
  }

  function wrapManualSearch() {
    const tools = $('kitchenWorkspace')?.querySelector('.kitchen-tools');
    const box = tools?.querySelector('.kitchen-search-box');
    if (!tools || !box || $('kitchenManualToggle')) return;
    const toggle = document.createElement('button');
    toggle.id = 'kitchenManualToggle';
    toggle.className = 'kitchen-manual-toggle';
    toggle.type = 'button';
    toggle.textContent = '⌕ Ricerca manuale';
    const wrap = document.createElement('div');
    wrap.id = 'kitchenManualWrap';
    wrap.className = 'kitchen-manual-wrap';
    box.parentNode.insertBefore(toggle, box);
    wrap.appendChild(box);
    tools.appendChild(wrap);
    toggle.addEventListener('click', () => {
      wrap.classList.toggle('open');
      toggle.textContent = wrap.classList.contains('open') ? '× Chiudi ricerca manuale' : '⌕ Ricerca manuale';
      if (wrap.classList.contains('open')) setTimeout(() => $('kitchenSearch')?.focus(), 30);
    });
  }

  function resetForNext() {
    const panel = $('kitchenPersonPanel');
    if (panel) panel.hidden = true;
    if ($('kitchenSearch')) $('kitchenSearch').value = '';
    if ($('kitchenSearchResults')) $('kitchenSearchResults').innerHTML = '';
    $('kitchenManualWrap')?.classList.remove('open');
    if ($('kitchenManualToggle')) $('kitchenManualToggle').textContent = '⌕ Ricerca manuale';
  }

  function addNextButton() {
    const head = $('kitchenPersonPanel')?.querySelector('.kitchen-person-head');
    if (!head || $('kitchenUxNext')) return;
    const button = document.createElement('button');
    button.id = 'kitchenUxNext';
    button.type = 'button';
    button.className = 'kitchen-ux-next';
    button.textContent = 'Nuovo';
    button.addEventListener('click', resetForNext);
    head.appendChild(button);
  }

  function addBottomScanner() {
    const workspace = $('kitchenWorkspace');
    if (!workspace || $('kitchenBottomScan')) return;
    const button = document.createElement('button');
    button.id = 'kitchenBottomScan';
    button.type = 'button';
    button.className = 'kitchen-bottom-scan';
    button.innerHTML = '<span>▣</span> NUOVA SCANSIONE';
    button.addEventListener('click', () => { resetForNext(); $('kitchenScanButton')?.click(); });
    workspace.appendChild(button);
  }

  function updateStationLabel() {
    const label = $('kitchenMobileStationName');
    if (label) label.textContent = stationName();
  }

  function polish() {
    const workspace = $('kitchenWorkspace');
    if (!workspace) return;
    workspace.classList.add('kitchen-ux');
    const title = workspace.querySelector('.kitchen-head h1');
    if (title) title.textContent = 'Cucina';
    buildStationLine();
    buildScanZone();
    wrapManualSearch();
    addNextButton();
    addBottomScanner();
    updateStationLabel();
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 140; i += 1) {
      const workspace = $('kitchenWorkspace');
      if (workspace) {
        polish();
        observer = new MutationObserver(() => { if (!workspace.hidden) setTimeout(polish, 20); });
        observer.observe(workspace, { attributes:true, childList:true, subtree:true, attributeFilter:['hidden'] });
        window.addEventListener('campo:station-changed', updateStationLabel);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();