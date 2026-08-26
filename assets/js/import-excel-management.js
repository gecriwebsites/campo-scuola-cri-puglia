(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let observer = null;
  let busy = false;

  function showMessage(message, type = '') {
    let el = $('importManagementMessage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'importManagementMessage';
      el.className = 'ix-management-message';
      const history = $('importHistory');
      history?.parentElement?.insertBefore(el, history);
    }
    if (!el) return;
    el.textContent = message;
    el.className = `ix-management-message${type ? ` ${type}` : ''}`;
    el.hidden = !message;
  }

  function injectStyles() {
    if ($('importManagementStyles')) return;
    const style = document.createElement('style');
    style.id = 'importManagementStyles';
    style.textContent = `
      #importExcelView .ix-history-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:stretch}
      #importExcelView .ix-history-entry>.ix-history-item{width:100%;min-width:0}
      #importExcelView .ix-history-actions{display:flex;flex-direction:column;gap:5px}
      #importExcelView .ix-history-action{border:1px solid #d8dde1;background:#fff;border-radius:9px;padding:6px 8px;font:inherit;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}
      #importExcelView .ix-history-action:hover{border-color:#d40000}.ix-history-action.danger{color:#a0001d;border-color:#edcbd0}.ix-history-action.danger:hover{background:#fff5f6}
      #importExcelView .ix-management-message{margin:0 0 9px;padding:9px 10px;border:1px solid #d8dde1;border-radius:10px;background:#f6f8f9;font-size:10px;font-weight:750;line-height:1.4}
      #importExcelView .ix-management-message.success{background:#f2faf5;border-color:#d6eadf;color:#176744}.ix-management-message.error{background:#fff5f6;border-color:#efcbd0;color:#a0001d}
      #importExcelView .ix-management-message[hidden]{display:none}
      @media(max-width:980px){#importExcelView .ix-history-entry{grid-template-columns:1fr}#importExcelView .ix-history-actions{flex-direction:row}}
    `;
    document.head.appendChild(style);
  }

  async function deleteImport(id, replaceAfter = false) {
    if (busy || !id) return false;
    busy = true;
    showMessage(replaceAfter ? 'Preparazione sostituzione…' : 'Eliminazione sessione Excel…');
    const { data, error } = await client.rpc('elimina_importazione_excel', { p_importazione_id: id });
    busy = false;
    if (error || data?.status !== 'eliminata') {
      showMessage(`Operazione non riuscita: ${error?.message || data?.status || 'errore'}`, 'error');
      return false;
    }
    showMessage(replaceAfter ? 'Sessione precedente rimossa. Carica ora il nuovo file.' : `Importazione eliminata (${data.righe_eliminate || 0} righe di staging).`, 'success');
    $('importExcelRefresh')?.click();
    return true;
  }

  function chooseReplacement(importId, fileName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) { input.remove(); return; }
      const ok = window.confirm(`Sostituire “${fileName || 'questa importazione'}” con “${file.name}”? La vecchia sessione di staging verrà eliminata.`);
      if (!ok) { input.remove(); return; }
      const deleted = await deleteImport(importId, true);
      if (!deleted) { input.remove(); return; }

      const mainInput = $('importFileInput');
      if (!mainInput) {
        showMessage('Vecchia sessione eliminata. Seleziona il nuovo file dal riquadro principale.', 'success');
        input.remove();
        return;
      }

      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        mainInput.files = dt.files;
        mainInput.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => $('importExcelView')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } catch (_) {
        showMessage('Vecchia sessione eliminata. Seleziona il nuovo file dal riquadro principale.', 'success');
      }
      input.remove();
    }, { once: true });
    input.click();
  }

  function enhanceHistory() {
    const history = $('importHistory');
    if (!history) return;

    const items = [...history.querySelectorAll(':scope > .ix-history-item')];
    items.forEach(item => {
      if (item.closest('.ix-history-entry')) return;
      const id = item.dataset.importId;
      if (!id) return;
      const fileName = item.querySelector('strong')?.textContent?.trim() || 'Importazione Excel';

      const wrap = document.createElement('div');
      wrap.className = 'ix-history-entry';
      item.parentNode.insertBefore(wrap, item);
      wrap.appendChild(item);

      const actions = document.createElement('div');
      actions.className = 'ix-history-actions';
      actions.innerHTML = `<button class="ix-history-action" type="button" data-ix-replace="${id}">Sostituisci</button><button class="ix-history-action danger" type="button" data-ix-delete="${id}">Elimina</button>`;
      wrap.appendChild(actions);

      actions.querySelector('[data-ix-replace]')?.addEventListener('click', event => {
        event.stopPropagation();
        chooseReplacement(id, fileName);
      });
      actions.querySelector('[data-ix-delete]')?.addEventListener('click', async event => {
        event.stopPropagation();
        if (!window.confirm(`Eliminare “${fileName}” e tutte le righe della sua anteprima?`)) return;
        await deleteImport(id, false);
      });
    });
  }

  async function waitForUi() {
    for (let i = 0; i < 120; i += 1) {
      if ($('importHistory') && $('importExcelView')) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async function init() {
    if (!config || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return;
    const { data: profile, error: profileError } = await client.from('utenti_segreteria').select('ruolo,attivo').eq('user_id', session.user.id).maybeSingle();
    if (profileError || !profile?.attivo || !['admin', 'segreteria'].includes(profile.ruolo)) return;
    if (!await waitForUi()) return;
    injectStyles();
    enhanceHistory();
    observer = new MutationObserver(() => enhanceHistory());
    observer.observe($('importHistory'), { childList: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
