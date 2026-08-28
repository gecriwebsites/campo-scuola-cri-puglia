(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let selectedFile = null;
  let running = false;

  const text = value => String(value ?? '').trim();
  const norm = value => text(value).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Libreria Excel non disponibile'));
      document.head.appendChild(script);
    });
  }

  function setStatusSuffix(message) {
    const el = $('masterWorkbookStatus');
    if (!el || !message) return;
    const base = String(el.textContent || '').replace(/\s*·\s*Esigenze alimentari:.*$/i, '');
    el.textContent = `${base} · Esigenze alimentari: ${message}`;
  }

  function toast(message, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` ${type}` : ''}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3600);
  }

  async function importDietaryFromMaster() {
    if (running || !selectedFile || !client) return;
    running = true;
    try {
      await ensureXlsx();
      const wb = window.XLSX.read(await selectedFile.arrayBuffer(), { type:'array', cellDates:true });
      const ws = wb.Sheets['01_PERSONE'];
      if (!ws) return;
      const rows = window.XLSX.utils.sheet_to_json(ws, { defval:'', raw:false, blankrows:false, cellDates:true });
      const requests = rows.map(row => ({
        key:text(row.CHIAVE_PERSONA),
        description:text(row.ESIGENZE_ALIMENTARI)
      })).filter(row => row.key && row.description);

      if (!requests.length) {
        setStatusSuffix('nessuna segnalazione da importare');
        return;
      }

      const { data: people, error:peopleError } = await client.from('persone').select('id,chiave_import').not('chiave_import','is',null).limit(3000);
      if (peopleError) throw peopleError;
      const byKey = new Map((people || []).map(person => [norm(person.chiave_import), person.id]));
      const resolved = requests.map(item => ({ ...item, personId:byKey.get(norm(item.key)) || null })).filter(item => item.personId);
      const missing = requests.length - resolved.length;
      if (!resolved.length) throw new Error('nessuna CHIAVE_PERSONA delle esigenze alimentari è stata trovata dopo l’importazione');

      const ids = [...new Set(resolved.map(item => item.personId))];
      const { data: existingRows, error:existingError } = await client.from('esigenze_alimentari').select('persona_id').in('persona_id', ids);
      if (existingError) throw existingError;
      const existing = new Set((existingRows || []).map(row => row.persona_id));

      let saved = 0;
      for (const item of resolved) {
        const payload = { presente:true, descrizione:item.description };
        const result = existing.has(item.personId)
          ? await client.from('esigenze_alimentari').update(payload).eq('persona_id', item.personId)
          : await client.from('esigenze_alimentari').insert({ persona_id:item.personId, ...payload });
        if (result.error) throw result.error;
        existing.add(item.personId);
        saved += 1;
      }

      setStatusSuffix(`${saved} salvate${missing ? `, ${missing} non abbinate` : ''}`);
      toast(`${saved} esigenze alimentari importate e condivise con la Cucina.`, 'success');
    } catch (error) {
      setStatusSuffix(`errore — ${error.message}`);
      toast(`Import esigenze alimentari non riuscito: ${error.message}`, 'error');
    } finally {
      running = false;
    }
  }

  async function init() {
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });

    for (let i=0;i<120;i+=1) {
      const input = $('masterWorkbookFile');
      if (input) {
        input.addEventListener('change', event => { selectedFile = event.target.files?.[0] || null; });
        break;
      }
      await new Promise(resolve => setTimeout(resolve,100));
    }

    document.addEventListener('campo-master-import-complete', () => { void importDietaryFromMaster(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
