(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function injectStyles() {
    if ($('personaDietarySafeV3Styles')) return;
    $('personaDietarySafeV2Styles')?.remove();
    const style = document.createElement('style');
    style.id = 'personaDietarySafeV3Styles';
    style.textContent = `
      #personModal.person-ux .person-ux-dietary-block{
        grid-column:1/-1;
        margin-top:4px;
        padding:15px 16px;
        border:1px solid #e2cea0;
        border-left:5px solid #b97812;
        border-radius:7px;
        background:#fffaf0;
      }
      #personModal.person-ux .person-ux-dietary-head{margin-bottom:11px}
      #personModal.person-ux .person-ux-dietary-head h4{margin:0;font-size:16px;line-height:1.25;color:#593f0e}
      #personModal.person-ux .person-ux-dietary-head p{margin:4px 0 0;font-size:13px;line-height:1.45;color:#705f38}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor{margin:0!important;padding:0!important;border:0!important;background:transparent!important;border-radius:0!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row{display:flex!important;align-items:flex-start!important;gap:11px!important;margin:0!important;padding:12px 13px!important;border:1px solid #e4d4ae!important;border-radius:6px!important;background:#fff!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row input{width:20px!important;height:20px!important;margin-top:1px!important;flex:0 0 auto!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row b{display:block!important;font-size:14px!important;color:#463510!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryEditor .switch-row small{display:block!important;margin-top:3px!important;font-size:12px!important;line-height:1.4!important;color:#746546!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDetailsWrap{display:block!important;margin-top:11px!important;font-size:13px!important;font-weight:750!important;color:#485c68!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDetailsWrap[hidden]{display:none!important}
      #personModal.person-ux .person-ux-dietary-block #personDietaryDescription{width:100%!important;min-height:96px!important;margin-top:6px!important;padding:10px 11px!important;border:1px solid #c7d1d8!important;border-radius:5px!important;background:#fff!important;font-size:14px!important;line-height:1.5!important;box-sizing:border-box!important}
      #personModal.person-ux .person-ux-dietary-block #personDietarySaveState{min-height:18px!important;margin-top:7px!important;font-size:12px!important}
      #personModal.person-ux #personDietaryTitle{display:none!important}
      #personModal.acc-quick-person .person-ux-dietary-block{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function createEditorIfMissing() {
    if ($('personDietaryEditor')) return $('personDietaryEditor');
    const editor = document.createElement('div');
    editor.id = 'personDietaryEditor';
    editor.className = 'dietary-editor';
    editor.innerHTML = `
      <label class="switch-row">
        <input id="personDietaryPresent" type="checkbox">
        <span><b>Allergie / intolleranze alimentari</b><small>La segnalazione viene condivisa automaticamente con la postazione Cucina.</small></span>
      </label>
      <label id="personDietaryDetailsWrap" class="dietary-details" hidden>
        Dettaglio dell'esigenza
        <textarea id="personDietaryDescription" class="field-textarea" rows="3" placeholder="Es. celiachia, allergia alla frutta a guscio, intolleranza al lattosio…"></textarea>
      </label>
      <div id="personDietarySaveState" class="dietary-save-state" aria-live="polite"></div>`;
    return editor;
  }

  function placeDietaryBlock() {
    const grid = $('personUxContactGrid');
    if (!grid) return false;

    const editor = createEditorIfMissing();
    let block = grid.querySelector('.person-ux-dietary-block');
    if (!block) {
      block = document.createElement('div');
      block.className = 'person-ux-dietary-block';
      block.innerHTML = `
        <div class="person-ux-dietary-head">
          <h4>Esigenze alimentari</h4>
          <p>Registra qui allergie, intolleranze o altre esigenze da segnalare alla Cucina.</p>
        </div>`;
      grid.appendChild(block);
    }
    if (editor.parentElement !== block) block.appendChild(editor);
    const title = $('personDietaryTitle');
    if (title) title.hidden = true;
    return true;
  }

  async function init() {
    injectStyles();
    // Creazione deterministica con attesa limitata della nuova scheda persona.
    // Nessun observer sul workspace e nessun ciclo DOM continuo.
    for (let i = 0; i < 80; i += 1) {
      if (placeDietaryBlock()) return;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
