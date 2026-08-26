(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let observer = null;
  let arranging = false;

  const labels = {
    dashboard: 'Panoramica',
    persone: 'Persone',
    accreditamento: 'Accredito',
    turni: 'Turni',
    pernottamenti: 'Alloggi',
    pasti: 'Pasti',
    mezzi: 'Mezzi',
    situazione: 'Situazione',
    'situazione-campo': 'Situazione',
    'import-excel': 'Import Master'
  };
  const order = ['dashboard','persone','accreditamento','turni','pernottamenti','pasti','mezzi','situazione','situazione-campo','import-excel'];

  function injectStyles() {
    if ($('navigationUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'navigationUxV1Styles';
    style.textContent = `
      #standardWorkspace .app-shell-head{display:block!important;margin:0 0 14px!important;padding:8px 0 0!important}
      #standardWorkspace .app-shell-head>div:first-child{display:flex!important;align-items:baseline!important;gap:10px!important;flex-wrap:wrap!important;margin:0 0 8px!important}
      #standardWorkspace .app-shell-head .kicker{display:none!important}
      #standardWorkspace .app-shell-head h1{margin:0!important;font-size:23px!important;line-height:1.1!important;letter-spacing:-.02em!important;color:#1b2d39!important}
      #standardWorkspace .app-shell-head p{margin:0!important;font-size:10px!important;color:#71808b!important}
      #standardWorkspace .app-nav{display:flex!important;width:100%!important;gap:2px!important;margin:0!important;padding:3px!important;border:1px solid #d6dee4!important;border-radius:6px!important;background:#f6f8f9!important;box-shadow:none!important;overflow-x:auto!important;scrollbar-width:thin!important}
      #standardWorkspace .app-nav-btn{flex:0 0 auto!important;min-height:34px!important;margin:0!important;padding:6px 10px!important;border:1px solid transparent!important;border-radius:4px!important;background:transparent!important;color:#526470!important;font-size:10px!important;font-weight:800!important;box-shadow:none!important;white-space:nowrap!important}
      #standardWorkspace .app-nav-btn:hover{background:#fff!important;border-color:#dce3e8!important;color:#213745!important}
      #standardWorkspace .app-nav-btn.active{background:#173b52!important;border-color:#173b52!important;color:#fff!important}
      #standardWorkspace [data-view-panel="dashboard"] .module-grid{margin-top:0!important}
      #standardWorkspace [data-view-panel="dashboard"] .module-card{border-radius:7px!important;box-shadow:none!important}
      @media(max-width:700px){#standardWorkspace .app-shell-head>div:first-child{display:block!important}#standardWorkspace .app-shell-head p{margin-top:4px!important}}
    `;
    document.head.appendChild(style);
  }

  function startObserver(nav) {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => setTimeout(arrange, 30));
    observer.observe(nav, { childList:true, subtree:true });
  }

  function arrange() {
    if (arranging) return;
    const nav = document.querySelector('#standardWorkspace .app-nav');
    if (!nav) return;
    arranging = true;
    if (observer) observer.disconnect();
    try {
      const buttons = [...nav.querySelectorAll(':scope > .app-nav-btn')];
      buttons.forEach(btn => {
        const label = labels[btn.dataset.view];
        if (label && btn.textContent.trim() !== label) btn.textContent = label;
      });

      const refreshed = [...nav.querySelectorAll(':scope > .app-nav-btn')];
      const ranked = order.map(view => refreshed.find(btn => btn.dataset.view === view)).filter(Boolean);
      const unknown = refreshed.filter(btn => !order.includes(btn.dataset.view));
      const desired = [...ranked, ...unknown];
      const different = desired.length === refreshed.length && desired.some((btn, index) => refreshed[index] !== btn);
      if (different) desired.forEach(btn => nav.appendChild(btn));
    } finally {
      arranging = false;
      startObserver(nav);
    }
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      const nav = document.querySelector('#standardWorkspace .app-nav');
      if (nav) {
        arrange();
        setTimeout(arrange, 500);
        setTimeout(arrange, 1400);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
