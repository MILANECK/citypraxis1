const SVG_NS='http://www.w3.org/2000/svg';

export function progressMeter(value,className,fillClass=''){
  const percent=Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):0;
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 100 1');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add(className);
  const rect=document.createElementNS(SVG_NS,'rect');
  rect.setAttribute('x','0');rect.setAttribute('y','0');rect.setAttribute('width',String(percent));rect.setAttribute('height','1');
  rect.classList.add('progress-meter-fill');
  if(fillClass)rect.classList.add(fillClass);
  svg.append(rect);
  return svg;
}
