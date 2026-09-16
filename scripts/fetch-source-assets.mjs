import {writeFile} from 'node:fs/promises';
const images={
 'service-physio.jpg':'4d82a7b8163065cf2ce478183db68ce6.jpg',
 'service-osteo.jpg':'4b1c3b6db08e934ca548c5ef45c2f543.jpg',
 'service-logo.jpg':'de19895c18c8a0ebca1b1ddbdc4f8733.jpg',
 'service-massage.jpg':'802273d855cc88b586ae4b1b2db39038.jpg',
 'service-rueckenfit.jpg':'3acc3416e9243952b4a11b36c321c86e.jpg',
 'service-crafta.jpg':'2db903d11315bc7c750873ed00ebde14.jpg',
 'service-cmd.jpg':'5b3d3440194304c77fcfc0eb295a822f.jpg',
 'practice-original.jpg':'43cfe0d4aa2fb009416ae214d623c5a8.jpg'
};
const results=await Promise.allSettled(Object.entries(images).map(async([file,source])=>{const response=await fetch('https://citypraxis.wien/images/'+source);if(!response.ok)throw new Error(`${file}: ${response.status}`);await writeFile('public/assets/'+file,Buffer.from(await response.arrayBuffer()));return file;}));
for(const result of results)console.log(result.status==='fulfilled'?result.value:result.reason.message);
if(results.some(r=>r.status==='rejected'))process.exitCode=1;
