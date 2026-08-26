(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let observer = null;

  function injectStyles() {
    if ($('cucinaUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'cucinaUxV1Styles';
    style.textContent = `
      /* =====================================================
         CUCINA UX V1 — POSTAZIONE DI SERVIZIO RAPIDA
         ===================================================== */
      #kitchenWorkspace.kitchen-ux{max-width:1280px!important;padding-top:10px!important;padding-bottom:34px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:16px!important;margin:6px 0 12px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head h1{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head p{margin:0!important;font-size:11px!important;color:#687985!important}
      #kitchenWorkspace.kitchen-ux .kitchen-head-controls{display:flex!important;gap:6px!important;align-items:center!important}
      #kitchenWorkspace.kitchen-ux .kitchen-date{height:40px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;padding:0 9px!important;font:inherit!important;font-size:11px!important;background:#fff!important}
      #kitchenWorkspace.kitchen-ux .kitchen-refresh{width:40px!important;height:40px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;font-size:18px!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-realtime{display:inline-flex!important;width:auto!important;margin:0 0 10px!important;padding:5px 7px!important;border:1px solid #d6e5dc!important;border-radius:4px!important;background:#f2f9f5!important;font-size:9px!important;font-weight:800!important;color:#18714d!important}

      #kitchenWorkspace.kitchen-ux .meal-dashboard{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;margin:0 0 10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card{margin:0!important;padding:11px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card:last-child{border-right:0!important}
      #kitchenWorkspace.kitchen-ux .meal-summary-card h2{margin:2px 0 8px!important;font-size:15px!important;color:#203440!important}
      #kitchenWorkspace.kitchen-ux .meal-label{font-size:8px!important;font-weight:850!important;letter-spacing:.07em!important;text-transform:uppercase!important;color:#788791!important}
      #kitchenWorkspace.kitchen-ux .meal-stat-row{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:4px!important}
      #kitchenWorkspace.kitchen-ux .meal-stat{padding:6px!important;border:1px solid #e4e9ed!important;border-radius:4px!important;background:#fafbfc!important;text-align:center!important}
      #kitchenWorkspace.kitchen-ux .meal-stat small{font-size:7px!important;color:#788791!important}.meal-stat strong{font-size:16px!important;margin-top:1px!important;color:#1f3441!important}

      .kitchen-ux-scan-zone{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:9px;margin:0 0 10px}
      .kitchen-ux-scan-primary{display:flex;align-items:center;gap:16px;min-height:104px;padding:16px 18px;border:1px solid #b9d0dd;border-left:5px solid #173b52;border-radius:7px;background:#eef6fa;cursor:pointer;text-align:left}
      .kitchen-ux-scan-primary:hover{background:#e6f1f7}.kitchen-ux-scan-primary .icon{width:58px;height:58px;border-radius:6px;background:#173b52;color:#fff;display:grid;place-items:center;font-size:28px;flex:0 0 auto}
      .kitchen-ux-scan-primary strong{display:block;font-size:18px;color:#173b52}.kitchen-ux-scan-primary span{display:block;margin-top:3px;font-size:11px;line-height:1.4;color:#617887}
      .kitchen-ux-help{display:flex;flex-direction:column;justify-content:center;padding:13px 15px;border:1px solid #d5dde3;border-radius:7px;background:#fff}
      .kitchen-ux-help strong{font-size:11px;color:#2b414e}.kitchen-ux-help span{margin-top:4px;font-size:9px;line-height:1.45;color:#73838e}

      #kitchenWorkspace.kitchen-ux .kitchen-tools{display:block!important;margin:0 0 10px!important;padding:10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-box{width:100%!important;margin:0!important}.kitchen-search-box>label{display:block!important;margin-bottom:5px!important;font-size:9px!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#71808b!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-input{height:42px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important;padding:0 10px!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-input input{height:40px!important;font-size:12px!important}
      #kitchenWorkspace.kitchen-ux #kitchenScanButton{display:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-results{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important;margin-top:6px!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result{min-width:0!important;padding:8px 9px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important;box-shadow:none!important}
      #kitchenWorkspace.kitchen-ux .kitchen-search-result strong{font-size:10px!important}.kitchen-search-result small{font-size:8px!important}.dietary-mini,.muted-mini{font-size:8px!important}

      #kitchenWorkspace.kitchen-ux .kitchen-person-panel{margin:0!important;padding:0!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:13px 15px!important;border-bottom:1px solid #e2e8ec!important;background:#f8fafb!important}
      #kitchenWorkspace.kitchen-ux .kitchen-person-head h2{margin:2px 0!important;font-size:22px!important;color:#182d3a!important}.kitchen-person-head p{margin:2px 0 0!important;font-size:10px!important;color:#70808b!important}
      .kitchen-ux-next{min-height:36px;border:1px solid #c3ced6;background:#fff;border-radius:4px;padding:7px 10px;font:inherit;font-size:10px;font-weight:850;color:#40545f;cursor:pointer}.kitchen-ux-next:hover{background:#eef3f6}
      #kitchenWorkspace.kitchen-ux .dietary-alert{display:flex!important;align-items:flex-start!important;gap:12px!important;margin:12px 14px 0!important;padding:14px!important;border:2px solid #d49a23!important;border-radius:6px!important;background:#fff7dc!important;color:#674d08!important}
      #kitchenWorkspace.kitchen-ux .dietary-alert strong{display:block!important;font-size:14px!important;text-transform:uppercase!important}.dietary-alert span,.dietary-alert div{font-size:11px!important;line-height:1.4!important}
      #kitchenWorkspace.kitchen-ux .kitchen-tickets{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;padding:14px!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;align-content:start!important;min-height:190px!important;margin:0!important;padding:14px!important;border:1px solid #d7e0e6!important;border-top:5px solid #607d90!important;border-radius:6px!important;background:#fafcfd!important;box-shadow:none!important;text-align:center!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket.colazione{border-top-color:#b98520!important}.meal-ticket.pranzo{border-top-color:#287454!important}.meal-ticket.cena{border-top-color:#415c84!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket.used{opacity:.82!important;background:#f2f5f4!important;border-top-color:#6b8b78!important}
      #kitchenWorkspace.kitchen-ux .meal-ticket-icon{display:none!important}.meal-ticket-copy small{font-size:8px!important;text-transform:uppercase!important;letter-spacing:.07em!important;color:#788791!important}.meal-ticket-copy strong{display:block!important;margin:3px 0!important;font-size:19px!important;color:#1c303d!important}.meal-ticket-copy span{display:block!important;min-height:34px!important;font-size:10px!important;line-height:1.35!important;color:#6d7e89!important}
      #kitchenWorkspace.kitchen-ux .meal-use-button{width:100%!important;min-height:58px!important;margin-top:auto!important;border:0!important;border-radius:5px!important;background:#173b52!important;color:#fff!important;font:inherit!important;font-size:13px!important;font-weight:900!important;box-shadow:none!important;cursor:pointer!important}
      #kitchenWorkspace.kitchen-ux .meal-use-button:hover:not(:disabled){background:#0e2c40!important}.meal-use-button:disabled{background:#d9e0e4!important;color:#75838b!important;cursor:not-allowed!important}
      #kitchenWorkspace.kitchen-ux .kitchen-privacy-note{padding:8px 14px 12px!important;font-size:8px!important;color:#85929a!important;text-align:center!important}

      @media(max-width:900px){.kitchen-ux-scan-zone{grid-template-columns:1fr}.kitchen-ux-help{display:none}.kitchen-search-results{grid-template-columns:1fr!important}}
      @media(max-width:700px){#kitchenWorkspace.kitchen-ux .kitchen-head{align-items:flex-start!important;flex-direction:column!important}.meal-dashboard{grid-template-columns:1fr!important}.meal-summary-card{border-right:0!important;border-bottom:1px solid #e3e8ec!important}.meal-summary-card:last-child{border-bottom:0!important}#kitchenWorkspace.kitchen-ux .kitchen-tickets{grid-template-columns:1fr!important}.meal-ticket{min-height:140px!important}}
    `;
    document.head.appendChild(style);
  }

  function buildScanZone() {
    const workspace = $('kitchenWorkspace');
    const tools = workspace?.querySelector('.kitchen-tools');
    if (!workspace || !tools || $('kitchenUxScanZone')) return;
    const zone = document.createElement('div');
    zone.id = 'kitchenUxScanZone';
    zone.className = 'kitchen-ux-scan-zone';
    zone.innerHTML = `
      <button id="kitchenUxScan" class="kitchen-ux-scan-primary" type="button">
        <span class="icon">▣</span>
        <span><strong>Scansiona QR</strong><span>Inquadra il QR sul badge, verifica la persona e registra il pasto con un click.</span></span>
      </button>
      <div class="kitchen-ux-help"><strong>Modalità servizio</strong><span>La ricerca manuale resta disponibile sotto come alternativa. I ticket già utilizzati non possono essere consumati una seconda volta.</span></div>`;
    tools.insertAdjacentElement('beforebegin', zone);
    $('kitchenUxScan')?.addEventListener('click', () => $('kitchenScanButton')?.click());
  }

  function addNextButton() {
    const head = $('kitchenPersonPanel')?.querySelector('.kitchen-person-head');
    if (!head || $('kitchenUxNext')) return;
    const button = document.createElement('button');
    button.id = 'kitchenUxNext';
    button.type = 'button';
    button.className = 'kitchen-ux-next';
    button.textContent = 'Nuova scansione';
    button.addEventListener('click', () => {
      const panel = $('kitchenPersonPanel');
      if (panel) panel.hidden = true;
      if ($('kitchenSearch')) $('kitchenSearch').value = '';
      if ($('kitchenSearchResults')) $('kitchenSearchResults').innerHTML = '';
      setTimeout(() => $('kitchenUxScan')?.focus(), 20);
    });
    head.appendChild(button);
  }

  function polish() {
    const workspace = $('kitchenWorkspace');
    if (!workspace) return;
    workspace.classList.add('kitchen-ux');
    const title = workspace.querySelector('.kitchen-head p');
    if (title) title.textContent = 'Scansione rapida dei badge, ticket pasti ed esigenze alimentari.';
    buildScanZone();
    addNextButton();
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if ($('kitchenWorkspace')) {
        polish();
        observer = new MutationObserver(() => {
          if (!$('kitchenWorkspace')?.hidden) setTimeout(() => { buildScanZone(); addNextButton(); }, 20);
        });
        observer.observe($('kitchenWorkspace'), { attributes:true, childList:true, subtree:true, attributeFilter:['hidden'] });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
