(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('importMasterUxV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'importMasterUxV2Styles';
    style.textContent = `
      #importExcelView.master-ux-v2 .ix-head{margin:8px 0 14px!important;padding:0!important;align-items:end!important}
      #importExcelView.master-ux-v2 .ix-head h2{margin:2px 0 4px!important;font-size:30px!important;color:#1c303d!important}
      #importExcelView.master-ux-v2 .ix-head p{font-size:13px!important;line-height:1.45!important;max-width:820px!important}
      #importExcelView.master-ux-v2 #importExcelRealtime{font-size:11px!important}
      #importExcelView.master-ux-v2 #importExcelRefresh{min-height:40px!important;font-size:12px!important;border-radius:5px!important}

      .master-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0 0 12px;border:1px solid #d5dde3;border-radius:7px;background:#fff;overflow:hidden}
      .master-flow-step{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;padding:12px 13px;border-right:1px solid #e4e9ed}
      .master-flow-step:last-child{border-right:0}.master-flow-step b{width:34px;height:34px;display:grid;place-items:center;border-radius:5px;background:#173b52;color:#fff;font-size:13px}.master-flow-step strong{display:block;font-size:13px;color:#263b48}.master-flow-step small{display:block;margin-top:2px;font-size:11px;line-height:1.3;color:#74838d}

      #importExcelView.master-ux-v2 #masterWorkbookPanel{margin:0!important;padding:18px!important;border:1px solid #d1dae1!important;border-radius:7px!important;box-shadow:none!important;background:#fff!important}
      #importExcelView.master-ux-v2 #masterWorkbookPanel>.panel-kicker{font-size:11px!important}
      #importExcelView.master-ux-v2 #masterWorkbookPanel>h3{margin:3px 0 5px!important;font-size:20px!important;color:#203642!important}
      #importExcelView.master-ux-v2 #masterWorkbookPanel>p{max-width:980px!important;font-size:13px!important;line-height:1.5!important}
      #importExcelView.master-ux-v2 .mw-grid{grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;margin-top:16px!important}
      #importExcelView.master-ux-v2 .mw-drop{min-height:92px!important;padding:15px 17px!important;border:2px dashed #a8b6c1!important;border-radius:6px!important;background:#f7f9fb!important}
      #importExcelView.master-ux-v2 .mw-drop:hover{border-color:#173b52!important;background:#f1f6f9!important}
      #importExcelView.master-ux-v2 .mw-drop>span{font-size:29px!important;line-height:1!important}
      #importExcelView.master-ux-v2 .mw-drop strong{font-size:16px!important;color:#263b48!important}
      #importExcelView.master-ux-v2 .mw-drop span{font-size:12px!important;line-height:1.4!important}
      #importExcelView.master-ux-v2 .mw-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;min-width:300px!important}
      #importExcelView.master-ux-v2 .mw-btn{min-height:46px!important;border-radius:5px!important;font-size:12px!important;padding:9px 13px!important}
      #importExcelView.master-ux-v2 .mw-btn.primary{background:#173b52!important;border-color:#173b52!important}
      #importExcelView.master-ux-v2 .mw-btn.primary:not(:disabled):hover{background:#0f2e43!important}
      #importExcelView.master-ux-v2 .mw-status{margin-top:12px!important;padding:12px 14px!important;border-radius:0 5px 5px 0!important;font-size:12px!important;line-height:1.5!important}
      #importExcelView.master-ux-v2 .mw-progress{height:7px!important;border-radius:999px!important}.mw-progress>div{background:#173b52!important}
      #importExcelView.master-ux-v2 .mw-summary{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important}
      #importExcelView.master-ux-v2 .mw-stat{padding:10px 11px!important;border-radius:5px!important;background:#fafbfc!important}.mw-stat small{font-size:11px!important}.mw-stat strong{font-size:21px!important}
      #importExcelView.master-ux-v2 .mw-errors{padding:0 2px!important;font-size:12px!important;line-height:1.5!important}
      #importExcelView.master-ux-v2 #masterLegacyToggle{display:none!important}
      #importExcelView.master-ux-v2 .ix-layout{display:none!important}

      .master-help{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:9px;margin-top:10px}
      .master-help-card{border:1px solid #d9e1e7;border-radius:6px;background:#fff;padding:13px 14px}.master-help-card strong{display:block;font-size:13px;color:#283d49}.master-help-card p{margin:4px 0 0;font-size:12px;line-height:1.45;color:#6e7d87}.master-help-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin-top:9px}.master-help-list span{display:block;padding:6px 7px;border:1px solid #e1e6ea;border-radius:4px;background:#f8fafb;font-size:10px;font-weight:800;color:#536671;text-align:center}

      @media(max-width:1100px){.master-flow{grid-template-columns:1fr 1fr}.master-flow-step:nth-child(2){border-right:0}.master-flow-step:nth-child(-n+2){border-bottom:1px solid #e4e9ed}.master-help{grid-template-columns:1fr}.master-help-list{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:800px){#importExcelView.master-ux-v2 .mw-grid{grid-template-columns:1fr!important}#importExcelView.master-ux-v2 .mw-actions{min-width:0!important}.master-flow{grid-template-columns:1fr}.master-flow-step{border-right:0!important;border-bottom:1px solid #e4e9ed}.master-flow-step:last-child{border-bottom:0}.master-help-list{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function polish() {
    const view = $('importExcelView');
    const panel = $('masterWorkbookPanel');
    if (!view || !panel) return false;
    view.classList.add('master-ux-v2', 'mw-legacy-hidden');

    const title = view.querySelector('.ix-head h2');
    const desc = view.querySelector('.ix-head p');
    if (title) title.textContent = 'Import Master';
    if (desc) desc.textContent = 'Carica il file Master del Campo, controlla gli errori e importa in un’unica operazione anagrafiche e dati operativi.';

    if (!$('masterFlow')) {
      const flow = document.createElement('div');
      flow.id = 'masterFlow';
      flow.className = 'master-flow';
      flow.innerHTML = `
        <div class="master-flow-step"><b>1</b><div><strong>Seleziona file</strong><small>Usa il modello Master ufficiale.</small></div></div>
        <div class="master-flow-step"><b>2</b><div><strong>Controlla</strong><small>Nessun dato viene scritto.</small></div></div>
        <div class="master-flow-step"><b>3</b><div><strong>Correggi</strong><small>Risolvi eventuali righe segnalate.</small></div></div>
        <div class="master-flow-step"><b>4</b><div><strong>Importa</strong><small>Aggiorna il gestionale completo.</small></div></div>`;
      panel.insertAdjacentElement('beforebegin', flow);
    }

    if (!$('masterHelp')) {
      const help = document.createElement('div');
      help.id = 'masterHelp';
      help.className = 'master-help';
      help.innerHTML = `
        <div class="master-help-card"><strong>Uso consigliato</strong><p>Nella maggior parte dei casi compila soprattutto <b>01_PERSONE</b>. Gli altri fogli servono solo quando devi pre-caricare corsi, turni, eccezioni pasti o mezzi.</p><div class="master-help-list"><span>01_PERSONE</span><span>02_CORSI</span><span>03_TURNI</span><span>04_PASTI</span><span>05_MEZZI</span></div></div>
        <div class="master-help-card"><strong>Import sicuro</strong><p>Il pulsante <b>Controlla file</b> esegue prima la validazione. <b>Importa tutto</b> resta disabilitato se vengono rilevati errori bloccanti.</p></div>`;
      panel.insertAdjacentElement('afterend', help);
    }
    return true;
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 60; i += 1) {
      if (polish()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
