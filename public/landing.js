// Text and detail entrances stay separate from hover and background parallax.
export function enhanceLanding({preview=false}={}){
  if(!document.body.classList.contains('public-page'))return;
  const isHome=document.body.classList.contains('home-page');
  const header=document.querySelector('.header');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=[];
  const atmosphere=document.querySelector('.home-surface');
  const background=document.querySelector('.home-atmosphere-background');
  const homeShader=document.querySelector('#home-mesh-shader');
  const teamFeature=document.querySelector('.home-page .team-feature');
  const priceSection=document.querySelector('.home-page .home-price-wrap');
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
    // Carousel cards must remain visible even when an in-app browser misses a reveal event.
    '.home-section-link','.home-team-photo',
    '.team-feature-copy>.eyebrow','.team-feature-copy>h2','.team-feature-copy>p','.team-feature-copy>.text-link',
    '.home-people .section-heading>div>*','.home-people .review-quote','.home-people .review-card blockquote','.home-people .review-card figcaption',
    '.home-distinction-copy>.eyebrow','.home-distinction-copy>h2','.home-distinction-benefits li',
    '.home-price-copy>*','.home-price-figure>*','.home-faq-intro>*','.home-faq .faq-list>details',
    '.home-scroll-line','.footer-top>div','.footer-bottom',
    // Interior templates share the rhythm, while forms and dense tables stay ready to use.
    '.interior-page .article>.eyebrow','.interior-page .article>h1','.interior-page .article>.article-intro',
    '.interior-page .article>.article-body>*','.interior-page .listing-card',
    '.interior-page .about-specialisation-copy>*','.interior-page .about-specialisation>h2',
    '.interior-page .service-intro>div>*','.interior-page .service-intro>img',
    '.interior-page .clinical-card>.eyebrow','.interior-page .clinical-card>h2','.interior-page .clinical-card>h3','.interior-page .clinical-card>p','.interior-page .clinical-card>ul',
    '.interior-page .clinical-aside>.eyebrow','.interior-page .clinical-aside>h2','.interior-page .clinical-aside>p','.interior-page .clinical-aside>.text-link',
    '.interior-page .therapist-photo-frame','.interior-page .therapist-intro>:not(.therapist-bio)','.interior-page .therapist-bio>*',
    '.interior-page .therapist-section>h2','.interior-page .therapist-section>p','.interior-page .therapist-section>ul',
    '.interior-page .therapist-profile-end>*',
    '.interior-page .info-card>.eyebrow','.interior-page .info-card>h2','.interior-page .info-card>h3',
    '.interior-page .info-card>p','.interior-page .info-card>a','.interior-page .weekly-hours>div',
    '.interior-page .faq-list>details',
    '.interior-page .booking-layout>div:first-child>*',
    '.interior-page #booking-form'

  ].join(','))];
  const panelTargets=[...document.querySelectorAll('.interior-page :is(.article,.clinical-reading)>.clinical-card,.interior-page .therapist-section,.interior-page .contact-grid>:is(.info-card,.map-card)')];
  targets.push(...panelTargets);
  for(let index=targets.length-1;index>=0;index--){
    if(panelTargets.some(panel=>panel!==targets[index]&&panel.contains(targets[index])))targets.splice(index,1);
  }
  targets.sort((a,b)=>a===b?0:a.compareDocumentPosition(b)&4?-1:1);
  const cleanTeamHover=enhanceTeamHover();
  const cleanSlidingCards=enhanceSlidingCards();
  const cleanTherapyCarousel=enhanceTherapyCarousel();
  const watermark=document.querySelector('.home-footer-watermark');
  const priceValues=[...document.querySelectorAll('.home-price-value')].map((node,index)=>({node,final:Number(node.dataset.priceValue),text:node.textContent,duration:index===1?940:1000}));
  const faqRows=[...document.querySelectorAll('.home-faq .faq-list>details')];
  const benefitRows=[...document.querySelectorAll('.home-distinction-benefits>li')];
  const starGroups=[...document.querySelectorAll('.home-people .review-stars')];
  const teamCards=[...document.querySelectorAll('.interior-page[data-page="/ueber-uns"] .team-directory :is(.team-person,.team-aim-card)')];
  const journeyGrid=document.querySelector('.interior-page[data-page="/ablauf-wahltherapie"] .process-grid');
  const groupTimings=new WeakMap();
  let observer,watermarkObserver,teamObserver,journeyObserver,frame,priceFrame,disposed=false;
  const initiallyVisible=node=>{
    if(!node.isConnected)return false;
    const rect=node.getBoundingClientRect();
    return rect.bottom>0&&rect.top<innerHeight*.96&&rect.width>0&&rect.height>0;
  };
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
    if(event.pseudoElement)return;
    if((['translate','scale'].includes(event.propertyName)||(event.propertyName==='opacity'&&event.target.closest('.home-distinction')))&&event.target.classList.contains('home-reveal-visible')){
      event.target.classList.remove('home-reveal-ready','home-reveal-visible');
      event.target.style.removeProperty('--home-reveal-delay');
    }
  };
  const onIntroEnd=event=>{
    if(!event.target.classList.contains('interior-load-reveal')&&!event.target.classList.contains('journey-step-load'))return;
    event.target.classList.remove('interior-load-reveal','journey-step-load');
    event.target.style.removeProperty('--interior-load-delay');
  };
  document.addEventListener('transitionend',onRevealEnd);
  document.addEventListener('animationend',onIntroEnd);
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
    if(homeShader){
      const reveal=node=>{
        if(!node)return 0;
        const rect=node.getBoundingClientRect();
        const enter=Math.max(0,Math.min(1,(innerHeight*.86-rect.top)/240));
        const leave=Math.max(0,Math.min(1,(rect.bottom-innerHeight*.14)/240));
        return enter*leave;
      };
      const opacity=Math.max(reveal(teamFeature)*.78,reveal(priceSection)*.92);
      homeShader.style.setProperty('--home-mesh-opacity',opacity.toFixed(3));
    }
    frame=null;
  };
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(updateScroll);};
  const showAll=()=>{
    document.body.classList.remove('interior-reveal-pending');
    document.body.classList.remove('team-reveal-enabled');
    observer?.disconnect();
    watermarkObserver?.disconnect();
    teamObserver?.disconnect();
    journeyObserver?.disconnect();
    watermark?.classList.remove('watermark-waiting','watermark-visible');
    finishPrices();
    faqRows.forEach(node=>{node.classList.remove('faq-line-waiting','faq-line-visible');node.style.removeProperty('--detail-delay');});
    benefitRows.forEach(node=>{node.classList.remove('benefit-line-waiting','benefit-line-visible');node.style.removeProperty('--benefit-line-delay');});
    starGroups.forEach(node=>{node.classList.remove('stars-waiting','stars-visible');node.style.removeProperty('--stars-delay');});
    teamCards.forEach(node=>{node.classList.remove('team-card-priming','team-card-waiting','team-card-visible','interior-load-reveal');node.style.removeProperty('--team-card-delay');node.style.removeProperty('--interior-load-delay');});
    journeyGrid?.querySelectorAll(':scope>li').forEach(node=>{node.classList.remove('journey-step-waiting','journey-step-visible','journey-step-load');node.style.removeProperty('--journey-delay');});
    targets.forEach(node=>node.classList.remove('home-reveal-ready','home-reveal-visible'));
    targets.forEach(node=>{node.classList.remove('interior-load-reveal');node.style.removeProperty('--interior-load-delay');});
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
    benefitRows.forEach(node=>node.classList.add('benefit-line-waiting'));
    starGroups.forEach(node=>node.classList.add('stars-waiting'));
    const revealTarget=(node,now)=>{
      if(disposed||!node.classList.contains('home-reveal-ready')||node.classList.contains('home-reveal-visible'))return;
      const group=node.closest('.home-distinction,.home-section-intro,.therapy-grid,.team-feature-copy,.review-card,.section-heading,.home-price-panel,.home-faq-intro,.faq-list,.footer-top,.listing-grid,.team-roster,.team-profiles,.process-grid,.service-intro,.therapist-intro,.therapist-section,.therapist-profile-end,.clinical-card,.about-specialisation,.info-card,.weekly-hours,.booking-layout')||node.parentElement;
      const delay=Math.min(group.matches('.home-distinction')?2100:800,Math.max(140,(groupTimings.get(group)||0)-now));
      groupTimings.set(group,now+delay+(node.matches('details')?220:170));
      node.style.setProperty('--home-reveal-delay',`${delay}ms`);
      node.classList.add('home-reveal-visible');
      if(node.matches('.home-price-range'))animatePrices(delay+240);
      if(node.matches('.home-faq details')){
        node.style.setProperty('--detail-delay',`${delay+180}ms`);
        node.classList.add('faq-line-visible');
      }
      if(node.matches('.home-distinction-benefits>li')){
        node.style.setProperty('--benefit-line-delay',`${delay+90}ms`);
        node.classList.add('benefit-line-visible');
      }
      if(node.matches('.review-card figcaption')){
        const stars=node.querySelector('.review-stars');
        stars?.style.setProperty('--stars-delay',`${delay+300}ms`);
        stars?.classList.add('stars-visible');
      }
      observer.unobserve(node);
    };
    observer=new IntersectionObserver(entries=>{
      const now=performance.now();
      entries.filter(entry=>entry.isIntersecting).forEach(entry=>revealTarget(entry.target,now));
    },{threshold:.18,rootMargin:`0px 0px -${Math.min(140,Math.max(90,innerHeight*.18))}px 0px`});
    // Elements below the opening viewport keep their scroll-triggered reveal.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(disposed||motion.matches)return;
      if(!isHome){
        targets.filter(initiallyVisible).forEach((node,index)=>{
          node.classList.remove('home-reveal-ready');
          node.style.setProperty('--interior-load-delay',`${180+index*190}ms`);
          node.classList.add('interior-load-reveal');
        });
      }
      targets.forEach(node=>{
        if(node.isConnected&&node.classList.contains('home-reveal-ready')&&!node.classList.contains('home-reveal-visible'))observer.observe(node);
      });
      document.body.classList.remove('interior-reveal-pending');
    }));
    if(teamCards.length){
      const rowPositions=new Map();
      const startedCards=new WeakSet();
      teamCards.forEach(card=>{
        const row=Math.round(card.getBoundingClientRect().top/8);
        const position=rowPositions.get(row)||0;
        rowPositions.set(row,position+1);
        card.style.setProperty('--team-card-delay',`${90+position*110}ms`);
        card.classList.add('team-card-priming','team-card-waiting');
      });
      const revealTeamCard=card=>{
        if(disposed||startedCards.has(card))return;
        startedCards.add(card);
        teamObserver.unobserve(card);
        // An image arriving mid-transition makes the first visible row look different.
        const photos=[...card.querySelectorAll('img')];
        Promise.all(photos.map(photo=>photo.complete?Promise.resolve():Promise.race([
          photo.decode().catch(()=>{}),
          new Promise(resolve=>setTimeout(resolve,750))
        ]))).then(()=>{
          if(!disposed&&card.isConnected&&card.classList.contains('team-card-waiting'))card.classList.add('team-card-visible');
        });
      };
      teamObserver=new IntersectionObserver(entries=>{
        entries.filter(entry=>entry.isIntersecting).forEach(entry=>revealTeamCard(entry.target));
      },{threshold:.25,rootMargin:'0px 0px -22% 0px'});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(disposed)return;
        const initialCards=teamCards.filter(initiallyVisible);
        const initialCardSet=new Set(initialCards);
        teamCards.forEach(card=>{
          if(initialCardSet.has(card))return;
          if(card.isConnected&&card.classList.contains('team-card-waiting')){
            card.classList.remove('team-card-priming');
            teamObserver.observe(card);
          }
        });
        if(!initialCards.length)return;
        const photos=initialCards.flatMap(card=>[...card.querySelectorAll('img')]);
        Promise.all(photos.map(photo=>photo.complete?Promise.resolve():Promise.race([
          photo.decode().catch(()=>{}),
          new Promise(resolve=>setTimeout(resolve,750))
        ]))).then(()=>{
          if(disposed||motion.matches)return;
          initialCards.forEach((card,index)=>{
            if(!card.isConnected)return;
            card.classList.remove('team-card-priming','team-card-waiting');
            card.classList.add('team-card-visible');
            card.style.setProperty('--interior-load-delay',`${760+index*150}ms`);
            card.classList.add('interior-load-reveal');
          });
        });
      }));
    }
    if(journeyGrid){
      const steps=[...journeyGrid.querySelectorAll(':scope>li')];
      steps.forEach(step=>step.classList.add('journey-step-waiting'));
      journeyObserver=new IntersectionObserver(entries=>{
        entries.filter(entry=>entry.isIntersecting).forEach(entry=>{
          entry.target.classList.add('journey-step-visible');
          journeyObserver.unobserve(entry.target);
        });
      },{threshold:.25,rootMargin:'0px 0px -80px 0px'});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(disposed)return;
        steps.forEach((step,index)=>{
          if(!step.isConnected)return;
          if(initiallyVisible(step)){
            step.classList.remove('journey-step-waiting');
            step.style.setProperty('--interior-load-delay',`${780+index*350}ms`);
            step.classList.add('journey-step-load');
          }else{
            step.style.setProperty('--journey-delay',`${Math.min(index,2)*150}ms`);
            journeyObserver.observe(step);
          }
        });
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
    disposed=true;
    showAll();
    cleanTeamHover();
    cleanSlidingCards();
    cleanTherapyCarousel();
    sizeObserver.disconnect();
    if(frame)cancelAnimationFrame(frame);
    window.removeEventListener('scroll',onScroll);
    window.removeEventListener('resize',onScroll);
    motion.removeEventListener('change',onMotion);
    document.removeEventListener('focusin',onFocus);
    document.removeEventListener('transitionend',onRevealEnd);
    document.removeEventListener('animationend',onIntroEnd);
    decorativeLines.forEach(line=>line.remove());
    atmosphere?.style.removeProperty('--home-atmosphere-shift');
    atmosphere?.style.removeProperty('--home-background-top');
    homeShader?.style.removeProperty('--home-mesh-opacity');
  };
}

