(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let observer = null;
  let arranging = false;

  function injectStyles() {
    if ($('personaDietaryUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'personaDietaryUxV1Styles';
    style.textContent = `
      #personModal.person-ux #personUxDietarySection{
        border-left:4px solid #c88a19!important;
        background:#fff!important;
      }
      #personModal.person-ux #personUxDietarySection .person-ux-section-head{
        margin-bottom:12px!important;
      }
      #personModal.person-ux #personUxDietarySection .person-ux-section-head h3{
        color:#624712!important;
      }
      #personModal.person-ux #personUxDietarySection .person-ux-section-head p{
        color:#715f39!important;
      }
      #personModal.person-ux #personDietaryEditor{
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
      }
      #personModal.person-ux #personDietaryEditor .switch-row{
        display:flex!important;
        align-items:flex-start!important;
        gap:12px!important;
        margin:0!important;
        padding:12px!important;
        border:1px solid #e7d5aa!important;
        border-radius:6px!important;
        background:#fffaf0!important;
      }
      #personModal.person-ux #personDietaryEditor .switch-row input{
        margin-top:2px!important;
        width:18px!important;
        height:18px!important;
        flex:0 0 auto!important;
      }
      #personModal.person-ux #personDietaryEditor .switch-row b{
        display:block!important;
        font-size:13px!important;
        color:#4d3b16!important;
      }
      #personModal.person-ux #personDietaryEditor .switch-row small{
        display:block!important;
        margin-top:3px!important;
        font-size:11px!important;
        line-height:1.4!important;
        color:#756544!important;
      }
      #personModal.person-ux #personDietaryDetailsWrap{
        display:block!important;
        margin:11px 0 0!important;
        font-size:12px!important;
        color:#4d5d67!important;
      }
      #personModal.person-ux #personDietaryDetailsWrap[hidden]{display:none!important}
      #personModal.person-ux #personDietaryDescription{
        min-height:92px!important;
        margin-top:6px!important;
        padding:10px 11px!important;
        border:1px solid #cbd4db!important;
        border-radius:5px!important;
        background:#fff!important;
        font-size:14px!important;
        line-height:1.45!important;
      }
      #personModal.person-ux #personDietarySaveState{
        min-height:18px!important;
        margin-top:7px!important;
        font-size:11px!important;
      }
      #personModal.person-ux #personDietaryTitle{display:none!important}
      #personModal.acc-quick-person #personUxDietarySection{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    if (arranging) return;
    const main = document.querySelector('#personModal .person-ux-main');
    const editor = $('personDietaryEditor');
    if (!main || !editor) return;

    arranging = true;
    try {
      let section = $('personUxDietarySection');
      if (!section) {
        section = document.createElement('section');
        section.id = 'personUxDietarySection';
        section.className = 'person-ux-section';
        section.innerHTML = `
          <div class="person-ux-section-head">
            <div>
              <h3>Esigenze alimentari</h3>
              <p>Allergie e intolleranze da condividere automaticamente con la postazione Cucina.</p>
            </div>
          </div>
          <div id="personUxDietaryBody"></div>`;

        const stay = [...main.querySelectorAll('.person-ux-section')].find(node => /permanenza/i.test(node.querySelector('h3')?.textContent || ''));
        if (stay) main.insertBefore(section, stay);
        else main.appendChild(section);
      }

      const body = $('personUxDietaryBody');
      if (body && editor.parentElement !== body) body.appendChild(editor);
      const legacyTitle = $('personDietaryTitle');
      if (legacyTitle) legacyTitle.hidden = true;
    } finally {
      arranging = false;
    }
  }

  function init() {
    injectStyles();
    const form = $('personForm');
    if (!form) return;
    ensureSection();
    observer = new MutationObserver(() => setTimeout(ensureSection, 0));
    observer.observe(form, { childList:true, subtree:true });
    setTimeout(ensureSection, 100);
    setTimeout(ensureSection, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
