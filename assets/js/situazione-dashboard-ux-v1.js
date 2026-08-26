(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('situationDashboardUxStyles')) return;
    const style = document.createElement('style');
    style.id = 'situationDashboardUxStyles';
    style.textContent = `
      /* Dashboard iniziale — versione stabile, senza observer ricorsivi */
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux{max-width:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;margin:6px 0 12px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card{margin:0!important;padding:13px 15px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;min-height:74px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card:last-child{border-right:0!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card small{font-size:11px!important;color:#6d7c86!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-card strong{font-size:24px!important;color:#1e3441!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-action-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;margin:0 0 12px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel{margin:0!important;padding:16px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel h2{font-size:18px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-panel p{font-size:12px!important;line-height:1.45!important}
      .dashboard-situation-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin:0 0 12px;padding:14px 16px;border:1px solid #cbdce6;border-left:4px solid #173b52;border-radius:6px;background:#f3f8fb}
      .dashboard-situation-cta span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:850;color:#70838f}
      .dashboard-situation-cta strong{display:block;margin-top:2px;font-size:16px;color:#193849}
      .dashboard-situation-cta small{display:block;margin-top:3px;font-size:12px;color:#6f808a}
      .dashboard-situation-cta button{min-height:40px;border:0;border-radius:4px;background:#173b52;color:#fff;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card{border-radius:7px!important;box-shadow:none!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card strong{font-size:13px!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card small{font-size:11px!important;line-height:1.35!important}
      #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .module-card em{font-size:10px!important}

      /* Situazione Campo — solo styling, nessuna osservazione continua del DOM */
      #situationView.situation-ux{max-width:none!important}
      #situationView.situation-ux .situation-head h2{font-size:29px!important;color:#192e3b!important}
      #situationView.situation-ux .situation-head p{font-size:12px!important}
      #situationView.situation-ux .situation-kpis{gap:8px!important}
      #situationView.situation-ux .situation-kpi{border-radius:7px!important;box-shadow:none!important}
      #situationView.situation-ux .situation-kpi small{font-size:11px!important}
      #situationView.situation-ux .situation-kpi strong{font-size:25px!important}
      #situationView.situation-ux .situation-kpi em{font-size:11px!important;line-height:1.35!important}
      #situationView.situation-ux .situation-panel{border-radius:7px!important;box-shadow:none!important}
      #situationView.situation-ux .situation-panel h3{font-size:17px!important}
      #situationView.situation-ux .situation-panel>p{font-size:12px!important}
      #situationView.situation-ux .coverage-stat small{font-size:11px!important}
      #situationView.situation-ux .coverage-caption{font-size:11px!important}
      #situationView.situation-ux .shift-situation strong{font-size:13px!important}
      #situationView.situation-ux .shift-situation small{font-size:11px!important}
      #situationView.situation-ux .critical-item strong{font-size:13px!important}
      #situationView.situation-ux .critical-item small{font-size:11px!important}
      #situationView.situation-ux .situation-quicklink{font-size:12px!important}

      @media(max-width:700px){
        #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .metric-grid{grid-template-columns:1fr 1fr!important}
        #standardWorkspace [data-view-panel="dashboard"].dashboard-ux .dashboard-action-grid{grid-template-columns:1fr!important}
        .dashboard-situation-cta{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildDashboardCta() {
    const dashboard = document.querySelector('#standardWorkspace [data-view-panel="dashboard"]');
    if (!dashboard) return false;
    dashboard.classList.add('dashboard-ux');
    if ($('dashboardSituationCta')) return true;

    const actions = dashboard.querySelector('.dashboard-action-grid');
    if (!actions) return false;

    const cta = document.createElement('div');
    cta.id = 'dashboardSituationCta';
    cta.className = 'dashboard-situation-cta';
    cta.innerHTML = `<div><span>Quadro operativo</span><strong>Situazione Campo</strong><small>Turni, pernottamenti, mezzi, pasti e criticità in un’unica schermata realtime.</small></div><button type="button">Apri situazione</button>`;
    actions.insertAdjacentElement('beforebegin', cta);
    cta.querySelector('button')?.addEventListener('click', () => document.querySelector('.app-nav-btn[data-view="situazione"]')?.click());
    return true;
  }

  function polishSituation() {
    const view = $('situationView');
    if (!view) return false;
    view.classList.add('situation-ux');
    const p = view.querySelector('.situation-head p');
    const text = 'Numeri essenziali, copertura e criticità operative del Campo.';
    if (p && p.textContent !== text) p.textContent = text;
    return true;
  }

  async function init() {
    injectStyles();

    // Le UI possono essere create pochi istanti dopo il caricamento degli script.
    // Facciamo solo pochi tentativi temporizzati: nessun MutationObserver sul workspace.
    for (let i = 0; i < 40; i += 1) {
      const dashboardReady = buildDashboardCta();
      const situationReady = polishSituation();
      if (dashboardReady && situationReady) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
