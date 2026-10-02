export async function enhanceConfirmation(element) {
  element.classList.add('request-confirmation');
  element.querySelector('.success-mark,.chat-success')?.remove();
  const picture=document.createElement('picture');
  picture.className='confirmation-logo';
  picture.innerHTML='<source media="(prefers-reduced-motion: reduce)" srcset="/assets/confirmation-reveal-still.svg"><img src="/assets/confirmation-reveal.svg" alt="" width="2000" height="2000">';
  element.prepend(picture);
  element.setAttribute('tabindex','-1');
  element.focus({preventScroll:true});
}
