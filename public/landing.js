// Text and detail entrances stay separate from hover and background parallax.
export function enhanceLanding({preview=false}={}){
  if(!document.body.classList.contains('home-page'))return;
  const header=document.querySelector('.header');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=[];
  const atmosphere=document.querySelector('.home-surface');
  const background=document.querySelector('.home-atmosphere-background');
  const hero=document.querySelector('.hero');
  const decorativeLines=[];
  document.querySelectorAll('.home-people .reviews-section .section-heading,.home-price-figure').forEach(parent=>{
    const line=document.createElement('span');
    line.className='home-scroll-line';line.setAttribute('aria-hidden','true');
    parent.prepend(line);decorativeLines.push(line);
  });
  // Reveal readable pieces individually; never animate both a text block and its parent.
  const targets=[...document.querySelectorAll([
    '.home-section-intro>.eyebrow','.home-section-intro>h2','.home-section-intro>p',
    '.home-therapies .therapy-card','.home-section-link','.home-team-photo',
    '.team-feature-copy>.eyebrow','.team-feature-copy>h2','.team-feature-copy>p','.team-feature-copy>.text-link',
    '.home-people .section-heading>div>*','.home-people .review-quote','.home-people .review-card blockquote','.home-people .review-card figcaption',
    '.home-price-copy>*','.home-price-figure>*','.home-faq-intro>*','.home-faq .faq-list>details',
    '.home-scroll-line','.footer-top>div','.footer-bottom','.home-footer-watermark>img'
  ].join(','))];
  let observer,frame;
  const onRevealEnd=event=>{
    if(['translate','scale'].includes(event.propertyName)&&event.target.classList.contains('home-reveal-visible')){
      event.target.classList.remove('home-reveal-ready','home-reveal-visible');
      event.target.style.removeProperty('--home-reveal-delay');
    }
  };
  document.addEventListener('transitionend',onRevealEnd);
  const updateScroll=()=>{
    header.classList.toggle('header-is-scrolled',window.scrollY>64||preview);
    if(atmosphere){
      atmosphere.style.setProperty('--home-background-top',`${hero?.offsetHeight||0}px`);
      const rect=background.getBoundingClientRect();
      // A bounded, slower background drift. The UI and team photo never move with it.
      const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
      const shift=preview||motion.matches?0:(progress-.5)*360;
      atmosphere.style.setProperty('--home-atmosphere-shift',`${shift.toFixed(2)}px`);
    }
    frame=null;
  };
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(updateScroll);};
  const showAll=()=>{
    observer?.disconnect();
    targets.forEach(node=>node.classList.remove('home-reveal-ready','home-reveal-visible'));
    animations.forEach(animation=>animation.cancel());
  };
  updateScroll();
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  const sizeObserver=new ResizeObserver(onScroll);
  if(hero)sizeObserver.observe(hero);
  if(atmosphere)sizeObserver.observe(atmosphere);
  if(!preview&&!motion.matches){
    targets.forEach(node=>node.classList.add('home-reveal-ready'));
    observer=new IntersectionObserver(entries=>{
      // Stagger only neighbours entering together, so a single card never waits.
      const entering=entries.filter(entry=>entry.isIntersecting);
      entering.forEach((entry,index)=>{
        const node=entry.target;
        node.style.setProperty('--home-reveal-delay',`${Math.min(index,4)*90}ms`);
        node.classList.add('home-reveal-visible');
        observer.unobserve(node);
      });
    },{threshold:.12,rootMargin:'0px 0px -28px 0px'});
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
      const line=selector==='.home-hero-divider';
      if(node)animations.push(node.animate([{opacity:0,transform:line?'scaleX(0)':'translateY(18px)'},{opacity:1,transform:line?'scaleX(1)':'translateY(0)'}],{duration:line?1100:820,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}));
    });
  }
  const onMotion=()=>{if(motion.matches)showAll();updateScroll();};
  const onFocus=event=>{
    event.target.closest('.home-reveal-ready')?.classList.add('home-reveal-visible');
    animations.forEach(animation=>{if(animation.effect?.target?.contains(event.target))animation.finish();});
  };
  motion.addEventListener('change',onMotion);
  document.addEventListener('focusin',onFocus);
  return ()=>{
    showAll();
    sizeObserver.disconnect();
    if(frame)cancelAnimationFrame(frame);
    window.removeEventListener('scroll',onScroll);
    window.removeEventListener('resize',onScroll);
    motion.removeEventListener('change',onMotion);
    document.removeEventListener('focusin',onFocus);
    document.removeEventListener('transitionend',onRevealEnd);
    decorativeLines.forEach(line=>line.remove());
    atmosphere?.style.removeProperty('--home-atmosphere-shift');
    atmosphere?.style.removeProperty('--home-background-top');
  };
}
