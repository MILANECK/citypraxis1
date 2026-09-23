import {createHmac,randomUUID,timingSafeEqual,randomBytes} from 'node:crypto';
import {isIP} from 'node:net';
import {ChatError} from './validation.mjs';
const processSecret=randomBytes(32).toString('hex');
export function signingSecret(){return process.env.CHAT_SESSION_SECRET||process.env.SUPABASE_SECRET_KEY||processSecret;}
export function sign(value){const payload=Buffer.from(JSON.stringify(value)).toString('base64url');return `${payload}.${createHmac('sha256',signingSecret()).update(payload).digest('base64url')}`;}
export function verify(token,kind){
  if(typeof token!=='string'||token.length>10000)throw new ChatError('session_expired',401);
  const [payload,signature,...extra]=token.split('.');if(!payload||!signature||extra.length||! /^[A-Za-z0-9_-]+$/.test(payload)||! /^[A-Za-z0-9_-]+$/.test(signature))throw new ChatError('session_expired',401);
  const expected=createHmac('sha256',signingSecret()).update(payload).digest('base64url');
  if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new ChatError('session_expired',401);
  let value;try{value=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{throw new ChatError('session_expired',401);}
  if(value.kind!==kind||!Number.isFinite(value.expires)||value.expires<Date.now())throw new ChatError('session_expired',401);return value;
}
export const newSession=()=>sign({kind:'session',id:randomUUID(),expires:Date.now()+30*60*1000});
export function clientAddress(req){
  // Render's public ingress is behind Cloudflare. Its edge overwrites this header.
  const edgeIP=req.headers['cf-connecting-ip'];
  if(process.env.RENDER==='true'&&typeof edgeIP==='string'&&isIP(edgeIP))return edgeIP;
  const hops=Number(process.env.TRUST_PROXY_HOPS||0),chain=String(req.headers['x-forwarded-for']||'').split(',').map(x=>x.trim());
  if(Number.isInteger(hops)&&hops>0&&hops<=5&&chain.length>=hops&&isIP(chain.at(-hops)))return chain.at(-hops);
  return req.socket.remoteAddress||'unknown';
}
export function makeLimiter({maxEntries=10000,now=Date.now}={}){
  const buckets=new Map();return (key,max,windowMs=15*60*1000)=>{
    const at=now();if(buckets.size>=maxEntries){for(const [id,b]of buckets)if(b.until<=at)buckets.delete(id);if(buckets.size>=maxEntries&&!buckets.has(key))throw new ChatError('rate_limit',429);}
    let b=buckets.get(key);if(!b||b.until<=at){b={count:0,until:at+windowMs};buckets.set(key,b);}if(++b.count>max)throw new ChatError('rate_limit',429);
  };
}
