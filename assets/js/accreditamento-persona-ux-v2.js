(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let modalObserver = null;
  let mode = false;
  let forceFull = false;
  const movedNodes = new Map();

  function activeView() {
    return document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view || '';
  }

  function toast(message, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3200);
  }

  function injectStyles() {
    if ($('accreditPersonUxV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'accreditPersonUxV2Styles';
    style.textContent = `
      /* I blocchi rapidi esistono sempre nel DOM ma fuori dalla modalità accredito devono sparire. */
      #personModal .acc-quick-main,
      #personModal .acc-quick-material-card{display:none!important}

      #personModal.acc-quick-person .person-panel{width:min(1180px,calc(100vw - 40px))!important}
      #personModal.acc-quick-person .person-panel-body{padding-bottom:78px!important}
      #personModal.acc-quick-person #personForm.person-ux-form{grid-template-columns:minmax(0,1fr) 330px!important}
      #personModal.acc-quick-person .person-ux-main{display:block!important}
      #personModal.acc-quick-person .person-ux-section{display:none!important}
      #personModal.acc-quick-person .acc-quick-main{display:block!important;background:#fff;border:1px solid #d7dee4;border-radius:7px;padding:16px 17px}
      #personModal.acc-quick-person .acc-quick-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:1px solid #e7ecef}
      #personModal.acc-quick-person .acc-quick-head h3{margin:0;font-size:16px;color:#1c2c38}
      #personModal.acc-quick-person .acc-quick-head p{margin:3px 0 0;font-size:10px;color:#74828c}
      #personModal.acc-quick-person .acc-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 12px}
      #personModal.acc-quick-person .acc-quick-grid>label{display:block!important;margin:0!important;font-size:11px!important;font-weight:750!important;color:#465966!important}
      #personModal.acc-quick-person .acc-quick-grid .field-input{width:100%!important;box-sizing:border-box!important;height:42px!important;margin-top:5px!important;border:1px solid #cbd4db!important;border-radius:5px!important;background:#fff!important;color:#1d2a34!important;font-size:13px!important;padding:0 10px!important}
      #personModal.acc-quick-person .acc-quick-course{grid-column:1/-1;border:1px solid #dce3e8;border-radius:5px;background:#f8fafb;padding:10px 11px}
      #personModal.acc-quick-person .acc-quick-course>span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:850;color:#72818c;margin-bottom:6px}
      #personModal.acc-quick-person .acc-quick-course #personCourses{display:flex!important;gap:6px!important;flex-wrap:wrap!important}
      #personModal.acc-quick-person .acc-quick-course #personCourses[hidden]{display:none!important}

      #personModal.acc-quick-person .person-ux-side{position:sticky!important;top:102px!important}
      #personModal.acc-quick-person .person-ux-side-card.person-ux-operational-card{display:block!important}
      #personModal.acc-quick-person .person-ux-side-card:not(.person-ux-operational-card),
      #personModal.acc-quick-person #excelVerifyPanel,
      #personModal.acc-quick-person .qr-card{display:none!important}
      #personModal.acc-quick-person .acc-quick-material-card{display:block!important;background:#fff;border:1px solid #d7dee4;border-radius:7px;padding:13px;margin-bottom:10px}
      #personModal.acc-quick-person .acc-quick-material-card h4{margin:0 0 9px;padding-bottom:8px;border-bottom:1px solid #e7ecef;font-size:12px;color:#263944}
      #personModal.acc-quick-person .acc-quick-material-grid{display:grid;gap:6px}
      #personModal.acc-quick-person .acc-quick-material-grid .switch-row{display:flex!important;align-items:center!important;gap:9px!important;margin:0!important;padding:9px 10px!important;border:1px solid #e0e6ea!important;border-radius:5px!important;background:#fafbfc!important}
      #personModal.acc-quick-person .acc-quick-material-grid .switch-row b{font-size:11px!important}
      #personModal.acc-quick-person .acc-quick-material-grid .switch-row small{font-size:9px!important;color:#7b8993!important}
      #personModal.acc-quick-person .acc-quick-badge-field{display:block!important;margin:0 0 7px!important;font-size:10px!important;font-weight:750!important;color:#526572!important}
      #personModal.acc-quick-person .acc-quick-badge-field .field-input{height:39px!important;margin-top:5px!important;border-radius:5px!important;font-size:12px!important}
      #personModal.acc-quick-person .acc-quick-print{display:grid;grid-template-columns:42px minmax(0,1fr);gap:9px;align-items:center;width:100%;margin-top:4px;padding:10px;border:1px solid #c4d5e0;border-radius:5px;background:#eef6fb;color:#244c64;text-align:left;font:inherit;cursor:pointer}
      #personModal.acc-quick-person .acc-quick-print:hover{background:#e4f0f7;border-color:#a9c2d2}
      #personModal.acc-quick-person .acc-quick-print-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:4px;background:#173b52;color:#fff;font-size:19px;font-weight:900}
      #personModal.acc-quick-person .acc-quick-print strong{display:block;font-size:11px}.acc-quick-print small{display:block;margin-top:2px;font-size:9px;color:#668092;line-height:1.3}

      #personModal.acc-quick-person .acc-quick-summary{display:block!important;margin-top:12px;background:#fff;border:1px solid #d7dee4;border-radius:7px;overflow:hidden}
      #personModal.acc-quick-person .acc-quick-summary>button:first-child{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;background:#f7f9fa;padding:10px 12px;font:inherit;font-size:11px;font-weight:800;color:#40535f;cursor:pointer}
      #personModal.acc-quick-person .acc-quick-summary-body{display:none;padding:12px}
      #personModal.acc-quick-person .acc-quick-summary.open .acc-quick-summary-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #personModal.acc-quick-person .acc-quick-summary-item{border:1px solid #e1e6ea;border-radius:4px;background:#fafbfc;padding:8px}
      #personModal.acc-quick-person .acc-quick-summary-item span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#788791;font-weight:850}
      #personModal.acc-quick-person .acc-quick-summary-item strong{display:block;margin-top:3px;font-size:10px;color:#2e424e;overflow-wrap:anywhere}
      #personModal.acc-quick-person .acc-quick-full{display:block;width:calc(100% - 24px);margin:0 12px 12px;border:1px solid #c5d0d8;background:#fff;border-radius:4px;padding:8px 9px;font:inherit;font-size:9px;font-weight:800;color:#40535f;cursor:pointer}
      #personModal.acc-quick-person .acc-quick-full:hover{background:#f2f6f8}

      #personModal.acc-quick-person .person-ux-actions{grid-column:1/-1!important}

      @media(max-width:850px){
        #personModal.acc-quick-person #personForm.person-ux-form{grid-template-columns:1fr!important}
        #personModal.acc-quick-person .person-ux-side{position:static!important}
      }
      @media(max-width:620px){
        #personModal.acc-quick-person .acc-quick-grid{grid-template-columns:1fr!important}
        #personModal.acc-quick-person .acc-quick-course{grid-column:auto}
        #personModal.acc-quick-person .acc-quick-summary.open .acc-quick-summary-body{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function parentLabel(id) {
    return $(id)?.closest('label') || null;
  }

  function cloneValue(id) {
    const el = $(id);
    if (!el) return '—';
    if (el.type === 'checkbox') return el.checked ? 'Sì' : 'No';
    if (el.tagName === 'SELECT') return el.options?.[el.selectedIndex]?.textContent?.trim() || '—';
    return String(el.value || '').trim() || '—';
  }

  function rememberAndMove(node, destination) {
    if (!node || !destination || node.parentElement === destination) return;
    if (!movedNodes.has(node)) {
      const marker = document.createComment(`accreditamento-slot-${movedNodes.size + 1}`);
      node.parentNode?.insertBefore(marker, node);
      movedNodes.set(node, marker);
    }
    destination.appendChild(node);
  }

  function restoreMovedNodes() {
    movedNodes.forEach((marker, node) => {
      if (marker?.parentNode) marker.parentNode.insertBefore(node, marker.nextSibling);
      marker?.remove();
    });
    movedNodes.clear();
  }

  function ensureQuickMain() {
    const main = document.querySelector('#personModal .person-ux-main');
    if (!main) return null;
    let block = $('accQuickMain');
    if (!block) {
      block = document.createElement('section');
      block.id = 'accQuickMain';
      block.className = 'acc-quick-main';
      block.innerHTML = `
        <div class="acc-quick-head">
          <div><h3>Accreditamento rapido</h3><p>Solo le informazioni necessarie per consegna materiale e presenza.</p></div>
        </div>
        <div id="accQuickGrid" class="acc-quick-grid"></div>
        <div id="accQuickSummary" class="acc-quick-summary">
          <button type="button"><span>Riepilogo altri dati</span><span>Mostra ▾</span></button>
          <div id="accQuickSummaryBody" class="acc-quick-summary-body"></div>
          <button id="accQuickFullSheet" class="acc-quick-full" type="button">Apri scheda completa</button>
        </div>`;
      main.prepend(block);

      block.querySelector('#accQuickSummary>button:first-child')?.addEventListener('click', () => {
        const summary = $('accQuickSummary');
        summary?.classList.toggle('open');
        const opened = summary?.classList.contains('open');
        const spans = summary?.querySelector('button:first-child')?.querySelectorAll('span');
        if (spans?.[1]) spans[1].textContent = opened ? 'Nascondi ▴' : 'Mostra ▾';
        if (opened) refreshSummary();
      });

      $('accQuickFullSheet')?.addEventListener('click', () => {
        forceFull = true;
        disable(true);
        document.querySelector('#personModal .person-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    return block;
  }

  function placeMainFields() {
    const grid = $('accQuickGrid');
    if (!grid) return;

    ['personNome', 'personCognome', 'personTelefono', 'personComitato'].forEach(id => {
      const label = parentLabel(id);
      if (label) rememberAndMove(label, grid);
    });

    const courses = $('personCourses');
    if (courses) {
      let wrap = $('accQuickCourse');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'accQuickCourse';
        wrap.className = 'acc-quick-course';
        wrap.innerHTML = '<span>Corso</span>';
        grid.appendChild(wrap);
      }
      rememberAndMove(courses, wrap);
    }
  }

  function ensurePrintButton(card) {
    let button = $('accQuickPrintQr');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'accQuickPrintQr';
    button.type = 'button';
    button.className = 'acc-quick-print';
    button.innerHTML = `
      <span class="acc-quick-print-icon">QR</span>
      <span><strong>Stampa QR adesivo</strong><small>Etichetta pronta da applicare sul badge. Il QR viene anche attivato.</small></span>`;
    button.addEventListener('click', printAdhesiveQr);
    card.appendChild(button);
    return button;
  }

  function placeMaterialFields() {
    const side = document.querySelector('#personModal .person-ux-side');
    if (!side) return;

    let card = $('accQuickMaterial');
    if (!card) {
      card = document.createElement('section');
      card.id = 'accQuickMaterial';
      card.className = 'acc-quick-material-card';
      card.innerHTML = '<h4>Badge, gadget e QR</h4><div id="accQuickMaterialBody" class="acc-quick-material-grid"></div>';
      const operational = side.querySelector('.person-ux-operational-card');
      if (operational) operational.insertAdjacentElement('afterend', card);
      else side.prepend(card);
    }

    const body = $('accQuickMaterialBody');
    const badgeLabel = parentLabel('personBadgeNumber');
    if (badgeLabel) {
      badgeLabel.classList.add('acc-quick-badge-field');
      rememberAndMove(badgeLabel, body);
    }

    ['personBadgeDelivered', 'personGadgetDelivered', 'personQrActive'].forEach(id => {
      const row = $(id)?.closest('.switch-row');
      if (row) rememberAndMove(row, body);
    });

    ensurePrintButton(card);
  }

  function refreshSummary() {
    const body = $('accQuickSummaryBody');
    if (!body) return;
    const items = [
      ['Codice fiscale', cloneValue('personCf')],
      ['Email', cloneValue('personEmail')],
      ['Regione', cloneValue('personRegione')],
      ['Componente CRI', cloneValue('personComponente')],
      ['Destinazione alloggio', cloneValue('personHousingSector')],
      ['Pernottamento', cloneValue('personPernotto')],
      ['Arrivo previsto', cloneValue('personArrival')],
      ['Partenza prevista', cloneValue('personDeparture')],
      ['Contatto ICE', cloneValue('personIceName')],
      ['Telefono ICE', cloneValue('personIcePhone')],
      ['Note', cloneValue('personNotes')]
    ];
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    body.innerHTML = items.map(([key, value]) => `<div class="acc-quick-summary-item"><span>${escape(key)}</span><strong>${escape(value)}</strong></div>`).join('');
  }

  function qrImageData() {
    const box = $('personQrBox');
    if (!box) return null;
    const canvas = box.querySelector('canvas');
    if (canvas) {
      try { return canvas.toDataURL('image/png'); } catch (_) {}
    }
    return box.querySelector('img')?.src || null;
  }

  function printAdhesiveQr() {
    const src = qrImageData();
    if (!src) {
      toast('QR non ancora disponibile. Chiudi e riapri la scheda oppure salva prima la persona.', 'error');
      return;
    }

    const nome = `${$('personNome')?.value || ''} ${$('personCognome')?.value || ''}`.trim() || 'Persona';
    const badge = String($('personBadgeNumber')?.value || '').trim();
    const popup = window.open('', '_blank', 'width=520,height=620');
    if (!popup) {
      toast('Il browser ha bloccato la finestra di stampa.', 'error');
      return;
    }

    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR badge</title><style>
      @page{size:50mm 50mm;margin:2mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif}
      .label{width:46mm;height:46mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}
      img{width:31mm;height:31mm;image-rendering:auto}
      strong{display:block;max-width:44mm;margin-top:1.5mm;font-size:9pt;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      span{display:block;margin-top:.8mm;font-size:7.5pt;color:#333}
      @media screen{body{display:grid;place-items:center;min-height:100vh}.label{border:1px dashed #aaa}}
    </style></head><body><div class="label"><img src="${src}" alt="QR"><strong>${nome.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong>${badge ? `<span>Badge ${badge.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : ''}</div><script>window.onload=()=>setTimeout(()=>window.print(),120)<\/script></body></html>`);
    popup.document.close();

    const qrActive = $('personQrActive');
    if (qrActive && !qrActive.checked) {
      qrActive.checked = true;
      qrActive.dispatchEvent(new Event('change', { bubbles:true }));
    }

    // La stampa del QR durante l'accredito equivale all'attivazione del QR.
    // Salviamo subito la scheda per evitare che l'operatore debba ricordarsi un passaggio in più.
    setTimeout(() => $('personForm')?.requestSubmit(), 60);
    toast('QR adesivo inviato alla stampa e QR attivato.', 'success');
  }

  function enable() {
    const modal = $('personModal');
    if (!modal || modal.hidden || activeView() !== 'accreditamento' || forceFull) return;
    mode = true;
    ensureQuickMain();
    placeMainFields();
    placeMaterialFields();
    refreshSummary();
    modal.classList.add('acc-quick-person');
  }

  function disable(restore = true) {
    mode = false;
    $('personModal')?.classList.remove('acc-quick-person');
    $('accQuickSummary')?.classList.remove('open');
    if (restore) restoreMovedNodes();
  }

  async function init() {
    injectStyles();
    for (let i = 0; i < 100; i += 1) {
      if ($('personModal') && document.querySelector('#personModal .person-ux-main')) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    const modal = $('personModal');
    if (!modal) return;

    modalObserver = new MutationObserver(() => {
      if (modal.hidden) {
        disable(true);
        forceFull = false;
      } else {
        setTimeout(enable, 40);
      }
    });
    modalObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });

    document.addEventListener('click', event => {
      if (event.target.closest('.app-nav-btn') && !modal.hidden) {
        setTimeout(() => {
          if (activeView() === 'accreditamento' && !forceFull) enable();
          else disable(true);
        }, 20);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();