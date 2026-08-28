(() => {
  'use strict';

  const config = window.CAMPO_CONFIG && window.CAMPO_CONFIG.supabase;
  const $ = id => document.getElementById(id);
  let client = null;
  let session = null;
  let profile = null;
  let busy = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = value => Number(value || 0);

  function formatDate(value) {
    if (!value) return '—';
    const [y,m,d] = String(value).split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', { weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'Europe/Rome' }).format(new Date(Date.UTC(y,m-1,d,12)));
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', { timeZone:'Europe/Rome', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);
  }

  function formatTime(value) {
    return value ? String(value).slice(0,5) : '—';
  }

  function stateLabel(value) {
    return ({ da_aprire:'Da aprire', operativa:'Giornata operativa', chiusa:'Giornata chiusa' })[value] || 'Da aprire';
  }

  function priorityLabel(value) {
    return ({ bassa:'Bassa', media:'Media', alta:'Alta', critica:'Critica' })[value] || value || '—';
  }

  function statusLabel(value) {
    return ({ aperta:'Aperta', in_gestione:'In gestione', risolta:'Risolta' })[value] || value || '—';
  }

  function canUse() {
    const station = sessionStorage.getItem('campo_scuola_segreteria_postazione') || '';
    return profile?.ruolo === 'admin' || (profile?.ruolo === 'segreteria' && station === 'Referente Segreteria');
  }

  function mount() {
    const bar = document.querySelector('#coordinationView .coord-datebar');
    if (!bar || $('coordDailyReport')) return false;
    const button = document.createElement('button');
    button.id = 'coordDailyReport';
    button.className = 'coord-refresh';
    button.type = 'button';
    button.textContent = '🖨️ Report giornaliero';
    button.addEventListener('click', generateReport);
    bar.appendChild(button);
    return true;
  }

  async function readData(date) {
    const [situation, day, critical, handovers] = await Promise.all([
      client.rpc('situazione_campo_dashboard', { p_data:date }),
      client.from('giornate_operative').select('*').eq('data',date).maybeSingle(),
      client.from('criticita_operative').select('*').eq('data',date).order('created_at',{ ascending:true }),
      client.from('passaggi_consegne').select('*').eq('data',date).order('created_at',{ ascending:true })
    ]);
    if (situation.error) throw situation.error;
    if (day.error && day.error.code !== 'PGRST116') throw day.error;
    if (critical.error) throw critical.error;
    if (handovers.error) throw handovers.error;
    return {
      situation:situation.data || {},
      day:day.data || null,
      criticalities:critical.data || [],
      handovers:handovers.data || []
    };
  }

  function automaticCriticalities(data) {
    const c = data?.criticita || {};
    const items = [];
    if (n(c.turni_scoperti) > 0) items.push(`${n(c.turni_scoperti)} turni scoperti`);
    if (n(c.pernottamenti_senza_posto) > 0) items.push(`${n(c.pernottamenti_senza_posto)} pernottamenti senza posto letto`);
    if (n(c.posti_emergenza_occupati) > 0) items.push(`${n(c.posti_emergenza_occupati)} posti di emergenza occupati`);
    return items;
  }

  function buildHtml(date, payload) {
    const s = payload.situation || {};
    const persone = s.persone || {};
    const mezzi = s.mezzi || {};
    const letti = s.pernottamenti || {};
    const turni = s.turni || {};
    const pasti = s.pasti || {};
    const day = payload.day || {};
    const autoCritical = automaticCriticalities(s);
    const shifts = Array.isArray(turni.dettaglio) ? turni.dettaglio : [];
    const operator = profile?.nome_visualizzato || session?.user?.email || 'Operatore autorizzato';
    const base = new URL('.', location.href).href;
    const logoCri = `${base}assets/img/logo-cri-puglia.png`;
    const logoCampo = `${base}assets/img/logo-campo.png`;

    const criticalRows = payload.criticalities.length ? payload.criticalities.map(item => `
      <tr><td>${esc(item.titolo || '—')}</td><td>${esc(item.area || 'generale')}</td><td>${esc(priorityLabel(item.priorita))}</td><td>${esc(statusLabel(item.stato))}</td><td>${esc(item.descrizione || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Nessuna criticità registrata.</td></tr>';

    const handoverRows = payload.handovers.length ? payload.handovers.map(item => `
      <div class="handover"><p>${esc(item.testo || item.nota || '')}</p><small>${esc(item.postazione || 'Postazione')} · ${formatDateTime(item.created_at)}</small></div>`).join('') : '<div class="empty box">Nessun passaggio consegne registrato.</div>';

    const shiftRows = shifts.length ? shifts.map(row => `
      <tr><td>${esc(row.titolo || row.area || 'Turno')}</td><td>${esc(row.area || '—')}</td><td>${esc(`${formatTime(row.ora_inizio)}–${formatTime(row.ora_fine)}`)}</td><td>${esc(row.luogo || '—')}</td><td>${n(row.coperti)}/${n(row.richiesti)}</td><td>${n(row.scoperti)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">Nessun turno programmato.</td></tr>';

    const mealRows = [['colazione','Colazione'],['pranzo','Pranzo'],['cena','Cena']].map(([key,label]) => {
      const row = pasti[key] || {};
      return `<tr><td>${label}</td><td>${n(row.previsti)}</td><td>${n(row.consumati)}</td><td>${n(row.restanti)}</td></tr>`;
    }).join('');

    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report giornaliero ${date}</title><style>
      @page{size:A4;margin:14mm}
      *{box-sizing:border-box}body{margin:0;background:#eef1f3;color:#1f2f39;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.4}.sheet{width:min(210mm,100%);margin:18px auto;background:#fff;padding:14mm;box-shadow:0 10px 35px rgba(0,0,0,.12)}
      .toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:8px;padding:10px;background:#202a31}.toolbar button{border:0;border-radius:5px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer}.toolbar .primary{background:#d40000;color:#fff}.toolbar .secondary{background:#fff;color:#26343d}
      .head{display:grid;grid-template-columns:72px minmax(0,1fr) 95px;gap:14px;align-items:center;border-bottom:3px solid #d40000;padding-bottom:12px}.head img{max-width:100%;max-height:66px;object-fit:contain}.head h1{margin:0;font-size:20pt;line-height:1.05}.head p{margin:4px 0 0;color:#62717a}.right{text-align:right}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.meta div,.kpi{border:1px solid #dce2e6;padding:8px;border-radius:5px}.meta span,.kpi small{display:block;color:#6b7982;font-size:8pt;font-weight:700;text-transform:uppercase}.meta strong,.kpi strong{display:block;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.kpi strong{font-size:17pt}.section{margin-top:15px;break-inside:avoid}.section h2{margin:0 0 7px;padding-bottom:5px;border-bottom:1px solid #cfd7dc;font-size:13pt}.section h3{font-size:10.5pt;margin:8px 0 4px}.note{padding:9px 10px;border-left:4px solid #617887;background:#f4f7f9;white-space:pre-wrap}.warning{padding:8px 10px;border-left:4px solid #c88916;background:#fff9eb}.good{padding:8px 10px;border-left:4px solid #188357;background:#f2faf6}table{width:100%;border-collapse:collapse;font-size:9pt}th{background:#f1f4f6;text-align:left;color:#53636d}th,td{border:1px solid #dce2e6;padding:6px;vertical-align:top}.empty{color:#7a868d;font-style:italic}.handover{border:1px solid #dde3e6;border-radius:4px;padding:8px 9px;margin-bottom:6px;break-inside:avoid}.handover p{margin:0;white-space:pre-wrap}.handover small{display:block;color:#71808a;margin-top:4px}.box{padding:9px;border:1px dashed #cfd7dc}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:28px}.signature{padding-top:34px;border-bottom:1px solid #4d5960;text-align:center;font-size:8.5pt;color:#61707a}.footer{margin-top:20px;padding-top:7px;border-top:1px solid #dce2e6;color:#7a858c;font-size:7.5pt;text-align:center}
      @media print{body{background:#fff}.toolbar{display:none}.sheet{width:auto;margin:0;padding:0;box-shadow:none}.section{break-inside:auto}thead{display:table-header-group}}
      @media(max-width:700px){.sheet{margin:0;padding:18px}.head{grid-template-columns:55px 1fr}.head .right{display:none}.meta,.kpis{grid-template-columns:1fr 1fr}.signatures{grid-template-columns:1fr;gap:24px}}
    </style></head><body><div class="toolbar"><button class="primary" onclick="window.print()">Stampa / Salva PDF</button><button class="secondary" onclick="window.close()">Chiudi</button></div><main class="sheet">
      <header class="head"><img src="${logoCri}" alt="CRI Puglia"><div><h1>Report giornaliero operativo</h1><p>2° Campo di Formazione Residenziale CRI Puglia · La Rotta della Formazione</p></div><img class="right" src="${logoCampo}" alt="Logo Campo"></header>
      <div class="meta"><div><span>Giornata</span><strong>${esc(formatDate(date))}</strong></div><div><span>Stato</span><strong>${esc(stateLabel(day.stato))}</strong></div><div><span>Generato da</span><strong>${esc(operator)}</strong></div></div>
      <div class="kpis"><div class="kpi"><small>Persone presenti</small><strong>${n(persone.presenti)} / ${n(persone.totali)}</strong></div><div class="kpi"><small>Mezzi presenti</small><strong>${n(mezzi.presenti)} / ${n(mezzi.totali)}</strong></div><div class="kpi"><small>Pernottamenti</small><strong>${n(letti.letti_occupati)} / ${n(letti.previsti)}</strong></div><div class="kpi"><small>Turni scoperti</small><strong>${n(turni.scoperti)}</strong></div></div>
      <section class="section"><h2>Stato della giornata</h2><div class="note">${day.note ? esc(day.note) : 'Nessuna nota ufficiale registrata nella Gestione giornata operativa.'}</div><div style="margin-top:7px;font-size:8.5pt;color:#6c7981">Apertura: ${formatDateTime(day.aperta_at)} · Chiusura: ${formatDateTime(day.chiusa_at)} · Report generato: ${formatDateTime(new Date().toISOString())}</div></section>
      <section class="section"><h2>Criticità automatiche</h2>${autoCritical.length ? `<div class="warning">${autoCritical.map(v=>`• ${esc(v)}`).join('<br>')}</div>` : '<div class="good">Nessuna criticità automatica rilevata dalla Situazione Campo.</div>'}</section>
      <section class="section"><h2>Turni della giornata</h2><table><thead><tr><th>Turno</th><th>Area</th><th>Orario</th><th>Luogo</th><th>Copertura</th><th>Scoperti</th></tr></thead><tbody>${shiftRows}</tbody></table></section>
      <section class="section"><h2>Pasti</h2><table><thead><tr><th>Servizio</th><th>Previsti</th><th>Consumati</th><th>Restanti</th></tr></thead><tbody>${mealRows}</tbody></table></section>
      <section class="section"><h2>Criticità operative registrate</h2><table><thead><tr><th>Titolo</th><th>Area</th><th>Priorità</th><th>Stato</th><th>Dettaglio</th></tr></thead><tbody>${criticalRows}</tbody></table></section>
      <section class="section"><h2>Passaggio consegne</h2>${handoverRows}</section>
      <section class="section"><h2>Riepilogo logistico</h2><table><tbody><tr><th>Persone previste nella giornata</th><td>${n(persone.previsti_giornata)}</td><th>Persone fuori</th><td>${n(persone.fuori)}</td></tr><tr><th>Pernottamenti senza posto</th><td>${n(letti.senza_posto)}</td><th>Posti emergenza occupati</th><td>${n(letti.posti_emergenza_occupati)} / ${n(letti.posti_emergenza_attivi)}</td></tr><tr><th>Personale turni richiesto</th><td>${n(turni.personale_richiesto)}</td><th>Personale coperto / confermato</th><td>${n(turni.personale_coperto)} / ${n(turni.personale_confermato)}</td></tr></tbody></table></section>
      <div class="signatures"><div class="signature">Referente Segreteria</div><div class="signature">Amministratore / Responsabile</div></div>
      <div class="footer">Documento generato dall’Area Riservata Operativa · Campo Scuola CRI Puglia 2026</div>
    </main></body></html>`;
  }

  async function generateReport() {
    if (busy || !client) return;
    const date = $('coordDate')?.value;
    if (!date) return;
    const button = $('coordDailyReport');
    busy = true;
    if (button) { button.disabled = true; button.textContent = 'Preparazione report…'; }
    try {
      const payload = await readData(date);
      const popup = window.open('', '_blank', 'width=1100,height=850');
      if (!popup) throw new Error('Il browser ha bloccato la finestra del report. Consenti i popup per questo sito.');
      popup.document.open();
      popup.document.write(buildHtml(date,payload));
      popup.document.close();
    } catch (error) {
      alert(`Report non disponibile: ${error.message || error}`);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = '🖨️ Report giornaliero'; }
    }
  }

  async function init() {
    if (!config?.url || !config?.publishableKey || !window.supabase) return;
    client = window.supabase.createClient(config.url, config.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    const { data:{ session:currentSession }, error } = await client.auth.getSession();
    if (error || !currentSession) return;
    session = currentSession;
    const { data, error:profileError } = await client.from('utenti_segreteria').select('nome_visualizzato,ruolo,attivo').eq('user_id',session.user.id).maybeSingle();
    if (profileError || !data?.attivo) return;
    profile = data;
    if (!canUse()) return;
    for (let i=0;i<80;i+=1) {
      if (mount()) return;
      await new Promise(resolve => setTimeout(resolve,100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
