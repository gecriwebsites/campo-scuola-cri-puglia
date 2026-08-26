(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let observer = null;

  function injectStyles() {
    if ($('situationDashboardUxStyles')) return;
    const style = document.createElement('style');
    style.id = 'situationDashboardUxStyles';
    style.textContent = `
      /* Dashboard iniziale */
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux{max-width:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;margin:4px 0 9px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card{margin:0!important;padding:11px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;min-height:68px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card:last-child{border-right:0!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-icon{width:30px!important;height:30px!important;border-radius:4px!important;background:#f1f5f7!important;font-size:14px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card small{font-size:8px!important;text-transform:uppercase!important;letter-spacing:.055em!important;color:#73828c!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card strong{font-size:21px!important;color:#1e3441!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-action-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;margin:0 0 10px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel{margin:0!important;padding:14px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel h2{margin:3px 0 4px!important;font-size:16px!important;color:#1d313e!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel p{font-size:9px!important;line-height:1.35!important;color:#76858e!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .quick-search-wrap{height:39px!important;border-radius:4px!important;border-color:#cad3d9!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .quick-search-wrap input{height:37px!important;font-size:11px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .presence-summary strong{font-size:34px!important;color:#173b52!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .presence-summary span,.dashboard-ux .summary-row{font-size:10px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel .btn{min-height:36px!important;border-radius:4px!important;font-size:9px!important;padding:7px 10px!important}
      .dashboard-situation-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin:0 0 10px;padding:12px 14px;border:1px solid #cbdce6;border-left:4px solid #173b52;border-radius:6px;background:#f3f8fb}
      .dashboard-situation-cta span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;font-weight:850;color:#70838f}.dashboard-situation-cta strong{display:block;margin-top:2px;font-size:14px;color:#193849}.dashboard-situation-cta small{display:block;margin-top:2px;font-size:9px;color:#6f808a}
      .dashboard-situation-cta button{min-height:36px;border:0;border-radius:4px;background:#173b52;color:#fff;padding:7px 11px;font:inherit;font-size:9px;font-weight:850;cursor:pointer}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .modules-head{margin:12px 0 7px!important}.dashboard-ux .modules-head h2{font-size:17px!important}.dashboard-ux .modules-head p{font-size:9px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-grid{gap:6px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card{min-height:76px!important;padding:10px!important;border:1px solid #d9e0e5!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card>span{font-size:20px!important}.dashboard-ux .module-card strong{font-size:11px!important}.dashboard-ux .module-card small{font-size:8px!important;line-height:1.25!important}.dashboard-ux .module-card em{font-size:7px!important}

      /* Situazione Campo */
      #situationView.situation-ux{max-width:none!important}
      #situationView.situation-ux .situation-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:end!important;gap:14px!important;margin:8px 0 9px!important}
      #situationView.situation-ux .situation-head .kicker{font-size:8px!important}.situation-ux .situation-head h2{margin:2px 0 3px!important;font-size:27px!important;letter-spacing:-.02em!important;color:#192e3b!important}.situation-ux .situation-head p{font-size:10px!important}.situation-ux .situation-realtime{font-size:8px!important;margin-top:4px!important}
      #situationView.situation-ux .situation-datebar{display:flex!important;gap:4px!important;flex-wrap:nowrap!important}
      #situationView.situation-ux .situation-datebar input{height:36px!important;border-radius:4px!important;font-size:10px!important;padding:0 7px!important}.situation-ux .situation-date-btn{width:36px!important;height:36px!important;border-radius:4px!important;font-size:17px!important}.situation-ux .situation-refresh{height:36px!important;border-radius:4px!important;font-size:9px!important;padding:6px 9px!important}
      #situationView.situation-ux .situation-date-title{margin:0 0 7px!important;padding:8px 11px!important;border:1px solid #d8e0e5!important;border-radius:5px!important;background:#fff!important}.situation-ux .situation-date-title strong{font-size:12px!important}.situation-ux .situation-date-title span{font-size:8px!important}
      #situationView.situation-ux .situation-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;margin:0 0 8px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #situationView.situation-ux .situation-kpi{margin:0!important;padding:11px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;min-height:87px!important}.situation-ux .situation-kpi:last-child{border-right:0!important}
      #situationView.situation-ux .situation-kpi.alert{background:#fff5f6!important}.situation-ux .situation-kpi.warning{background:#fff9eb!important}.situation-ux .situation-kpi.good{background:#fff!important}
      #situationView.situation-ux .situation-kpi .kpi-icon{width:28px!important;height:28px!important;border-radius:4px!important;font-size:13px!important}.situation-ux .situation-kpi small{font-size:8px!important;text-transform:uppercase!important;letter-spacing:.05em!important}.situation-ux .situation-kpi strong{font-size:23px!important;margin:5px 0 2px!important;color:#1b3544!important}.situation-ux .situation-kpi em{font-size:8px!important;line-height:1.25!important}
      #situationView.situation-ux .situation-grid{display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr)!important;gap:8px!important;align-items:start!important}.situation-ux .situation-grid>div{gap:8px!important}
      #situationView.situation-ux .situation-panel{margin:0!important;padding:12px!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important}.situation-ux .situation-panel h3{margin:2px 0 3px!important;font-size:14px!important;color:#223944!important}.situation-ux .situation-panel>p{margin:0 0 8px!important;font-size:8px!important}.situation-ux .situation-panel-head{margin-bottom:8px!important}.situation-ux .panel-link{border-radius:4px!important;padding:6px 8px!important;font-size:8px!important}
      #situationView.situation-ux .coverage-box{gap:4px!important;margin-bottom:7px!important}.situation-ux .coverage-stat{border-radius:4px!important;padding:7px!important}.situation-ux .coverage-stat small{font-size:7px!important}.situation-ux .coverage-stat strong{font-size:16px!important;margin-top:2px!important}.situation-ux .coverage-progress{height:6px!important;margin:6px 0 3px!important}.situation-ux .coverage-caption{font-size:8px!important}
      #situationView.situation-ux .shift-situation-list{gap:4px!important}.situation-ux .shift-situation{border-radius:4px!important;padding:7px 8px!important}.situation-ux .shift-situation strong{font-size:9px!important}.situation-ux .shift-situation small{font-size:7px!important}.situation-ux .shift-situation-count{font-size:8px!important}
      #situationView.situation-ux .meal-situation-grid{gap:4px!important}.situation-ux .meal-situation{border-radius:4px!important;padding:8px!important}.situation-ux .meal-situation h4{margin:0 0 6px!important;font-size:10px!important}.situation-ux .meal-situation-values{gap:3px!important}.situation-ux .meal-situation-values span{border-radius:3px!important;padding:5px 2px!important}.situation-ux .meal-situation-values em{font-size:6px!important}.situation-ux .meal-situation-values strong{font-size:13px!important}
      #situationView.situation-ux .critical-list{gap:4px!important}.situation-ux .critical-item{border-radius:4px!important;padding:8px 9px!important}.situation-ux .critical-item strong{font-size:10px!important}.situation-ux .critical-item small{font-size:8px!important;line-height:1.3!important}.situation-ux .critical-item b{font-size:10px!important}.situation-ux .critical-empty{border-radius:4px!important;padding:10px!important;font-size:9px!important}
      #situationView.situation-ux .situation-quicklinks{grid-template-columns:repeat(2,1fr)!important;gap:4px!important;margin-top:7px!important}.situation-ux .situation-quicklink{border-radius:4px!important;padding:8px 6px!important;font-size:8px!important}

      @media(max-width:950px){#situationView.situation-ux .situation-grid{grid-template-columns:1fr!important}}
      @media(max-width:700px){
        #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-grid{grid-template-columns:1fr 1fr!important}.dashboard-ux .metric-card:nth-child(2){border-right:0!important}.dashboard-ux .metric-card:nth-child(-n+2){border-bottom:1px solid #e3e8ec!important}
        #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-action-grid{grid-template-columns:1fr!important}.dashboard-situation-cta{grid-template-columns:1fr!important}
        #situationView.situation-ux .situation-head{grid-template-columns:1fr!important;align-items:start!important}.situation-ux .situation-datebar{width:100%!important}.situation-ux .situation-datebar input{flex:1!important;min-width:0!important}
        #situationView.situation-ux .situation-kpis{grid-template-columns:1fr 1fr!important}.situation-ux .situation-kpi:nth-child(2){border-right:0!important}.situation-ux .situation-kpi:nth-child(-n+2){border-bottom:1px solid #e3e8ec!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildDashboardCta() {
    const dashboard = document.querySelector('#standardWorkspace [data-view-panel="dashboard"]');
    if (!dashboard || $('dashboardSituationCta')) return;
    dashboard.classList.add('dashboard-ux');
    const actions = dashboard.querySelector('.dashboard-action-grid');
    if (!actions) return;
    const cta = document.createElement('div');
    cta.id = 'dashboardSituationCta';
    cta.className = 'dashboard-situation-cta';
    cta.innerHTML = `<div><span>Quadro operativo</span><strong>Situazione Campo</strong><small>Turni, pernottamenti, mezzi, pasti e criticità in un’unica schermata realtime.</small></div><button type="button">Apri situazione</button>`;
    actions.insertAdjacentElement('beforebegin', cta);
    cta.querySelector('button')?.addEventListener('click', () => document.querySelector('.app-nav-btn[data-view="situazione"]')?.click());
  }

  function polishSituation() {
    const view = $('situationView');
    if (!view) return;
    view.classList.add('situation-ux');
    const p = view.querySelector('.situation-head p');
    if (p) p.textContent = 'Numeri essenziali, copertura e criticità operative del Campo.';
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 140; i += 1) {
      buildDashboardCta();
      polishSituation();
      if ($('situationView')) {
        const workspace = $('standardWorkspace');
        if (workspace) {
          observer = new MutationObserver(() => { buildDashboardCta(); polishSituation(); });
          observer.observe(workspace, { childList:true, subtree:true });
        }
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();