window.CAMPO_CONFIG = {
  supabase: {
    url: "https://blwxfpyhhoyzmvkmgjqe.supabase.co",
    publishableKey: "sb_publishable_epl7k8BwDO31aIYqyIpH3g_0YWrovA3"
  },
  contacts: [
    {
      group: "Direzione / Delegati",
      role: "DTR AOES",
      name: "Francesco Monopoli",
      phone: "",
      email: "emergenza@puglia.cri.it"
    },
    {
      group: "Direzione / Delegati",
      role: "DTR Formazione",
      name: "Ilaria Altavilla",
      phone: "",
      email: "formazione@puglia.cri.it"
    },
    {
      group: "Segreteria del Campo",
      role: "Segreteria",
      name: "Sabino Martiradonna",
      phone: "3279440117",
      email: ""
    },
    {
      group: "Segreteria del Campo",
      role: "Segreteria",
      name: "Simone Diaco",
      phone: "3791192419",
      email: ""
    },
    {
      group: "Segreteria del Campo",
      role: "Segreteria",
      name: "Lara Di Fonte",
      phone: "3348096382",
      email: ""
    },
    {
      group: "Segreteria del Campo",
      role: "Segreteria",
      name: "Maria Cristina Caldarola",
      phone: "+393474580140",
      email: ""
    }
  ],
  webmaster: {
    name: "Simone Diaco",
    organisation: "CRI Puglia",
    phone: "3791192419",
    email: "simone.diaco@puglia.cri.it"
  }
};

(() => {
  const workspace = document.getElementById('standardWorkspace');

  // Sul portale pubblico carichiamo soltanto la rifinitura grafica dedicata.
  // Login e Area Riservata hanno invece i propri moduli separati.
  if (!workspace) {
    if (document.body && !document.body.classList.contains('reserved-body')) {
      const src = 'assets/js/public-final-ux.js?v=1';
      if (![...document.scripts].some(script => script.getAttribute('src') === src)) {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
    return;
  }

  const style = document.createElement('style');
  style.textContent = '.app-nav{max-width:100%;overflow-x:auto;scrollbar-width:none}.app-nav::-webkit-scrollbar{display:none}.app-nav-btn{flex:0 0 auto}';
  document.head.appendChild(style);

  const sources = [
    'assets/js/cucina-ux-v1.js',
    'assets/js/pernottamenti-segreteria.js',
    'assets/js/production-polish-v1.js?v=1',
    'assets/js/pernottamenti-ux-v1.js',
    'assets/js/turni-segreteria.js',
    'assets/js/turni-ux-v1.js',
    'assets/js/turni-stati-rapidi.js',
    'assets/js/mezzi-segreteria.js',
    'assets/js/mezzi-ux-v1.js',
    'assets/js/situazione-campo.js',
    'assets/js/situazione-dashboard-ux-v1.js?v=fix-loop-2',
    'assets/js/import-excel-segreteria.js',
    'assets/js/supabase-rpc-catch-fix.js',
    'assets/js/import-master-workbook.js',
    'assets/js/import-master-ux-v2.js?v=1',
    'assets/js/accreditamento-verifica-excel.js',
    'assets/js/persona-ux-v1.js',
    'assets/js/persona-dietary-safe-v2.js?v=3',
    'assets/js/persone-ux-v1.js',
    'assets/js/persone-table-responsive-fix.js',
    'assets/js/accreditamento-ux-v1.js',
    'assets/js/accreditamento-persona-ux-v2.js',
    'assets/js/accreditamento-alloggio-qr.js?v=2',
    'assets/js/qr-etichette-verticali-v2.js?v=1',
    'assets/js/persona-close-fast-v1.js?v=1',
    'assets/js/pasti-ux-v1.js',
    'assets/js/admin-tools.js',
    'assets/js/admin-tools-ux-v2.js?v=1',
    'assets/js/admin-backup-v1.js?v=3',
    'assets/js/admin-diagnostics-v1.js?v=3',
    'assets/js/realtime-collaudo-v1.js?v=1',
    'assets/js/admin-readiness-v1.js?v=1',
    'assets/js/giornata-operativa-v1.js?v=1',
    'assets/js/giornata-operativa-controls-v1.js?v=1',
    'assets/js/admin-accordion-v1.js?v=1',
    'assets/js/coordinamento-operativo-v1.js?v=1',
    'assets/js/report-giornaliero-v1.js?v=1',
    'assets/js/navigation-ux-v1.js?v=coord-1',
    'assets/js/layout-wide-safe-v1.js?v=1',
    'assets/js/readability-safe-v2.js?v=3'
  ];

  if (document.readyState === 'loading') {
    document.write(sources.map(src => `<script src="${src}"><\/script>`).join(''));
    return;
  }

  sources.forEach(src => {
    if ([...document.scripts].some(script => script.getAttribute('src') === src)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
})();
