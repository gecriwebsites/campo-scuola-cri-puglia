(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'campo_admin_accordion_open_v1';

  const sections = [
    {
      key:'readiness', selector:'#adminReadiness', icon:'🧭', title:'Preparazione del Campo',
      subtitle:'Controlli preliminari, checklist di avvio e configurazione delle postazioni.', badge:'PRE-CAMPO'
    },
    {
      key:'daily', selector:'#dailyOpsAdmin', icon:'📅', title:'Giornata operativa',
      subtitle:'Apertura, chiusura e passaggio consegne della giornata selezionata.', badge:'GIORNALIERO'
    },
    {
      key:'realtime', selector:'#realtimeCollaudo', icon:'📡', title:'Realtime e postazioni',
      subtitle:'Verifica la comunicazione tra Admin, Segreteria e Cucina.', badge:'COLLAUDO'
    },
    {
      key:'backup', selector:'#adminBackup', icon:'💾', title:'Backup operativo',
      subtitle:'Esporta una copia tecnica dei dati prima di operazioni importanti.', badge:'SICUREZZA'
    },
    {
      key:'diagnostics', selector:'#adminDiagnostics', icon:'🩺', title:'Diagnostica gestionale',
      subtitle:'Controlla interfaccia, database, RPC e moduli principali senza modificare dati.', badge:'CONTROLLO'
    },
    {
      key:'danger', selector:'#adminToolsModal .admin-danger', icon:'⚠️', title:'Operazioni pericolose',
      subtitle:'Reset completo dei dati operativi. Utilizzare solo quando realmente necessario.', badge:'RISCHIO', danger:true
    }
  ];

  function injectStyles() {
    if ($('adminAccordionV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminAccordionV1Styles';
    style.textContent = `
      #adminToolsModal .admin-tools-card{width:min(1080px,calc(100vw - 34px))!important;background:#f4f6f8!important;padding:0!important}
      #adminToolsModal .admin-tools-head{padding:18px 20px!important;background:#fff!important;border-bottom:1px solid #d8e0e5!important}
      #adminToolsModal .admin-tools-head .kicker{color:#a60018!important}
      #adminToolsModal #adminToolsTitle{margin:2px 0 4px!important;font-size:25px!important;color:#203744!important}
      #adminToolsModal .admin-tools-head p{font-size:13px!important;color:#6b7b85!important}
      #adminToolsModal .admin-accordion-shell{padding:14px 16px 18px}
      #adminToolsModal .admin-accordion-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;margin-bottom:11px;padding:12px 14px;border:1px solid #d9e1e6;border-radius:7px;background:#fff}
      #adminToolsModal .admin-accordion-intro strong{display:block;font-size:14px;color:#263d49}.admin-accordion-intro small{display:block;margin-top:3px;font-size:11px;line-height:1.45;color:#71808a}.admin-accordion-intro span{white-space:nowrap;border:1px solid #cfe2d8;background:#f4faf6;color:#16724e;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900}
      #adminToolsModal .admin-accordion-item{margin:0 0 8px!important;border:1px solid #d8e0e5!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important;padding:0!important;box-shadow:none!important}
      #adminToolsModal .admin-accordion-item.danger{border-color:#e8c2c8!important}
      #adminToolsModal .admin-accordion-toggle{width:100%;min-height:64px;border:0;background:#fff;display:grid;grid-template-columns:42px minmax(0,1fr) auto 28px;gap:10px;align-items:center;padding:10px 12px;text-align:left;font:inherit;cursor:pointer}
      #adminToolsModal .admin-accordion-toggle:hover{background:#f8fafb}.admin-accordion-item.danger .admin-accordion-toggle{background:#fff9fa}.admin-accordion-item.danger .admin-accordion-toggle:hover{background:#fff4f6}
      #adminToolsModal .admin-accordion-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #dbe3e8;border-radius:6px;background:#f5f8fa;font-size:18px}.admin-accordion-item.danger .admin-accordion-icon{border-color:#ebc9cf;background:#fff0f2}
      #adminToolsModal .admin-accordion-copy strong{display:block;font-size:14px;color:#263d49}.admin-accordion-copy small{display:block;margin-top:3px;font-size:11px;line-height:1.35;color:#74828b}
      #adminToolsModal .admin-accordion-badge{border:1px solid #d7e0e5;border-radius:999px;background:#f7f9fa;color:#657681;padding:4px 7px;font-size:9px;font-weight:900;letter-spacing:.03em;white-space:nowrap}.admin-accordion-item.danger .admin-accordion-badge{border-color:#ebc9cf;background:#fff0f2;color:#9b1f35}
      #adminToolsModal .admin-accordion-chevron{display:grid;place-items:center;font-size:18px;color:#647681;transition:transform .15s ease}.admin-accordion-item.open .admin-accordion-chevron{transform:rotate(180deg)}
      #adminToolsModal .admin-accordion-body{padding:0 12px 12px;border-top:1px solid #e4e9ec;background:#fff}.admin-accordion-body[hidden]{display:none!important}
      #adminToolsModal .admin-accordion-body>#adminReadiness,
      #adminToolsModal .admin-accordion-body>#dailyOpsAdmin,
      #adminToolsModal .admin-accordion-body>#realtimeCollaudo,
      #adminToolsModal .admin-accordion-body>#adminBackup,
      #adminToolsModal .admin-accordion-body>#adminDiagnostics,
      #adminToolsModal .admin-accordion-body>.admin-danger{margin:12px 0 0!important;border:0!important;border-radius:5px!important;box-shadow:none!important}
      #adminToolsModal .admin-accordion-body>#adminReadiness,
      #adminToolsModal .admin-accordion-body>#dailyOpsAdmin,
      #adminToolsModal .admin-accordion-body>#realtimeCollaudo,
      #adminToolsModal .admin-accordion-body>#adminBackup,
      #adminToolsModal .admin-accordion-body>#adminDiagnostics{margin:12px 0 0!important;border:0!important;border-radius:5px!important;background:transparent!important;padding:0!important}
      #adminToolsModal .admin-accordion-body .admin-readiness-grid,
      #adminToolsModal .admin-accordion-body .daily-grid{margin-top:10px!important}
      @media(max-width:720px){
        #adminToolsModal .admin-accordion-shell{padding:10px}
        #adminToolsModal .admin-accordion-intro{grid-template-columns:1fr}.admin-accordion-intro span{justify-self:start}
        #adminToolsModal .admin-accordion-toggle{grid-template-columns:38px minmax(0,1fr) 24px}.admin-accordion-badge{display:none}
        #adminToolsModal .admin-accordion-copy strong{font-size:13px}.admin-accordion-copy small{font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureShell() {
    const card = document.querySelector('#adminToolsModal .admin-tools-card');
    const head = card?.querySelector(':scope > .admin-tools-head');
    if (!card || !head) return null;
    let shell = $('adminAccordionShell');
    if (!shell) {
      shell = document.createElement('div');
      shell.id = 'adminAccordionShell';
      shell.className = 'admin-accordion-shell';
      shell.innerHTML = `<div class="admin-accordion-intro"><div><strong>Centro di amministrazione</strong><small>Ogni funzione è separata per ambito. Apri solo la sezione che ti serve; le altre restano compresse.</small></div><span>ADMIN · OPERATIVO</span></div>`;
      head.insertAdjacentElement('afterend', shell);
      const title = $('adminToolsTitle');
      if (title) title.textContent = 'Centro di amministrazione';
      const desc = head.querySelector('p');
      if (desc) desc.textContent = 'Configurazione, controllo, sicurezza e operatività del gestionale del Campo.';
    }
    return shell;
  }

  function setOpen(wrapper, open) {
    if (!wrapper) return;
    wrapper.classList.toggle('open', open);
    const body = wrapper.querySelector('.admin-accordion-body');
    const toggle = wrapper.querySelector('.admin-accordion-toggle');
    if (body) body.hidden = !open;
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openOnly(key) {
    document.querySelectorAll('#adminAccordionShell .admin-accordion-item').forEach(item => setOpen(item, item.dataset.adminSection === key));
    try { sessionStorage.setItem(STORAGE_KEY, key); } catch (_) {}
  }

  function wrapDefinition(def, shell) {
    const target = document.querySelector(def.selector);
    if (!target) return null;
    const existing = $(`adminAccordion_${def.key}`);
    if (existing) return existing;

    const wrapper = document.createElement('section');
    wrapper.id = `adminAccordion_${def.key}`;
    wrapper.dataset.adminSection = def.key;
    wrapper.className = `admin-accordion-item${def.danger ? ' danger' : ''}`;
    wrapper.innerHTML = `<button class="admin-accordion-toggle" type="button" aria-expanded="false"><span class="admin-accordion-icon">${def.icon}</span><span class="admin-accordion-copy"><strong>${def.title}</strong><small>${def.subtitle}</small></span><span class="admin-accordion-badge">${def.badge}</span><span class="admin-accordion-chevron">⌄</span></button><div class="admin-accordion-body" hidden></div>`;
    wrapper.querySelector('.admin-accordion-body').appendChild(target);
    wrapper.querySelector('.admin-accordion-toggle').addEventListener('click', () => {
      const isOpen = wrapper.classList.contains('open');
      if (isOpen) {
        setOpen(wrapper, false);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
      } else openOnly(def.key);
    });
    shell.appendChild(wrapper);
    return wrapper;
  }

  function arrange() {
    const shell = ensureShell();
    if (!shell) return false;
    const intro = shell.querySelector('.admin-accordion-intro');
    const wrappers = sections.map(def => wrapDefinition(def, shell)).filter(Boolean);
    let cursor = intro;
    sections.forEach(def => {
      const wrapper = $(`adminAccordion_${def.key}`);
      if (!wrapper) return;
      cursor.insertAdjacentElement('afterend', wrapper);
      cursor = wrapper;
    });

    let wanted = '';
    try { wanted = sessionStorage.getItem(STORAGE_KEY) || ''; } catch (_) {}
    const available = sections.find(def => $(`adminAccordion_${def.key}`));
    if (!document.querySelector('#adminAccordionShell .admin-accordion-item.open')) {
      const chosen = wanted && $(`adminAccordion_${wanted}`) ? wanted : available?.key;
      if (chosen) openOnly(chosen);
    }
    return wrappers.length > 0;
  }

  function finiteArrange(retries=24) {
    let count = 0;
    const tick = () => {
      arrange();
      count += 1;
      if (count < retries) setTimeout(tick, 100);
    };
    tick();
  }

  function init() {
    injectStyles();
    finiteArrange(60);
    document.addEventListener('click', event => {
      if (event.target.closest('#adminToolsButton')) setTimeout(() => finiteArrange(18), 20);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
