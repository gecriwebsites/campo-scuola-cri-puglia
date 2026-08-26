(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let listObserver = null;
  let metricObserver = null;

  function injectStyles(){
    if ($('accreditUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'accreditUxV1Styles';
    style.textContent = `
      /* =====================================================
         ACCREDITAMENTO UX V1 — OPERATIVITÀ RAPIDA
         ===================================================== */
      [data-view-panel="accreditamento"].accredit-ux-view{max-width:none!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accreditation-heading{margin:8px 0 12px!important;align-items:flex-end!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accreditation-heading h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accreditation-heading p{margin:0!important;font-size:12px!important;color:#687985!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accreditation-live{border-radius:5px!important;padding:7px 9px!important;font-size:10px!important;box-shadow:none!important}

      .acc-ux-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #d5dde3;border-radius:7px;background:#fff;margin-bottom:9px;overflow:hidden}
      .acc-ux-stat{padding:10px 13px;border-right:1px solid #e3e8ec}.acc-ux-stat:last-child{border-right:0}
      .acc-ux-stat span{display:block;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.07em;color:#71808b}
      .acc-ux-stat strong{display:block;margin-top:2px;font-size:21px;line-height:1.1;color:#1c303c}.acc-ux-stat.present strong{color:#18714d}.acc-ux-stat.todo strong{color:#a74323}
      .acc-ux-flow{display:flex;gap:0;align-items:stretch;margin-bottom:9px;border:1px solid #d5dde3;border-radius:7px;background:#f8fafb;overflow:hidden}
      .acc-ux-flow div{display:flex;align-items:center;gap:8px;flex:1;padding:8px 11px;border-right:1px solid #e2e7eb;font-size:10px;color:#5e6e79}.acc-ux-flow div:last-child{border-right:0}
      .acc-ux-flow b{width:21px;height:21px;border-radius:4px;background:#18374d;color:#fff;display:grid;place-items:center;font-size:9px;flex:0 0 auto}
      .acc-ux-flow strong{font-size:10px;color:#304550}

      [data-view-panel="accreditamento"].accredit-ux-view .accredit-search-panel{display:grid!important;grid-template-columns:minmax(260px,1fr) auto!important;gap:8px!important;align-items:center!important;margin:0 0 10px!important;padding:10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-search{height:44px!important;border:1px solid #c9d2d9!important;border-radius:5px!important;padding:0 10px!important;box-shadow:none!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-search input{height:42px!important;font-size:13px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .scan-actions{display:flex!important;gap:6px!important;margin:0!important}
      [data-view-panel="accreditamento"].accredit-ux-view .scan-action{min-height:44px!important;border-radius:5px!important;padding:8px 11px!important;font-size:10px!important;font-weight:850!important;box-shadow:none!important;white-space:nowrap!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-filters{grid-column:1/-1!important;display:flex!important;gap:5px!important;flex-wrap:wrap!important;margin:0!important;padding-top:2px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .filter-pill{border-radius:4px!important;padding:6px 9px!important;font-size:9px!important;box-shadow:none!important}

      [data-view-panel="accreditamento"].accredit-ux-view .accredit-list{display:grid!important;gap:6px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-row{display:grid!important;grid-template-columns:minmax(210px,1.25fr) minmax(240px,1fr) minmax(130px,.55fr) 120px!important;gap:10px!important;align-items:center!important;margin:0!important;padding:11px 12px!important;border:1px solid #d8e0e6!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important;min-width:0!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-row:hover{border-color:#bac8d1!important;background:#f9fbfc!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-row.busy{border-color:#e5d19e!important;background:#fffaf0!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-person{min-width:0!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-person strong{display:block!important;font-size:12px!important;line-height:1.25!important;color:#172b38!important;white-space:normal!important;overflow-wrap:anywhere!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-person small{display:block!important;margin-top:3px!important;font-size:9px!important;line-height:1.3!important;color:#788791!important;white-space:normal!important;overflow-wrap:anywhere!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-meta{font-size:9px!important;line-height:1.55!important;color:#596b77!important;min-width:0!important;white-space:normal!important;overflow-wrap:anywhere!important}
      [data-view-panel="accreditamento"].accredit-ux-view .status-pill,[data-view-panel="accreditamento"].accredit-ux-view .work-pill{border-radius:3px!important;font-size:9px!important;line-height:1.25!important;white-space:normal!important;text-align:center!important;padding:5px 7px!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-actions{display:block!important;min-width:0!important}
      [data-view-panel="accreditamento"].accredit-ux-view .accredit-open{width:100%!important;min-height:38px!important;border-radius:4px!important;padding:7px 8px!important;font-size:10px!important;font-weight:850!important;box-shadow:none!important;white-space:normal!important}
      [data-view-panel="accreditamento"].accredit-ux-view .empty-state{padding:24px!important;font-size:11px!important}

      @media(max-width:980px){
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-row{grid-template-columns:minmax(180px,1fr) minmax(190px,1fr) 120px!important}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-actions{grid-column:1/-1!important;display:flex!important;justify-content:flex-end!important}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-open{width:auto!important;min-width:130px!important}
      }
      @media(max-width:700px){
        .acc-ux-summary{grid-template-columns:1fr 1fr}.acc-ux-stat:nth-child(2){border-right:0}.acc-ux-stat:last-child{grid-column:1/-1;border-top:1px solid #e3e8ec}
        .acc-ux-flow{display:grid}.acc-ux-flow div{border-right:0;border-bottom:1px solid #e2e7eb}.acc-ux-flow div:last-child{border-bottom:0}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-search-panel{grid-template-columns:1fr!important}
        [data-view-panel="accreditamento"].accredit-ux-view .scan-actions{width:100%!important}.scan-actions .scan-action{flex:1!important}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-filters{grid-column:auto!important}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-row{grid-template-columns:1fr!important;gap:7px!important}
        [data-view-panel="accreditamento"].accredit-ux-view .accredit-actions{grid-column:auto!important}.accredit-actions .accredit-open{width:100%!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildUi(view){
    if (!$('accUxSummary')) {
      const summary = document.createElement('div');
      summary.id = 'accUxSummary';
      summary.className = 'acc-ux-summary';
      summary.innerHTML = `
        <div class="acc-ux-stat"><span>Persone registrate</span><strong id="accUxTotal">0</strong></div>
        <div class="acc-ux-stat todo"><span>Da accreditare</span><strong id="accUxOutside">0</strong></div>
        <div class="acc-ux-stat present"><span>Presenti al Campo</span><strong id="accUxPresent">0</strong></div>`;
      view.querySelector('.accredit-search-panel')?.insertAdjacentElement('beforebegin', summary);
    }
    if (!$('accUxFlow')) {
      const flow = document.createElement('div');
      flow.id = 'accUxFlow';
      flow.className = 'acc-ux-flow';
      flow.innerHTML = `
        <div><b>1</b><span><strong>Cerca la persona</strong><br>Nome, CF, telefono o badge</span></div>
        <div><b>2</b><span><strong>Apri la scheda</strong><br>Controlla dati, badge, QR e alloggio</span></div>
        <div><b>3</b><span><strong>Registra l’ingresso</strong><br>La presenza si aggiorna in tempo reale</span></div>`;
      $('accUxSummary')?.insertAdjacentElement('afterend', flow);
    }
  }

  function updateSummary(){
    const total = Number(String($('metricPeople')?.textContent || '0').replace(/\D/g,'')) || 0;
    const present = Number(String($('metricPresent')?.textContent || '0').replace(/\D/g,'')) || 0;
    if ($('accUxTotal')) $('accUxTotal').textContent = total;
    if ($('accUxPresent')) $('accUxPresent').textContent = present;
    if ($('accUxOutside')) $('accUxOutside').textContent = Math.max(0,total-present);
  }

  function polishRows(){
    document.querySelectorAll('#accreditList .accredit-row').forEach(row => {
      const button = row.querySelector('.accredit-open');
      const status = row.querySelector('.status-pill');
      if (button && status) {
        const present = /presente/i.test(status.textContent || '');
        button.textContent = present ? 'Apri scheda' : 'Apri accredito';
      }
      row.querySelectorAll('.accredit-meta').forEach(meta => meta.setAttribute('title', meta.textContent.trim()));
    });
    updateSummary();
  }

  function initObservers(){
    const list = $('accreditList');
    if (list && !listObserver) {
      listObserver = new MutationObserver(() => setTimeout(polishRows, 15));
      listObserver.observe(list,{childList:true,subtree:true});
    }
    const metric = $('metricPeople')?.parentElement?.parentElement;
    if (metric && !metricObserver) {
      metricObserver = new MutationObserver(updateSummary);
      metricObserver.observe(metric,{childList:true,subtree:true,characterData:true});
    }
  }

  async function init(){
    injectStyles();
    for(let i=0;i<100;i+=1){
      const view = document.querySelector('[data-view-panel="accreditamento"]');
      if(view){
        view.classList.add('accredit-ux-view');
        const p = view.querySelector('.accreditation-heading p');
        if (p) p.textContent = 'Ingresso rapido: cerca la persona, apri la scheda operativa e registra la presenza.';
        buildUi(view);
        initObservers();
        polishRows();
        return;
      }
      await new Promise(resolve=>setTimeout(resolve,60));
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
