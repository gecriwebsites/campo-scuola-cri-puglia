(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let busy = false;

  const TABLES = [
    'persone', 'persone_tipologie', 'persone_corsi', 'persone_aree', 'persone_qualifiche',
    'movimenti_persone', 'turni', 'persone_turni', 'tende', 'posti_letto',
    'servizi_pasto', 'persone_pasti', 'esigenze_alimentari', 'mezzi',
    'attivazioni_mezzi', 'autisti_mezzi', 'movimenti_mezzi',
    'verifiche_accreditamento_persona', 'importazioni', 'importazioni_righe', 'log_attivita'
  ];

  function injectStyles() {
    if ($('adminBackupV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminBackupV1Styles';
    style.textContent = `
      .admin-backup{margin:12px 18px 0;padding:14px;border:1px solid #d7e1e7;border-radius:6px;background:#fff}
      .admin-backup-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .admin-backup-head h3{margin:0;font-size:16px;color:#233946}.admin-backup-head p{margin:3px 0 0;font-size:12px;color:#6d7d87;line-height:1.45}
      .admin-backup-btn{min-height:40px;border:1px solid #b9c8d2;border-radius:5px;background:#f3f8fb;color:#173b52;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap}
      .admin-backup-btn:hover{background:#e8f2f7}.admin-backup-btn:disabled{opacity:.5;cursor:not-allowed}
      .admin-backup-state{min-height:18px;margin-top:9px;font-size:11px;font-weight:750;color:#647681}.admin-backup-state.success{color:#16794f}.admin-backup-state.error{color:#a0001d}
      @media(max-width:720px){.admin-backup-head{align-items:flex-start;flex-direction:column}.admin-backup-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    const diagnostics = $('adminDiagnostics');
    const danger = document.querySelector('#adminToolsModal .admin-danger');
    const anchor = diagnostics || danger;
    if (!anchor || $('adminBackup')) return false;

    const box = document.createElement('section');
    box.id = 'adminBackup';
    box.className = 'admin-backup';
    box.innerHTML = `
      <div class="admin-backup-head">
        <div><h3>Backup operativo</h3><p>Esporta in un unico file JSON i dati operativi accessibili all'Amministratore. Nessun dato viene modificato.</p></div>
        <button id="adminBackupRun" class="admin-backup-btn" type="button">Esporta backup</button>
      </div>
      <div id="adminBackupState" class="admin-backup-state">Il file può essere conservato come copia tecnica prima di importazioni o modifiche importanti.</div>`;
    anchor.insertAdjacentElement('beforebegin', box);
    $('adminBackupRun')?.addEventListener('click', exportBackup);
    return true;
  }

  function safeFilenameDate() {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }).formatToParts(d).reduce((acc,p) => { acc[p.type] = p.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
  }

  function setState(message, type='') {
    const el = $('adminBackupState');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-backup-state${type ? ` ${type}` : ''}`;
  }

  async function readTable(table) {
    try {
      const { data, error } = await client.from(table).select('*').limit(10000);
      if (error) return { ok:false, error:error.message, rows:[] };
      return { ok:true, rows:data || [] };
    } catch (error) {
      return { ok:false, error:error.message, rows:[] };
    }
  }

  async function exportBackup() {
    if (busy || !client) return;
    busy = true;
    const button = $('adminBackupRun');
    if (button) { button.disabled = true; button.textContent = 'Esportazione…'; }
    setState('Lettura dati in corso…');

    try {
      const payload = {
        formato: 'campo-cri-puglia-backup-v1',
        generato_at: new Date().toISOString(),
        sorgente: 'Area Riservata Operativa',
        tabelle: {},
        errori: {}
      };

      let totalRows = 0;
      for (const table of TABLES) {
        setState(`Lettura ${table}…`);
        const result = await readTable(table);
        if (result.ok) {
          payload.tabelle[table] = result.rows;
          totalRows += result.rows.length;
        } else {
          payload.tabelle[table] = [];
          payload.errori[table] = result.error;
        }
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Campo_CRI_Puglia_${safeFilenameDate()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      const errors = Object.keys(payload.errori).length;
      setState(errors
        ? `Backup creato con ${totalRows} record. ${errors} tabelle non erano leggibili e sono indicate nel file.`
        : `Backup creato correttamente · ${totalRows} record esportati.`, errors ? 'error' : 'success');
    } catch (error) {
      setState(`Backup non riuscito: ${error.message}`, 'error');
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'Esporta backup'; }
    }
  }

  async function init() {
    injectStyles();
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data, error:profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !data?.attivo || data.ruolo !== 'admin') return;

    for (let i=0;i<60;i+=1) {
      if (mount()) return;
      await new Promise(resolve => setTimeout(resolve,100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
