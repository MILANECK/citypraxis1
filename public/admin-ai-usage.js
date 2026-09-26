export function showAIUsage(panel,data,language='de'){
  const en=language==='en',t=(a,b)=>en?a:b;
  panel.innerHTML=`<h2>${t('AI Chatbot Usage','KI-Chatbot-Nutzung')}</h2>`;
  const note=text=>{const p=document.createElement('p');p.className='ai-usage-note';p.textContent=text;panel.append(p);};
  if(data.loading){note(t('Checking OpenAI reported costs…','OpenAI-Kosten werden abgerufen …'));return;}
  if(!data.available){note(t('Chat activity is currently unavailable.','Chat-Aktivität ist derzeit nicht verfügbar.'));return;}
  const money=n=>Number.isFinite(n)?new Intl.NumberFormat(en?'en-US':'de-AT',{style:'currency',currency:'USD'}).format(n):'—';
  const costAvailable=data.costAvailable===true;
  const metrics=document.createElement('div');metrics.className='ai-usage-metrics';
  const metricsToShow=[
    [t('OpenAI reported · this month','OpenAI gemeldet · dieser Monat'),costAvailable?money(data.cost):'—']
  ];
  if(Number.isFinite(data.budget)){
    metricsToShow.push([t('Monthly AI budget','Monatsbudget KI'),money(data.budget)]);
    metricsToShow.push([t('Budget remaining','Verbleibendes Budget'),costAvailable?money(data.remaining):'—']);
  }
  metricsToShow.push([t('Chat conversations this month','Chat-Gespräche diesen Monat'),String(Number(data.conversations)||0)]);
  for(const [label,value] of metricsToShow){
    const item=document.createElement('div'),small=document.createElement('span'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;item.append(small,strong);metrics.append(item);
  }
  panel.append(metrics);
  if(costAvailable&&Number.isFinite(data.budget)){
    const percent=data.budget>0?Math.min(100,100*data.cost/data.budget):data.cost>0?100:0;
    const bar=document.createElement('div');bar.className='ai-usage-track';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',t('OpenAI reported monthly project cost versus budget','Von OpenAI gemeldete monatliche Projektkosten im Verhältnis zum Budget'));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(Math.round(percent)));
    const fill=document.createElement('span');fill.style.width=`${percent}%`;fill.className=data.exceeded?'over':percent>=80?'near':'';bar.append(fill);panel.append(bar);
    if(data.exceeded)note(t('Monthly budget exceeded.','Monatsbudget überschritten.'));
  }
  if(!costAvailable){
    const setup=t('Actual OpenAI costs are not connected yet. Add OPENAI_ADMIN_KEY and OPENAI_PROJECT_ID to the server environment.','Die tatsächlichen OpenAI-Kosten sind noch nicht verbunden. OPENAI_ADMIN_KEY und OPENAI_PROJECT_ID in der Serverumgebung eintragen.');
    const errors={permission:t('OpenAI did not authorize the cost report. Check the admin key permissions.','OpenAI hat den Kostenbericht nicht autorisiert. Bitte die Berechtigungen des Admin-Schlüssels prüfen.'),upstream:t('OpenAI reported costs could not be retrieved right now.','Die von OpenAI gemeldeten Kosten konnten gerade nicht abgerufen werden.'),incomplete:t('OpenAI returned an incomplete cost report. Try refreshing later.','OpenAI hat einen unvollständigen Kostenbericht zurückgegeben. Bitte später erneut laden.')};
    note(['not_configured','project_not_configured'].includes(data.costReason)?setup:errors[data.costReason]||errors.upstream);
  }else{
    note(t('OpenAI-reported cost for the configured project. The report can lag behind recent usage; it is not the prepaid account balance.','Von OpenAI gemeldete Kosten für das konfigurierte Projekt. Der Bericht kann aktuelle Nutzung verzögert anzeigen; er ist kein Prepaid-Kontostand.'));
    if(data.reportedAt){const at=new Date(data.reportedAt);if(!Number.isNaN(at.getTime()))note(t('Retrieved from OpenAI ','Von OpenAI abgerufen ')+at.toLocaleString(en?'en-GB':'de-AT',{timeZone:'UTC',timeZoneName:'short'}));}
  }
  if(!Number(data.conversations)&&!data.tracking_since)note(t('No chat activity has been recorded this month. Older conversations are not backfilled.','Diesen Monat wurde noch keine Chat-Aktivität erfasst. Ältere Gespräche werden nicht nachträglich eingetragen.'));
  if(data.trackingIncomplete)note(t('Some chat activity could not be recorded by the website.','Einige Chat-Aktivitäten konnten von der Website nicht erfasst werden.'));
}
