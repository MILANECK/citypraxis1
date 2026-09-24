export async function enhanceConfirmation(element) {
  element.classList.add('request-confirmation');
  element.querySelector('.success-mark,.chat-success')?.remove();
  const picture=document.createElement('picture');
  picture.className='confirmation-logo';
  picture.innerHTML='<source media="(prefers-reduced-motion: reduce)" srcset="/assets/confirmation-logo-still.webp"><img src="/assets/confirmation-logo.webp" alt="" width="768" height="432">';
  element.prepend(picture);
  element.setAttribute('tabindex','-1');
  element.focus({preventScroll:true});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  await document.fonts.ready;
  if(!element.isConnected)return;
  let line=0;
  for(const block of element.querySelectorAll('h2,h3,p')) {
    const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const fragment=document.createDocumentFragment();
      for(const part of node.textContent.split(/(\s+)/u)){
        if(!part)continue;
        if(/^\s+$/u.test(part)){fragment.append(part);continue;}
        const word=document.createElement('span');word.className='confirmation-word';word.textContent=part;fragment.append(word);
      }
      node.replaceWith(fragment);
    }
    let previousTop;
    for(const word of block.querySelectorAll('.confirmation-word')){
      const top=Math.round(word.getBoundingClientRect().top);
      if(top!==previousTop){line++;previousTop=top;}
      word.style.setProperty('--reveal-delay',`${180+line*110}ms`);
    }
  }
  element.classList.add('confirmation-reveal');
}
