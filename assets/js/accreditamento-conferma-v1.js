(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  const STATION_KEY = 'campo_scuola_segreteria_postazione';

  let client = null;
  let session = null;
  let profile = null;
  let schemaReady = true;
  let states = new Map();
  let currentFilter = 'all';
  let modalObserver = null;
  let metricObserver = null;
  let realtimeChannel = null;
  let busy = false;

  const station = () => sessionStorage.getItem(STATION_KEY) || '';
  const activeView = () => document.querySelector('#standardWorkspace .app-nav-btn.active')?.dataset.view || '';

  function toast(message, type='') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3600);
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
    if ($('accreditFinalV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'accreditFinalV1Styles';
    style.textContent = `
      .accredit-final-card{display:block!important;margin:0 0 10px;padding:13px;border:1px solid #cbd9e2;border-radius:7px;background:#fff;box-sizing:border-box}
      .accredit-final-card .acc-final-kicker{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#758590}
      .accredit-final-card h4{margin:3px 0 4px;font-size:14px;color:#203640}.accredit-final-card p{margin:0;font-size:10px;line-height:1.4;color:#6e7e88}
      .accredit-final-button{width:100%;min-height:48px;margin-top:10px;border:0;border-radius:5px;background:#14734c;color:#fff;padding:9px 12px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;box-shadow:none}
      .accredit-final-button:hover{background:#105f3f}.accredit-final-button:disabled{cursor:not-allowed;opacity:.72}
      .accredit-final-card.warn{border-color:#e9cf91;background:#fffaf0}.accredit-final-card.warn h4{color:#765300}.accredit-final-card.warn .accredit-final-button{background:#9b6a00}
      .accredit-final-card.done{border-color:#bcdcca;background:#f3fbf6}.accredit-final-card.done h4{color:#126b46}.accredit-final-card.done .accredit-final-button{background:#e4f4ea;color:#126b46;border:1px solid #bcdcca}
      .accredit-final-card.error{border-color:#e2b8bf;background:#fff7f8}.accredit-final-card.error h4{color:#9c1d34}.accredit-final-card.error .accredit-final-button{background:#8f2438}
      .acc-final-detail{display:block;margin-top:6px;font-size:9px;font-weight:750;color:#627580}

      #accreditList .status-pill.acc-final-pending{background:#fff0df!important;color:#98471f!important;border:1px solid #f0ccb3!important}
      #accreditList .status-pill.acc-final-accredited-present{background:#e8f7ef!important;color:#126b46!important;border:1px solid #c4e4d2!important}
      #accreditList .status-pill.acc-final-accredited-outside{background:#eaf2fb!important;color:#205f91!important;border:1px solid #cbddef!important}
      #accreditList .accredit-open.acc-final-accredited{font-size:0!important}
      #accreditList .accredit-open.acc-final-accredited::after{content:'Apri scheda';font-size:10px!important;font-weight:850!important}
    `;
    document.head.appendChild(style);
  }

  async function loadStates() {
    if (!client) return false;
    const { data, error } = await client.from('persone')
      .select('id,presente,attivo,accreditato,accreditato_at,accreditato_postazione')
      .eq('attivo', true)
      .limit(2500);

    if (error) {
      if (/accreditato|column/i.test(error.message || '')) schemaReady = false;
      return false;
    }

    schemaReady = true;
    states = new Map((data || []).map(row => [String(row.id), row]));
    applyListState();
    updateSummary();
    return true;
  }

  function updateSummary() {
    if (!schemaReady || !states.size) return;
    const all = [...states.values()];
    const total = all.length;
    const accredited = all.filter(x => x.accreditato === true).length;
    const present = all.filter(x => x.presente === true).length;
    if ($('accUxTotal')) $('accUxTotal').textContent = String(total);
    if ($('accUxOutside')) $('accUxOutside').textContent = String(Math.max(0,total-accredited));
    if ($('accUxPresent')) $('accUxPresent').textContent = String(present);
  }

  function renameFilters() {
    const all = document.querySelector('[data-accredit-filter="all"]');
    const pending = document.querySelector('[data-accredit-filter="outside"]');
    const accredited = document.querySelector('[data-accredit-filter="present"]');
    if (all) all.textContent = 'Tutti';
    if (pending) pending.textContent = 'Da accreditare';
    if (accredited) accredited.textContent = 'Accreditati';
  }

  function applyFilter(rows) {
    rows.forEach(row => {
      const personId = row.querySelector('[data-person-id]')?.dataset.personId;
      const state = personId ? states.get(String(personId)) : null;
      let show = true;
      if (currentFilter === 'pending') show = !state?.accreditato;
      if (currentFilter === 'accredited') show = state?.accreditato === true;
      row.hidden = !show;
    });
  }

  function applyListState() {
    if (!schemaReady) return;
    const rows = [...document.querySelectorAll('#accreditList .accredit-row')];
    rows.forEach(row => {
      const button = row.querySelector('.accredit-open');
      const personId = button?.dataset.personId;
      const state = personId ? states.get(String(personId)) : null;
      if (!button || !state) return;

      const pill = row.querySelector('.status-pill');
      button.classList.toggle('acc-final-accredited', state.accreditato === true);
      if (pill) {
        pill.classList.remove('present','outside','acc-final-pending','acc-final-accredited-present','acc-final-accredited-outside');
        if (state.accreditato === true && state.presente === true) {
          pill.classList.add('acc-final-accredited-present');
          pill.textContent = '✓ Accreditato · Presente';
        } else if (state.accreditato === true) {
          pill.classList.add('acc-final-accredited-outside');
          pill.textContent = '✓ Accreditato · Fuori';
        } else {
          pill.classList.add('acc-final-pending');
          pill.textContent = 'Da accreditare';
        }
      }
    });
    applyFilter(rows);
  }

  async function verificationState(personId) {
    const { data, error } = await client.from('verifiche_accreditamento_persona')
      .select('stato,verificato_at')
      .eq('persona_id', personId)
      .maybeSingle();
    if (error) return { required:false, state:null };
    return data ? { required:true, state:data.stato || 'da_verificare', verifiedAt:data.verificato_at || null } : { required:false, state:null };
  }

  function ensureCard() {
    const side = document.querySelector('#personModal .person-ux-side');
    if (!side) return null;
    let card = $('accreditFinalCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'accreditFinalCard';
      card.className = 'accredit-final-card';
      card.innerHTML = `
        <div class="acc-final-kicker">Chiusura accredito</div>
        <h4 id="accreditFinalTitle">Stato accredito</h4>
        <p id="accreditFinalText">Caricamento…</p>
        <span id="accreditFinalDetail" class="acc-final-detail"></span>
        <button id="accreditFinalButton" class="accredit-final-button" type="button">Attendi…</button>`;
      const material = $('accQuickMaterial');
      const operational = side.querySelector('.person-ux-operational-card');
      if (material) material.insertAdjacentElement('afterend', card);
      else if (operational) operational.insertAdjacentElement('afterend', card);
      else side.prepend(card);
      $('accreditFinalButton')?.addEventListener('click', onFinalAction);
    }
    return card;
  }

  function setCard(kind, title, text, buttonText, disabled=false, detail='') {
    const card = ensureCard();
    if (!card) return;
    card.className = `accredit-final-card${kind ? ` ${kind}` : ''}`;
    if ($('accreditFinalTitle')) $('accreditFinalTitle').textContent = title;
    if ($('accreditFinalText')) $('accreditFinalText').textContent = text;
    if ($('accreditFinalDetail')) $('accreditFinalDetail').textContent = detail;
    const btn = $('accreditFinalButton');
    if (btn) { btn.textContent = buttonText; btn.disabled = disabled || busy; btn.dataset.action = kind === 'warn' ? 'verify' : kind === 'done' ? 'done' : kind === 'error' ? 'setup' : 'confirm'; }
  }

  async function refreshModalState() {
    const modal = $('personModal');
    const personId = String($('personId')?.value || '').trim();
    if (!modal || modal.hidden || !personId || activeView() !== 'accreditamento') return;

    ensureCard();
    if (!schemaReady) {
      setCard('error','Accredito da configurare','Prima di usare il nuovo accredito esegui lo script SQL dedicato in Supabase.','Configurazione richiesta',true,'supabase/step-accreditamento-definitivo.sql');
      return;
    }

    const [{ data:person, error }, verification] = await Promise.all([
      client.from('persone').select('id,presente,accreditato,accreditato_at,accreditato_postazione').eq('id',personId).maybeSingle(),
      verificationState(personId)
    ]);
    if (error || !person) return;

    states.set(String(person.id),person);
    applyListState();
    updateSummary();

    if (person.accreditato === true) {
      const detail = [person.accreditato_at ? `Accreditato ${formatDateTime(person.accreditato_at)}` : '', person.accreditato_postazione || '', person.presente ? 'Attualmente presente' : 'Attualmente fuori dal Campo'].filter(Boolean).join(' · ');
      setCard('done','✓ Accredito completato','Questa persona è già stata accreditata. Le successive entrate e uscite non annullano l’accredito.','✓ ACCREDITO COMPLETATO',true,detail);
      return;
    }

    if (verification.required && verification.state !== 'verificato') {
      setCard('warn','Prima verifica i dati','La persona proviene da un’importazione. Completa il confronto dei dati prima di chiudere l’accredito.','APRI VERIFICA DATI',false,'Dopo la verifica il pulsante diventerà “Conferma accredito”.');
      return;
    }

    setCard('','Pronto per l’accredito','Conferma dopo aver controllato i dati e le spunte di badge/gadget. Il QR viene attivato e viene registrato l’ingresso.','✓ CONFERMA ACCREDITO',false, verification.required ? 'Verifica dati completata.' : 'Persona inserita manualmente: verifica Excel non richiesta.');
  }

  async function openVerification() {
    if ($('accQuickFullSheet')) $('accQuickFullSheet').click();
    for (let i=0;i<25;i+=1) {
      const panel = $('excelVerifyPanel');
      if (panel && !panel.hidden) {
        panel.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      await new Promise(resolve => setTimeout(resolve,100));
    }
    toast('Apri la scheda completa e completa “Dati importati”.','error');
  }

  function waitForSave() {
    const form = $('personForm');
    const message = $('personFormMessage');
    if (!form || !message) return Promise.reject(new Error('Scheda persona non disponibile.'));

    return new Promise((resolve,reject) => {
      let finished = false;
      const finish = (fn,value) => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        clearTimeout(timer);
        fn(value);
      };
      const check = () => {
        const text = String(message.textContent || '').trim();
        if (message.classList.contains('error') && text) finish(reject,new Error(text));
        else if (message.classList.contains('success') && /salvat|aggiornat/i.test(text)) finish(resolve,true);
      };
      const observer = new MutationObserver(check);
      observer.observe(message,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
      const timer = setTimeout(() => finish(reject,new Error('Salvataggio della scheda non confermato.')),9000);
      form.requestSubmit();
      setTimeout(check,50);
    });
  }

  async function confirmAccreditation() {
    if (busy) return;
    const personId = String($('personId')?.value || '').trim();
    if (!personId) return;
    busy = true;
    setCard('','Accredito in corso','Salvataggio dati e registrazione dell’ingresso…','ATTENDI…',true);

    try {
      const verification = await verificationState(personId);
      if (verification.required && verification.state !== 'verificato') {
        await openVerification();
        throw new Error('Completa prima la verifica dei dati importati.');
      }

      const qr = $('personQrActive');
      if (qr && !qr.checked) qr.checked = true;

      await waitForSave();

      const { data:acc, error:accError } = await client.rpc('conferma_accreditamento_persona', {
        p_persona_id:personId,
        p_postazione:station() || null
      });
      if (accError) throw accError;
      if (!['accreditato','gia_accreditato'].includes(acc?.status)) {
        if (acc?.status === 'verifica_necessaria') throw new Error('Completa prima la verifica dei dati importati.');
        throw new Error(`Accredito non completato: ${acc?.status || 'errore'}`);
      }

      const { data:movement, error:movementError } = await client.rpc('registra_movimento_persona_sicuro', {
        p_persona_id:personId,
        p_tipo:'entrata',
        p_postazione:station() || null
      });
      if (movementError) throw new Error(`Accredito salvato, ma entrata non registrata: ${movementError.message}`);
      if (!['registrato','gia_presente'].includes(movement?.status)) throw new Error(`Accredito salvato, ma entrata non registrata (${movement?.status || 'errore'}).`);

      try {
        await client.from('log_attivita').insert({
          operatore_id:session.user.id,
          azione:'accredito_e_ingresso_completati',
          entita:'persone',
          entita_id:personId,
          dettagli:{postazione:station() || null}
        });
      } catch (_) {}

      await loadStates();
      toast('✓ Accredito completato e ingresso registrato.','success');
      setTimeout(() => document.querySelector('#personModal [data-close-person]')?.click(),350);
    } catch (error) {
      toast(error.message || String(error),'error');
      await refreshModalState();
    } finally {
      busy = false;
      const btn = $('accreditFinalButton');
      if (btn && !btn.disabled) btn.disabled = false;
    }
  }

  async function onFinalAction() {
    const action = $('accreditFinalButton')?.dataset.action;
    if (action === 'verify') { await openVerification(); return; }
    if (action === 'confirm') await confirmAccreditation();
  }

  function bindFilters() {
    document.addEventListener('click', event => {
      const btn = event.target.closest('[data-accredit-filter]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      const raw = btn.dataset.accreditFilter;
      currentFilter = raw === 'outside' ? 'pending' : raw === 'present' ? 'accredited' : 'all';
      document.querySelectorAll('[data-accredit-filter]').forEach(x => x.classList.toggle('active',x === btn));
      applyListState();
    },true);

    $('accreditSearch')?.addEventListener('input', () => setTimeout(applyListState,40));
  }

  function connectRealtime() {
    realtimeChannel = client.channel('campo-accreditamento-definitivo');
    realtimeChannel
      .on('postgres_changes',{event:'*',schema:'public',table:'persone'},() => setTimeout(loadStates,120))
      .on('postgres_changes',{event:'*',schema:'public',table:'verifiche_accreditamento_persona'},() => setTimeout(refreshModalState,120))
      .subscribe();
  }

  async function init() {
    injectStyles();
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth = await client.auth.getSession();
    session = auth.data?.session || null;
    if (!session) return;
    const p = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (p.error || !p.data?.attivo || !['admin','segreteria'].includes(p.data.ruolo)) return;
    profile = p.data;

    renameFilters();
    bindFilters();
    await loadStates();
    connectRealtime();

    const modal = $('personModal');
    if (modal) {
      modalObserver = new MutationObserver(() => {
        if (!modal.hidden) setTimeout(refreshModalState,80);
      });
      modalObserver.observe(modal,{attributes:true,attributeFilter:['hidden']});
    }

    const metric = $('metricPeople')?.parentElement?.parentElement;
    if (metric) {
      metricObserver = new MutationObserver(() => setTimeout(updateSummary,20));
      metricObserver.observe(metric,{childList:true,subtree:true,characterData:true});
    }

    document.addEventListener('click', event => {
      if (event.target.closest('#excelVerifyConfirm') || event.target.closest('#excelVerifyReopen')) {
        for (let i=1;i<=8;i+=1) setTimeout(refreshModalState,i*220);
      }
      if (event.target.closest('.app-nav-btn[data-view="accreditamento"]')) setTimeout(() => { renameFilters(); applyListState(); updateSummary(); },80);
    });

    for (let i=1;i<=10;i+=1) setTimeout(() => { renameFilters(); applyListState(); updateSummary(); },i*180);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
