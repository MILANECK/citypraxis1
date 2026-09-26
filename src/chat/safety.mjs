export function safetySignal(value){
  const emergency=/\b(can'?t breathe|cannot breathe|not breathing|chest pain|severe bleeding|kill myself|suicid\w*|stroke now|herzinfarkt|schlaganfall|atemnot|keine luft|nicht atmen|starke brustschmerzen|starke blutung|umbringen)\b/ig;
  for(const match of value.matchAll(emergency)){if(!/\b(no|not|kein\w*|ohne)\s*$/i.test(value.slice(Math.max(0,match.index-16),match.index)))return 'emergency';}
  return /\b(diagnos\w*|which medication|what medicine|what exercises|recommend.*treatment|should i take|welche medikamente|welche übungen|welche behandlung|mrt auswerten|befund interpretieren)\b/i.test(value)?'medical':null;
}
export const aiEnabled=()=>process.env.CHAT_AI_ENABLED==='true'&&Boolean(process.env.OPENAI_API_KEY);
