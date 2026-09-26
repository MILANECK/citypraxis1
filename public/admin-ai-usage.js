export function showAIUsage(panel,data,language='de'){
  const en=language==='en',t=(a,b)=>en?a:b;
  panel.innerHTML=`<h2>${t('AI Chatbot Usage','KI-Chatbot-Nutzung')}</h2>`;
  const note=text=>{const p=document.createElement('p');p.className='ai-usage-note';p.textContent=text;panel.append(p);};
  if(data.loading){note(t('Checking usage…','Nutzung wird geladen …'));return;}
  if(!data.available){note(t('Usage tracking is currently unavailable. Check the database migration.','Nutzungsdaten sind derzeit nicht verfügbar. Bitte Datenbankmigration prüfen.'));return;}
  const money=n=>Number.isFinite(n)?new Intl.NumberFormat(en?'en-US':'de-AT',{style:'currency',currency:'USD'}).format(n):'—';
  const metrics=document.createElement('div');metrics.className='ai-usage-metrics';
  for(const [label,value] of [[t('This month · estimated','Dieser Monat · geschätzt'),money(data.cost)],[t('Monthly budget','Monatsbudget'),money(data.budget)],[t('Estimated remaining','Geschätzt verbleibend'),money(data.remaining)],[t('Chats this month','Chats diesen Monat'),String(Number(data.conversations)||0)]]){
    const item=document.createElement('div'),small=document.createElement('span'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;item.append(small,strong);metrics.append(item);
  }
  panel.append(metrics);
  const percent=data.budget>0?Math.min(100,100*data.cost/data.budget):data.cost>0?100:0;
  if(data.budget!==null){const bar=document.createElement('div');bar.className='ai-usage-track';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',t('Monthly spend versus budget','Monatskosten im Verhältnis zum Budget'));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(Math.round(percent)));const fill=document.createElement('span');fill.style.width=`${percent}%`;fill.className=data.exceeded?'over':percent>=80?'near':'';bar.append(fill);panel.append(bar);}
  if(data.exceeded)note(t('Monthly budget exceeded.','Monatsbudget überschritten.'));
  if(data.budget===null)note(t('Monthly budget configuration is invalid.','Die Einstellung des Monatsbudgets ist ungültig.'));
  if(data.incomplete)note(t('Estimate incomplete: some usage could not be priced or saved.','Schätzung unvollständig: Einige Nutzungsdaten konnten nicht berechnet oder gespeichert werden.'));
  note(t('Estimated API cost, not the OpenAI account balance. Calendar month in UTC.','Geschätzte API-Kosten, kein OpenAI-Kontoguthaben. Kalendermonat in UTC.'));
  const since=data.tracking_since?new Date(data.tracking_since):null;
  if(since&&!Number.isNaN(since.getTime()))note(t('Recorded usage since ','Erfasste Nutzung seit ')+since.toLocaleDateString(en?'en-GB':'de-AT',{timeZone:'UTC'})+t('; earlier usage is not included.','; frühere Nutzung ist nicht enthalten.'));
  else note(t('Tracking starts with the next chatbot conversation.','Die Erfassung beginnt mit dem nächsten Chat.'));
}
