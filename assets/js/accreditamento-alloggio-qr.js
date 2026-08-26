(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let accommodation = null;
  let currentPersonId = null;
  let modalObserver = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function toast(message, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3200);
  }

  function injectStyles() {
    if ($('accreditAccommodationStyles')) return;
    const style = document.createElement('style');
    style.id = 'accreditAccommodationStyles';
    style.textContent = `
      #personModal.acc-quick-person .acc-quick-accommodation{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;border:1px solid #cbdce7;border-left:4px solid #245f7d;border-radius:5px;background:#f2f8fb;padding:10px 11px}
      #personModal.acc-quick-person .acc-quick-accommodation-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:4px;background:#173b52;color:#fff;font-size:17px}
      #personModal.acc-quick-person .acc-quick-accommodation span{display:block;font-size:8px;font-weight:850;letter-spacing:.07em;text-transform:uppercase;color:#6b8090}
      #personModal.acc-quick-person .acc-quick-accommodation strong{display:block;margin-top:2px;font-size:13px;color:#173b52}
      #personModal.acc-quick-person .acc-quick-accommodation small{display:block;margin-top:2px;font-size:9px;color:#617887}
      #personModal.acc-quick-person .acc-quick-summary-item.accommodation{border-color:#cbdce7;background:#f2f8fb}
      #personModal.acc-quick-person .acc-quick-summary-item.accommodation strong{color:#173b52;font-size:11px}
    `;
    document.head.appendChild(style);
  }

  async function loadAccommodation() {
    if (!client) return;
    const personId = String($('personId')?.value || '').trim();
    currentPersonId = personId || null;
    accommodation = null;
    if (!personId) { renderAccommodation(); return; }

    const { data: bed, error: bedError } = await client
      .from('posti_letto')
      .select('id,tenda_id,codice_posto,emergenza')
      .eq('persona_id', personId)
      .maybeSingle();

    if (bedError || !bed) { renderAccommodation(); return; }

    const { data: tent } = await client
      .from('tende')
      .select('id,codice,nome,destinazione')
      .eq('id', bed.tenda_id)
      .maybeSingle();

    accommodation = {
      bedId: bed.id,
      bedCode: bed.codice_posto || '—',
      emergency: bed.emergenza === true,
      tentCode: tent?.codice || 'Tenda',
      tentName: tent?.nome || tent?.codice || 'Tenda',
      destination: tent?.destinazione || ''
    };
    renderAccommodation();
  }

  function accommodationLabel() {
    if (!accommodation) return 'Nessun posto letto assegnato';
    return `${accommodation.tentCode} · Posto ${accommodation.bedCode}`;
  }

  function renderAccommodation() {
    const grid = $('accQuickGrid');
    if (grid) {
      let box = $('accQuickAccommodation');
      if (!box) {
        box = document.createElement('div');
        box.id = 'accQuickAccommodation';
        box.className = 'acc-quick-accommodation';
        box.innerHTML = '<div class="acc-quick-accommodation-icon">⌂</div><div><span>Alloggio assegnato</span><strong id="accQuickAccommodationValue">—</strong><small id="accQuickAccommodationMeta"></small></div>';
        const course = $('accQuickCourse');
        if (course?.parentElement === grid) course.insertAdjacentElement('afterend', box);
        else grid.appendChild(box);
      }
      const value = accommodationLabel();
      const meta = accommodation
        ? `${accommodation.tentName}${accommodation.emergency ? ' · posto emergenza' : ''} — comunicalo al volontario durante l’accredito.`
        : 'Da assegnare prima dell’arrivo, se è previsto il pernottamento.';
      if ($('accQuickAccommodationValue')?.textContent !== value) $('accQuickAccommodationValue').textContent = value;
      if ($('accQuickAccommodationMeta')?.textContent !== meta) $('accQuickAccommodationMeta').textContent = meta;
    }
    ensureSummaryItem();
  }

  function ensureSummaryItem() {
    const body = $('accQuickSummaryBody');
    if (!body || !body.children.length) return;
    let item = $('accQuickAccommodationSummary');
    if (!item) {
      item = document.createElement('div');
      item.id = 'accQuickAccommodationSummary';
      item.className = 'acc-quick-summary-item accommodation';
      body.insertBefore(item, body.firstChild);
    }
    const html = `<span>Alloggio assegnato</span><strong>${esc(accommodationLabel())}</strong>`;
    if (item.innerHTML !== html) item.innerHTML = html;
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

  async function printSticker() {
    if (String($('personId')?.value || '') !== String(currentPersonId || '')) await loadAccommodation();
    const src = qrImageData();
    if (!src) {
      toast('QR non ancora disponibile. Salva la persona e riapri l’accredito.', 'error');
      return;
    }

    const name = `${$('personNome')?.value || ''} ${$('personCognome')?.value || ''}`.trim() || 'Persona';
    const badge = String($('personBadgeNumber')?.value || '').trim();
    const room = accommodationLabel();
    const popup = window.open('', '_blank', 'width=520,height=620');
    if (!popup) {
      toast('Il browser ha bloccato la finestra di stampa.', 'error');
      return;
    }

    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR badge</title><style>
      @page{size:50mm 50mm;margin:2mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif}
      .label{width:46mm;height:46mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}
      img{width:28mm;height:28mm}.name{max-width:44mm;margin-top:1mm;font-size:8.5pt;font-weight:700;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .meta{margin-top:.6mm;font-size:7pt;color:#333;line-height:1.05}.room{margin-top:.7mm;font-size:7.5pt;font-weight:700;color:#173b52;line-height:1.05}
      @media screen{body{display:grid;place-items:center;min-height:100vh}.label{border:1px dashed #aaa}}
    </style></head><body><div class="label"><img src="${src}" alt="QR"><div class="name">${esc(name)}</div>${badge ? `<div class="meta">Badge ${esc(badge)}</div>` : ''}<div class="room">${esc(room)}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),120)<\/script></body></html>`);
    popup.document.close();

    const qrActive = $('personQrActive');
    if (qrActive && !qrActive.checked) {
      qrActive.checked = true;
      qrActive.dispatchEvent(new Event('change', { bubbles:true }));
    }
    setTimeout(() => $('personForm')?.requestSubmit(), 60);
    toast(`QR adesivo in stampa · ${room}.`, 'success');
  }

  async function init() {
    injectStyles();
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });

    for (let i = 0; i < 120; i += 1) {
      if ($('personModal')) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    const modal = $('personModal');
    if (!modal) return;

    modalObserver = new MutationObserver(() => {
      if (!modal.hidden) setTimeout(loadAccommodation, 90);
      else { accommodation = null; currentPersonId = null; }
    });
    modalObserver.observe(modal, { attributes:true, attributeFilter:['hidden'] });

    document.addEventListener('click', event => {
      const summaryToggle = event.target.closest('#accQuickSummary>button:first-child');
      if (summaryToggle) setTimeout(ensureSummaryItem, 20);

      const print = event.target.closest('#accQuickPrintQr');
      if (!print) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      printSticker();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
