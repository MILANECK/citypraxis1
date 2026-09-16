import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile('docs/team-placeholder-sources.json','utf8'));
for(const [i,entry]of source.results.entries()){
  const response=await fetch(entry.picture.large);if(!response.ok)throw new Error(`Portrait ${i+1}: ${response.status}`);
  await writeFile(`public/assets/team-placeholder-${i+1}.jpg`,Buffer.from(await response.arrayBuffer()));
}
console.log('Four sample portraits saved. These are not actual Citypraxis team members.');
