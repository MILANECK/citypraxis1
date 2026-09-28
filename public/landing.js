// One entrance per section. Native scrolling and card hover remain independent.
export function enhanceLanding({preview=false}={}){
  if(!document.body.classList.contains('home-page'))return;
  const header=document.querySelector('.header');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=[];
  const targets=[...document.querySelectorAll('[data-home-reveal],.home-therapies .therapy-card,.home-people .reviews-section .section-heading,.home-people .review-card')];
  let observer,frame;
  const onRevealEnd=event=>{
    if(event.propertyName==='translate'&&event.target.classList.contains('home-reveal-visible')){
      event.target.classList.remove('home-reveal-ready','home-reveal-visible');
      event.target.style.removeProperty('--home-reveal-delay');
    }
  };
  document.addEventListener('transitionend',onRevealEnd);
  const updateHeader=()=>{
    header.classList.toggle('header-is-scrolled',window.scrollY>64||preview);
    frame=null;
  };
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(updateHeader);};
  const showAll=()=>{
    observer?.disconnect();
    targets.forEach(node=>node.classList.remove('home-reveal-ready','home-reveal-visible'));
    animations.forEach(animation=>animation.cancel());
  };
  updateHeader();
  window.addEventListener('scroll',onScroll,{passive:true});
  if(!preview&&!motion.matches){
    targets.forEach(node=>node.classList.add('home-reveal-ready'));
    observer=new IntersectionObserver(entries=>{
      // Stagger only neighbours entering together, so a single card never waits.
      const entering=entries.filter(entry=>entry.isIntersecting);
      entering.forEach((entry,index)=>{
        const node=entry.target;
        node.style.setProperty('--home-reveal-delay',`${Math.min(index,4)*85}ms`);
        node.classList.add('home-reveal-visible');
        observer.unobserve(node);
      });
    },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
    targets.forEach(node=>observer.observe(node));
    const intro=[
      ['.hero-copy>.eyebrow',0],
      ['.hero-copy h1>span:first-of-type',100],
      ['.hero-copy h1>span:last-of-type',260],
      ['.hero-copy>p',430],
      ['.hero-actions>a:first-child',560],
      ['.hero-actions>a:last-child',680],
      ['.home-hero-divider',760],
      ...[1,2,3,4].map((n,i)=>[`.hero-quick-strip .quick-links>a:nth-child(${n})`,820+i*90])
    ];
    // Start from the poster too: a slow or blocked video never holds up reading.
    intro.forEach(([selector,delay])=>{
      const node=document.querySelector(selector);
      if(node)animations.push(node.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:820,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}));
    });
  }
  const onMotion=()=>{if(motion.matches)showAll();};
  const onFocus=event=>{
    event.target.closest('.home-reveal-ready')?.classList.add('home-reveal-visible');
    animations.forEach(animation=>{if(animation.effect?.target?.contains(event.target))animation.finish();});
  };
  motion.addEventListener('change',onMotion);
  document.addEventListener('focusin',onFocus);
  return ()=>{
    showAll();
    if(frame)cancelAnimationFrame(frame);
    window.removeEventListener('scroll',onScroll);
    motion.removeEventListener('change',onMotion);
    document.removeEventListener('focusin',onFocus);
    document.removeEventListener('transitionend',onRevealEnd);
  };
}
