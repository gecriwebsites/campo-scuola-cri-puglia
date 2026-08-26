(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let bodyObserver = null;
  let currentBody = null;
  let setupTimer = null;

  function injectStyles() {
    if ($('excelVerifyNavFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'excelVerifyNavFixStyles';
    style.textContent = `
      /* Disabilita la vecchia navigazione V2: poteva essere ricreata dai MutationObserver */
      #excelVerifyPanel .ux-verify-nav{display:none!important}

      #excelVerifyPanel .xvn-nav{margin:18px 0 6px;padding:16px;border:1px solid #d9e0e6;border-radius:14px;background:#f8fafb;display:grid;gap:14px}
      #excelVerifyPanel .xvn-progress{display:flex;align-items:center;justify-content:space-between;gap:14px}
      #excelVerifyPanel .xvn-progress strong{font-size:16px;color:#27313a}
      #excelVerifyPanel .xvn-progress span{font-size:13px;color:#69747e;font-weight:750}
      #excelVerifyPanel .xvn-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
      #excelVerifyPanel .xvn-step{min-height:48px;border:1px solid #d7dde2;border-radius:10px;background:#fff;color:#5e6871;font:inherit;font-size:13px;font-weight:850;cursor:pointer;padding:8px 10px;display:flex;align-items:center;justify-content:center;gap:7px;text-align:center}
      #excelVerifyPanel .xvn-step:hover{border-color:#b8c2ca;background:#fdfefe}
      #excelVerifyPanel .xvn-step.active{background:#202a33;border-color:#202a33;color:#fff}
      #excelVerifyPanel .xvn-step.done{background:#eaf7f0;border-color:#c8e6d6;color:#146c47}
      #excelVerifyPanel .xvn-step.attention:not(.active){background:#fff6da;border-color:#ecd48f;color:#7c5a00}
      #excelVerifyPanel .xvn-step.missing:not(.active){background:#fff0f2;border-color:#edc9cf;color:#98283a}
      #excelVerifyPanel .xvn-step .num{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.07);font-size:11px;flex:0 0 auto}
      #excelVerifyPanel .xvn-step.active .num{background:rgba(255,255,255,.18)}
      #excelVerifyPanel .xvn-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #e1e6ea;padding-top:13px}
      #excelVerifyPanel .xvn-actions small{font-size:13px;color:#66717b;line-height:1.4}
      #excelVerifyPanel .xvn-buttons{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
      #excelVerifyPanel .xvn-btn{min-height:46px;border:1px solid #ccd4da;border-radius:10px;background:#fff;padding:10px 16px;font:inherit;font-size:14px;font-weight:900;cursor:pointer}
      #excelVerifyPanel .xvn-btn.primary{background:#202a33;border-color:#202a33;color:#fff}
      #excelVerifyPanel .xvn-btn:disabled{opacity:.42;cursor:not-allowed}

      /* La riga corrente resta completamente editabile */
      #excelVerifyPanel .excel-verify-compare.ux-guided .excel-verify-row{display:none!important}
      #excelVerifyPanel .excel-verify-compare.ux-guided .excel-verify-row.ux-verify-current{display:grid!important}
      #excelVerifyPanel .excel-verify-row.ux-verify-current{animation:xvnIn .12s ease-out}
      @keyframes xvnIn{from{opacity:.55;transform:translateY(3px)}to{opacity:1;transform:none}}

      @media(max-width:900px){
        #excelVerifyPanel .xvn-steps{grid-template-columns:repeat(2,minmax(0,1fr))}
        #excelVerifyPanel .xvn-actions{align-items:flex-start;flex-direction:column}
        #excelVerifyPanel .xvn-buttons{width:100%;justify-content:stretch}
        #excelVerifyPanel .xvn-btn{flex:1}
      }
    `;
    document.head.appendChild(style);
  }

  function rowLabel(row, index) {
    return row.querySelector(':scope > strong')?.textContent?.trim() || `Dato ${index + 1}`;
  }

  function rowState(row) {
    const badge = row.querySelector('.excel-verify-match');
    if (badge?.classList.contains('missing')) return 'missing';
    if (badge?.classList.contains('check')) return 'attention';
    if (badge?.classList.contains('ok')) return 'ok';
    return 'info';
  }

  function removeLegacyNav(body) {
    body?.querySelectorAll('.ux-verify-nav').forEach(el => el.remove());
  }

  function renderGuide(compare, nav) {
    const rows = [...compare.querySelectorAll(':scope > .excel-verify-row')];
    if (!rows.length || !nav) return;

    let index = Number(compare.dataset.xvnIndex || 0);
    if (!Number.isFinite(index)) index = 0;
    index = Math.max(0, Math.min(rows.length - 1, index));
    compare.dataset.xvnIndex = String(index);
    compare.classList.add('ux-guided');

    rows.forEach((row, i) => row.classList.toggle('ux-verify-current', i === index));

    const title = nav.querySelector('[data-xvn-title]');
    const counter = nav.querySelector('[data-xvn-counter]');
    const prev = nav.querySelector('[data-xvn-prev]');
    const next = nav.querySelector('[data-xvn-next]');
    const helper = nav.querySelector('[data-xvn-helper]');

    if (title) title.textContent = rowLabel(rows[index], index);
    if (counter) counter.textContent = `Controllo ${index + 1} di ${rows.length}`;
    if (prev) prev.disabled = index === 0;
    if (next) next.textContent = index === rows.length - 1 ? 'Vai al riepilogo ✓' : 'Dato successivo →';

    const state = rowState(rows[index]);
    if (helper) {
      helper.textContent = state === 'missing'
        ? 'Dato mancante: puoi compilarlo qui oppure lasciarlo vuoto e proseguire.'
        : state === 'attention'
          ? 'Dato da verificare: correggilo, usa il valore Excel oppure mantieni quello del gestionale.'
          : state === 'ok'
            ? 'Dato già corretto: puoi passare al successivo.'
            : 'Controlla il dato e prosegui quando vuoi.';
    }

    nav.querySelectorAll('[data-xvn-step]').forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.classList.toggle('done', i < index);
      button.classList.remove('attention', 'missing');
      const stateI = rowState(rows[i]);
      if (stateI === 'attention') button.classList.add('attention');
      if (stateI === 'missing') button.classList.add('missing');
    });

    const details = compare.parentElement?.querySelector('.excel-verify-details');
    details?.classList.toggle('ux-unreviewed', index < rows.length - 1);
  }

  function buildNav(compare) {
    const rows = [...compare.querySelectorAll(':scope > .excel-verify-row')];
    if (!rows.length) return null;

    let nav = compare.parentElement?.querySelector(':scope > .xvn-nav');
    if (nav && Number(nav.dataset.rowCount || 0) === rows.length) return nav;
    nav?.remove();

    nav = document.createElement('div');
    nav.className = 'xvn-nav';
    nav.dataset.rowCount = String(rows.length);
    nav.innerHTML = `
      <div class="xvn-progress">
        <strong data-xvn-title>Controllo dati</strong>
        <span data-xvn-counter>Controllo 1 di ${rows.length}</span>
      </div>
      <div class="xvn-steps">
        ${rows.map((row, i) => `<button class="xvn-step" type="button" data-xvn-step="${i}"><span class="num">${i + 1}</span><span>${rowLabel(row, i)}</span></button>`).join('')}
      </div>
      <div class="xvn-actions">
        <small data-xvn-helper>Controlla il dato e prosegui quando vuoi.</small>
        <div class="xvn-buttons">
          <button class="xvn-btn" type="button" data-xvn-prev>← Dato precedente</button>
          <button class="xvn-btn primary" type="button" data-xvn-next>Dato successivo →</button>
        </div>
      </div>`;

    compare.insertAdjacentElement('afterend', nav);

    nav.addEventListener('click', event => {
      const step = event.target.closest('[data-xvn-step]');
      const prev = event.target.closest('[data-xvn-prev]');
      const next = event.target.closest('[data-xvn-next]');
      const currentRows = [...compare.querySelectorAll(':scope > .excel-verify-row')];
      if (!currentRows.length) return;

      let index = Number(compare.dataset.xvnIndex || 0);
      if (step) index = Number(step.dataset.xvnStep);
      else if (prev) index = Math.max(0, index - 1);
      else if (next) {
        if (index >= currentRows.length - 1) {
          compare.dataset.xvnIndex = String(currentRows.length - 1);
          renderGuide(compare, nav);
          compare.parentElement?.querySelector('.excel-verify-details')?.classList.remove('ux-unreviewed');
          compare.parentElement?.querySelector('.excel-verify-actions')?.scrollIntoView({ behavior:'smooth', block:'center' });
          return;
        }
        index += 1;
      } else return;

      compare.dataset.xvnIndex = String(index);
      renderGuide(compare, nav);
      currentRows[index]?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });

    return nav;
  }

  function setupGuide() {
    const body = $('excelVerifyBody');
    if (!body) return;
    removeLegacyNav(body);
    const compare = body.querySelector('.excel-verify-compare');
    if (!compare) return;
    const rows = [...compare.querySelectorAll(':scope > .excel-verify-row')];
    if (!rows.length) return;

    const nav = buildNav(compare);
    renderGuide(compare, nav);
  }

  function observeBody(body) {
    if (!body || body === currentBody) return;
    bodyObserver?.disconnect();
    currentBody = body;
    bodyObserver = new MutationObserver(mutations => {
      const meaningful = mutations.some(m => {
        const target = m.target instanceof Element ? m.target : m.target?.parentElement;
        return target && !target.closest('.xvn-nav') && !target.closest('.xve-editor');
      });
      if (!meaningful) return;
      clearTimeout(setupTimer);
      setupTimer = setTimeout(setupGuide, 40);
    });
    bodyObserver.observe(body, { childList:true, subtree:true });
  }

  function detachLegacyVerificationObserver() {
    const oldBody = $('excelVerifyBody');
    if (!oldBody || oldBody.dataset.xvnDetached === '1') return oldBody;

    /*
      ux-segreteria-v2 osservava il vecchio #excelVerifyBody e ricostruiva la sua
      navigazione dopo ogni click. Sostituendo il nodo, quell'observer resta sul
      nodo dismesso mentre tutte le altre funzioni, che cercano l'id al momento
      dell'uso, lavorano normalmente sul nuovo body.
    */
    const fresh = oldBody.cloneNode(false);
    fresh.id = 'excelVerifyBody';
    fresh.className = oldBody.className;
    fresh.dataset.xvnDetached = '1';
    oldBody.replaceWith(fresh);
    return fresh;
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 120; i += 1) {
      if ($('excelVerifyPanel') && $('excelVerifyBody')) break;
      await sleep(80);
    }
    const body = detachLegacyVerificationObserver();
    observeBody(body);
    setupGuide();

    /* Nel raro caso in cui un altro script ricrei il body, riaggancia il fix. */
    const panel = $('excelVerifyPanel');
    if (panel) {
      new MutationObserver(() => {
        const latest = $('excelVerifyBody');
        if (latest && latest !== currentBody) {
          observeBody(latest);
          setTimeout(setupGuide, 40);
        }
      }).observe(panel, { childList:true, subtree:false });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
