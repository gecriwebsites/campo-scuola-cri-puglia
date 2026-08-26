(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_STORAGE_KEY = 'campo_scuola_segreteria_postazione';

  let client = null;
  let people = [];
  let tents = [];
  let beds = [];
  let typesByPerson = new Map();
  let selectedPerson = null;
  let observer = null;
  let busy = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const norm = value => String(value || '').trim().toLocaleLowerCase('it');
  const getStation = () => sessionStorage.getItem(STATION_STORAGE_KEY) || '';
  const fullName = p => `${p?.nome || ''} ${p?.cognome || ''}`.trim();

  function injectStyles() {
    if ($('overnightUxV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'overnightUxV1Styles';
    style.textContent = `
      /* =====================================================
         ALLOGGI UX V1 — PIANTA OPERATIVA
         ===================================================== */
      #overnightView.overnight-ux{max-width:none!important}
      #overnightView.overnight-ux .view-heading{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important;margin:8px 0 14px!important}
      #overnightView.overnight-ux .view-heading h2{margin:3px 0 4px!important;font-size:30px!important;letter-spacing:-.025em!important;color:#182834!important}
      #overnightView.overnight-ux .view-heading p{margin:0!important;font-size:12px!important;color:#687985!important}
      #overnightView.overnight-ux .overnight-realtime{display:inline-flex!important;margin-top:6px!important;padding:4px 6px!important;border:1px solid #d7e5dd!important;border-radius:4px!important;background:#f2f9f5!important;font-size:9px!important}
      #overnightView.overnight-ux #overnightRefresh{min-height:40px!important;border-radius:5px!important;padding:8px 12px!important;font-size:11px!important;box-shadow:none!important}

      #overnightView.overnight-ux .overnight-summary{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;margin:0 0 10px!important;border:1px solid #d5dde3!important;border-radius:7px!important;background:#fff!important;overflow:hidden!important}
      #overnightView.overnight-ux .overnight-summary-card{margin:0!important;padding:10px 13px!important;border:0!important;border-right:1px solid #e3e8ec!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
      #overnightView.overnight-ux .overnight-summary-card:last-child{border-right:0!important}
      #overnightView.overnight-ux .overnight-summary-card small{font-size:9px!important;text-transform:uppercase!important;letter-spacing:.06em!important;color:#72818c!important;font-weight:850!important}
      #overnightView.overnight-ux .overnight-summary-card strong{font-size:21px!important;margin-top:2px!important;color:#1d303d!important}
      #overnightView.overnight-ux .overnight-summary-card:last-child strong{color:#a74323!important}

      .overnight-quick{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:8px;align-items:start;margin:0 0 10px;padding:10px;border:1px solid #d5dde3;border-radius:7px;background:#fff}
      .overnight-quick-main{position:relative;min-width:0}.overnight-quick-label{display:block;margin-bottom:5px;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.065em;color:#71808b}
      .overnight-quick-search{display:flex;align-items:center;gap:8px;height:42px;border:1px solid #c9d2d9;border-radius:5px;background:#fff;padding:0 10px}
      .overnight-quick-search input{width:100%;height:40px;border:0;outline:0;background:transparent;font:inherit;font-size:12px;color:#2d414e}
      .overnight-quick-results{position:absolute;left:0;right:0;top:66px;z-index:25;display:grid;gap:3px;max-height:300px;overflow:auto;padding:5px;border:1px solid #ccd5dc;border-radius:5px;background:#fff;box-shadow:0 10px 28px rgba(18,32,42,.14)}
      .overnight-quick-results[hidden]{display:none!important}.overnight-quick-person{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;border-radius:4px;background:#fff;padding:8px 9px;text-align:left;font:inherit;cursor:pointer}.overnight-quick-person:hover{background:#f2f6f8}
      .overnight-quick-person strong{display:block;font-size:11px;color:#223844}.overnight-quick-person small{display:block;margin-top:2px;font-size:9px;color:#7a8892}.overnight-quick-person em{font-style:normal;font-size:9px;color:#526876;white-space:nowrap}
      .overnight-quick-state{min-width:290px;min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:17px;padding:7px 9px;border:1px solid #d9e1e6;border-radius:5px;background:#f8fafb;color:#526571;font-size:10px}
      .overnight-quick-state strong{font-size:10px;color:#2c424f}.overnight-quick-clear{border:1px solid #c5d0d8;background:#fff;border-radius:4px;padding:6px 8px;font:inherit;font-size:9px;font-weight:800;color:#455a67;cursor:pointer}
      .overnight-quick-help{grid-column:1/-1;font-size:9px;color:#778690}.overnight-quick-help b{color:#344b58}

      #overnightView.overnight-ux .overnight-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 320px!important;gap:10px!important;align-items:start!important}
      #overnightView.overnight-ux .tent-list{display:grid!important;gap:7px!important}
      #overnightView.overnight-ux .tent-card{margin:0!important;padding:12px!important;border:1px solid #d6dee4!important;border-left:4px solid #7f919d!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important}
      #overnightView.overnight-ux .tent-card.faculty{border-left-color:#7960a4!important}
      #overnightView.overnight-ux .tent-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;margin-bottom:9px!important}
      #overnightView.overnight-ux .tent-title{display:block!important}.tent-icon{display:none!important}
      #overnightView.overnight-ux .tent-title h3{margin:0!important;font-size:14px!important;color:#203542!important}.tent-title p{margin:3px 0 0!important;font-size:9px!important;color:#798791!important}
      #overnightView.overnight-ux .tent-controls{display:flex!important;gap:5px!important;align-items:center!important;flex-wrap:wrap!important;justify-content:flex-end!important}
      #overnightView.overnight-ux .tent-destination{height:34px!important;border-radius:4px!important;font-size:9px!important;padding:0 7px!important}
      #overnightView.overnight-ux .emergency-toggle{min-height:34px!important;border-radius:4px!important;padding:6px 8px!important;font-size:9px!important;box-shadow:none!important}
      #overnightView.overnight-ux .bed-grid{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:5px!important}
      #overnightView.overnight-ux .bed-slot{position:relative!important;min-width:0!important;min-height:68px!important;margin:0!important;padding:7px!important;border:1px solid #dfe5e9!important;border-radius:5px!important;background:#fafbfc!important;box-shadow:none!important;overflow:hidden!important}
      #overnightView.overnight-ux .bed-slot:hover:not(:disabled){border-color:#8aa0af!important;background:#f3f7f9!important}
      #overnightView.overnight-ux .bed-slot.occupied{border-color:#c9e0d4!important;background:#f0f8f4!important}.bed-slot.occupied strong{color:#176844!important}
      #overnightView.overnight-ux .bed-slot.emergency{border-style:dashed!important;border-color:#e5c77f!important;background:#fffaf0!important}.bed-slot.emergency.disabled{background:#f6f7f8!important;border-color:#dde2e6!important}
      #overnightView.overnight-ux .bed-slot strong{font-size:11px!important}.bed-slot small{display:block!important;font-size:8px!important;line-height:1.2!important;color:#74838d!important;white-space:normal!important;overflow-wrap:anywhere!important}
      #overnightView.overnight-ux .bed-badge{border-radius:3px!important;padding:2px 4px!important;font-size:7px!important}
      #overnightView.overnight-ux .overnight-help{margin-top:8px!important;padding:7px 8px!important;border-radius:4px!important;background:#f7f9fa!important;font-size:8px!important;line-height:1.4!important}

      #overnightView.overnight-ux .bed-slot.quick-compatible{border:2px solid #247953!important;background:#edf8f2!important;box-shadow:0 0 0 2px rgba(36,121,83,.08)!important;cursor:pointer!important}
      #overnightView.overnight-ux .bed-slot.quick-compatible::after{content:'ASSEGNA';position:absolute;right:4px;bottom:4px;padding:2px 4px;border-radius:3px;background:#247953;color:#fff;font-size:6px;font-weight:900;letter-spacing:.04em}
      #overnightView.overnight-ux .bed-slot.quick-incompatible:not(.occupied){opacity:.38!important}

      #overnightView.overnight-ux .overnight-side{display:grid!important;gap:8px!important;position:sticky!important;top:140px!important}
      #overnightView.overnight-ux .overnight-side-card{margin:0!important;padding:12px!important;border:1px solid #d6dee4!important;border-radius:6px!important;background:#fff!important;box-shadow:none!important}
      #overnightView.overnight-ux .overnight-side-card h3{margin:3px 0 5px!important;font-size:14px!important;color:#243945!important}.overnight-side-card>p{margin:0 0 9px!important;font-size:9px!important;line-height:1.4!important;color:#74828c!important}
      #overnightView.overnight-ux .unassigned-list{display:grid!important;gap:4px!important;max-height:430px!important}.unassigned-person{padding:7px 8px!important;border-radius:4px!important;background:#fafbfc!important}.unassigned-person strong{font-size:10px!important}.unassigned-person small{font-size:8px!important;line-height:1.3!important}.unassigned-person.warn{background:#fff9ec!important}
      #overnightView.overnight-ux .overnight-empty{padding:14px!important;font-size:9px!important}

      #overnightModal.overnight-ux-modal{padding:14px!important;background:rgba(18,27,34,.62)!important}
      #overnightModal.overnight-ux-modal .overnight-backdrop{backdrop-filter:blur(2px)!important}
      #overnightModal.overnight-ux-modal .overnight-modal-card{width:min(650px,calc(100vw - 28px))!important;max-height:calc(100dvh - 28px)!important;border:1px solid #cfd8df!important;border-radius:8px!important;padding:0 15px 15px!important;background:#fff!important;box-shadow:0 22px 65px rgba(11,22,30,.28)!important}
      #overnightModal.overnight-ux-modal .overnight-modal-head{position:sticky!important;top:0!important;z-index:3!important;margin:0 -15px!important;padding:13px 15px!important;border-bottom:1px solid #dde4e8!important;background:#fff!important}
      #overnightModal.overnight-ux-modal .overnight-modal-head h2{font-size:18px!important;margin:3px 0!important}.overnight-modal-head p{font-size:9px!important}
      #overnightModal.overnight-ux-modal .overnight-close{width:34px!important;height:34px!important;border-radius:4px!important;font-size:19px!important}
      #overnightModal.overnight-ux-modal .overnight-search{margin-top:12px!important;border-radius:5px!important;padding:0 9px!important}.overnight-search input{height:40px!important;font-size:10px!important}
      #overnightModal.overnight-ux-modal .overnight-candidates{gap:4px!important;margin-top:7px!important}.overnight-candidate{padding:8px!important;border-radius:5px!important}.overnight-candidate strong{font-size:10px!important}.overnight-candidate small{font-size:8px!important}.overnight-candidate button{border-radius:4px!important;padding:6px 8px!important;font-size:9px!important}
      #overnightModal.overnight-ux-modal .occupied-person-card{margin-top:12px!important;padding:10px!important;border-radius:5px!important}.occupied-person-card h3{font-size:14px!important}.occupied-person-card p{font-size:9px!important}
      #overnightModal.overnight-ux-modal .release-options{font-size:9px!important}.release-button{border-radius:4px!important;padding:8px 10px!important;font-size:9px!important}

      @media(max-width:1050px){#overnightView.overnight-ux .overnight-layout{grid-template-columns:1fr!important}#overnightView.overnight-ux .overnight-side{position:static!important;grid-template-columns:1fr 1fr!important}.overnight-quick{grid-template-columns:1fr!important}.overnight-quick-state{min-width:0!important;margin-top:0!important}.overnight-quick-help{grid-column:auto!important}}
      @media(max-width:760px){#overnightView.overnight-ux .overnight-summary{grid-template-columns:1fr 1fr!important}.overnight-summary-card:nth-child(2){border-right:0!important}.overnight-summary-card:nth-child(-n+2){border-bottom:1px solid #e3e8ec!important}#overnightView.overnight-ux .bed-grid{grid-template-columns:repeat(3,1fr)!important}#overnightView.overnight-ux .overnight-side{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function buildQuickUi() {
    const view = $('overnightView');
    if (!view || $('overnightQuickAssign')) return;
    const box = document.createElement('section');
    box.id = 'overnightQuickAssign';
    box.className = 'overnight-quick';
    box.innerHTML = `
      <div class="overnight-quick-main">
        <label class="overnight-quick-label" for="overnightQuickSearch">Assegna rapidamente una persona</label>
        <div class="overnight-quick-search"><span>⌕</span><input id="overnightQuickSearch" type="search" placeholder="Nome, cognome, Comitato o badge…" autocomplete="off"></div>
        <div id="overnightQuickResults" class="overnight-quick-results" hidden></div>
      </div>
      <div id="overnightQuickState" class="overnight-quick-state"><span>Nessuna persona selezionata</span></div>
      <div class="overnight-quick-help"><b>Uso rapido:</b> seleziona la persona e poi clicca uno dei posti evidenziati in verde. Il database continua a verificare compatibilità, Faculty e posti emergenza.</div>`;
    view.querySelector('.overnight-layout')?.insertAdjacentElement('beforebegin', box);

    $('overnightQuickSearch')?.addEventListener('input', renderQuickResults);
    $('overnightQuickResults')?.addEventListener('click', event => {
      const button = event.target.closest('[data-overnight-quick-person]');
      if (!button) return;
      selectedPerson = people.find(p => p.id === button.dataset.overnightQuickPerson) || null;
      $('overnightQuickSearch').value = selectedPerson ? fullName(selectedPerson) : '';
      $('overnightQuickResults').hidden = true;
      updateQuickState();
      applyBedHighlights();
    });
    $('overnightQuickState')?.addEventListener('click', event => {
      if (!event.target.closest('[data-clear-overnight-quick]')) return;
      clearQuickSelection();
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('#overnightQuickAssign')) $('overnightQuickResults')?.setAttribute('hidden','');
    });

    $('overnightTentList')?.addEventListener('click', handleQuickBedClick, true);
  }

  function renderQuickResults() {
    const out = $('overnightQuickResults');
    if (!out) return;
    const q = norm($('overnightQuickSearch')?.value);
    if (q.length < 2) { out.hidden = true; out.innerHTML = ''; return; }
    const assigned = new Set(beds.filter(b => b.persona_id).map(b => b.persona_id));
    const rows = people.filter(p => p.pernotto && !assigned.has(p.id) && norm(`${p.nome} ${p.cognome} ${p.comitato || ''} ${p.numero_badge || ''}`).includes(q)).slice(0,20);
    out.innerHTML = rows.map(p => `<button class="overnight-quick-person" type="button" data-overnight-quick-person="${p.id}"><span><strong>${esc(fullName(p))}</strong><small>${esc(p.comitato || 'Campo')} · ${p.settore_alloggio === 'uomo' ? 'Uomo' : p.settore_alloggio === 'donna' ? 'Donna' : 'Alloggio da definire'}</small></span><em>Seleziona</em></button>`).join('') || '<div class="overnight-empty">Nessuna persona da assegnare trovata.</div>';
    out.hidden = false;
  }

  function updateQuickState() {
    const state = $('overnightQuickState');
    if (!state) return;
    if (!selectedPerson) { state.innerHTML = '<span>Nessuna persona selezionata</span>'; return; }
    state.innerHTML = `<span><strong>${esc(fullName(selectedPerson))}</strong><br>${esc(selectedPerson.comitato || '')}</span><button class="overnight-quick-clear" type="button" data-clear-overnight-quick>Annulla</button>`;
  }

  function clearQuickSelection() {
    selectedPerson = null;
    if ($('overnightQuickSearch')) $('overnightQuickSearch').value = '';
    if ($('overnightQuickResults')) $('overnightQuickResults').hidden = true;
    updateQuickState();
    applyBedHighlights();
  }

  function compatible(person, tent) {
    if (!person || !tent || tent.destinazione === 'da_definire') return false;
    if (tent.destinazione === 'faculty') return (typesByPerson.get(person.id) || []).includes('docente');
    if (tent.destinazione === 'uomini') return person.settore_alloggio === 'uomo';
    if (tent.destinazione === 'donne') return person.settore_alloggio === 'donna';
    return false;
  }

  function applyBedHighlights() {
    document.querySelectorAll('#overnightTentList .bed-slot').forEach(btn => {
      btn.classList.remove('quick-compatible','quick-incompatible');
      if (!selectedPerson) return;
      const bed = beds.find(b => b.id === btn.dataset.bedId);
      const tent = bed ? tents.find(t => t.id === bed.tenda_id) : null;
      const free = !!bed && !bed.persona_id && bed.attivo !== false && (!bed.emergenza || tent?.posti_emergenza_attivi);
      if (free && compatible(selectedPerson,tent) && !btn.disabled) btn.classList.add('quick-compatible');
      else if (!bed?.persona_id) btn.classList.add('quick-incompatible');
    });
  }

  async function handleQuickBedClick(event) {
    if (!selectedPerson || busy) return;
    const button = event.target.closest('.bed-slot.quick-compatible[data-bed-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const bed = beds.find(b => b.id === button.dataset.bedId);
    if (!bed) return;
    busy = true;
    button.disabled = true;
    const { data, error } = await client.rpc('assegna_posto_letto', { p_persona_id:selectedPerson.id, p_posto_letto_id:bed.id, p_postazione:getStation() });
    busy = false;
    button.disabled = false;
    if (error || data?.status !== 'assegnato') {
      const msg = error?.message || ({
        settore_alloggio_da_definire:'Definisci prima Uomo/Donna nella scheda persona.',
        posto_occupato:'Il posto è stato appena occupato da un’altra postazione.',
        persona_gia_assegnata:'La persona ha già un posto assegnato.',
        posto_emergenza_non_attivo:'Il posto emergenza non è attivo.',
        tenda_da_configurare:'La tenda deve essere configurata prima.'
      }[data?.status] || 'Assegnazione non disponibile.');
      window.alert(msg);
      await loadMeta();
      return;
    }
    clearQuickSelection();
    $('overnightRefresh')?.click();
  }

  async function loadMeta() {
    if (!client) return;
    const [pRes,tRes,bRes,typeRes] = await Promise.all([
      client.from('persone').select('id,nome,cognome,comitato,numero_badge,pernotto,settore_alloggio,attivo').eq('attivo',true).order('cognome').order('nome'),
      client.from('tende').select('id,codice,nome,destinazione,posti_emergenza_attivi,attiva').eq('attiva',true),
      client.from('posti_letto').select('id,tenda_id,persona_id,emergenza,attivo'),
      client.from('persone_tipologie').select('persona_id,tipologia_codice').limit(5000)
    ]);
    if (pRes.error || tRes.error || bRes.error || typeRes.error) return;
    people = pRes.data || [];
    tents = tRes.data || [];
    beds = (bRes.data || []).filter(b => tents.some(t => t.id === b.tenda_id));
    typesByPerson = new Map();
    (typeRes.data || []).forEach(r => { const a=typesByPerson.get(r.persona_id)||[]; if(!a.includes(r.tipologia_codice))a.push(r.tipologia_codice); typesByPerson.set(r.persona_id,a); });
    if (selectedPerson) selectedPerson = people.find(p => p.id === selectedPerson.id) || null;
    updateQuickState();
    applyBedHighlights();
  }

  function observeRender() {
    const list = $('overnightTentList');
    if (!list || observer) return;
    observer = new MutationObserver(() => {
      clearTimeout(observeRender.timer);
      observeRender.timer = setTimeout(async () => { await loadMeta(); applyBedHighlights(); }, 30);
    });
    observer.observe(list,{childList:true,subtree:true});
  }

  async function init() {
    injectStyles();
    if (!config || !window.supabase) return;
    for (let i=0;i<120;i+=1) { if ($('overnightView') && $('overnightTentList')) break; await new Promise(r=>setTimeout(r,70)); }
    const view = $('overnightView');
    if (!view) return;
    view.classList.add('overnight-ux');
    const title = view.querySelector('.view-heading h2'); if (title) title.textContent = 'Alloggi';
    const sub = view.querySelector('.view-heading p'); if (sub) sub.textContent = 'Tende e posti letto: individua subito disponibilità, persone da sistemare e assegnazioni.';
    $('overnightModal')?.classList.add('overnight-ux-modal');
    client = window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth = await client.auth.getSession(); if (!auth.data?.session) return;
    buildQuickUi();
    await loadMeta();
    observeRender();
    $('overnightRefresh')?.addEventListener('click', () => setTimeout(loadMeta,80));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
