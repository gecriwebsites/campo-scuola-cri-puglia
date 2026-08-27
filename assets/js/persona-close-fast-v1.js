(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function markClosing() {
    const modal = $('personModal');
    if (!modal || modal.hidden) return;
    modal.classList.add('person-fast-closing');
  }

  function injectStyles() {
    if ($('personCloseFastStyles')) return;
    const style = document.createElement('style');
    style.id = 'personCloseFastStyles';
    style.textContent = `
      #personModal.person-fast-closing{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    const modal = $('personModal');
    if (!modal) return;

    document.addEventListener('click', event => {
      if (event.target.closest('[data-close-person]')) markClosing();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) markClosing();
    }, true);

    const observer = new MutationObserver(() => {
      if (modal.hidden) modal.classList.remove('person-fast-closing');
    });
    observer.observe(modal, { attributes:true, attributeFilter:['hidden'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
