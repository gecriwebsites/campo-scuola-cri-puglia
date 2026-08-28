(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_KEY = 'campo_scuola_segreteria_postazione';

  let client = null;
  let session = null;
  let states = new Map();
  let currentFilter = 'all';
  let listObserver = null;
  let modalObserver = null;
  let realtime = null;
  let busy = false;
  let modalLoadToken = 0;

  const station = () => sessionStorage.getItem(STATION_KEY) || '';
  const activeView = () => document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view || '';
  const personId = () => String($('personId')?.value || '').trim() || null;

  function toast(message, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3400);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', {
      timeZone:'Europe/Rome', day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'
    }).format(d);
  }

  function injectStyles() {
    if ($('accreditFlowV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'accreditFlowV2Styles';
    style.textContent = `
      /* ACCREDITO: un solo flusso, senza vecchi riquadri concorrenti */
      #personModal.acc-quick-person #accreditFinalCard{display:none!important}
      #personModal.acc-quick-person #excelVerifyPanel{display:none!important}
      #accreditList .excel-verify-list-badge{display:none!important}

      .acc-flow-overview{margin:0 0 13px;border:1px solid #d6dfe5;border-radius:7px;background:#f8fafb;overflow:hidden}
      .acc-flow-overview-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 11px;border-bottom:1px solid #e3e9ed;background:#fff}
      .acc-flow-overview-head strong{display:block;font-size:12px;color:#243a47}.acc-flow-overview-head small{display:block;margin-top:2px;font-size:9px;color:#72818c}
      .acc-flow-verify-pill{display:inline-flex;padding:4px 6px;border-radius:3px;font-size:8px;font-weight:900;white-space:nowrap}
      .acc-flow-verify-pill.pending{background:#fff1cf;color:#805b00}.acc-flow-verify-pill.done{background:#e8f7ef;color:#116b45}.acc-flow-verify-pill.na{background:#edf1f4;color:#63717a}
      .acc-flow-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#e2e8ec}
      .acc-flow-data>div{min-width:0;padding:9px 10px;background:#fff}
      .acc-flow-data span{display:block;font-size:8px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#7a8993}
      .acc-flow-data strong{display:block;margin-top:3px;font-size:10px;line-height:1.35;color:#263b47;overflow-wrap:anywhere}
      .acc-flow-dietary{grid-column:1/-1!important}.acc-flow-dietary.warning{background:#fff7e8!important}.acc-flow-dietary.warning strong{color:#875200!important}.acc-flow-dietary.alert{background:#fff1f2!important}.acc-flow-dietary.alert strong{color:#a22238!important}
      .acc-flow-verify-action{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-top:1px solid #e3e9ed;background:#fff}
      .acc-flow-verify-action p{margin:0;font-size:9px;line-height:1.4;color:#687985}
      .acc-flow-verify-btn{flex:0 0 auto;border:0;border-radius:4px;background:#173b52;color:#fff;padding:8px 10px;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.acc-flow-verify-btn:disabled{opacity:.55;cursor:not-allowed}

      .acc-flow-final{display:block!important;margin:0 0 10px;padding:13px;border:1px solid #b9d9c7;border-radius:7px;background:#f4fbf7}
      .acc-flow-final h4{margin:0 0 4px;font-size:14px;color:#145f40}.acc-flow-final p{margin:0;font-size:10px;line-height:1.4;color:#587267}
      .acc-flow-final button{width:100%;min-height:50px;margin-top:10px;border:0;border-radius:5px;background:#14734c;color:#fff;padding:10px 12px;font:inherit;font-size:12px;font-weight:950;cursor:pointer}.acc-flow-final button:disabled{opacity:.55;cursor:not-allowed}
      .acc-flow-final.waiting{border-color:#e7ce91;background:#fffaf0}.acc-flow-final.waiting h4{color:#765300}.acc-flow-final.waiting button{background:#9a6b00}
      .acc-flow-final.done{border-color:#c9d7de;background:#f7f9fa}.acc-flow-final.done h4{color:#425965}.acc-flow-final.done button{display:none}
      .acc-flow-final-detail{display:block;margin-top:5px;font-size:9px;color:#70808a;font-weight:750}

      #accreditList .status-pill.acc-v2-pending{background:#fff0df!important;color:#98471f!important;border:1px solid #f0ccb3!important}
      #accreditList .status-pill.acc-v2-present{background:#e8f7ef!important;color:#126b46!important;border:1px solid #c4e4d2!important}
      #accreditList .status-pill.acc-v2-outside{background:#eaf2fb!important;color:#205f91!important;border:1px solid #cbddef!important}
      #accreditList .accredit-row.acc-is-accredited .accredit-open{font-size:0!important}
      #accreditList .accredit-row.acc-is-accredited .accredit-open::after{content:'Apri scheda';font-size:10px!important;font-weight:850!important}

      /* Se già accreditato, nella scheda Persone la vecchia verifica Excel non serve più. */
      #personModal.acc-flow-accredited #excelVerifyPanel{display:none!important}
      #personModal.acc-flow-accredited .person-verify-toggle{display:none!important}

      /* QR Entrata/Uscita anche dalla pagina Persone. */
      .people-qr-action{height:38px;border:1px solid #cbd5dc;border-radius:4px;background:#fff;padding:0 10px;font:inherit;font-size:9px;font-weight:900;color:#334d5b;cursor:pointer;white-space:nowrap}
      .people-qr-action:hover{border-color:#173b52;background:#f5f8fa}.people-qr-action.entry{color:#126b46}.people-qr-action.exit{color:#9b2f3f}

      @media(max-width:760px){.acc-flow-data{grid-template-columns:1fr 1fr}.acc-flow-verify-action{align-items:stretch;flex-direction:column}.acc-flow-verify-btn{width:100%}}
      @media(max-width:520px){.acc-flow-data{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function loadStates() {
    if (!client) return;
    const { data, error } = await client.from('persone')
      .select('id,presente,attivo,accreditato,accreditato_at,accreditato_postazione')
      .eq('attivo',true)
      .limit(2500);
    if (error) {
      console.warn('Accredito V2: stato non disponibile', error.message);
      return;
    }
    states = new Map((data || []).map(row => [String(row.id), row]));
    applyListState();
    updateSummary();
    applyModalAccreditedClass();
  }

  function updateSummary() {
    if (!states.size) return;
    const rows = [...states.values()];
    const total = rows.length;
    const accredited = rows.filter(x => x.accreditato === true).length;
    const present = rows.filter(x => x.presente === true).length;
    if ($('accUxTotal')) $('accUxTotal').textContent = String(total);
    if ($('accUxOutside')) $('accUxOutside').textContent = String(Math.max(0,total-accredited));
    if ($('accUxPresent')) $('accUxPresent').textContent = String(present);
  }

  function renameAccreditationUi() {
    const all = document.querySelector('[data-accredit-filter="all"]');
    const pending = document.querySelector('[data-accredit-filter="outside"]');
    const accredited = document.querySelector('[data-accredit-filter="present"]');
    if (all) all.textContent = 'Tutti';
    if (pending) pending.textContent = 'Da accreditare';
    if (accredited) accredited.textContent = 'Accreditati';

    const flow = $('accUxFlow');
    if (flow) {
      const items = flow.querySelectorAll(':scope > div');
      if (items[0]) items[0].innerHTML = '<b>1</b><span><strong>Cerca la persona</strong><br>Apri accredito</span>';
      if (items[1]) items[1].innerHTML = '<b>2</b><span><strong>Verifica e prepara</strong><br>Dati, alloggio, allergie, badge e QR</span>';
      if (items[2]) items[2].innerHTML = '<b>3</b><span><strong>Conferma accredito</strong><br>Salva tutto + registra entrata</span>';
    }
  }

  function applyListState() {
    renameAccreditationUi();
    const rows = [...document.querySelectorAll('#accreditList .accredit-row')];
    rows.forEach(row => {
      const button = row.querySelector('.accredit-open');
      const id = button?.dataset.personId;
      const st = id ? states.get(String(id)) : null;
      if (!button || !st) return;
      const accredited = st.accreditato === true;
      row.classList.toggle('acc-is-accredited', accredited);
      const pill = row.querySelector('.status-pill');
      if (pill) {
        pill.classList.remove('present','outside','acc-v2-pending','acc-v2-present','acc-v2-outside');
        if (!accredited) {
          pill.classList.add('acc-v2-pending');
          pill.textContent = 'Da accreditare';
        } else if (st.presente === true) {
          pill.classList.add('acc-v2-present');
          pill.textContent = '✓ Accreditato · Presente';
        } else {
          pill.classList.add('acc-v2-outside');
          pill.textContent = '✓ Accreditato · Fuori';
        }
      }
      let show = true;
      if (currentFilter === 'pending') show = !accredited;
      if (currentFilter === 'accredited') show = accredited;
      row.hidden = !show;
    });
  }

  function bindAccreditationFilters() {
    document.addEventListener('click', event => {
      const btn = event.target.closest('[data-accredit-filter]');
      if (!btn) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const raw = btn.dataset.accreditFilter;
      currentFilter = raw === 'outside' ? 'pending' : raw === 'present' ? 'accredited' : 'all';
      document.querySelectorAll('[data-accredit-filter]').forEach(x => x.classList.toggle('active',x === btn));
      applyListState();
    }, true);
  }

  async function verificationState(id) {
    const { data, error } = await client.from('verifiche_accreditamento_persona')
      .select('stato,verificato_at,verificato_postazione')
      .eq('persona_id',id)
      .maybeSingle();
    if (error || !data) return { required:false, state:null, verifiedAt:null };
    return { required:true, state:data.stato || 'da_verificare', verifiedAt:data.verificato_at || null, station:data.verificato_postazione || null };
  }

  async function accommodation(id) {
    const { data:bed } = await client.from('posti_letto')
      .select('codice_posto,tenda_id')
      .eq('persona_id',id)
      .maybeSingle();
    if (!bed) return null;
    const { data:tent } = await client.from('tende').select('codice,nome').eq('id',bed.tenda_id).maybeSingle();
    return { tent:tent?.codice || tent?.nome || 'Tenda', bed:bed.codice_posto || '' };
  }

  async function dietary(id) {
    const { data } = await client.from('esigenze_alimentari').select('presente,descrizione').eq('persona_id',id).maybeSingle();
    return data || null;
  }

  function currentCourseText() {
    const node = $('personCourses');
    if (!node || node.hidden) return 'Nessun corso associato';
    return String(node.textContent || '').replace(/\s+/g,' ').trim() || 'Nessun corso associato';
  }

  function ensureOverview() {
    const quick = $('accQuickMain');
    if (!quick) return null;
    let box = $('accFlowOverview');
    if (!box) {
      box = document.createElement('section');
      box.id = 'accFlowOverview';
      box.className = 'acc-flow-overview';
      const head = quick.querySelector('.acc-quick-head');
      if (head) head.insertAdjacentElement('afterend',box);
      else quick.prepend(box);
    }
    return box;
  }

  function ensureFinalCard() {
    const side = document.querySelector('#personModal .person-ux-side');
    if (!side) return null;
    let card = $('accFlowFinal');
    if (!card) {
      card = document.createElement('section');
      card.id = 'accFlowFinal';
      card.className = 'acc-flow-final';
      const material = $('accQuickMaterial');
      if (material) material.insertAdjacentElement('afterend',card);
      else side.appendChild(card);
    }
    return card;
  }

  function renderFinal(state, verification) {
    const card = ensureFinalCard();
    if (!card) return;
    if (state?.accreditato === true) {
      card.className = 'acc-flow-final done';
      card.innerHTML = `<h4>✓ Persona già accreditata</h4><p>L’accredito iniziale è concluso. Da ora gestisci soltanto entrate e uscite.</p><span class="acc-flow-final-detail">${esc([state.accreditato_at ? `Accreditato ${formatDateTime(state.accreditato_at)}` : '', state.accreditato_postazione || '', state.presente ? 'Presente' : 'Fuori dal Campo'].filter(Boolean).join(' · '))}</span>`;
      return;
    }
    const verified = !verification.required || verification.state === 'verificato';
    card.className = `acc-flow-final${verified ? '' : ' waiting'}`;
    card.innerHTML = `<h4>${verified ? 'Pronto per completare l’accredito' : 'Completa prima la verifica dei dati'}</h4><p>${verified ? 'Salva la scheda, attiva il QR, registra l’accredito e l’entrata, poi chiude automaticamente questa finestra.' : 'Confronta i dati con la persona e premi “Dati verificati” nella prima parte della scheda.'}</p><button id="accFlowConfirm" type="button" ${verified ? '' : 'disabled'}>✓ CONFERMA ACCREDITO</button>`;
    $('accFlowConfirm')?.addEventListener('click', confirmAccreditation);
  }

  async function renderModalFlow() {
    const token = ++modalLoadToken;
    const modal = $('personModal');
    const id = personId();
    if (!modal || modal.hidden || !id) return;

    const state = states.get(String(id)) || null;
    modal.classList.toggle('acc-flow-accredited', state?.accreditato === true);

    /* In Persone non trasformiamo la scheda: nascondiamo solo la verifica se già accreditato. */
    if (activeView() !== 'accreditamento') return;

    for (let i=0;i<30 && !$('accQuickMain');i+=1) await new Promise(r => setTimeout(r,60));
    if (token !== modalLoadToken || modal.hidden || personId() !== id) return;

    const [verification, lodging, food] = await Promise.all([
      verificationState(id), accommodation(id), dietary(id)
    ]);
    if (token !== modalLoadToken || modal.hidden || personId() !== id) return;

    const currentState = states.get(String(id)) || state;
    const box = ensureOverview();
    if (box) {
      const verified = !verification.required || verification.state === 'verificato';
      const foodText = food?.presente ? (food.descrizione || 'Esigenza alimentare segnalata') : 'Nessuna allergia/intolleranza segnalata';
      const lodgingText = lodging ? `${lodging.tent}${lodging.bed ? ` · Posto ${lodging.bed}` : ''}` : ($('personPernotto')?.checked ? 'Pernottamento previsto · posto non assegnato' : 'Nessun pernottamento previsto');
      const verifyClass = !verification.required ? 'na' : verified ? 'done' : 'pending';
      const verifyText = !verification.required ? 'Verifica non richiesta' : verified ? '✓ Dati verificati' : '⚠ Da verificare';
      box.innerHTML = `
        <div class="acc-flow-overview-head"><div><strong>1 · Controllo dati prima dell’accredito</strong><small>Confronta queste informazioni con la persona davanti a te.</small></div><span class="acc-flow-verify-pill ${verifyClass}">${verifyText}</span></div>
        <div class="acc-flow-data">
          <div><span>Nome e cognome</span><strong>${esc(`${$('personNome')?.value || ''} ${$('personCognome')?.value || ''}`.trim() || '—')}</strong></div>
          <div><span>Codice fiscale</span><strong>${esc($('personCf')?.value || '—')}</strong></div>
          <div><span>Comitato</span><strong>${esc($('personComitato')?.value || '—')}</strong></div>
          <div><span>Telefono</span><strong>${esc($('personTelefono')?.value || '—')}</strong></div>
          <div><span>Corso / ruolo</span><strong>${esc(currentCourseText())}</strong></div>
          <div><span>Alloggio</span><strong>${esc(lodgingText)}</strong></div>
          <div class="acc-flow-dietary ${food?.presente ? 'alert' : ''}"><span>Allergie / intolleranze</span><strong>${esc(foodText)}</strong></div>
        </div>
        ${verification.required ? `<div class="acc-flow-verify-action"><p>${verified ? `Verifica completata${verification.verifiedAt ? ` il ${esc(formatDateTime(verification.verifiedAt))}` : ''}.` : 'Dopo aver controllato i dati con la persona, conferma qui la verifica.'}</p><button id="accFlowVerify" class="acc-flow-verify-btn" type="button" ${verified ? 'disabled' : ''}>${verified ? '✓ DATI VERIFICATI' : '✓ CONFERMA DATI VERIFICATI'}</button></div>` : ''}`;
      $('accFlowVerify')?.addEventListener('click', confirmVerification);
    }
    renderFinal(currentState,verification);
  }

  async function confirmVerification() {
    if (busy) return;
    const id = personId();
    if (!id) return;
    const btn = $('accFlowVerify');
    if (btn) { btn.disabled = true; btn.textContent = 'SALVATAGGIO…'; }
    const { data, error } = await client.rpc('conferma_verifica_accreditamento', {
      p_persona_id:id,
      p_note:null,
      p_postazione:station() || null
    });
    if (error || data?.status !== 'verificato') {
      if (btn) { btn.disabled = false; btn.textContent = '✓ CONFERMA DATI VERIFICATI'; }
      toast(`Verifica non salvata: ${error?.message || data?.status || 'errore'}`,'error');
      return;
    }
    toast('✓ Dati verificati. Ora puoi confermare l’accredito.','success');
    await renderModalFlow();
  }

  function waitForFormSave() {
    const form = $('personForm');
    const message = $('personFormMessage');
    if (!form || !message) return Promise.reject(new Error('Scheda persona non disponibile.'));
    return new Promise((resolve,reject) => {
      let done = false;
      const finish = (fn,value) => {
        if (done) return;
        done = true;
        obs.disconnect();
        clearTimeout(timer);
        fn(value);
      };
      const check = () => {
        const txt = String(message.textContent || '').trim();
        if (message.classList.contains('error') && txt) finish(reject,new Error(txt));
        else if (message.classList.contains('success') && /salvat|aggiornat/i.test(txt)) finish(resolve,true);
      };
      const obs = new MutationObserver(check);
      obs.observe(message,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
      const timer = setTimeout(() => finish(reject,new Error('Il salvataggio della scheda non è stato confermato.')),9000);
      form.requestSubmit();
      setTimeout(check,80);
    });
  }

  async function confirmAccreditation() {
    if (busy) return;
    const id = personId();
    if (!id) return;
    busy = true;
    const button = $('accFlowConfirm');
    if (button) { button.disabled = true; button.textContent = 'ACCREDITO IN CORSO…'; }
    try {
      const verification = await verificationState(id);
      if (verification.required && verification.state !== 'verificato') throw new Error('Conferma prima la verifica dei dati.');

      const qr = $('personQrActive');
      if (qr) qr.checked = true;
      await waitForFormSave();

      const { data:acc, error:accError } = await client.rpc('conferma_accreditamento_persona', {
        p_persona_id:id,
        p_postazione:station() || null
      });
      if (accError) throw accError;
      if (!['accreditato','gia_accreditato'].includes(acc?.status)) throw new Error(acc?.status === 'verifica_necessaria' ? 'Conferma prima la verifica dei dati.' : `Accredito non completato (${acc?.status || 'errore'}).`);

      const { data:move, error:moveError } = await client.rpc('registra_movimento_persona_sicuro', {
        p_persona_id:id,
        p_tipo:'entrata',
        p_postazione:station() || null
      });
      if (moveError) throw new Error(`Accredito salvato, ma entrata non registrata: ${moveError.message}`);
      if (!['registrato','gia_presente'].includes(move?.status)) throw new Error(`Accredito salvato, ma entrata non registrata (${move?.status || 'errore'}).`);

      await loadStates();
      toast('✓ Accredito completato, dati salvati e ingresso registrato.','success');
      setTimeout(() => document.querySelector('#personModal [data-close-person]')?.click(),220);
    } catch (error) {
      toast(error.message || String(error),'error');
      await renderModalFlow();
    } finally {
      busy = false;
    }
  }

  function applyModalAccreditedClass() {
    const modal = $('personModal');
    const id = personId();
    if (!modal || modal.hidden || !id) return;
    modal.classList.toggle('acc-flow-accredited', states.get(String(id))?.accreditato === true);
  }

  async function scanMovement(type) {
    if (!window.CampoQrScanner?.open) { toast('Scanner QR non disponibile.','error'); return; }
    try {
      await window.CampoQrScanner.open({
        title:type === 'entrata' ? 'QR Entrata' : 'QR Uscita',
        subtitle:`Inquadra il QR personale per registrare ${type === 'entrata' ? 'l’ingresso' : 'l’uscita'} dal Campo.`,
        onScan:async token => {
          const uuid = String(token || '').trim();
          const { data, error } = await client.rpc('registra_movimento_persona_qr', { p_qr_token:uuid, p_tipo:type, p_postazione:station() || null });
          if (error) { toast(`Movimento non registrato: ${error.message}`,'error'); return; }
          if (data?.status === 'registrato') toast(`${data.nome || ''} ${data.cognome || ''}: ${type === 'entrata' ? 'ENTRATA' : 'USCITA'} registrata.`,'success');
          else if (data?.status === 'gia_presente') toast('Persona già presente.','error');
          else if (data?.status === 'gia_fuori') toast('Persona già fuori dal Campo.','error');
          else toast('QR non valido o non attivo.','error');
          await loadStates();
        }
      });
    } catch (error) { toast(error.message || String(error),'error'); }
  }

  function injectPeopleQrButtons() {
    const toolbar = document.querySelector('[data-view-panel="persone"] .data-toolbar');
    if (!toolbar || $('peopleQrEntry')) return;
    const entry = document.createElement('button');
    entry.id = 'peopleQrEntry'; entry.type = 'button'; entry.className = 'people-qr-action entry'; entry.textContent = '▣ QR ENTRATA';
    const exit = document.createElement('button');
    exit.id = 'peopleQrExit'; exit.type = 'button'; exit.className = 'people-qr-action exit'; exit.textContent = '▣ QR USCITA';
    entry.addEventListener('click',() => scanMovement('entrata'));
    exit.addEventListener('click',() => scanMovement('uscita'));
    toolbar.append(entry,exit);
  }

  function connectRealtime() {
    realtime = client.channel('campo-accredito-v2');
    realtime
      .on('postgres_changes',{event:'*',schema:'public',table:'persone'},() => setTimeout(loadStates,120))
      .on('postgres_changes',{event:'*',schema:'public',table:'verifiche_accreditamento_persona'},() => setTimeout(renderModalFlow,120))
      .on('postgres_changes',{event:'*',schema:'public',table:'esigenze_alimentari'},() => setTimeout(renderModalFlow,120))
      .on('postgres_changes',{event:'*',schema:'public',table:'posti_letto'},() => setTimeout(renderModalFlow,120))
      .subscribe();
  }

  async function init() {
    injectStyles();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth = await client.auth.getSession();
    session = auth.data?.session || null;
    if (!session) return;
    const profile = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (profile.error || !profile.data?.attivo || !['admin','segreteria'].includes(profile.data.ruolo)) return;

    for (let i=0;i<100 && !$('personModal');i+=1) await new Promise(r => setTimeout(r,50));
    injectPeopleQrButtons();
    renameAccreditationUi();
    bindAccreditationFilters();
    await loadStates();
    connectRealtime();

    const list = $('accreditList');
    if (list) {
      listObserver = new MutationObserver(() => setTimeout(applyListState,20));
      listObserver.observe(list,{childList:true,subtree:false});
    }

    const modal = $('personModal');
    if (modal) {
      modalObserver = new MutationObserver(() => {
        if (!modal.hidden) {
          setTimeout(applyModalAccreditedClass,35);
          setTimeout(renderModalFlow,90);
        }
      });
      modalObserver.observe(modal,{attributes:true,attributeFilter:['hidden']});
    }

    document.addEventListener('click',event => {
      if (event.target.closest('.app-nav-btn[data-view="accreditamento"]')) setTimeout(() => { renameAccreditationUi(); applyListState(); },80);
      if (event.target.closest('#excelVerifyConfirm') || event.target.closest('#excelVerifyReopen')) setTimeout(renderModalFlow,250);
    });

    for (let i=1;i<=8;i+=1) setTimeout(() => { injectPeopleQrButtons(); renameAccreditationUi(); applyListState(); },i*180);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
