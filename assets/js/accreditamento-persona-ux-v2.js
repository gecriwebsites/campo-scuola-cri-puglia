(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let modalObserver = null;
  let mode = false;

  function activeView(){
    return document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view || '';
  }

  function injectStyles(){
    if ($('accreditPersonUxV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'accreditPersonUxV2Styles';
    style.textContent = `
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

      #personModal.acc-quick-person .acc-quick-summary{display:block!important;margin-top:12px;background:#fff;border:1px solid #d7dee4;border-radius:7px;overflow:hidden}
      #personModal.acc-quick-person .acc-quick-summary>button{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;background:#f7f9fa;padding:10px 12px;font:inherit;font-size:11px;font-weight:800;color:#40535f;cursor:pointer}
      #personModal.acc-quick-person .acc-quick-summary-body{display:none;padding:12px}
      #personModal.acc-quick-person .acc-quick-summary.open .acc-quick-summary-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #personModal.acc-quick-person .acc-quick-summary-item{border:1px solid #e1e6ea;border-radius:4px;background:#fafbfc;padding:8px}
      #personModal.acc-quick-person .acc-quick-summary-item span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#788791;font-weight:850}
      #personModal.acc-quick-person .acc-quick-summary-item strong{display:block;margin-top:3px;font-size:10px;color:#2e424e;overflow-wrap:anywhere}
      #personModal.acc-quick-person .acc-quick-full{margin-top:9px;border:1px solid #c5d0d8;background:#fff;border-radius:4px;padding:7px 9px;font:inherit;font-size:9px;font-weight:800;color:#40535f;cursor:pointer}

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

  function parentLabel(id){ return $(id)?.closest('label') || null; }
  function cloneValue(id){
    const el = $(id);
    if (!el) return '—';
    if (el.type === 'checkbox') return el.checked ? 'Sì' : 'No';
    if (el.tagName === 'SELECT') return el.options?.[el.selectedIndex]?.textContent?.trim() || '—';
    return String(el.value || '').trim() || '—';
  }

  function ensureQuickMain(){
    const main = document.querySelector('#personModal .person-ux-main');
    if (!main) return null;
    let block = $('accQuickMain');
    if (!block){
      block = document.createElement('section');
      block.id = 'accQuickMain';
      block.className = 'acc-quick-main';
      block.innerHTML = `<div class="acc-quick-head"><div><h3>Accreditamento rapido</h3><p>Solo le informazioni necessarie all’ingresso e all’uscita dal Campo.</p></div></div><div id="accQuickGrid" class="acc-quick-grid"></div><div id="accQuickSummary" class="acc-quick-summary"><button type="button"><span>Riepilogo altri dati</span><span>Mostra ▾</span></button><div id="accQuickSummaryBody" class="acc-quick-summary-body"></div><button id="accQuickFullSheet" class="acc-quick-full" type="button">Apri scheda completa</button></div>`;
      main.prepend(block);
      block.querySelector('#accQuickSummary>button')?.addEventListener('click', () => {
        block.querySelector('#accQuickSummary')?.classList.toggle('open');
        const opened = block.querySelector('#accQuickSummary')?.classList.contains('open');
        const spans = block.querySelector('#accQuickSummary>button')?.querySelectorAll('span');
        if (spans?.[1]) spans[1].textContent = opened ? 'Nascondi ▴' : 'Mostra ▾';
        if (opened) refreshSummary();
      });
      $('accQuickFullSheet')?.addEventListener('click', () => {
        mode = false;
        $('personModal')?.classList.remove('acc-quick-person');
      });
    }
    return block;
  }

  function placeMainFields(){
    const grid = $('accQuickGrid');
    if (!grid) return;
    ['personNome','personCognome','personTelefono','personComitato'].forEach(id => {
      const label = parentLabel(id); if (label && label.parentElement !== grid) grid.appendChild(label);
    });
    const courses = $('personCourses');
    if (courses){
      let wrap = $('accQuickCourse');
      if (!wrap){ wrap = document.createElement('div'); wrap.id='accQuickCourse'; wrap.className='acc-quick-course'; wrap.innerHTML='<span>Corso</span>'; grid.appendChild(wrap); }
      if (courses.parentElement !== wrap) wrap.appendChild(courses);
    }
  }

  function placeMaterialFields(){
    const side = document.querySelector('#personModal .person-ux-side');
    if (!side) return;
    let card = $('accQuickMaterial');
    if (!card){
      card = document.createElement('section');
      card.id='accQuickMaterial'; card.className='acc-quick-material-card';
      card.innerHTML='<h4>Badge, gadget e QR</h4><div id="accQuickMaterialBody" class="acc-quick-material-grid"></div>';
      const operational = side.querySelector('.person-ux-operational-card');
      if (operational) operational.insertAdjacentElement('afterend',card); else side.prepend(card);
    }
    const body = $('accQuickMaterialBody');
    const badgeLabel = parentLabel('personBadgeNumber');
    if (badgeLabel){ badgeLabel.classList.add('acc-quick-badge-field'); body.appendChild(badgeLabel); }
    ['personBadgeDelivered','personGadgetDelivered','personQrActive'].forEach(id => {
      const row = $(id)?.closest('.switch-row'); if(row) body.appendChild(row);
    });
  }

  function refreshSummary(){
    const body = $('accQuickSummaryBody'); if(!body) return;
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
    body.innerHTML = items.map(([k,v])=>`<div class="acc-quick-summary-item"><span>${k}</span><strong>${String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong></div>`).join('');
  }

  function enable(){
    const modal = $('personModal');
    if (!modal || modal.hidden || activeView() !== 'accreditamento') return;
    mode = true;
    ensureQuickMain();
    placeMainFields();
    placeMaterialFields();
    refreshSummary();
    modal.classList.add('acc-quick-person');
  }

  function disable(){
    if(!mode) return;
    mode = false;
    $('personModal')?.classList.remove('acc-quick-person');
  }

  async function init(){
    injectStyles();
    for(let i=0;i<100;i+=1){ if($('personModal') && document.querySelector('#personModal .person-ux-main')) break; await new Promise(r=>setTimeout(r,60)); }
    const modal = $('personModal'); if(!modal) return;
    modalObserver = new MutationObserver(()=>{ if(modal.hidden) disable(); else setTimeout(enable,40); });
    modalObserver.observe(modal,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('click', event=>{
      if(event.target.closest('.app-nav-btn') && !modal.hidden){ setTimeout(()=>{ if(activeView()==='accreditamento') enable(); else disable(); },20); }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
