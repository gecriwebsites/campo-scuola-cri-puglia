(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_KEY = 'campo_scuola_segreteria_postazione';
  const LABEL_W = 45;
  const LABEL_H = 70;

  let client = null;
  let session = null;
  let profile = null;
  let loading = false;
  let trackingAvailable = true;
  let people = [];
  let typeDefs = new Map();
  let typesByPerson = new Map();
  let coursesByPerson = new Map();
  let bedsByPerson = new Map();
  let tents = new Map();
  let latestPrint = new Map();
  let courseDefs = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const station = () => sessionStorage.getItem(STATION_KEY) || '';
  const canUse = () => profile?.ruolo === 'admin' || profile?.ruolo === 'segreteria';
  const fullName = person => `${person?.nome || ''} ${person?.cognome || ''}`.trim();

  function toast(message, type='') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3500);
  }

  function injectStyles() {
    if ($('qrVerticalLabelsStyles')) return;
    const style = document.createElement('style');
    style.id = 'qrVerticalLabelsStyles';
    style.textContent = `
      .qr-bulk-btn{margin-left:8px;white-space:nowrap}
      .qr-bulk-modal[hidden]{display:none}.qr-bulk-modal{position:fixed;inset:0;z-index:520;display:grid;place-items:center;padding:20px}.qr-bulk-backdrop{position:absolute;inset:0;background:rgba(18,25,30,.58);backdrop-filter:blur(3px)}
      .qr-bulk-card{position:relative;width:min(1050px,calc(100vw - 34px));max-height:calc(100dvh - 34px);overflow:auto;background:#fff;border-radius:9px;box-shadow:0 24px 70px rgba(0,0,0,.25)}
      .qr-bulk-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 19px;border-bottom:1px solid #dce3e8;background:#fff}.qr-bulk-head h2{margin:0;font-size:23px;color:#1f3542}.qr-bulk-head p{margin:4px 0 0;font-size:12px;color:#71808a}.qr-bulk-close{width:38px;height:38px;border:1px solid #d4dce1;border-radius:5px;background:#fff;font-size:22px;cursor:pointer}
      .qr-bulk-body{padding:16px 18px 19px}.qr-bulk-info{padding:10px 11px;border:1px solid #cddde7;border-left:4px solid #245f7d;border-radius:5px;background:#f3f8fb;color:#3c5665;font-size:11px;line-height:1.45}.qr-bulk-info.warn{border-color:#ecc8ce;border-left-color:#a9263d;background:#fff8f9;color:#812336}
      .qr-bulk-filters{display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(3,minmax(145px,.7fr));gap:8px;margin-top:12px}.qr-bulk-filters input,.qr-bulk-filters select{height:42px;border:1px solid #cad4da;border-radius:5px;background:#fff;padding:0 10px;font:inherit;font-size:12px}.qr-bulk-options{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0}.qr-bulk-options label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:750;color:#4e626e}.qr-bulk-options input{width:16px;height:16px}
      .qr-bulk-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #dce3e7;border-radius:5px;background:#fafbfc}.qr-bulk-summary strong{font-size:14px;color:#243b48}.qr-bulk-summary small{display:block;margin-top:2px;color:#73818a;font-size:10px}.qr-bulk-layout{display:flex;align-items:center;gap:7px}.qr-bulk-layout select{height:36px;border:1px solid #cad4da;border-radius:5px;background:#fff;padding:0 8px;font:inherit;font-size:11px}
      .qr-bulk-preview{margin-top:10px;border:1px solid #e0e5e8;border-radius:5px;overflow:hidden}.qr-bulk-preview-head{padding:9px 11px;background:#f5f7f8;border-bottom:1px solid #e0e5e8;font-size:11px;font-weight:850;color:#425762}.qr-bulk-list{max-height:310px;overflow:auto}.qr-bulk-row{display:grid;grid-template-columns:minmax(190px,1fr) minmax(150px,.8fr) minmax(130px,.55fr) 120px;gap:10px;padding:8px 11px;border-bottom:1px solid #edf0f2;font-size:10px;align-items:center}.qr-bulk-row:last-child{border-bottom:0}.qr-bulk-row strong{font-size:11px;color:#2c424e}.qr-bulk-row span{color:#6e7e87}.qr-bulk-status{font-weight:850;color:#667781}.qr-bulk-status.ok{color:#16794f}
      .qr-bulk-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.qr-bulk-actions small{font-size:10px;color:#72818a}.qr-bulk-print{min-height:42px;border:0;border-radius:5px;background:#173b52;color:#fff;padding:8px 14px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.qr-bulk-print:disabled{opacity:.45;cursor:not-allowed}
      @media(max-width:850px){.qr-bulk-filters{grid-template-columns:1fr 1fr}.qr-bulk-row{grid-template-columns:1fr 1fr}.qr-bulk-row>div:nth-child(2){grid-column:1/-1}.qr-bulk-actions{align-items:stretch;flex-direction:column}.qr-bulk-print{width:100%}}
      @media(max-width:560px){.qr-bulk-filters{grid-template-columns:1fr}.qr-bulk-summary{align-items:flex-start;flex-direction:column}.qr-bulk-row{grid-template-columns:1fr}.qr-bulk-row>div:nth-child(2){grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  async function readAll() {
    if (loading) return;
    loading = true;
    try {
      const queries = await Promise.all([
        client.from('persone').select('id,nome,cognome,numero_badge,presente,attivo,qr_token,qr_attivo,tipologia').eq('attivo',true).order('cognome').order('nome').limit(2000),
        client.from('tipologie_persona').select('codice,nome,ordine,attiva').eq('attiva',true).order('ordine').limit(100),
        client.from('persone_tipologie').select('persona_id,tipologia_codice').limit(6000),
        client.from('persone_corsi').select('persona_id,ruolo,corsi(id,codice,nome)').limit(6000),
        client.from('corsi').select('id,codice,nome').order('codice').limit(500),
        client.from('posti_letto').select('persona_id,codice_posto,tenda_id,emergenza').not('persona_id','is',null).limit(2500),
        client.from('tende').select('id,codice,nome').limit(100)
      ]);
      if (queries[0].error) throw queries[0].error;
      people = queries[0].data || [];
      typeDefs = new Map((queries[1].data || []).map(x => [x.codice,x.nome]));
      typesByPerson = new Map();
      (queries[2].data || []).forEach(row => {
        const list = typesByPerson.get(row.persona_id) || [];
        list.push(row.tipologia_codice);
        typesByPerson.set(row.persona_id,list);
      });
      coursesByPerson = new Map();
      (queries[3].data || []).forEach(row => {
        if (!row.corsi) return;
        const list = coursesByPerson.get(row.persona_id) || [];
        list.push({...row.corsi, ruolo:row.ruolo || ''});
        coursesByPerson.set(row.persona_id,list);
      });
      courseDefs = queries[4].data || [];
      bedsByPerson = new Map((queries[5].data || []).map(x => [x.persona_id,x]));
      tents = new Map((queries[6].data || []).map(x => [x.id,x]));

      trackingAvailable = true;
      latestPrint = new Map();
      const history = await client.from('stampe_qr').select('persona_id,created_at').order('created_at',{ascending:false}).limit(8000);
      if (history.error) trackingAvailable = false;
      else (history.data || []).forEach(row => { if (!latestPrint.has(row.persona_id)) latestPrint.set(row.persona_id,row.created_at); });
    } finally {
      loading = false;
    }
  }

  function roleNames(person) {
    const codes = typesByPerson.get(person.id) || (person.tipologia ? [person.tipologia] : []);
    return [...new Set(codes.map(code => typeDefs.get(code) || code).filter(Boolean))];
  }

  function courses(person) { return coursesByPerson.get(person.id) || []; }

  function courseText(person) {
    const list = courses(person);
    if (!list.length) return '';
    if (list.length === 1) {
      const item = list[0];
      return [item.codice,item.nome].filter(Boolean).join(' · ');
    }
    const codes = list.map(item => item.codice || item.nome).filter(Boolean);
    return codes.length <= 2 ? codes.join(' · ') : `${codes.slice(0,2).join(' · ')} · +${codes.length - 2}`;
  }

  function accommodation(person) {
    const bed = bedsByPerson.get(person.id);
    if (!bed) return '';
    const tent = tents.get(bed.tenda_id);
    const tentName = tent?.codice || tent?.nome || 'Tenda';
    return `${tentName} · ${bed.codice_posto ? `Posto ${bed.codice_posto}` : 'posto assegnato'}${bed.emergenza ? ' · E' : ''}`;
  }

  function buildItem(person, overrides={}) {
    return {
      ...person,
      ...overrides,
      name:`${overrides.nome ?? person.nome ?? ''} ${overrides.cognome ?? person.cognome ?? ''}`.trim(),
      roles:overrides.roles || roleNames(person),
      courseText:overrides.courseText ?? courseText(person),
      accommodation:overrides.accommodation ?? accommodation(person),
      lastPrint:latestPrint.get(person.id) || null
    };
  }

  function formatStamp(value) {
    if (!value) return 'Mai';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);
  }

  function filters() {
    return {
      q:String($('qrBulkSearch')?.value || '').trim().toLocaleLowerCase('it'),
      type:$('qrBulkType')?.value || '',
      course:$('qrBulkCourse')?.value || '',
      presence:$('qrBulkPresence')?.value || '',
      qr:$('qrBulkQr')?.value || 'attivi',
      badge:!!$('qrBulkBadgeOnly')?.checked,
      never:!!$('qrBulkNever')?.checked
    };
  }

  function filteredPeople() {
    const f = filters();
    return people.filter(person => {
      if (!person.qr_token) return false;
      const item = buildItem(person);
      const haystack = [item.name,person.numero_badge,item.roles.join(' '),item.courseText].join(' ').toLocaleLowerCase('it');
      if (f.q && !haystack.includes(f.q)) return false;
      if (f.type && !(typesByPerson.get(person.id) || [person.tipologia]).includes(f.type)) return false;
      if (f.course && !courses(person).some(course => String(course.id) === f.course)) return false;
      if (f.presence === 'presenti' && !person.presente) return false;
      if (f.presence === 'fuori' && person.presente) return false;
      if (f.qr === 'attivi' && person.qr_attivo === false) return false;
      if (f.qr === 'disattivati' && person.qr_attivo !== false) return false;
      if (f.badge && !person.numero_badge) return false;
      if (f.never && latestPrint.has(person.id)) return false;
      return true;
    });
  }

  function renderBulk() {
    const rows = filteredPeople();
    if ($('qrBulkCount')) $('qrBulkCount').textContent = `${rows.length} ${rows.length === 1 ? 'etichetta' : 'etichette'} da generare`;
    if ($('qrBulkPrint')) {
      $('qrBulkPrint').disabled = rows.length === 0;
      $('qrBulkPrint').textContent = rows.length ? `Stampa ${rows.length} QR` : 'Nessun QR da stampare';
    }
    const list = $('qrBulkList');
    if (list) {
      list.innerHTML = rows.slice(0,120).map(person => {
        const item = buildItem(person);
        return `<div class="qr-bulk-row"><div><strong>${esc(item.name)}</strong><br><span>${esc(person.numero_badge ? `Badge ${person.numero_badge}` : 'Badge non assegnato')}</span></div><div>${esc(item.courseText || 'Nessun corso')}<br><span>${esc(item.roles.join(' · ') || 'Ruolo non definito')}</span></div><div>${esc(item.accommodation || 'Nessun alloggio')}</div><div class="qr-bulk-status${item.lastPrint ? ' ok' : ''}">${item.lastPrint ? `Stampato ${esc(formatStamp(item.lastPrint))}` : 'Mai stampato'}</div></div>`;
      }).join('') + (rows.length > 120 ? `<div class="qr-bulk-row"><div><strong>… e altre ${rows.length - 120} persone</strong></div></div>` : '');
    }
    if ($('qrBulkNever')) $('qrBulkNever').disabled = !trackingAvailable;
  }

  function mountModal() {
    if ($('qrBulkModal')) return;
    const modal = document.createElement('div');
    modal.id = 'qrBulkModal';
    modal.className = 'qr-bulk-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="qr-bulk-backdrop" data-close-qr-bulk></div><section class="qr-bulk-card" role="dialog" aria-modal="true" aria-labelledby="qrBulkTitle">
      <header class="qr-bulk-head"><div><h2 id="qrBulkTitle">Stampa massiva QR badge</h2><p>Etichette verticali ufficiali 45 × 70 mm da applicare sul retro dei badge A6.</p></div><button class="qr-bulk-close" data-close-qr-bulk type="button" aria-label="Chiudi">×</button></header>
      <div class="qr-bulk-body"><div id="qrBulkTracking" class="qr-bulk-info">QR più grande e dati disposti in verticale. Nel QR resta codificato esclusivamente il token operativo casuale.</div>
        <div class="qr-bulk-filters"><input id="qrBulkSearch" type="search" placeholder="Nome, badge, corso, ruolo…"><select id="qrBulkType"><option value="">Tutti i ruoli</option></select><select id="qrBulkCourse"><option value="">Tutti i corsi</option></select><select id="qrBulkPresence"><option value="">Tutte le presenze</option><option value="presenti">Solo presenti</option><option value="fuori">Solo fuori</option></select></div>
        <div class="qr-bulk-filters" style="grid-template-columns:repeat(2,minmax(180px,1fr));margin-top:8px"><select id="qrBulkQr"><option value="attivi">Solo QR attivi</option><option value="tutti">Tutti i QR</option><option value="disattivati">Solo QR disattivati</option></select><div></div></div>
        <div class="qr-bulk-options"><label><input id="qrBulkBadgeOnly" type="checkbox"> Solo con numero badge</label><label><input id="qrBulkNever" type="checkbox"> Solo mai stampati</label></div>
        <div class="qr-bulk-summary"><div><strong id="qrBulkCount">0 etichette da generare</strong><small>Formato singola etichetta: 45 × 70 mm verticale.</small></div><label class="qr-bulk-layout"><span>Foglio</span><select id="qrBulkLayout"><option value="12">A4 · 12 etichette verticali (4×3) — consigliato</option><option value="9">A4 · 9 etichette verticali (3×3) — più arioso</option></select></label></div>
        <div class="qr-bulk-preview"><div class="qr-bulk-preview-head">Anteprima elenco</div><div id="qrBulkList" class="qr-bulk-list"></div></div>
        <div class="qr-bulk-actions"><small>La stampa apre l'anteprima A4. Usa scala 100% / dimensioni effettive per rispettare i 45 × 70 mm.</small><button id="qrBulkPrint" class="qr-bulk-print" type="button">Stampa QR</button></div>
      </div></section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if (event.target.closest('[data-close-qr-bulk]')) closeBulk(); });
    modal.querySelectorAll('input,select').forEach(el => el.addEventListener('input', renderBulk));
    $('qrBulkPrint')?.addEventListener('click', printBulk);
  }

  function mountButton() {
    if ($('qrBulkButton')) return;
    const heading = document.querySelector('#standardWorkspace [data-view-panel="persone"] .view-heading');
    const add = $('addPersonButton');
    if (!heading || !add) return;
    const button = document.createElement('button');
    button.id = 'qrBulkButton';
    button.type = 'button';
    button.className = 'btn secondary qr-bulk-btn';
    button.textContent = '▦ Stampa QR in massa';
    button.addEventListener('click', openBulk);
    add.insertAdjacentElement('beforebegin',button);
  }

  async function openBulk() {
    mountModal();
    $('qrBulkModal').hidden = false;
    document.body.classList.add('modal-open');
    await readAll();
    const typeSelect = $('qrBulkType');
    if (typeSelect && typeSelect.options.length === 1) [...typeDefs.entries()].forEach(([code,name]) => typeSelect.add(new Option(name,code)));
    const courseSelect = $('qrBulkCourse');
    if (courseSelect && courseSelect.options.length === 1) courseDefs.forEach(course => courseSelect.add(new Option([course.codice,course.nome].filter(Boolean).join(' · '),String(course.id))));
    const info = $('qrBulkTracking');
    if (info) {
      info.classList.toggle('warn',!trackingAvailable);
      info.innerHTML = trackingAvailable ? 'QR più grande e dati disposti in verticale. Nel QR resta codificato esclusivamente il token operativo casuale.' : 'Le etichette possono essere stampate, ma lo storico stampe non è disponibile. Verifica la tabella <strong>stampe_qr</strong>.';
    }
    renderBulk();
  }

  function closeBulk() {
    if ($('qrBulkModal')) $('qrBulkModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  async function qrDataUrl(token) {
    if (!token || !window.QRCode) throw new Error('Generatore QR non disponibile.');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:300px;height:300px;background:#fff';
    document.body.appendChild(holder);
    new window.QRCode(holder,{text:token,width:300,height:300,correctLevel:window.QRCode.CorrectLevel.M});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = holder.querySelector('canvas');
    const img = holder.querySelector('img');
    const src = canvas ? canvas.toDataURL('image/png') : img?.src;
    holder.remove();
    if (!src) throw new Error('Impossibile generare il QR.');
    return src;
  }

  async function ensureActive(rows) {
    const inactive = rows.filter(person => person.qr_attivo === false);
    if (!inactive.length) return;
    const { error } = await client.from('persone').update({qr_attivo:true}).in('id',inactive.map(person => person.id));
    if (error) throw error;
    inactive.forEach(person => { person.qr_attivo = true; });
  }

  function labelHtml(item, src) {
    const base = new URL('.',location.href).href;
    const cri = `${base}assets/img/logo-cri-puglia.png`;
    const campo = `${base}assets/img/logo-campo.png`;
    const roles = item.roles.join(' · ');
    const meta = [item.numero_badge ? `Badge <b>${esc(item.numero_badge)}</b>` : '', item.accommodation ? `<b>${esc(item.accommodation)}</b>` : ''].filter(Boolean).join(' · ');
    return `<article class="qr-label">
      <div class="qr-label-head"><img src="${cri}" alt="CRI Puglia"><div><strong>CRI PUGLIA</strong><span>La Rotta della Formazione</span></div><img src="${campo}" alt="Logo Campo"></div>
      <div class="qr-code-wrap"><img class="qr-code" src="${src}" alt="QR personale"></div>
      <div class="qr-label-info"><div class="qr-name">${esc(item.name || '—')}</div>${item.courseText ? `<div class="qr-course">${esc(item.courseText)}</div>` : ''}${roles ? `<div class="qr-role">${esc(roles)}</div>` : ''}${meta ? `<div class="qr-meta">${meta}</div>` : ''}</div>
      <div class="qr-label-foot">Campo Scuola CRI Puglia 2026 · QR personale</div>
    </article>`;
  }

  function printCss(mode, perPage) {
    const cols = perPage === 9 ? 3 : 4;
    const colGap = perPage === 9 ? '14mm' : '3.3mm';
    const rowGap = perPage === 9 ? '9mm' : '8mm';
    return `
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#172832}
      .toolbar{position:sticky;top:0;z-index:10;display:flex;justify-content:center;gap:8px;padding:10px;background:#202a31}.toolbar button{border:0;border-radius:5px;padding:9px 14px;font:inherit;font-weight:800;cursor:pointer}.toolbar .primary{background:#d40000;color:#fff}.toolbar .secondary{background:#fff;color:#26343d}
      .qr-label{width:${LABEL_W}mm;height:${LABEL_H}mm;border:.25mm dashed #aeb8be;border-top:1.2mm solid #d40000;padding:1.5mm 1.6mm 1.2mm;overflow:hidden;break-inside:avoid;background:#fff;display:flex;flex-direction:column;align-items:stretch}
      .qr-label-head{height:7.5mm;display:grid;grid-template-columns:10mm minmax(0,1fr) 11mm;gap:.7mm;align-items:center;border-bottom:.2mm solid #e2e7ea;padding-bottom:.7mm}.qr-label-head img{display:block;max-width:10mm;max-height:5.8mm;object-fit:contain;margin:auto}.qr-label-head img:last-child{max-width:11mm}.qr-label-head div{text-align:center;min-width:0}.qr-label-head strong{display:block;font-size:5.8pt;color:#a90018;line-height:1}.qr-label-head span{display:block;margin-top:.3mm;font-size:4.5pt;font-weight:700;color:#586a74;line-height:1.05}
      .qr-code-wrap{height:33mm;display:grid;place-items:center;padding:1.2mm 0 .6mm}.qr-code{width:30mm;height:30mm;display:block;image-rendering:pixelated}
      .qr-label-info{height:24.2mm;text-align:center;overflow:hidden;padding:0 .5mm}.qr-name{font-size:10pt;font-weight:900;line-height:1.02;color:#152a36;max-height:8mm;overflow:hidden}.qr-course{margin-top:1mm;font-size:6.5pt;font-weight:750;line-height:1.12;color:#394f5b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.qr-role{margin-top:1mm;font-size:7.1pt;font-weight:900;color:#b00018;line-height:1.05;max-height:5.5mm;overflow:hidden}.qr-meta{margin-top:1mm;font-size:6.3pt;line-height:1.12;color:#425862;max-height:5mm;overflow:hidden}
      .qr-label-foot{height:3mm;margin-top:auto;border-top:.2mm solid #e2e7ea;padding-top:.55mm;text-align:center;font-size:4.7pt;font-weight:700;color:#738089;white-space:nowrap;overflow:hidden}
      .print-page{width:190mm;min-height:277mm;margin:0 auto;display:grid;grid-template-columns:repeat(${cols},${LABEL_W}mm);grid-auto-rows:${LABEL_H}mm;column-gap:${colGap};row-gap:${rowGap};align-content:start;justify-content:center;break-after:page}.print-page:last-child{break-after:auto}
      @page{size:A4 portrait;margin:10mm}@media print{.toolbar{display:none}.print-page{margin:0}.qr-label{break-inside:avoid}}
      ${mode === 'single' ? `@page{size:${LABEL_W}mm ${LABEL_H}mm;margin:0}.toolbar{display:none}.print-page{width:${LABEL_W}mm;min-height:${LABEL_H}mm;display:block}.qr-label{border:0;border-top:1.2mm solid #d40000}` : ''}
    `;
  }

  function popupHtml(itemsWithQr, mode='mass', perPage=12) {
    const pages = [];
    const chunk = mode === 'single' ? 1 : perPage;
    for (let i=0;i<itemsWithQr.length;i+=chunk) pages.push(itemsWithQr.slice(i,i+chunk));
    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etichette QR verticali Campo CRI</title><style>${printCss(mode,perPage)}</style></head><body>${mode === 'mass' ? '<div class="toolbar"><button class="primary" onclick="window.print()">Stampa / Salva PDF</button><button class="secondary" onclick="window.close()">Chiudi</button></div>' : ''}${pages.map(page => `<section class="print-page">${page.map(row => labelHtml(row.item,row.qr)).join('')}</section>`).join('')}${mode === 'single' ? '<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script>' : ''}</body></html>`;
  }

  async function recordPrint(rows, type, layout) {
    if (!trackingAvailable || !rows.length) return;
    const payload = rows.map(person => ({persona_id:person.id,tipo:type,formato:'45x70-verticale',postazione:station() || null,created_by:session.user.id,dettagli:{layout,orientamento:'verticale'}}));
    const { error } = await client.from('stampe_qr').insert(payload);
    if (error) {
      trackingAvailable = false;
      return;
    }
    const now = new Date().toISOString();
    rows.forEach(person => latestPrint.set(person.id,now));
  }

  async function prepareAndPrint(rows, mode, perPage=12) {
    if (!rows.length) return;
    const popup = window.open('','_blank',mode === 'single' ? 'width=470,height=720' : 'width=1100,height=850');
    if (!popup) {
      toast('Il browser ha bloccato la finestra di stampa. Autorizza i popup per questo sito.','error');
      return;
    }
    popup.document.write('<!doctype html><title>Preparazione QR…</title><body style="font-family:Arial;padding:30px">Preparazione etichette QR verticali…</body>');
    popup.document.close();
    try {
      await ensureActive(rows);
      const data = [];
      for (let i=0;i<rows.length;i+=1) {
        const person = rows[i];
        data.push({item:buildItem(person),qr:await qrDataUrl(person.qr_token)});
        if (mode === 'mass' && $('qrBulkPrint')) $('qrBulkPrint').textContent = `Preparazione ${i+1}/${rows.length}…`;
      }
      popup.document.open();
      popup.document.write(popupHtml(data,mode,perPage));
      popup.document.close();
      await recordPrint(rows,mode === 'single' ? 'singola' : 'massiva',mode === 'single' ? 'singola-45x70-verticale' : `A4-verticale-${perPage}`);
      if (mode === 'mass') {
        renderBulk();
        toast(`${rows.length} etichette QR verticali preparate.`,'success');
      } else {
        toast(`Etichetta QR verticale pronta · ${fullName(rows[0])}.`,'success');
      }
    } catch (error) {
      try { popup.close(); } catch (_) {}
      toast(`Stampa QR non riuscita: ${error.message || error}`,'error');
    } finally {
      if ($('qrBulkPrint')) {
        const count = filteredPeople().length;
        $('qrBulkPrint').disabled = count === 0;
        $('qrBulkPrint').textContent = count ? `Stampa ${count} QR` : 'Nessun QR da stampare';
      }
    }
  }

  async function printBulk() {
    const rows = filteredPeople();
    if (!rows.length) return;
    const perPage = Number($('qrBulkLayout')?.value || 12) === 9 ? 9 : 12;
    await prepareAndPrint(rows,'mass',perPage);
  }

  async function printCurrent() {
    await readAll();
    const id = String($('personId')?.value || '').trim();
    const person = people.find(item => String(item.id) === id);
    if (!person) {
      toast('Persona non trovata per la stampa QR.','error');
      return;
    }
    const selectedRoles = [...document.querySelectorAll('#personTypes label')]
      .filter(label => label.querySelector('input')?.checked)
      .map(label => label.textContent.trim())
      .filter(Boolean);
    const overrides = {
      nome:String($('personNome')?.value || person.nome || '').trim(),
      cognome:String($('personCognome')?.value || person.cognome || '').trim(),
      numero_badge:String($('personBadgeNumber')?.value || person.numero_badge || '').trim() || null,
      roles:selectedRoles.length ? selectedRoles : roleNames(person)
    };
    const printPerson = {...person,nome:overrides.nome,cognome:overrides.cognome,numero_badge:overrides.numero_badge};
    const prepared = buildItem(printPerson,overrides);
    const popup = window.open('','_blank','width=470,height=720');
    if (!popup) {
      toast('Il browser ha bloccato la finestra di stampa.','error');
      return;
    }
    popup.document.write('<!doctype html><title>Preparazione QR…</title><body style="font-family:Arial;padding:30px">Preparazione etichetta QR verticale…</body>');
    popup.document.close();
    try {
      await ensureActive([person]);
      const qr = await qrDataUrl(person.qr_token);
      popup.document.open();
      popup.document.write(popupHtml([{item:prepared,qr}],'single',1));
      popup.document.close();
      await recordPrint([person],'singola','singola-45x70-verticale');
      const qrActive = $('personQrActive');
      if (qrActive && !qrActive.checked) {
        qrActive.checked = true;
        qrActive.dispatchEvent(new Event('change',{bubbles:true}));
      }
      toast(`Etichetta QR verticale pronta · ${prepared.name}.`,'success');
    } catch (error) {
      try { popup.close(); } catch (_) {}
      toast(`Stampa QR non riuscita: ${error.message || error}`,'error');
    }
  }

  async function init() {
    injectStyles();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth = await client.auth.getSession();
    session = auth.data?.session || null;
    if (!session) return;
    const result = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (result.error || !result.data?.attivo) return;
    profile = result.data;
    if (!canUse()) return;
    mountButton();
    mountModal();
    document.addEventListener('click', event => {
      const button = event.target.closest('#printQrButton');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void printCurrent();
    }, true);
  }

  window.CampoQrLabels = { printCurrent, openBulk };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
