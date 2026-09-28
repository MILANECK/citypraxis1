// Text and detail entrances stay separate from hover and background parallax.
export function enhanceLanding({preview=false}={}){
  if(!document.body.classList.contains('public-page'))return;
  const isHome=document.body.classList.contains('home-page');
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
    '.home-distinction-copy>.eyebrow','.home-distinction-copy>h2',
    '.home-price-copy>*','.home-price-figure>*','.home-faq-intro>*','.home-faq .faq-list>details',
    '.home-scroll-line','.footer-top>div','.footer-bottom',
    // Interior templates share the rhythm, while forms and dense tables stay ready to use.
    '.interior-page .article>.eyebrow','.interior-page .article>h1','.interior-page .article>.article-intro',
    '.interior-page .article>.article-body>*','.interior-page .listing-card',
    '.interior-page .service-intro>div>*','.interior-page .service-intro>img',
    '.interior-page .clinical-card>h2','.interior-page .clinical-card>h3','.interior-page .clinical-card>p','.interior-page .clinical-card>ul',
    '.interior-page .clinical-aside>.eyebrow','.interior-page .clinical-aside>h2','.interior-page .clinical-aside>p',
    '.interior-page .therapist-photo-frame','.interior-page .therapist-intro>*',
    '.interior-page .therapist-section>h2','.interior-page .therapist-section>p','.interior-page .therapist-section>ul',
    '.interior-page .info-card>.eyebrow','.interior-page .info-card>h2','.interior-page .info-card>h3',
    '.interior-page .info-card>p','.interior-page .weekly-hours>div',
    '.interior-page .booking-layout>div:first-child>*',
    '.interior-page #booking-form'

  ].join(','))];
  const cleanTeamHover=enhanceTeamHover();
  const watermark=document.querySelector('.home-footer-watermark');
  const priceValues=[...document.querySelectorAll('.home-price-value')].map((node,index)=>({node,final:Number(node.dataset.priceValue),text:node.textContent,duration:index===1?940:1000}));
  const faqRows=[...document.querySelectorAll('.home-faq .faq-list>details')];
  const starGroups=[...document.querySelectorAll('.home-people .review-stars')];
  const teamCards=[...document.querySelectorAll('.interior-page[data-page="/ueber-uns"] .team-directory :is(.team-person,.team-aim-card)')];
  const journeyGrid=document.querySelector('.interior-page[data-page="/ablauf-wahltherapie"] .process-grid');
  const groupTimings=new WeakMap();
  let observer,watermarkObserver,teamObserver,journeyObserver,frame,priceFrame;
  const finishPrices=()=>{
    if(priceFrame)cancelAnimationFrame(priceFrame);
    priceFrame=null;
    priceValues.forEach(({node,text})=>{node.textContent=text;});
  };
  const animatePrices=delay=>{
    if(!priceValues.length)return;
    let started;
    const tick=now=>{
      started??=now;
      const elapsed=Math.max(0,now-started-delay);
      priceValues.forEach(({node,final,text,duration})=>{
        const progress=Math.min(1,elapsed/duration);
        const extra=Math.max(24,Math.round(final*.6));
        node.textContent=progress===1?text:String(Math.round(final+extra*(1-progress)**1.5));
      });
      if(elapsed<1000)priceFrame=requestAnimationFrame(tick);
      else finishPrices();
    };
    priceFrame=requestAnimationFrame(tick);
  };
  const onRevealEnd=event=>{
    if(['translate','scale'].includes(event.propertyName)&&event.target.classList.contains('home-reveal-visible')){
      event.target.classList.remove('home-reveal-ready','home-reveal-visible');
      event.target.style.removeProperty('--home-reveal-delay');
    }
  };
  document.addEventListener('transitionend',onRevealEnd);
  const updateScroll=()=>{
    const scrolled=header.classList.contains('header-is-scrolled');
    // Switch where the hero's bottom approaches the floating header, independent of screen size.
    const heroEnd=hero?.getBoundingClientRect().bottom??0;
    const headerEnd=header.getBoundingClientRect().bottom;
    header.classList.toggle('header-is-scrolled',preview||!isHome||heroEnd<=headerEnd+(scrolled?72:48));
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
    watermarkObserver?.disconnect();
    teamObserver?.disconnect();
    journeyObserver?.disconnect();
    watermark?.classList.remove('watermark-waiting','watermark-visible');
    finishPrices();
    faqRows.forEach(node=>{node.classList.remove('faq-line-waiting','faq-line-visible');node.style.removeProperty('--detail-delay');});
    starGroups.forEach(node=>{node.classList.remove('stars-waiting','stars-visible');node.style.removeProperty('--stars-delay');});
    teamCards.forEach(node=>{node.classList.remove('team-card-waiting','team-card-visible');node.style.removeProperty('--team-card-delay');});
    journeyGrid?.classList.remove('journey-waiting','journey-visible');
    journeyGrid?.querySelectorAll(':scope>li').forEach(node=>node.style.removeProperty('--journey-delay'));
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
    faqRows.forEach(node=>node.classList.add('faq-line-waiting'));
    starGroups.forEach(node=>node.classList.add('stars-waiting'));
    observer=new IntersectionObserver(entries=>{
      // Keep a local rhythm across observer callbacks, including slow scrolling.
      const now=performance.now();
      entries.filter(entry=>entry.isIntersecting).forEach(entry=>{
        const node=entry.target;
        const group=node.closest('.home-section-intro,.therapy-grid,.team-feature-copy,.review-card,.section-heading,.home-distinction-copy,.home-distinction-benefits,.home-price-panel,.home-faq-intro,.faq-list,.footer-top,.listing-grid,.team-roster,.team-profiles,.process-grid,.service-intro,.therapist-intro,.therapist-section,.clinical-card,.info-card,.weekly-hours,.booking-layout')||node.parentElement;
        const delay=Math.min(800,Math.max(140,(groupTimings.get(group)||0)-now));
        groupTimings.set(group,now+delay+(node.matches('details')?220:170));
        node.style.setProperty('--home-reveal-delay',`${delay}ms`);
        node.classList.add('home-reveal-visible');
        if(node.matches('.home-price-range'))animatePrices(delay+240);
        if(node.matches('.home-faq details')){
          node.style.setProperty('--detail-delay',`${delay+180}ms`);
          node.classList.add('faq-line-visible');
        }
        if(node.matches('.review-card figcaption')){
          const stars=node.querySelector('.review-stars');
          stars?.style.setProperty('--stars-delay',`${delay+300}ms`);
          stars?.classList.add('stars-visible');
        }
        observer.unobserve(node);
      });
    },{threshold:.18,rootMargin:`0px 0px -${Math.min(140,Math.max(90,innerHeight*.18))}px 0px`});
    targets.forEach(node=>observer.observe(node));
    if(teamCards.length){
      teamCards.forEach((card,index)=>{
        card.style.setProperty('--team-card-delay',`${100+(index%5)*115}ms`);
        card.classList.add('team-card-waiting');
      });
      teamObserver=new IntersectionObserver(entries=>{
        entries.filter(entry=>entry.isIntersecting).forEach(entry=>{
          entry.target.classList.add('team-card-visible');
          teamObserver.unobserve(entry.target);
        });
      },{threshold:.16,rootMargin:'0px 0px -12% 0px'});
      requestAnimationFrame(()=>requestAnimationFrame(()=>teamCards.forEach(card=>{
        if(card.isConnected&&card.classList.contains('team-card-waiting'))teamObserver.observe(card);
      })));
    }
    if(journeyGrid){
      journeyGrid.querySelectorAll(':scope>li').forEach((step,index)=>step.style.setProperty('--journey-delay',`${120+index*430}ms`));
      journeyGrid.classList.add('journey-waiting');
      journeyObserver=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){
          journeyGrid.classList.add('journey-visible');
          journeyObserver.disconnect();
        }
      },{threshold:.25,rootMargin:'0px 0px -80px 0px'});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(journeyGrid.isConnected&&journeyGrid.classList.contains('journey-waiting'))journeyObserver.observe(journeyGrid);
      }));
    }
    if(watermark){
      watermark.classList.add('watermark-waiting');
      // Observe the stationary parent so the upward entrance cannot shift its trigger.
      watermarkObserver=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.55)){
          watermark.classList.add('watermark-visible');
          watermarkObserver.disconnect();
        }
      },{threshold:.55});
      watermarkObserver.observe(watermark);
    }
    const intro=[
      ['.hero-copy>.eyebrow',0],
      ['.hero-copy h1>span:first-of-type',180],
      ['.hero-copy h1>span:last-of-type',400],
      ['.hero-copy>p',650],
      ['.hero-actions>a:first-child',850],
      ['.hero-actions>a:last-child',1040],
      ['.home-hero-divider',1200],
      ...[1,2,3,4].map((n,i)=>[`.hero-quick-strip .quick-links>a:nth-child(${n})`,1350+i*170])
    ];
    // Start from the poster too: a slow or blocked video never holds up reading.
    intro.forEach(([selector,delay])=>{
      const node=document.querySelector(selector);
      const line=selector==='.home-hero-divider';
      if(node)animations.push(node.animate([{opacity:0,transform:line?'scaleX(0)':'translateY(18px)'},{opacity:1,transform:line?'scaleX(1)':'translateY(0)'}],{duration:line?1500:1150,delay,easing:'cubic-bezier(.25,.1,.25,1)',fill:'backwards'}));
    });
  }
  const onMotion=()=>{if(motion.matches)showAll();updateScroll();};
  const onFocus=event=>{
    const focused=event.target.closest('.home-reveal-ready');
    focused?.classList.add('home-reveal-visible');
    event.target.closest('.team-card-waiting')?.classList.add('team-card-visible');
    const row=event.target.closest('.faq-line-waiting');
    if(row){row.style.setProperty('--detail-delay','0ms');row.classList.add('faq-line-visible');}
    const stars=event.target.closest('figcaption')?.querySelector('.review-stars');
    if(stars){stars.style.setProperty('--stars-delay','0ms');stars.classList.add('stars-visible');}
    animations.forEach(animation=>{if(animation.effect?.target?.contains(event.target))animation.finish();});
  };
  motion.addEventListener('change',onMotion);
  document.addEventListener('focusin',onFocus);
  return ()=>{
    showAll();
    cleanTeamHover();
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

// A white, inert copy is wiped by exactly the same edge as the expanding photo.
// The original remains the only accessible and interactive text/link.
function enhanceTeamHover(){
  const panel=document.querySelector('.team-feature');
  const photo=panel?.querySelector('.home-team-photo');
  const copy=panel?.querySelector('.team-feature-copy');
  if(!photo||!copy)return ()=>{};
  const whiteCopy=copy.cloneNode(true);
  whiteCopy.classList.add('team-feature-white');
  whiteCopy.setAttribute('aria-hidden','true');
  whiteCopy.inert=true;
  [whiteCopy,...whiteCopy.querySelectorAll('*')].forEach(node=>{
    ['id','data-copy-key','data-home-reveal'].forEach(attribute=>node.removeAttribute(attribute));
  });
  copy.append(whiteCopy);
  const measure=()=>{
    const panelWidth=panel.getBoundingClientRect().width,photoWidth=photo.getBoundingClientRect().width;
    panel.style.setProperty('--team-width',`${panelWidth}px`);
    panel.style.setProperty('--team-photo-shift',`${panelWidth*.44}px`);
    // Cover both frame endpoints plus its brief elastic stretch and blur bleed.
    // The fixed canvas prevents object-fit from zooming in and out during the slide.
    panel.style.setProperty('--team-image-width',`${Math.max(photoWidth,panelWidth*.56)+panelWidth*.075+16}px`);
    panel.style.setProperty('--team-photo-width',`${photoWidth}px`);
    panel.style.setProperty('--team-uncovered',`${panelWidth-photoWidth}px`);
  };
  const observer=new ResizeObserver(measure);
  observer.observe(panel);observer.observe(photo);
  measure();
  panel.classList.add('team-hover-ready');
  return ()=>{
    observer.disconnect();whiteCopy.remove();panel.classList.remove('team-hover-ready');
    ['--team-width','--team-photo-width','--team-uncovered','--team-photo-shift','--team-image-width'].forEach(name=>panel.style.removeProperty(name));
  };
}
