(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let observer = null;
  let enhancing = false;

  const STATES = [
    ['disponibile', 'Disponibile'],
    ['assegnato', 'Assegnato'],
    ['confermato', 'Confermato'],
    ['rinunciato', 'Rinunciato'],
    ['assente', 'Assente']
  ];

  function injectStyles() {
    if ($('turniQuickStateStyles')) return;
    const style = document.createElement('style');
    style.id = 'turniQuickStateStyles';
    style.textContent = `
      /* Stati persona turno: un click, niente menu a tendina */
      #shiftManageModal .shift-state-select.quick-state-source{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}
      .shift-quick-states{display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:7px}
      .shift-quick-state{min-height:29px;border:1px solid #cbd4da;border-radius:4px;background:#fff;padding:5px 8px;font:inherit;font-size:8px;font-weight:850;color:#4b5f6c;cursor:pointer;box-shadow:none;transition:background .1s,border-color .1s,color .1s}
      .shift-quick-state:hover{background:#f3f6f8;border-color:#aebbc5}
      .shift-quick-state[data-state="disponibile"].active{background:#edf2f5;border-color:#93a5b1;color:#334b5a}
      .shift-quick-state[data-state="assegnato"].active{background:#eaf2f8;border-color:#82a6bf;color:#2f617f}
      .shift-quick-state[data-state="confermato"].active{background:#eaf6ef;border-color:#7cb698;color:#176844}
      .shift-quick-state[data-state="rinunciato"].active{background:#fff4e7;border-color:#d6a368;color:#88551b}
      .shift-quick-state[data-state="assente"].active{background:#fff0f2;border-color:#d9919d;color:#982b3f}
      .shift-quick-state:disabled{opacity:.5;cursor:wait}

      .shift-person-row.quick-state-row .shift-person-top{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:3px!important}
      .shift-person-row.quick-state-row .shift-person-top>div{min-width:0}
      .shift-person-row.quick-state-row .shift-quick-states{grid-column:1/-1}

      .shift-add-state.quick-add-state{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:center!important;gap:8px!important;padding:7px 0!important}
      .shift-add-state.quick-add-state>select{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      .shift-add-state.quick-add-state .shift-add-quick{display:flex;gap:4px;flex-wrap:wrap}
      .shift-add-state.quick-add-state .shift-quick-state{font-size:8px!important;min-height:28px!important}

      @media(max-width:650px){
        .shift-quick-states{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
        .shift-quick-state{width:100%}
        .shift-add-state.quick-add-state{grid-template-columns:1fr!important}
        .shift-add-state.quick-add-state .shift-add-quick{display:grid;grid-template-columns:repeat(3,1fr)}
      }
    `;
    document.head.appendChild(style);
  }

  function syncButtons(group, value) {
    group?.querySelectorAll('[data-quick-shift-state]').forEach(button => {
      button.classList.toggle('active', button.dataset.state === value);
      button.setAttribute('aria-pressed', button.dataset.state === value ? 'true' : 'false');
    });
  }

  function enhanceLinkedRow(row) {
    const select = row.querySelector('select[data-shift-link-state]');
    if (!select || row.dataset.quickStateEnhanced === '1') return;
    row.dataset.quickStateEnhanced = '1';
    row.classList.add('quick-state-row');
    select.classList.add('quick-state-source');

    const group = document.createElement('div');
    group.className = 'shift-quick-states';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Stato persona nel turno');
    group.innerHTML = STATES.map(([value,label]) => `<button type="button" class="shift-quick-state" data-quick-shift-state data-state="${value}" aria-pressed="false">${label}</button>`).join('');
    select.insertAdjacentElement('afterend', group);
    syncButtons(group, select.value);

    group.addEventListener('click', event => {
      const button = event.target.closest('[data-quick-shift-state]');
      if (!button || button.disabled || select.value === button.dataset.state) return;
      const buttons = [...group.querySelectorAll('button')];
      buttons.forEach(btn => btn.disabled = true);
      select.value = button.dataset.state;
      syncButtons(group, select.value);
      select.dispatchEvent(new Event('change', { bubbles:true }));
      // La logica Turni ricarica normalmente il dato. Se non ricostruisce la riga,
      // riabilita comunque i controlli dopo un breve intervallo.
      setTimeout(() => {
        buttons.forEach(btn => btn.disabled = false);
        syncButtons(group, select.value);
      }, 900);
    });
  }

  function enhanceAddState() {
    const wrap = document.querySelector('#shiftManageModal .shift-add-state');
    const select = $('shiftCandidateState');
    if (!wrap || !select || wrap.dataset.quickAddEnhanced === '1') return;
    wrap.dataset.quickAddEnhanced = '1';
    wrap.classList.add('quick-add-state');

    const group = document.createElement('div');
    group.className = 'shift-add-quick';
    group.innerHTML = STATES.slice(0,3).map(([value,label]) => `<button type="button" class="shift-quick-state" data-quick-add-state data-state="${value}" aria-pressed="false">${label}</button>`).join('');
    wrap.appendChild(group);
    syncButtons(group, select.value || 'disponibile');

    group.addEventListener('click', event => {
      const button = event.target.closest('[data-quick-add-state]');
      if (!button) return;
      select.value = button.dataset.state;
      syncButtons(group, select.value);
      select.dispatchEvent(new Event('change', { bubbles:true }));
    });
  }

  function enhance() {
    if (enhancing) return;
    enhancing = true;
    try {
      document.querySelectorAll('#shiftLinkedList .shift-person-row').forEach(enhanceLinkedRow);
      enhanceAddState();
    } finally {
      enhancing = false;
    }
  }

  async function init() {
    injectStyles();
    for (let i=0;i<120;i+=1) {
      if ($('shiftLinkedList') && $('shiftCandidateState')) break;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    const modal = $('shiftManageModal');
    if (!modal) return;
    enhance();
    observer = new MutationObserver(() => setTimeout(enhance, 10));
    observer.observe(modal, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
