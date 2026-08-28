(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // Compatibilità con il vecchio loader ancora presente in area-segreteria.js:
  // config.js carica già pernottamenti-segreteria.js, quindi impediamo un secondo caricamento.
  if (!$('pernottamentiModuleScript')) {
    const marker = document.createElement('meta');
    marker.id = 'pernottamentiModuleScript';
    marker.dataset.productionGuard = '1';
    document.head.appendChild(marker);
  }

  function polish() {
    const workspace = $('standardWorkspace');
    if (!workspace) return false;

    document.title = 'Area Riservata Operativa | Campo Scuola CRI Puglia';

    const brandTitle = $('reservedAreaTitle');
    if (brandTitle) brandTitle.textContent = 'Area Riservata Operativa';

    const shellTitle = workspace.querySelector('.app-shell-head h1');
    if (shellTitle) shellTitle.textContent = 'Gestione operativa Campo';

    const nav = workspace.querySelector('.app-nav');
    if (nav) nav.setAttribute('aria-label', 'Moduli Area Riservata Operativa');

    const moduleNames = {
      'Turni': 'Turni',
      'Pernottamenti': 'Alloggi',
      'Mezzi': 'Mezzi',
      'Importa Excel': 'Import Master',
      'Situazione Campo': 'Situazione Campo'
    };

    workspace.querySelectorAll('[data-view-panel="dashboard"] .module-card').forEach(card => {
      const strong = card.querySelector('strong');
      if (!strong) return;
      const current = strong.textContent.trim();
      if (moduleNames[current]) strong.textContent = moduleNames[current];
      const status = card.querySelector('em');
      if (status && ['Da attivare', 'In sviluppo'].includes(status.textContent.trim())) status.textContent = 'Operativo';
    });

    return true;
  }

  async function init() {
    for (let i = 0; i < 50; i += 1) {
      if (polish()) return;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