function enhanceTherapyCarousel(){
  const track=document.querySelector('.home-page .therapy-grid');
  const nav=document.querySelector('.home-page .therapy-carousel-dots');
  if(!track||!nav)return ()=>{};
  const cards=[...track.querySelectorAll('.therapy-card')];
  const buttons=[...nav.querySelectorAll('[data-therapy-slide]')];
  const mobile=matchMedia('(max-width:767px)');
  if(cards.length<2||buttons.length!==cards.length)return ()=>{};
  let frame=0;
  const markActive=index=>buttons.forEach((button,i)=>{
    const active=i===index;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const update=()=>{
    frame=0;
    if(!mobile.matches)return;
    const center=track.getBoundingClientRect().left+track.clientLeft+track.clientWidth/2;
    let nearest=0,distance=Infinity;
    cards.forEach((card,index)=>{
      const rect=card.getBoundingClientRect();
      const next=Math.abs(rect.left+rect.width/2-center);
      if(next<distance){distance=next;nearest=index;}
    });
    markActive(nearest);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const onDot=event=>{
    const button=event.currentTarget,index=Number(button.dataset.therapySlide),card=cards[index];
    if(!card||!mobile.matches)return;
    const style=getComputedStyle(track),inset=parseFloat(style.scrollPaddingInlineStart)||0;
    const left=card.getBoundingClientRect().left-track.getBoundingClientRect().left+track.scrollLeft-inset;
    track.scrollTo({left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  buttons.forEach(button=>button.addEventListener('click',onDot));
  track.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  mobile.addEventListener('change',schedule);
  schedule();
  return ()=>{
    if(frame)cancelAnimationFrame(frame);
    buttons.forEach(button=>button.removeEventListener('click',onDot));
    track.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
    mobile.removeEventListener('change',schedule);
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
    panel.style.setProperty('--team-photo-shift',`${panelWidth-photoWidth}px`);
    panel.style.setProperty('--team-photo-width',`${photoWidth}px`);
    // Pre-size the image for the widest frame of the slide, then never resize it mid-animation.
    panel.style.setProperty('--team-image-width',`${photoWidth+(panelWidth-photoWidth)*.23+10}px`);
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

// Each new pointer entry toggles the team panel; leaving it keeps the chosen state.
function enhanceSlidingCards(){
  const desktop=matchMedia('(min-width:1001px) and (hover:hover) and (pointer:fine)');
  const cleanups=[];
  document.querySelectorAll('.team-feature.team-hover-ready').forEach(panel=>{
    const button=panel.querySelector('.home-team-plus');
    if(!button)return;
    const revealCopy=()=>panel.querySelectorAll('.team-feature-copy>.home-reveal-ready').forEach((node,index)=>{
      if(node.classList.contains('home-reveal-visible'))return;
      node.style.setProperty('--home-reveal-delay',`${index*100}ms`);
      node.classList.add('home-reveal-visible');
    });
    const update=()=>{
      const open=desktop.matches&&panel.classList.contains('is-open');
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?(document.documentElement.lang==='en'?'Hide team members':'Teammitglieder ausblenden'):(document.documentElement.lang==='en'?'Show team members':'Teammitglieder anzeigen'));
    };
    const onClick=event=>{
      if(!desktop.matches||event.target!==button&&!button.contains(event.target))return;
      revealCopy();
      panel.classList.toggle('is-open');
      update();
    };
    const onEnter=()=>{
      if(!desktop.matches)return;
      revealCopy();
      panel.classList.toggle('is-open');
      update();
    };
    const onKey=event=>{
      if(event.key!=='Escape'||!panel.classList.contains('is-open'))return;
      panel.classList.remove('is-open');
      update();
      button.focus();
    };
    const onMedia=()=>{
      panel.classList.remove('is-open');
      update();
    };
    panel.addEventListener('click',onClick);
    panel.addEventListener('pointerenter',onEnter);
    panel.addEventListener('keydown',onKey);
    desktop.addEventListener('change',onMedia);
    cleanups.push(()=>{
      panel.removeEventListener('click',onClick);
      panel.removeEventListener('pointerenter',onEnter);
      panel.removeEventListener('keydown',onKey);
      desktop.removeEventListener('change',onMedia);
      panel.classList.remove('is-open');
    });
  });
  return ()=>cleanups.forEach(cleanup=>cleanup());
}
