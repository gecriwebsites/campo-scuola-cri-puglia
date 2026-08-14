(function(){
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
