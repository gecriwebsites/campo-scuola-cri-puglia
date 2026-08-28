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

  function ensureImportMasterCard(workspace) {
    const cards = [...workspace.querySelectorAll('[data-view-panel="dashboard"] .module-card')];
    let card = cards.find(item => {
      const label = item.querySelector('strong')?.textContent?.trim();
      return label === 'Importa Excel' || label === 'Import Master';
    });
    if (!card) return;

    // Il vecchio HTML aveva questa voce come semplice <article>, quindi non poteva essere cliccata.
    // La trasformiamo in un vero pulsante senza duplicare il modulo di importazione.
    if (card.tagName !== 'BUTTON') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${card.className} module-button active-module`;
      button.innerHTML = card.innerHTML;
      button.dataset.openView = 'import-excel';
      card.replaceWith(button);
      card = button;
    } else {
      card.type = 'button';
      card.classList.add('module-button', 'active-module');
      card.dataset.openView = 'import-excel';
    }

    if (card.dataset.importMasterBound !== '1') {
      card.dataset.importMasterBound = '1';
      card.addEventListener('click', () => {
        const navButton = workspace.querySelector('.app-nav-btn[data-view="import-excel"]');
        if (navButton) {
          navButton.click();
          return;
        }
        // Fallback se il modulo sta ancora finendo di caricarsi.
        setTimeout(() => workspace.querySelector('.app-nav-btn[data-view="import-excel"]')?.click(), 120);
      });
    }
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

    ensureImportMasterCard(workspace);
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
