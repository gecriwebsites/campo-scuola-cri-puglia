(() => {
  'use strict';

  function sync() {
    const root = document.getElementById('dailyOpsAdmin');
    if (!root) return;
    const setupMissing = !document.getElementById('dailyOpsSetup')?.hidden;
    const stateText = document.querySelector('#dailyOpsBanner .daily-state')?.textContent || 'DA APRIRE';
    const openInputs = [...root.querySelectorAll('[data-daily-phase="open"]')];
    const closeInputs = [...root.querySelectorAll('[data-daily-phase="close"]')];
    const openComplete = openInputs.length > 0 && openInputs.every(input => input.checked);
    const closeComplete = closeInputs.length > 0 && closeInputs.every(input => input.checked);
    const open = document.getElementById('dailyOpsOpen');
    const close = document.getElementById('dailyOpsClose');
    if (open && stateText === 'DA APRIRE') open.disabled = setupMissing || !openComplete;
    if (close && stateText === 'OPERATIVA') close.disabled = setupMissing || !closeComplete;
  }

  async function init() {
    for (let i = 0; i < 70; i += 1) {
      const root = document.getElementById('dailyOpsAdmin');
      if (root) {
        root.addEventListener('change', event => {
          if (event.target.matches('[data-daily-phase]')) {
            event.target.closest('.daily-item')?.classList.toggle('done', event.target.checked);
            sync();
          }
        });
        root.addEventListener('click', () => setTimeout(sync, 0));
        sync();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
