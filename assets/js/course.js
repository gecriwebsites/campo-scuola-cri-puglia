(function(){
  const id=new URLSearchParams(location.search).get('id');
  const c=(window.COURSES||[]).find(x=>x.id===id)||(window.COURSES||[])[0];
  if(!c)return;

  document.title=c.name+' | Campo Scuola CRI Puglia';
  document.getElementById('courseTitle').textContent=c.name;
  document.getElementById('courseSubtitle').textContent='Informazioni e collegamenti utili per il corso '+c.id;
  document.getElementById('courseCode').textContent=c.id;
  document.getElementById('courseMode').textContent=c.mode;
  document.getElementById('courseDate').textContent=c.date;

  const directorCard=document.getElementById('courseDirectorCard');
  const director=document.getElementById('courseDirector');
  const directorActions=document.getElementById('courseDirectorActions');
  if(c.director && c.director.name){
    director.textContent=c.director.name;
    if(c.director.phone){
      const a=document.createElement('a');
      a.className='btn secondary'; a.href='tel:'+c.director.phone.replace(/\s+/g,''); a.textContent='📞 Chiama il Direttore';
      directorActions.appendChild(a);
    }
    if(c.director.email){
      const a=document.createElement('a');
      a.className='btn secondary'; a.href='mailto:'+c.director.email; a.textContent='✉️ Email al Direttore';
      directorActions.appendChild(a);
    }
    directorCard.hidden=false;
  }

  const linksCard=document.getElementById('courseLinksCard');
  const links=document.getElementById('courseLinks');
  const addLink=(url,label,kind)=>{
    if(!url)return;
    const a=document.createElement('a');
    a.className='resource-link '+(kind||'');
    a.href=url; a.target='_blank'; a.rel='noopener';
    a.innerHTML='<span class="resource-link-label">'+label+'</span><span class="resource-arrow">↗</span>';
    links.appendChild(a);
  };
  addLink(c.gaia,'🌐 Evento su GAIA','gaia');
  addLink(c.whatsapp,'💬 Gruppo WhatsApp','whatsapp');
  addLink(c.programma,'📊 Programma del corso','programma');
  addLink(c.meet,'🎥 Collegamento Google Meet','meet');
  if(links.children.length) linksCard.hidden=false;
})();
