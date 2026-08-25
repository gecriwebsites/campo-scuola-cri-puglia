(function(){
  const extraStyle=document.createElement('style');
  extraStyle.textContent=`
    .back-btn{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;padding:9px 13px;border:1px solid #e4e7eb;border-radius:11px;background:#fff;color:#202124;font:inherit;font-size:14px;font-weight:750;cursor:pointer;box-shadow:0 4px 14px rgba(20,20,20,.04)}
    .back-btn:hover{border-color:#d40000;color:#d40000;background:#fff8f8}
    .nav-dropdown{position:relative;display:flex;align-items:center}.nav-dropdown-row{display:flex;align-items:center}.nav-dropdown-row>a{padding-right:7px}.nav-dropdown-toggle{width:28px;height:36px;border:0;background:transparent;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:#62666d;font-size:15px;transition:.15s}.nav-dropdown-toggle:hover,.nav-dropdown.open .nav-dropdown-toggle{background:#fff1f1;color:#d40000}.nav-dropdown-toggle span{display:block;transition:transform .15s}.nav-dropdown.open .nav-dropdown-toggle span{transform:rotate(180deg)}.nav-submenu{display:none;position:absolute;top:calc(100% + 10px);right:0;min-width:210px;padding:8px;background:#fff;border:1px solid #e4e7eb;border-radius:12px;box-shadow:0 16px 38px rgba(20,20,20,.14);z-index:160}.nav-dropdown.open .nav-submenu{display:block}.nav-submenu a{display:flex!important;align-items:center;gap:8px;padding:11px 12px!important;border-radius:9px!important;font-size:13px!important;background:#fff!important;color:#202124!important}.nav-submenu a:hover{background:#fff1f1!important;color:#d40000!important}
    .contact-section+.contact-section{margin-top:54px}.section-head.compact{margin-bottom:20px}.section-head.compact h2{font-size:clamp(25px,3vw,34px)}.secretary-block{margin-top:48px;padding-top:42px;border-top:1px solid #e4e7eb}
    .program-embed-card{margin-top:18px;padding:0;overflow:hidden}.program-embed-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px;border-bottom:1px solid #e4e7eb}.program-embed-head h2{margin:4px 0 0}.sheet-frame-wrap{background:#f7f7f8}.sheet-frame-wrap iframe{display:block;width:100%;height:650px;border:0;background:#fff}
    .army-section{margin-top:56px;padding-top:42px;border-top:1px solid #e4e7eb}.army-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.army-card{position:relative;overflow:hidden}.army-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:#3f4b5a}.army-label{display:inline-flex;padding:6px 9px;border-radius:999px;background:#f1f3f5;color:#3f4b5a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.army-card h3{margin:14px 0 8px}.army-card p{color:#62666d}
    .qr-section{background:#f7f7f8}.qr-panel{display:grid;grid-template-columns:1.25fr .75fr;gap:28px;align-items:center}.qr-image-card{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.qr-image-card img{width:min(260px,75vw);height:auto;background:#fff;border-radius:18px;padding:14px;border:1px solid #e4e7eb;box-shadow:0 10px 30px rgba(20,20,20,.08)}.qr-image-card small{margin-top:12px;color:#62666d}.qr-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
    @media(max-width:980px){.nav-dropdown{display:block;width:100%}.nav-dropdown-row{width:100%}.nav-dropdown-row>a{flex:1}.nav-dropdown-toggle{width:44px;height:40px}.nav-submenu{position:static;right:auto;top:auto;margin:4px 0 4px 12px;min-width:0;padding:4px 0 4px 10px;border:0;border-left:3px solid #f0c5c5;border-radius:0;box-shadow:none}.nav-submenu a{padding:10px 11px!important}}
    @media(max-width:640px){.back-btn{margin-bottom:12px}.contact-section+.contact-section{margin-top:40px}.program-embed-head{display:block;padding:20px}.program-embed-head .btn{width:100%;margin-top:14px}.sheet-frame-wrap iframe{height:560px}.army-grid,.qr-panel{grid-template-columns:1fr}.qr-actions .btn{width:100%}}
  `;
  document.head.appendChild(extraStyle);

  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',()=>{nav.classList.toggle('open');btn.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});}

  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  if(nav){
    const oldReserved=nav.querySelector('a[href="login-segreteria.html"]');
    if(oldReserved) oldReserved.remove();

    const segreteriaLink=nav.querySelector('a[href="segreteria.html"]');
    if(segreteriaLink && !nav.querySelector('.nav-dropdown')){
      const dropdown=document.createElement('div');
      dropdown.className='nav-dropdown';

      const row=document.createElement('div');
      row.className='nav-dropdown-row';

      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='nav-dropdown-toggle';
      toggle.setAttribute('aria-label','Apri menu Segreteria');
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span>⌄</span>';

      const submenu=document.createElement('div');
      submenu.className='nav-submenu';
      submenu.innerHTML='<a href="login-segreteria.html">🔒 <span>Area riservata</span></a>';

      segreteriaLink.parentNode.insertBefore(dropdown,segreteriaLink);
      row.appendChild(segreteriaLink);
      row.appendChild(toggle);
      dropdown.appendChild(row);
      dropdown.appendChild(submenu);

      toggle.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const open=!dropdown.classList.contains('open');
        document.querySelectorAll('.nav-dropdown.open').forEach(el=>{
          if(el!==dropdown) el.classList.remove('open');
        });
        dropdown.classList.toggle('open',open);
        toggle.setAttribute('aria-expanded',open?'true':'false');
      });

      document.addEventListener('click',event=>{
        if(!dropdown.contains(event.target)){
          dropdown.classList.remove('open');
          toggle.setAttribute('aria-expanded','false');
        }
      });

      document.addEventListener('keydown',event=>{
        if(event.key==='Escape'){
          dropdown.classList.remove('open');
          toggle.setAttribute('aria-expanded','false');
        }
      });
    }
  }

  if(nav && !nav.querySelector('a[href="faq.html"]')){
    const faq=document.createElement('a');
    faq.href='faq.html';
    faq.textContent='FAQ';
    const bando=nav.querySelector('a[href="bando.html"]');
    if(bando) nav.insertBefore(faq,bando); else nav.appendChild(faq);
  }
  if(path==='faq.html'){
    nav?.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='faq.html'));
  }

  if(path==='corsi.html'){
    if(!document.querySelector('link[href="assets/css/course-cards.css"]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='assets/css/course-cards.css';
      document.head.appendChild(style);
    }
    const container=document.querySelector('main .section .container');
    if(container && !document.getElementById('armyCourses')){
      container.insertAdjacentHTML('beforeend',`<section class="army-section" id="armyCourses"><div class="section-head"><div><div class="kicker">Attività riservate</div><h2>Corsi per l’Esercito Italiano</h2></div><p>Attività formative riservate al personale dell’Esercito Italiano. Le iscrizioni sono curate dal Comando Militare Esercito “Puglia”.</p></div><div class="army-grid"><article class="card army-card"><span class="army-label">Riservato E.I.</span><h3>Corso Operatore Diritto Internazionale Umanitario (DIU)</h3><p><strong>21–24 settembre 2026</strong></p></article><article class="card army-card"><span class="army-label">Riservato E.I.</span><h3>Corso di Primo Soccorso</h3><p><strong>21–24 settembre 2026</strong></p></article></div></section>`);
    }
  }

  if(path==='index.html' || path===''){
    const quick=document.querySelector('.quick-grid');
    if(quick && !quick.querySelector('a[href="faq.html"]')){
      quick.insertAdjacentHTML('beforeend','<a class="quick-card" href="faq.html"><span class="ico">❓</span><b>FAQ</b><small>Risposte alle domande frequenti</small></a>');
    }
    const main=document.querySelector('main');
    if(main && !document.getElementById('qrPortal')){
      main.insertAdjacentHTML('beforeend',`<section class="section qr-section" id="qrPortal"><div class="container"><div class="qr-panel"><div><div class="kicker">Accesso rapido</div><h2>Porta il portale sempre con te</h2><p>Scansiona il QR code per aprire direttamente il portale del Campo da smartphone. Può essere utilizzato anche su badge, cartellonistica e materiale informativo.</p><div class="qr-actions"><a class="btn primary" href="https://gecriwebsites.github.io/campo-scuola-cri-puglia/">Apri il portale</a><a class="btn secondary" href="assets/img/qr-portale.svg" target="_blank" rel="noopener">Apri QR code</a></div></div><div class="card qr-image-card"><img src="assets/img/qr-portale.svg" alt="QR code del portale Campo Scuola CRI Puglia"><small>Campo Scuola CRI Puglia 2026</small></div></div></div></section>`);
    }
  }

  if(path!=='index.html' && path!==''){
    const hero=document.querySelector('.page-hero .container');
    if(hero && !hero.querySelector('.back-btn')){
      const back=document.createElement('button');
      back.type='button';
      back.className='back-btn';
      back.innerHTML='← <span>Indietro</span>';
      back.addEventListener('click',()=>{
        if(history.length>1) history.back();
        else location.href='index.html';
      });
      hero.prepend(back);
    }
  }

  document.querySelectorAll('[data-current-year]').forEach(el=>el.textContent=new Date().getFullYear());
  const cfg=window.CAMPO_CONFIG||{};

  const renderContact=(c)=>{
    const phone=c.phone?`<a href="tel:${c.phone.replace(/\s/g,'')}">📞 ${c.phone}</a>`:'';
    const email=c.email?`<a href="mailto:${c.email}">✉️ ${c.email}</a>`:'';
    return `<article class="card contact-card"><div class="role">${c.role||c.group||''}</div><div class="name">${c.name||''}</div>${phone}${email}</article>`;
  };

  document.querySelectorAll('[data-contacts]').forEach(container=>{
    if(!Array.isArray(cfg.contacts)) return;
    const wanted=(container.dataset.contactGroup||'').trim();
    const items=cfg.contacts.filter(c=>c&&c.name&&c.name.trim()&&(!wanted||c.group===wanted));
    container.innerHTML=items.map(renderContact).join('');
  });

  const wm=cfg.webmaster||{};
  document.querySelectorAll('[data-webmaster]').forEach(el=>{
    el.innerHTML=`Webmaster: <strong>${wm.name||'Simone Diaco'}</strong> · ${wm.organisation||'CRI Puglia'} · <a href="tel:${(wm.phone||'').replace(/\s/g,'')}">${wm.phone||''}</a> · <a href="mailto:${wm.email||''}">${wm.email||''}</a>`;
  });
})();
