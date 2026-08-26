(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('personaDietarySafeV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'personaDietarySafeV2Styles';
    style.textContent = `
      #personModal.person-ux .person-ux-dietary-block{
        grid-column:1/-1;
        margin-top:2px;
        padding:13px 14px;
        border:1px solid #e4d3aa;
        border-left:4px solid #bd8218;
        border-radius:6px;
        background:#fffaf0;
      }
      #personModal.person-ux .person-ux-dietary-head{margin-bottom:10px}
      #personModal.person-ux .person-ux-dietary-head h4{margin:0;font-size:15px;line-height:1.25;color:#5d4311}
      #personModal.person-ux .person-ux-dietary-head p{margin:4px 0 0;font-size:12px;line-height:1.45;color:#73623c}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor{margin:0!important;padding:0!important;border:0!important;background:transparent!important;border-radius:0!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row{display:flex!important;align-items:flex-start!important;gap:10px!important;margin:0!important;padding:11px 12px!important;border:1px solid #e7d7b3!important;border-radius:5px!important;background:#fff!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row input{width:18px!important;height:18px!important;margin-top:1px!important;flex:0 0 auto!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row b{display:block!important;font-size:13px!important;color:#4c3a17!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row small{display:block!important;margin-top:3px!important;font-size:11px!important;line-height:1.4!important;color:#75664a!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDetailsWrap{display:block!important;margin-top:10px!important;font-size:12px!important;font-weight:750!important;color:#4e606b!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDetailsWrap[hidden]{display:none!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDescription{width:100%!important;min-height:88px!important;margin-top:6px!important;padding:9px 10px!important;border:1px solid #cbd4db!important;border-radius:5px!important;background:#fff!important;font-size:14px!important;line-height:1.45!important;box-sizing:border-box!important}
      #personModal.person-ux .person-ux-dietary-block #personDietarySaveState{min-height:18px!important;margin-top:7px!important;font-size:11px!important}
      #personModal.person-ux #personDietaryTitle{display:none!important}
      #personModal.acc-quick-person .person-ux-dietary-block{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function placeDietaryBlock() {
    const grid = $('personUxContactGrid');
    const editor = $('personDietaryEditor');
    if (!grid || !editor) return false;
    if (grid.querySelector('.person-ux-dietary-block')?.contains(editor)) return true;

    let block = grid.querySelector('.person-ux-dietary-block');
    if (!block) {
      block = document.createElement('div');
      block.className = 'person-ux-dietary-block';
      block.innerHTML = `
        <div class="person-ux-dietary-head">
          <h4>Esigenze alimentari</h4>
          <p>Allergie e intolleranze condivise automaticamente con la postazione Cucina.</p>
        </div>`;
      grid.appendChild(block);
    }
    block.appendChild(editor);
    const title = $('personDietaryTitle');
    if (title) title.hidden = true;
    return true;
  }

  async function init() {
    injectStyles();
    // Solo polling temporaneo: nessun MutationObserver e nessuna modifica ciclica del DOM.
    for (let i = 0; i < 60; i += 1) {
      if (placeDietaryBlock()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
