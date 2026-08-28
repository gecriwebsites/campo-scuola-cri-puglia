(() => {
  'use strict';

  if (document.body.classList.contains('reserved-body')) return;
  if (document.getElementById('publicFinalUxStyles')) return;

  const style = document.createElement('style');
  style.id = 'publicFinalUxStyles';
  style.textContent = `
    /* Rifinitura finale del solo portale pubblico */
    body:not(.reserved-body) .topbar-inner{width:min(calc(100% - 32px),1320px)}
    body:not(.reserved-body) main>.section>.container,
    body:not(.reserved-body) .page-hero>.container,
    body:not(.reserved-body) .hero>.container,
    body:not(.reserved-body) main>.container,
    body:not(.reserved-body) .footer>.container{width:min(calc(100% - 32px),1320px)}

    body:not(.reserved-body) .quick-card,
    body:not(.reserved-body) .card{box-shadow:none}
    body:not(.reserved-body) .quick-card{min-height:112px}
    body:not(.reserved-body) .quick-card b{font-size:16px}
    body:not(.reserved-body) .quick-card small{font-size:13px;line-height:1.4}
    body:not(.reserved-body) .btn{min-height:44px}

    @media(max-width:980px){
      body:not(.reserved-body) .topbar{box-shadow:0 5px 20px rgba(20,20,20,.06)}
      body:not(.reserved-body) .menu-btn{display:grid;place-items:center;flex:0 0 46px;width:46px;height:46px;border-radius:9px;font-size:24px}
      body:not(.reserved-body) .nav{top:78px;max-height:calc(100dvh - 78px);overflow:auto;padding:10px 16px 18px;gap:2px;box-shadow:0 16px 34px rgba(20,20,20,.12)}
      body:not(.reserved-body) .nav>a,
      body:not(.reserved-body) .nav-dropdown-row>a{min-height:46px;display:flex;align-items:center;padding:10px 12px;border-radius:8px;font-size:15px}
      body:not(.reserved-body) .nav-dropdown-toggle{height:46px;width:46px;border-radius:8px}
      body:not(.reserved-body) .nav-submenu{margin:2px 0 8px 13px}
      body:not(.reserved-body) .nav-submenu a{min-height:44px;font-size:14px!important}
      body:not(.reserved-body) .hero{padding-top:44px}
      body:not(.reserved-body) .hero-grid{gap:32px}
      body:not(.reserved-body) .quick-grid{margin-top:-14px}
    }

    @media(max-width:700px){
      body:not(.reserved-body) .topbar-inner,
      body:not(.reserved-body) main>.section>.container,
      body:not(.reserved-body) .page-hero>.container,
      body:not(.reserved-body) .hero>.container,
      body:not(.reserved-body) main>.container,
      body:not(.reserved-body) .footer>.container{width:min(calc(100% - 24px),1320px)}
      body:not(.reserved-body) .hero h1{font-size:clamp(38px,12vw,52px)}
      body:not(.reserved-body) .hero p,
      body:not(.reserved-body) .page-hero p{font-size:16px;line-height:1.55}
      body:not(.reserved-body) .event-meta{gap:10px}
      body:not(.reserved-body) .meta-box{padding:10px 0}
      body:not(.reserved-body) .meta-box b,
      body:not(.reserved-body) .meta-box span{font-size:14px}
      body:not(.reserved-body) .quick-grid{gap:10px}
      body:not(.reserved-body) .quick-card{min-height:0;padding:17px}
      body:not(.reserved-body) .quick-card .ico{font-size:22px}
      body:not(.reserved-body) .card{padding:20px}
      body:not(.reserved-body) .section{padding:46px 0}
      body:not(.reserved-body) .section-head{margin-bottom:22px}
      body:not(.reserved-body) .section-head p{font-size:15px;line-height:1.55}
      body:not(.reserved-body) .footer{padding:28px 0}
      body:not(.reserved-body) .footer-inner{gap:16px}
      body:not(.reserved-body) .footer p{font-size:12px;line-height:1.6}
    }
  `;
  document.head.appendChild(style);

  const nav = document.querySelector('.nav');
  const menu = document.querySelector('.menu-btn');
  if (nav && menu) {
    nav.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || window.innerWidth > 980) return;
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', event => {
      if (window.innerWidth > 980 || !nav.classList.contains('open')) return;
      if (nav.contains(event.target) || menu.contains(event.target)) return;
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  }
})();
