(function(){
  const extraStyle=document.createElement('style');
  extraStyle.textContent=`
    .back-btn{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;padding:9px 13px;border:1px solid #e4e7eb;border-radius:11px;background:#fff;color:#202124;font:inherit;font-size:14px;font-weight:750;cursor:pointer;box-shadow:0 4px 14px rgba(20,20,20,.04)}
    .back-btn:hover{border-color:#d40000;color:#d40000;background:#fff8f8}
    .contact-section+.contact-section{margin-top:54px}.section-head.compact{margin-bottom:20px}.section-head.compact h2{font-size:clamp(25px,3vw,34px)}.secretary-block{margin-top:48px;padding-top:42px;border-top:1px solid #e4e7eb}
    .program-embed-card{margin-top:18px;padding:0;overflow:hidden}.program-embed-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px;border-bottom:1px solid #e4e7eb}.program-embed-head h2{margin:4px 0 0}.sheet-frame-wrap{background:#f7f7f8}.sheet-frame-wrap iframe{display:block;width:100%;height:650px;border:0;background:#fff}
    @media(max-width:640px){.back-btn{margin-bottom:12px}.contact-section+.contact-section{margin-top:40px}.program-embed-head{display:block;padding:20px}.program-embed-head .btn{width:100%;margin-top:14px}.sheet-frame-wrap iframe{height:560px}}
  `;
  document.head.appendChild(extraStyle);

  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',()=>{nav.classList.toggle('open');btn.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});}

  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(path!=='index.html' && path!==''){
    const hero=document.querySelector('.page-hero .container');
    if(hero){
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
