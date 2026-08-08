(function(){
  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',()=>{nav.classList.toggle('open');btn.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});}
  document.querySelectorAll('[data-current-year]').forEach(el=>el.textContent=new Date().getFullYear());
  const cfg=window.CAMPO_CONFIG||{};
  const container=document.querySelector('[data-contacts]');
  if(container&&Array.isArray(cfg.contacts)){
    container.innerHTML=cfg.contacts.filter(c=>c && c.name && c.name.trim() && c.name.trim().toLowerCase()!=='da definire').map(c=>{
      const phone=c.phone?`<a href="tel:${c.phone.replace(/\s/g,'')}">📞 ${c.phone}</a>`:'';
      const email=c.email?`<a href="mailto:${c.email}">✉️ ${c.email}</a>`:'';
      return `<article class="card contact-card"><div class="role">${c.group||''}</div><div class="name">${c.name||''}</div><div><strong>${c.role||''}</strong></div>${phone}${email}</article>`;
    }).join('');
  }
  const wm=cfg.webmaster||{};
  document.querySelectorAll('[data-webmaster]').forEach(el=>{
    el.innerHTML=`Webmaster: <strong>${wm.name||'Simone Diaco'}</strong> · ${wm.organisation||'CRI Puglia'} · <a href="tel:${(wm.phone||'').replace(/\s/g,'')}">${wm.phone||''}</a> · <a href="mailto:${wm.email||''}">${wm.email||''}</a>`;
  });
})();
