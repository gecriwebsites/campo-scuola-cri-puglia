(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('pastiUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'pastiUxV1Styles';
    style.textContent = `
      [data-view-panel="pasti"].pasti-ux{max-width:none!important}
      [data-view-panel="pasti"].pasti-ux .meals-admin-head{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;gap:16px!important;margin:8px 0 12px!important}
      [data-view-panel="pasti"].pasti-ux .meals-admin-head h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      [data-view-panel="pasti"].pasti-ux .meals-admin-head p{margin:0!important;font-size:12px!important;color:#687985!important}
      [data-view-panel="pasti"].pasti-ux .meals-realtime{border:1px solid #d6e5dc!important;border-radius:4px!important;background:#f2f9f5!important;padding:5px 7px!important;font-size:9px!important;font-weight:800!important;color:#16794f!important}

      .pasti-ux-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 9px;border:1px solid #d5dde3;border-radius:6px;background:#f8fafb;overflow:hidden}
      .pasti-ux-flow div{padding:8px 10px;border-right:1px solid #e2e7eb;font-size:9px;color:#677781}.pasti-ux-flow div:last-child{border-right:0}.pasti-ux-flow strong{display:block;font-size:10px;color:#304550;margin-bottom:2px}

      [data-view-panel="pasti"].pasti-ux .meals-summary-panel{margin:0 0 10px!important;padding:0!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      [data-view-panel="pasti"].pasti-ux .meals-summary-top{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0!important;padding:9px 10px!important;border-bottom:1px solid #e2e7eb!important;background:#f7f9fa!important}
      [data-view-panel="pasti"].pasti-ux .meals-summary-top h3{margin:2px 0 0!important;font-size:14px!important;color:#263944!important}
      [data-view-panel="pasti"].pasti-ux .meals-summary-date{height:36px!important;border:1px solid #c8d2d9!important;border-radius:4px!important;background:#fff!important;padding:0 8px!important;font:inherit!important;font-size:10px!important}
      .pasti-ux-date-actions{display:flex;gap:5px;align-items:center}.pasti-ux-today{height:36px;border:1px solid #c8d2d9;background:#fff;border-radius:4px;padding:0 9px;font:inherit;font-size:9px;font-weight:800;color:#4d616e;cursor:pointer}.pasti-ux-today:hover{background:#eef3f6}
      [data-view-panel="pasti"].pasti-ux .meals-summary-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;margin:0!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary{margin:0!important;padding:10px 12px!important;border:0!important;border-right:1px solid #e2e7eb!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary:last-child{border-right:0!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary>small{font-size:8px!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#75848e!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary h4{margin:2px 0 6px!important;font-size:13px!important;color:#243944!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary-values{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary-values span{padding:5px!important;border:1px solid #e3e8ec!important;border-radius:4px!important;background:#fafbfc!important;text-align:center!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary-values em{display:block!important;font-size:7px!important;color:#7a8993!important;font-style:normal!important}
      [data-view-panel="pasti"].pasti-ux .meal-admin-summary-values strong{display:block!important;margin-top:1px!important;font-size:13px!important;color:#223743!important}

      [data-view-panel="pasti"].pasti-ux .meals-admin-grid{display:grid!important;grid-template-columns:300px minmax(0,1fr)!important;gap:9px!important;align-items:start!important}
      [data-view-panel="pasti"].pasti-ux .meal-people-panel,[data-view-panel="pasti"].pasti-ux .meal-calendar-panel{margin:0!important;padding:12px!important;border:1px solid #d5dde3!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important;min-width:0!important}
      [data-view-panel="pasti"].pasti-ux .meal-panel-head{margin:0 0 8px!important;padding:0 0 8px!important;border-bottom:1px solid #e4e9ed!important}
      [data-view-panel="pasti"].pasti-ux .meal-panel-head h3{margin:2px 0 3px!important;font-size:14px!important;color:#263944!important}
      [data-view-panel="pasti"].pasti-ux .meal-panel-head p{margin:0!important;font-size:9px!important;color:#788690!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-search{display:flex!important;align-items:center!important;gap:7px!important;margin:0!important;padding:0 9px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;background:#fff!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-search input{width:100%!important;height:38px!important;border:0!important;outline:0!important;font:inherit!important;font-size:10px!important;background:transparent!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-count{margin:6px 1px!important;font-size:9px!important;color:#778690!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-list{display:grid!important;gap:4px!important;max-height:620px!important;overflow:auto!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-item{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:50px!important;margin:0!important;padding:7px 8px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important;text-align:left!important;box-shadow:none!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-item:hover{border-color:#bccbd4!important;background:#f5f9fb!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-item.active{border-color:#9fb8c8!important;background:#eef6fa!important}
      [data-view-panel="pasti"].pasti-ux .meal-person-item strong{font-size:10px!important;color:#233844!important}.meal-person-item small{font-size:8px!important;color:#7c8992!important}.meal-person-item em{font-size:8px!important;color:#637785!important;font-style:normal!important;text-align:right!important}

      [data-view-panel="pasti"].pasti-ux .meal-empty-selection{padding:50px 20px!important;border:1px dashed #cbd4db!important;border-radius:5px!important;background:#fafbfc!important;color:#76858f!important;font-size:10px!important;text-align:center!important}
      [data-view-panel="pasti"].pasti-ux .meal-selected-head{display:flex!important;justify-content:space-between!important;gap:10px!important;margin:0 0 8px!important;padding:0 0 8px!important;border-bottom:1px solid #e4e9ed!important}
      [data-view-panel="pasti"].pasti-ux .meal-selected-head h3{margin:2px 0 3px!important;font-size:17px!important;color:#213744!important}.meal-selected-head p{margin:0!important;font-size:9px!important;color:#788690!important}
      [data-view-panel="pasti"].pasti-ux .meal-dietary-warning{margin:0 0 8px!important;padding:8px 9px!important;border:1px solid #efd59a!important;border-radius:5px!important;background:#fff9e9!important;font-size:9px!important}

      [data-view-panel="pasti"].pasti-ux .meal-range-box{margin:0 0 8px!important;padding:9px!important;border:1px solid #dce3e8!important;border-radius:5px!important;background:#f8fafb!important}
      [data-view-panel="pasti"].pasti-ux .meal-range-row{display:flex!important;align-items:end!important;gap:6px!important;flex-wrap:wrap!important}
      [data-view-panel="pasti"].pasti-ux .meal-range-row label{font-size:8px!important;font-weight:800!important;color:#6f7f89!important;text-transform:uppercase!important;letter-spacing:.05em!important}
      [data-view-panel="pasti"].pasti-ux .meal-range-row input{display:block!important;height:35px!important;margin-top:4px!important;border:1px solid #c9d2d9!important;border-radius:4px!important;padding:0 7px!important;font:inherit!important;font-size:9px!important;background:#fff!important}
      [data-view-panel="pasti"].pasti-ux #mealUsePersonPeriod{height:35px!important;border-radius:4px!important;font-size:9px!important}
      [data-view-panel="pasti"].pasti-ux .meal-range-actions{display:flex!important;gap:5px!important;flex-wrap:wrap!important;margin-top:7px!important}
      [data-view-panel="pasti"].pasti-ux .meal-range-actions button{min-height:34px!important;border-radius:4px!important;padding:6px 9px!important;font-size:9px!important;font-weight:800!important;box-shadow:none!important}
      [data-view-panel="pasti"].pasti-ux .meal-bulk-state{margin-top:5px!important;font-size:8px!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar-legend{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin:7px 0!important;font-size:8px!important;color:#778690!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar-wrap{width:100%!important;overflow:auto!important;border:1px solid #d8e0e6!important;border-radius:5px!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar{width:100%!important;min-width:620px!important;border-collapse:collapse!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar th{padding:8px!important;background:#f2f5f7!important;border-bottom:1px solid #d8e0e6!important;font-size:8px!important;color:#657682!important;text-transform:uppercase!important;letter-spacing:.05em!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar td{padding:6px!important;border-bottom:1px solid #e7ecef!important;font-size:9px!important}
      [data-view-panel="pasti"].pasti-ux .meal-calendar-date strong{display:block!important;font-size:9px!important;color:#2f4551!important}.meal-calendar-date small{display:block!important;margin-top:2px!important;font-size:7px!important;color:#85919a!important}
      [data-view-panel="pasti"].pasti-ux .meal-toggle{width:100%!important;min-height:31px!important;border-radius:4px!important;padding:5px!important;font-size:8px!important;font-weight:800!important;box-shadow:none!important;white-space:normal!important}

      @media(max-width:950px){[data-view-panel="pasti"].pasti-ux .meals-admin-grid{grid-template-columns:1fr!important}[data-view-panel="pasti"].pasti-ux .meal-person-list{max-height:260px!important}}
      @media(max-width:650px){.pasti-ux-flow{grid-template-columns:1fr}.pasti-ux-flow div{border-right:0;border-bottom:1px solid #e2e7eb}.pasti-ux-flow div:last-child{border-bottom:0}[data-view-panel="pasti"].pasti-ux .meals-summary-grid{grid-template-columns:1fr!important}[data-view-panel="pasti"].pasti-ux .meal-admin-summary{border-right:0!important;border-bottom:1px solid #e2e7eb!important}.meal-admin-summary:last-child{border-bottom:0!important}[data-view-panel="pasti"].pasti-ux .meal-range-row{display:grid!important;grid-template-columns:1fr 1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function buildFlow(view) {
    if ($('pastiUxFlow')) return;
    const flow = document.createElement('div');
    flow.id = 'pastiUxFlow';
    flow.className = 'pasti-ux-flow';
    flow.innerHTML = '<div><strong>1 · Seleziona la persona</strong>Ricerca a sinistra per nome, badge o Comitato.</div><div><strong>2 · Usa la permanenza</strong>Imposta automaticamente il periodo Arrivo–Partenza.</div><div><strong>3 · Correggi solo le eccezioni</strong>Attiva o rimuovi Colazione, Pranzo e Cena giorno per giorno.</div>';
    const summary = view.querySelector('.meals-summary-panel');
    summary?.insertAdjacentElement('beforebegin', flow);
  }

  function buildTodayButton() {
    const top = document.querySelector('[data-view-panel="pasti"] .meals-summary-top');
    const date = $('mealsSummaryDate');
    if (!top || !date || $('pastiUxToday')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pasti-ux-date-actions';
    date.parentNode?.insertBefore(wrap, date);
    wrap.appendChild(date);
    const button = document.createElement('button');
    button.id = 'pastiUxToday';
    button.type = 'button';
    button.className = 'pasti-ux-today';
    button.textContent = 'Oggi';
    button.addEventListener('click', () => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
      date.value = today >= '2026-09-16' && today <= '2026-09-30' ? today : '2026-09-16';
      date.dispatchEvent(new Event('change', { bubbles:true }));
    });
    wrap.appendChild(button);
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      const view = document.querySelector('[data-view-panel="pasti"]');
      if (view) {
        view.classList.add('pasti-ux');
        const head = view.querySelector('.meals-admin-head');
        const title = head?.querySelector('h2');
        const p = head?.querySelector('p');
        if (title) title.textContent = 'Pasti';
        if (p) p.textContent = 'Pianificazione dei ticket individuali e riepilogo giornaliero per la Cucina.';
        const selectedHead = view.querySelector('.meal-selected-head .panel-kicker');
        if (selectedHead) selectedHead.textContent = 'Persona selezionata';
        if ($('mealUsePersonPeriod')) $('mealUsePersonPeriod').textContent = 'Usa permanenza';
        if ($('mealAssignRange')) $('mealAssignRange').textContent = 'Assegna periodo';
        if ($('mealRemoveRange')) $('mealRemoveRange').textContent = 'Rimuovi periodo';
        buildFlow(view);
        buildTodayButton();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
