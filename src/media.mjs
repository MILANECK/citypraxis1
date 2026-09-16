import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? {start,end} : null;
}
export async function serveFile(req,res,file,type) {
  const info = await stat(file);
  if (!info.isFile()) throw new Error('Not a file');
  const headers = {'Content-Type':type,'Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  let range;
  if (req.headers.range) {
    range = parseRange(req.headers.range,info.size);
    if (!range) {res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;}
    headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;
  }
  headers['Content-Length']=range ? range.end-range.start+1 : info.size;
  res.writeHead(range ? 206 : 200,headers);
  if(req.method==='HEAD'){res.end();return;}
  await pipeline(createReadStream(file,range || {}),res);
}
export function mediaType(bytes,type) {
  if(type==='video/mp4' && bytes.length>=16 && bytes.toString('ascii',4,8)==='ftyp')return 'mp4';
  if(type==='image/png' && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(type==='image/jpeg' && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return 'jpg';
  if(type==='image/webp' && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP')return 'webp';
  return null;
}
