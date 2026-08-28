(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_KEY = 'campo_scuola_segreteria_postazione';
  const LABEL_W = 70;
  const LABEL_H = 45;

  let client = null;
  let session = null;
  let profile = null;
  let loaded = false;
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

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const station = () => sessionStorage.getItem(STATION_KEY) || '';
  const canUse = () => profile?.ruolo === 'admin' || profile?.ruolo === 'segreteria';
  const fullName = p => `${p?.nome || ''} ${p?.cognome || ''}`.trim();

  function toast(message, type='') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3500);
  }

  function injectStyles() {
    if ($('qrOfficialLabelsStyles')) return;
    const style = document.createElement('style');
    style.id = 'qrOfficialLabelsStyles';
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
      loaded = true;
    } finally { loading = false; }
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
      const c = list[0];
      return [c.codice,c.nome].filter(Boolean).join(' · ');
    }
    const codes = list.map(c => c.codice || c.nome).filter(Boolean);
    return codes.length <= 2 ? codes.join(' · ') : `${codes.slice(0,2).join(' · ')} · +${codes.length - 2}`;
  }

  function accommodation(person) {
    const bed = bedsByPerson.get(person.id);
    if (!bed) return '';
    const tent = tents.get(bed.tenda_id);
    const t = tent?.codice || tent?.nome || 'Tenda';
    return `${t} · ${bed.codice_posto ? `Posto ${bed.codice_posto}` : 'posto assegnato'}${bed.emergenza ? ' · E' : ''}`;
  }

  function buildItem(person, overrides={}) {
    return {
      ...person,
      ...overrides,
      name: `${overrides.nome ?? person.nome ?? ''} ${overrides.cognome ?? person.cognome ?? ''}`.trim(),
      roles: overrides.roles || roleNames(person),
      courseText: overrides.courseText ?? courseText(person),
      accommodation: overrides.accommodation ?? accommodation(person),
      lastPrint: latestPrint.get(person.id) || null
    };
  }

  function formatStamp(value) {
    if (!value) return 'Mai';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function filters() {
    return {
      q:String($('qrBulkSearch')?.value || '').trim().toLocaleLowerCase('it'),
      type:$('qrBulkType')?.value || '', course:$('qrBulkCourse')?.value || '', presence:$('qrBulkPresence')?.value || '', qr:$('qrBulkQr')?.value || 'attivi',
      badge:!!$('qrBulkBadgeOnly')?.checked, never:!!$('qrBulkNever')?.checked
    };
  }

  function filteredPeople() {
    const f = filters();
    return people.filter(p => {
      if (!p.qr_token) return false;
      const item = buildItem(p);
      const hay = [item.name,p.numero_badge,item.roles.join(' '),item.courseText].join(' ').toLocaleLowerCase('it');
      if (f.q && !hay.includes(f.q)) return false;
      if (f.type && !(typesByPerson.get(p.id) || [p.tipologia]).includes(f.type)) return false;
      if (f.course && !courses(p).some(c => String(c.id) === f.course)) return false;
      if (f.presence === 'presenti' && !p.presente) return false;
      if (f.presence === 'fuori' && p.presente) return false;
      if (f.qr === 'attivi' && p.qr_attivo === false) return false;
      if (f.qr === 'disattivati' && p.qr_attivo !== false) return false;
      if (f.badge && !p.numero_badge) return false;
      if (f.never && latestPrint.has(p.id)) return false;
      return true;
    });
  }

  function renderBulk() {
    const rows = filteredPeople();
    if ($('qrBulkCount')) $('qrBulkCount').textContent = `${rows.length} ${rows.length === 1 ? 'etichetta' : 'etichette'} da generare`;
    if ($('qrBulkPrint')) { $('qrBulkPrint').disabled = rows.length === 0; $('qrBulkPrint').textContent = rows.length ? `Stampa ${rows.length} QR` : 'Nessun QR da stampare'; }
    const list = $('qrBulkList');
    if (list) {
      list.innerHTML = rows.slice(0,120).map(p => {
        const item = buildItem(p);
        return `<div class="qr-bulk-row"><div><strong>${esc(item.name)}</strong><br><span>${esc(p.numero_badge ? `Badge ${p.numero_badge}` : 'Badge non assegnato')}</span></div><div>${esc(item.courseText || 'Nessun corso')}<br><span>${esc(item.roles.join(' · ') || 'Ruolo non definito')}</span></div><div>${esc(item.accommodation || 'Nessun alloggio')}</div><div class="qr-bulk-status${item.lastPrint ? ' ok' : ''}">${item.lastPrint ? `Stampato ${esc(formatStamp(item.lastPrint))}` : 'Mai stampato'}</div></div>`;
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
      <header class="qr-bulk-head"><div><h2 id="qrBulkTitle">Stampa massiva QR badge</h2><p>Etichette ufficiali 70 × 45 mm da applicare sul retro dei badge A6.</p></div><button class="qr-bulk-close" data-close-qr-bulk type="button" aria-label="Chiudi">×</button></header>
      <div class="qr-bulk-body"><div id="qrBulkTracking" class="qr-bulk-info">Il QR contiene esclusivamente il token operativo casuale. Nome, corso e ruolo sono stampati sull’etichetta ma non codificati nel QR.</div>
        <div class="qr-bulk-filters"><input id="qrBulkSearch" type="search" placeholder="Nome, badge, corso, ruolo…"><select id="qrBulkType"><option value="">Tutti i ruoli</option></select><select id="qrBulkCourse"><option value="">Tutti i corsi</option></select><select id="qrBulkPresence"><option value="">Tutte le presenze</option><option value="presenti">Solo presenti</option><option value="fuori">Solo fuori</option></select></div>
        <div class="qr-bulk-filters" style="grid-template-columns:repeat(2,minmax(180px,1fr));margin-top:8px"><select id="qrBulkQr"><option value="attivi">Solo QR attivi</option><option value="tutti">Tutti i QR</option><option value="disattivati">Solo QR disattivati</option></select><div></div></div>
        <div class="qr-bulk-options"><label><input id="qrBulkBadgeOnly" type="checkbox"> Solo con numero badge</label><label><input id="qrBulkNever" type="checkbox"> Solo mai stampati</label></div>
        <div class="qr-bulk-summary"><div><strong id="qrBulkCount">0 etichette da generare</strong><small>I filtri agiscono sull’intera anagrafica attiva.</small></div><label class="qr-bulk-layout"><span>Foglio</span><select id="qrBulkLayout"><option value="10">A4 · 10 etichette (2×5) — consigliato</option><option value="12">A4 · 12 etichette (2×6)</option></select></label></div>
        <div class="qr-bulk-preview"><div class="qr-bulk-preview-head">Anteprima elenco</div><div id="qrBulkList" class="qr-bulk-list"></div></div>
        <div class="qr-bulk-actions"><small>La stampa apre un’anteprima A4. Dal browser scegli la stampante oppure “Salva come PDF”.</small><button id="qrBulkPrint" class="qr-bulk-print" type="button">Stampa QR</button></div>
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
    if (!loaded) await readAll();
    const type = $('qrBulkType');
    if (type && type.options.length === 1) [...typeDefs.entries()].forEach(([code,name]) => type.add(new Option(name,code)));
    const course = $('qrBulkCourse');
    if (course && course.options.length === 1) courseDefs.forEach(c => course.add(new Option([c.codice,c.nome].filter(Boolean).join(' · '),String(c.id))));
    const info = $('qrBulkTracking');
    if (info) {
      info.classList.toggle('warn',!trackingAvailable);
      info.innerHTML = trackingAvailable ? 'Il QR contiene esclusivamente il token operativo casuale. Nome, corso e ruolo sono stampati sull’etichetta ma non codificati nel QR.' : 'Le etichette possono essere stampate, ma lo storico stampe non è ancora disponibile. Esegui <strong>supabase/step-stampa-qr-etichette.sql</strong> per abilitare “Solo mai stampati” e la tracciatura.';
    }
    renderBulk();
  }

  function closeBulk() { if ($('qrBulkModal')) $('qrBulkModal').hidden = true; document.body.classList.remove('modal-open'); }

  async function qrDataUrl(token) {
    if (!token || !window.QRCode) throw new Error('Generatore QR non disponibile.');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:256px;height:256px;background:#fff';
    document.body.appendChild(holder);
    new window.QRCode(holder,{text:token,width:256,height:256,correctLevel:window.QRCode.CorrectLevel.M});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = holder.querySelector('canvas');
    const img = holder.querySelector('img');
    const src = canvas ? canvas.toDataURL('image/png') : img?.src;
    holder.remove();
    if (!src) throw new Error('Impossibile generare il QR.');
    return src;
  }

  async function ensureActive(rows) {
    const inactive = rows.filter(p => p.qr_attivo === false);
    if (!inactive.length) return;
    const ids = inactive.map(p => p.id);
    const { error } = await client.from('persone').update({qr_attivo:true}).in('id',ids);
    if (error) throw error;
    inactive.forEach(p => { p.qr_attivo = true; });
  }

  function labelHtml(item,src) {
    const base = new URL('.',location.href).href;
    const cri = `${base}assets/img/logo-cri-puglia.png`;
    const campo = `${base}assets/img/logo-campo.png`;
    const roles = item.roles.join(' · ');
    return `<article class="qr-label"><div class="qr-label-head"><img src="${cri}" alt="CRI Puglia"><span>La Rotta della Formazione</span><img src="${campo}" alt="Logo Campo"></div><div class="qr-label-main"><img class="qr-code" src="${src}" alt="QR"><div class="qr-label-info"><div class="qr-name">${esc(item.name || '—')}</div>${item.courseText ? `<div class="qr-course">${esc(item.courseText)}</div>` : ''}${roles ? `<div class="qr-role">${esc(roles)}</div>` : ''}<div class="qr-meta">${item.numero_badge ? `Badge <b>${esc(item.numero_badge)}</b>` : ''}${item.numero_badge && item.accommodation ? ' · ' : ''}${item.accommodation ? `<b>${esc(item.accommodation)}</b>` : ''}</div></div></div><div class="qr-label-foot">Campo Scuola CRI Puglia 2026 · QR personale</div></article>`;
  }

  function printCss(mode,perPage) {
    const rowGap = perPage === 12 ? '1.4mm' : '7mm';
    return `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#172832}.toolbar{position:sticky;top:0;z-index:10;display:flex;justify-content:center;gap:8px;padding:10px;background:#202a31}.toolbar button{border:0;border-radius:5px;padding:9px 14px;font:inherit;font-weight:800;cursor:pointer}.toolbar .primary{background:#d40000;color:#fff}.toolbar .secondary{background:#fff;color:#26343d}.qr-label{width:${LABEL_W}mm;height:${LABEL_H}mm;border:.25mm dashed #aeb8be;border-top:1.2mm solid #d40000;padding:1.6mm 1.8mm 1.2mm;overflow:hidden;break-inside:avoid;background:#fff}.qr-label-head{height:6.4mm;display:grid;grid-template-columns:15mm 1fr 15mm;gap:1mm;align-items:center;border-bottom:.2mm solid #e3e7ea;padding-bottom:.7mm}.qr-label-head img{display:block;max-width:15mm;max-height:5.2mm;object-fit:contain;margin:auto}.qr-label-head span{text-align:center;font-size:5.4pt;font-weight:800;color:#b00018;line-height:1.05}.qr-label-main{height:31.1mm;display:grid;grid-template-columns:29mm minmax(0,1fr);gap:1.8mm;align-items:center}.qr-code{width:29mm;height:29mm;image-rendering:pixelated}.qr-label-info{min-width:0}.qr-name{font-size:10.2pt;font-weight:900;line-height:1.02;color:#152a36;max-height:8.4mm;overflow:hidden}.qr-course{margin-top:1.2mm;font-size:6.6pt;font-weight:750;line-height:1.15;color:#394f5b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.qr-role{margin-top:1.1mm;font-size:7pt;font-weight:900;color:#b00018;line-height:1.1}.qr-meta{margin-top:1.4mm;font-size:6.5pt;line-height:1.18;color:#425862}.qr-label-foot{height:3mm;border-top:.2mm solid #e3e7ea;padding-top:.6mm;text-align:center;font-size:5.2pt;font-weight:700;color:#6b7981;white-space:nowrap;overflow:hidden}.print-page{width:190mm;min-height:277mm;margin:0 auto;display:grid;grid-template-columns:${LABEL_W}mm ${LABEL_W}mm;grid-auto-rows:${LABEL_H}mm;column-gap:10mm;row-gap:${rowGap};align-content:start;justify-content:center;break-after:page}.print-page:last-child{break-after:auto}@page{size:A4 portrait;margin:10mm}@media print{.toolbar{display:none}.print-page{margin:0}.qr-label{break-inside:avoid}}${mode === 'single' ? `@page{size:${LABEL_W}mm ${LABEL_H}mm;margin:0}.toolbar{display:none}.print-page{width:${LABEL_W}mm;min-height:${LABEL_H}mm;display:block}.qr-label{border:0;border-top:1.2mm solid #d40000}` : ''}`;
  }

  function popupHtml(itemsWithQr,mode='mass',perPage=10) {
    const pages = [];
    const chunk = mode === 'single' ? 1 : perPage;
    for (let i=0;i<itemsWithQr.length;i+=chunk) pages.push(itemsWithQr.slice(i,i+chunk));
    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etichette QR Campo CRI</title><style>${printCss(mode,perPage)}</style></head><body>${mode === 'mass' ? '<div class="toolbar"><button class="primary" onclick="window.print()">Stampa / Salva PDF</button><button class="secondary" onclick="window.close()">Chiudi</button></div>' : ''}${pages.map(page => `<section class="print-page">${page.map(x => labelHtml(x.item,x.qr)).join('')}</section>`).join('')}${mode === 'single' ? '<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script>' : ''}</body></html>`;
  }

  async function recordPrint(rows,type,layout) {
    if (!trackingAvailable || !rows.length) return;
    const payload = rows.map(p => ({persona_id:p.id,tipo:type,formato:'70x45',postazione:station() || null,created_by:session.user.id,dettagli:{layout}}));
    const { error } = await client.from('stampe_qr').insert(payload);
    if (error) { trackingAvailable = false; return; }
    const now = new Date().toISOString();
    rows.forEach(p => latestPrint.set(p.id,now));
  }

  async function prepareAndPrint(rows,mode,perPage=10) {
    if (!rows.length) return;
    const popup = window.open('','_blank',mode === 'single' ? 'width=520,height=560' : 'width=1100,height=820');
    if (!popup) { toast('Il browser ha bloccato la finestra di stampa. Autorizza i popup per questo sito.','error'); return; }
    popup.document.write('<!doctype html><title>Preparazione QR…</title><body style="font-family:Arial;padding:30px">Preparazione etichette QR in corso…</body>');
    popup.document.close();
    try {
      await ensureActive(rows);
      const data = [];
      for (let i=0;i<rows.length;i+=1) {
        const p = rows[i];
        const qr = await qrDataUrl(p.qr_token);
        data.push({item:buildItem(p),qr});
        if (mode === 'mass' && $('qrBulkPrint')) $('qrBulkPrint').textContent = `Preparazione ${i+1}/${rows.length}…`;
      }
      popup.document.open();
      popup.document.write(popupHtml(data,mode,perPage));
      popup.document.close();
      await recordPrint(rows,mode === 'single' ? 'singola' : 'massiva',mode === 'single' ? 'singola-70x45' : `A4-${perPage}`);
      if (mode === 'mass') { renderBulk(); toast(`${rows.length} etichette QR preparate.`,'success'); }
      else toast(`Etichetta QR pronta · ${fullName(rows[0])}.`,'success');
    } catch (error) {
      try { popup.close(); } catch (_) {}
      toast(`Stampa QR non riuscita: ${error.message || error}`,'error');
    } finally {
      if ($('qrBulkPrint')) { const count = filteredPeople().length; $('qrBulkPrint').disabled = count === 0; $('qrBulkPrint').textContent = count ? `Stampa ${count} QR` : 'Nessun QR da stampare'; }
    }
  }

  async function printBulk() {
    const rows = filteredPeople();
    if (!rows.length) return;
    const perPage = Number($('qrBulkLayout')?.value || 10) === 12 ? 12 : 10;
    await prepareAndPrint(rows,'mass',perPage);
  }

  async function printCurrent() {
    if (!loaded) await readAll();
    const id = String($('personId')?.value || '').trim();
    const person = people.find(p => String(p.id) === id);
    if (!person) { toast('Persona non trovata per la stampa QR.','error'); return; }
    const selectedRoles = [...document.querySelectorAll('#personTypes label')].filter(label => label.querySelector('input')?.checked).map(label => label.textContent.trim()).filter(Boolean);
    const overrides = {
      nome:String($('personNome')?.value || person.nome || '').trim(), cognome:String($('personCognome')?.value || person.cognome || '').trim(), numero_badge:String($('personBadgeNumber')?.value || person.numero_badge || '').trim() || null,
      roles:selectedRoles.length ? selectedRoles : roleNames(person)
    };
    const printPerson = {...person,nome:overrides.nome,cognome:overrides.cognome,numero_badge:overrides.numero_badge};
    const prepared = buildItem(printPerson,overrides);
    const popup = window.open('','_blank','width=520,height=560');
    if (!popup) { toast('Il browser ha bloccato la finestra di stampa.','error'); return; }
    popup.document.write('<!doctype html><title>Preparazione QR…</title><body style="font-family:Arial;padding:30px">Preparazione etichetta QR…</body>'); popup.document.close();
    try {
      await ensureActive([person]);
      const qr = await qrDataUrl(person.qr_token);
      popup.document.open(); popup.document.write(popupHtml([{item:prepared,qr}],'single',1)); popup.document.close();
      await recordPrint([person],'singola','singola-70x45');
      const qrActive = $('personQrActive');
      if (qrActive && !qrActive.checked) { qrActive.checked = true; qrActive.dispatchEvent(new Event('change',{bubbles:true})); }
      toast(`Etichetta QR pronta · ${prepared.name}.`,'success');
    } catch (error) { try { popup.close(); } catch (_) {} toast(`Stampa QR non riuscita: ${error.message || error}`,'error'); }
  }

  async function init() {
    injectStyles();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth = await client.auth.getSession();
    session = auth.data?.session || null;
    if (!session) return;
    const p = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (p.error || !p.data?.attivo) return;
    profile = p.data;
    if (!canUse()) return;
    mountButton();
    mountModal();
    document.addEventListener('click',event => {
      const button = event.target.closest('#printQrButton');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void printCurrent();
    },true);
  }

  window.CampoQrLabels = { printCurrent, openBulk };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();