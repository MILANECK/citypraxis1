import {ChatError} from './validation.mjs';

// Responses can contain commentary before the structured final answer.
// Never concatenate distinct messages or accept a partial/refused answer.
export function structuredResponse(payload){
  const unavailable=()=>{throw new ChatError('ai_unavailable',503);};
  if(payload?.status!=='completed'||!Array.isArray(payload.output))unavailable();
  const messages=payload.output.filter(item=>item.type==='message'||(!item.type&&Array.isArray(item.content)));
  const finals=messages.filter(item=>item.phase==='final_answer');
  const candidates=finals.length?finals:messages.filter(item=>item.phase==null);
  if(candidates.length!==1)unavailable();
  const message=candidates[0];
  if(message.role&&message.role!=='assistant'||message.status&&message.status!=='completed')unavailable();
  if(!Array.isArray(message.content)||message.content.some(block=>block.type==='refusal'))unavailable();
  const blocks=message.content.filter(block=>block.type==='output_text');
  if(!blocks.length||blocks.some(block=>typeof block.text!=='string'))unavailable();
  try{return JSON.parse(blocks.map(block=>block.text).join(''));}catch{unavailable();}
}
