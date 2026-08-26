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
  if (!workspace) return;

  const style = document.createElement('style');
  style.textContent = '.app-nav{max-width:100%;overflow-x:auto;scrollbar-width:none}.app-nav::-webkit-scrollbar{display:none}.app-nav-btn{flex:0 0 auto}';
  document.head.appendChild(style);

  const sources = [
    'assets/js/pernottamenti-segreteria.js',
    'assets/js/turni-segreteria.js',
    'assets/js/turni-ux-v1.js',
    'assets/js/mezzi-segreteria.js',
    'assets/js/situazione-campo.js',
    'assets/js/import-excel-segreteria.js',
    'assets/js/supabase-rpc-catch-fix.js',
    'assets/js/import-master-workbook.js',
    'assets/js/accreditamento-verifica-excel.js',
    'assets/js/persona-ux-v1.js',
    'assets/js/persone-ux-v1.js',
    'assets/js/persone-table-responsive-fix.js',
    'assets/js/accreditamento-ux-v1.js',
    'assets/js/accreditamento-persona-ux-v2.js',
    'assets/js/admin-tools.js'
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
