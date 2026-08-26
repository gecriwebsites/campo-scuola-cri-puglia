(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let client = null;
  let observer = null;
  let enhancing = false;

  function textOnly(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('small').forEach(n => n.remove());
    return clone.textContent.trim();
  }

  function isMissing(value) {
    const v = String(value || '').trim().toLowerCase();
    return !v || v === '—' || v === '-' || v === 'n/d' || v === 'nd' || v === 'non disponibile';
  }

  function dateToIso(value) {
    const s = String(value || '').trim();
    if (!s || s === '—') return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return '';
  }

  function dateIt(value) {
    if (!value) return '—';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
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
    if ($('excelVerifyEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'excelVerifyEditorStyles';
    style.textContent = `
      /* Verifica Excel: grande, leggibile, operativa */
      #excelVerifyPanel{border:1px solid #d8dee4!important;border-radius:14px!important;background:#fff!important}
      #excelVerifyPanel .excel-verify-panel-head{padding:20px 22px!important;background:#f7f9fb!important}
      #excelVerifyPanel .excel-verify-panel-head h4{font-size:22px!important;margin:3px 0 6px!important}
      #excelVerifyPanel .excel-verify-panel-head p{font-size:14px!important;line-height:1.5!important;max-width:760px}
      #excelVerifyPanel .excel-verify-state{font-size:13px!important;padding:8px 12px!important}
      #excelVerifyPanel .excel-verify-body{padding:20px 22px!important}
      #excelVerifyPanel .excel-verify-source{font-size:12px!important;padding:6px 9px!important}
      #excelVerifyPanel .excel-verify-row{border:1px solid #dfe4e8!important;border-radius:13px!important;padding:18px!important;gap:14px!important;min-height:116px!important;background:#fff!important}
      #excelVerifyPanel .excel-verify-row>strong{font-size:14px!important;color:#303840!important;text-transform:none!important;letter-spacing:0!important}
      #excelVerifyPanel .excel-verify-value{font-size:15px!important;line-height:1.45!important}
      #excelVerifyPanel .excel-verify-value small{font-size:11px!important;margin-bottom:4px!important;color:#78818a!important}
      #excelVerifyPanel .excel-verify-match{font-size:12px!important;padding:7px 10px!important}
      #excelVerifyPanel .excel-verify-match.missing{background:#fde8ea!important;color:#a0001d!important;border:1px solid #efc7cd!important}
      #excelVerifyPanel .excel-verify-match.manual{background:#edf3f8!important;color:#365d78!important;border:1px solid #d6e2eb!important}
      #excelVerifyPanel .excel-verify-match.check{background:#fff1c9!important;color:#7c5800!important;border:1px solid #ead083!important}
      #excelVerifyPanel .excel-verify-match.ok{background:#e8f7ef!important;color:#116b45!important;border:1px solid #c6e6d5!important}
      .xve-guide{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px;padding:14px;border:1px solid #dce2e7;border-radius:13px;background:#f8fafb}
      .xve-guide-item{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.4}.xve-guide-dot{width:12px;height:12px;border-radius:50%;margin-top:3px;flex:0 0 auto}.xve-guide-item strong{display:block;font-size:13px}.xve-guide-item span{display:block;color:#69737c;font-size:12px;margin-top:2px}
      .xve-guide-dot.green{background:#22825b}.xve-guide-dot.yellow{background:#d19a18}.xve-guide-dot.red{background:#c6283e}
      .xve-missing-help{grid-column:1/-1;margin-top:4px;padding:10px 12px;border-radius:10px;background:#fff4f5;color:#8e2636;font-size:13px;line-height:1.45;border:1px solid #f0cdd2}
      .xve-editor{grid-column:1/-1;border-top:1px solid #e8ecef;margin-top:4px;padding-top:14px;display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:10px;align-items:end}
      .xve-editor label{font-size:13px;font-weight:800;color:#40484f}.xve-editor input,.xve-editor select,.xve-editor textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;min-height:46px;border:1px solid #cbd3da;border-radius:10px;background:#fff;padding:9px 11px;font:inherit;font-size:15px}.xve-editor textarea{min-height:74px;resize:vertical}
      .xve-editor-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.xve-btn{min-height:44px;border:1px solid #ccd4da;border-radius:10px;background:#fff;padding:9px 13px;font:inherit;font-size:13px;font-weight:850;cursor:pointer}.xve-btn.primary{background:#c8102e;border-color:#c8102e;color:#fff}.xve-btn.use{background:#eef6ff;border-color:#cbddec;color:#245f8a}.xve-btn.meals{background:#fff7ed;border-color:#ecd5b7;color:#8a4c00}.xve-btn:disabled{opacity:.55;cursor:not-allowed}
      .xve-row-message{grid-column:1/-1;font-size:12px;font-weight:800;min-height:17px;color:#68727a}.xve-row-message.success{color:#16794f}.xve-row-message.error{color:#a0001d}
      #excelVerifyPanel .excel-verify-details{font-size:14px!important}.excel-verify-detail{font-size:13px!important}.excel-verify-detail strong{font-size:12px!important}
      #excelVerifyPanel .excel-verify-warning{font-size:13px!important;padding:12px 14px!important}
      #excelVerifyPanel .excel-verify-note{font-size:14px!important;min-height:82px!important;padding:11px 12px!important}
      #excelVerifyPanel .excel-verify-button{font-size:13px!important;padding:10px 13px!important;min-height:44px!important}
      #excelVerifyPanel .excel-verify-action-status{font-size:12px!important}
      #excelVerifyPanel .ux-verify-nav span{font-size:13px!important}#excelVerifyPanel .ux-verify-nav button{font-size:13px!important;padding:9px 12px!important;min-height:42px}
      @media(max-width:850px){.xve-guide{grid-template-columns:1fr}.xve-editor{grid-template-columns:1fr}.xve-editor-actions{justify-content:flex-start}#excelVerifyPanel .excel-verify-row{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function addGuide(body) {
    if (!body || body.querySelector('.xve-guide')) return;
    const guide = document.createElement('div');
    guide.className = 'xve-guide';
    guide.innerHTML = `
      <div class="xve-guide-item"><i class="xve-guide-dot green"></i><div><strong>Verde · corretto</strong><span>Excel e gestionale coincidono: non devi fare nulla.</span></div></div>
      <div class="xve-guide-item"><i class="xve-guide-dot yellow"></i><div><strong>Giallo · da controllare</strong><span>I due valori sono diversi: puoi correggerli direttamente qui.</span></div></div>
      <div class="xve-guide-item"><i class="xve-guide-dot red"></i><div><strong>Rosso · dato mancante</strong><span>Il dato non è compilato. Puoi inserirlo adesso oppure lasciarlo vuoto.</span></div></div>
      <div class="xve-missing-help"><strong>Importante:</strong> un campo rosso non blocca l'accreditamento. Serve solo a farti vedere subito cosa manca. Se l'informazione non è necessaria o non è disponibile, puoi proseguire senza compilarla.</div>`;
    const sources = body.querySelector('.excel-verify-sources');
    if (sources) sources.insertAdjacentElement('afterend', guide);
    else body.prepend(guide);
  }

  function rowState(row) {
    const values = row.querySelectorAll('.excel-verify-value');
    const current = textOnly(values[0]);
    const excel = textOnly(values[1]);
    const currentMissing = isMissing(current);
    const excelMissing = isMissing(excel);
    const original = row.querySelector('.excel-verify-match');
    const originalCheck = original?.classList.contains('check');
    if (currentMissing) return { type:'missing', label:'Manca · facoltativo', current, excel, currentMissing, excelMissing };
    if (excelMissing) return { type:'manual', label:'Non presente in Excel', current, excel, currentMissing, excelMissing };
    if (originalCheck) return { type:'check', label:'Da correggere', current, excel, currentMissing, excelMissing };
    return { type:'ok', label:'✓ Corretto', current, excel, currentMissing, excelMissing };
  }

  async function savePersonViaForm(row, fieldId, value, kind = 'text') {
    const control = $(fieldId);
    const form = $('personForm');
    if (!control || !form) return false;
    if (kind === 'bool') control.checked = value === true || value === 'true' || value === 'si';
    else control.value = value || '';
    control.dispatchEvent(new Event(kind === 'bool' ? 'change' : 'input', { bubbles:true }));
    const msg = row.querySelector('.xve-row-message');
    if (msg) { msg.textContent = 'Salvataggio…'; msg.className = 'xve-row-message'; }
    form.requestSubmit();
    for (let i = 0; i < 30; i += 1) {
      await sleep(120);
      const text = $('personFormMessage')?.textContent || '';
      if (/salvat|aggiornat|modifiche salvate/i.test(text)) {
        if (msg) { msg.textContent = 'Dato salvato nel gestionale.'; msg.className = 'xve-row-message success'; }
        return true;
      }
      if (/errore|non riusc|già associato|modificata da un'altra/i.test(text)) {
        if (msg) { msg.textContent = text; msg.className = 'xve-row-message error'; }
        return false;
      }
    }
    if (msg) { msg.textContent = 'Dato aggiornato. Prosegui con la verifica.'; msg.className = 'xve-row-message success'; }
    return true;
  }

  function updateCurrentText(row, value) {
    const first = row.querySelectorAll('.excel-verify-value')[0];
    if (!first) return;
    const label = first.querySelector('small')?.outerHTML || '<small>Gestionale</small>';
    first.innerHTML = `${label}${value || '—'}`;
    enhanceRow(row, true);
  }

  function editorForDate(row, fieldId, excelText) {
    const currentIso = $(fieldId)?.value || '';
    const excelIso = dateToIso(excelText);
    const wrap = document.createElement('div');
    wrap.className = 'xve-editor';
    wrap.innerHTML = `<label>Correggi / completa manualmente<input class="xve-date" type="date" value="${currentIso}"></label><div class="xve-editor-actions">${excelIso ? '<button class="xve-btn use" type="button" data-use-excel>Usa valore Excel</button>' : ''}<button class="xve-btn primary" type="button" data-save>Salva dato</button></div><div class="xve-row-message"></div>`;
    if (excelIso) wrap.querySelector('[data-use-excel]').addEventListener('click', () => { wrap.querySelector('.xve-date').value = excelIso; });
    wrap.querySelector('[data-save]').addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      const value = wrap.querySelector('.xve-date').value;
      const ok = await savePersonViaForm(row, fieldId, value);
      e.currentTarget.disabled = false;
      if (ok) updateCurrentText(row, dateIt(value));
    });
    return wrap;
  }

  function editorForOvernight(row, excelText) {
    const current = !!$('personPernotto')?.checked;
    const excelNorm = String(excelText || '').trim().toLowerCase();
    const excelValue = ['sì','si','true','1','yes'].includes(excelNorm) ? 'true' : ['no','false','0'].includes(excelNorm) ? 'false' : '';
    const wrap = document.createElement('div');
    wrap.className = 'xve-editor';
    wrap.innerHTML = `<label>Pernottamento<select class="xve-select"><option value="false"${!current ? ' selected' : ''}>No</option><option value="true"${current ? ' selected' : ''}>Sì</option></select></label><div class="xve-editor-actions">${excelValue ? '<button class="xve-btn use" type="button" data-use-excel>Usa valore Excel</button>' : ''}<button class="xve-btn primary" type="button" data-save>Salva dato</button></div><div class="xve-row-message"></div>`;
    if (excelValue) wrap.querySelector('[data-use-excel]').addEventListener('click', () => { wrap.querySelector('.xve-select').value = excelValue; });
    wrap.querySelector('[data-save]').addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      const value = wrap.querySelector('.xve-select').value === 'true';
      const ok = await savePersonViaForm(row, 'personPernotto', value, 'bool');
      e.currentTarget.disabled = false;
      if (ok) updateCurrentText(row, value ? 'Sì' : 'No');
    });
    return wrap;
  }

  function editorForDietary(row, excelText) {
    const presentControl = $('personDietaryPresent');
    const descControl = $('personDietaryDescription');
    const currentPresent = !!presentControl?.checked;
    const currentDesc = descControl?.value || '';
    const excelAvailable = !isMissing(excelText) && !/^(nessuna|nessuno|no)$/i.test(excelText.trim());
    const wrap = document.createElement('div');
    wrap.className = 'xve-editor';
    wrap.innerHTML = `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:9px"><label>Esigenze<select class="xve-diet-present"><option value="no"${!currentPresent ? ' selected' : ''}>Nessuna</option><option value="si"${currentPresent ? ' selected' : ''}>Segnalata</option></select></label><label>Descrizione<input class="xve-diet-text" value="${String(currentDesc).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="Es. celiachia, lattosio…"></label></div><div class="xve-editor-actions">${excelAvailable ? '<button class="xve-btn use" type="button" data-use-excel>Usa testo Excel</button>' : ''}<button class="xve-btn primary" type="button" data-save>Salva dato</button></div><div class="xve-row-message"></div>`;
    if (excelAvailable) wrap.querySelector('[data-use-excel]').addEventListener('click', () => { wrap.querySelector('.xve-diet-present').value = 'si'; wrap.querySelector('.xve-diet-text').value = excelText; });
    wrap.querySelector('[data-save]').addEventListener('click', async e => {
      const present = wrap.querySelector('.xve-diet-present').value === 'si';
      const desc = wrap.querySelector('.xve-diet-text').value.trim();
      if (!presentControl || !descControl) {
        const msg = wrap.querySelector('.xve-row-message'); msg.textContent = 'Editor allergie non disponibile.'; msg.className = 'xve-row-message error'; return;
      }
      e.currentTarget.disabled = true;
      presentControl.checked = present;
      descControl.value = present ? desc : '';
      presentControl.dispatchEvent(new Event('change', { bubbles:true }));
      descControl.dispatchEvent(new Event('input', { bubbles:true }));
      descControl.dispatchEvent(new Event('blur', { bubbles:true }));
      await sleep(850);
      e.currentTarget.disabled = false;
      const msg = wrap.querySelector('.xve-row-message'); msg.textContent = 'Esigenza alimentare salvata e sincronizzata con Cucina.'; msg.className = 'xve-row-message success';
      updateCurrentText(row, present ? (desc || 'Presente') : 'Nessuna');
    });
    return wrap;
  }

  function editorForMeals() {
    const wrap = document.createElement('div');
    wrap.className = 'xve-editor';
    wrap.innerHTML = `<div><strong style="font-size:14px">Pasti</strong><div style="font-size:12px;color:#68727a;margin-top:4px">I ticket si gestiscono nel modulo Pasti per evitare errori con la Cucina.</div></div><div class="xve-editor-actions"><button class="xve-btn meals" type="button">🍽 Gestisci pasti</button></div>`;
    wrap.querySelector('button').addEventListener('click', () => $('excelVerifyMeals')?.click());
    return wrap;
  }

  function enhanceRow(row, force = false) {
    if (!row || (!force && row.dataset.xveEnhanced === '1')) return;
    row.dataset.xveEnhanced = '1';
    row.querySelector('.xve-editor')?.remove();
    const label = row.querySelector(':scope > strong')?.textContent?.trim() || '';
    const values = row.querySelectorAll('.excel-verify-value');
    const excelText = textOnly(values[1]);
    const state = rowState(row);
    const badge = row.querySelector('.excel-verify-match');
    if (badge) {
      badge.classList.remove('ok','check','info','missing','manual');
      badge.classList.add(state.type);
      badge.textContent = state.label;
    }
    row.classList.toggle('xve-missing-row', state.type === 'missing');

    let editor = null;
    if (label === 'Arrivo') editor = editorForDate(row, 'personArrival', excelText);
    else if (label === 'Partenza') editor = editorForDate(row, 'personDeparture', excelText);
    else if (label === 'Pernotto') editor = editorForOvernight(row, excelText);
    else if (label === 'Allergie') editor = editorForDietary(row, excelText);
    else if (label === 'Pasti') editor = editorForMeals();
    if (editor) row.appendChild(editor);

    if (state.type === 'missing') {
      const msg = row.querySelector('.xve-row-message');
      if (msg && !msg.textContent) msg.textContent = 'Dato mancante: puoi compilarlo ora oppure lasciarlo vuoto. Non blocca l’accreditamento.';
    } else if (state.type === 'check') {
      const msg = row.querySelector('.xve-row-message');
      if (msg && !msg.textContent) msg.textContent = 'I valori sono diversi: scegli quale dato mantenere oppure inseriscine uno corretto.';
    } else if (state.type === 'manual') {
      const msg = row.querySelector('.xve-row-message');
      if (msg && !msg.textContent) msg.textContent = 'L’Excel non contiene questo dato. Il valore manuale del gestionale può restare così.';
    }
  }

  function enhance() {
    if (enhancing) return;
    const body = $('excelVerifyBody');
    if (!body || !body.children.length) return;
    enhancing = true;
    try {
      addGuide(body);
      body.querySelectorAll('.excel-verify-row').forEach(row => enhanceRow(row));
    } finally { enhancing = false; }
  }

  async function init() {
    injectStyles();
    if (config && window.supabase) {
      client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    }
    for (let i = 0; i < 120; i += 1) {
      if ($('excelVerifyPanel')) break;
      await sleep(100);
    }
    const panel = $('excelVerifyPanel');
    if (!panel) return;
    observer = new MutationObserver(() => setTimeout(enhance, 30));
    observer.observe(panel, { childList:true, subtree:true });
    enhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
