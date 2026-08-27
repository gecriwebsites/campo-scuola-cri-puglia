(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('adminToolsUxV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminToolsUxV2Styles';
    style.textContent = `
      #adminToolsButton{min-height:38px!important;padding:7px 11px!important;border-radius:5px!important;font-size:12px!important}
      #adminToolsModal .admin-tools-card{width:min(900px,calc(100vw - 34px))!important;max-height:calc(100dvh - 34px)!important;padding:0!important;border-radius:8px!important;overflow:auto!important}
      #adminToolsModal .admin-tools-head{position:sticky;top:0;z-index:3;padding:17px 19px!important;border-bottom:1px solid #dde4e9;background:#fff!important}
      #adminToolsModal .admin-tools-head h2{font-size:24px!important;color:#1f3441!important}
      #adminToolsModal .admin-tools-head p{font-size:13px!important;line-height:1.45!important}
      #adminToolsModal .admin-tools-close{border-radius:5px!important}
      #adminToolsModal .admin-danger{margin:16px 18px 18px!important;padding:16px!important;border-radius:6px!important}
      #adminToolsModal .admin-danger h3{font-size:18px!important}
      #adminToolsModal .admin-danger>p{font-size:13px!important;line-height:1.5!important}
      #adminToolsModal .admin-reset-counts{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin:13px 0!important}
      #adminToolsModal .admin-reset-stat{padding:10px 11px!important;border-radius:5px!important}
      #adminToolsModal .admin-reset-stat small{font-size:11px!important}
      #adminToolsModal .admin-reset-stat strong{font-size:21px!important}
      #adminToolsModal .admin-preserved{padding:11px 12px!important;border-radius:5px!important;font-size:12px!important;line-height:1.5!important}
      #adminToolsModal .admin-confirm{gap:10px!important;margin-top:14px!important}
      #adminToolsModal .admin-confirm label{font-size:12px!important;line-height:1.45!important}
      #adminToolsModal .admin-confirm input[type=text]{height:44px!important;border-radius:5px!important;font-size:13px!important}
      #adminToolsModal .admin-reset-button{min-height:44px!important;border-radius:5px!important;font-size:12px!important}
      #adminToolsModal .admin-reset-message{font-size:12px!important;line-height:1.4!important}
      .admin-ux-intro{margin:16px 18px 0;padding:13px 14px;border:1px solid #d7e2e8;border-left:4px solid #173b52;border-radius:5px;background:#f5f9fb}.admin-ux-intro strong{display:block;font-size:14px;color:#203a49}.admin-ux-intro p{margin:4px 0 0;font-size:12px;line-height:1.45;color:#687b87}
      @media(max-width:720px){#adminToolsModal .admin-reset-counts{grid-template-columns:1fr 1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function polish() {
    const modal = $('adminToolsModal');
    const danger = modal?.querySelector('.admin-danger');
    if (!modal || !danger) return false;
    if (!$('adminUxIntro')) {
      const intro = document.createElement('div');
      intro.id = 'adminUxIntro';
      intro.className = 'admin-ux-intro';
      intro.innerHTML = '<strong>Stato e manutenzione del gestionale</strong><p>Questa area è riservata all’amministratore. Il reset non modifica account, ruoli e configurazioni strutturali del Campo.</p>';
      danger.insertAdjacentElement('beforebegin', intro);
    }
    return true;
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 50; i += 1) {
      if (polish()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
