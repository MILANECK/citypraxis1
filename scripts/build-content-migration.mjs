import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('docs/source-content.json','utf8'));
const s=id=>source.find(s=>s.id===id),p=id=>s(id).paragraphs,l=id=>s(id).lists;
const text=parts=>parts.filter(Boolean).join('\n\n').replace(/[ \t]{2,}/g,' ');
const bullets=items=>items.map(i=>'- '+i).join('\n');
const heading=t=>'## '+t;
const records=[];
const add=(collection,id,data)=>records.push({collection,id,data:{...data,id,sourceUrl:'https://citypraxis.wien/',sourceDate:'2026-09-15'}});
const phys=p('info-physiotherapie'),fas=p('page-4'),crafta=p('page-5'),cmd=p('page-6'),ost=p('info-osteopathie'),mas=p('massagen'),massage=p('info-massagen'),methods=p('massagen-angebot'),logo=p('info-logopädie'),back=p('info-cmd'),process=p('tarifübersicht'),payment=p('ablaufinformation');
add('services','physiotherapie',{title:'Physiotherapie',tag:'PHYSIOTHERAPIE IN 1010 WIEN',intro:phys[2],body:text([phys[3],heading(phys[4]),bullets(l('info-physiotherapie')),heading('Behandlungskonzepte in der Physiotherapie'),bullets(fas.slice(2,8))]),methods:'',image:'/assets/service-physio.jpg',related:'faszienbehandlungen,crafta,cmd,rueckenfit',order:0});
add('services','osteopathie',{title:'Osteopathie',tag:'OSTEOPATHIE IN 1010 WIEN',intro:p('osteopathie')[2],body:text([ost[0],ost[1],heading(ost[2]),ost[3],ost[4],heading('Keine Symptombehandlung'),ost[6],heading(ost[7]),'### '+ost[8],ost[9],'### '+ost[10],ost[11],heading(ost[12]),ost[13]]),methods:'',image:'/assets/service-osteo.jpg',order:1});
add('services','logopaedie',{title:'Logopädie',tag:'LOGOPÄDIE IN 1010 WIEN',intro:p('logopädie')[4],body:text([logo[0],logo[1],heading(logo[2]),logo[3],logo[4],heading('Besonderheit der Logopädie in der Citypraxis'),logo[7],heading(logo[8]),bullets(l('info-logopädie'))]),methods:'',image:'/assets/service-logo.jpg',related:'crafta',order:2});
add('services','heilmassage',{title:'Massagen & Heilmassage',tag:'MASSAGEN IN 1010 WIEN',intro:mas[4],body:text([mas[5],heading('Klassische Massage / Heilmassage'),massage[2],massage[3],heading('Fussreflexzonen-Massage'),massage[5],heading(methods[0]),methods[1],methods[2],heading(methods[3]),methods[4],heading(methods[5]),methods[6],methods[7]]),methods:'',image:'/assets/service-massage.jpg',order:3});
add('services','rueckenfit',{title:'Rückenfit Kurs',tag:'BEWEGUNG IN DER GRUPPE',intro:back[1],body:text([heading('Kosten'),back[3],heading(back[5]),back[6],back[7],back[8],bullets(l('info-cmd')),heading(back[9]),back[10]]),methods:'',image:'/assets/service-rueckenfit.jpg',order:4});
add('services','faszienbehandlungen',{title:'Faszienbehandlungen',tag:'FDM & FASZIENMODULATION',intro:fas[9],body:text([heading('Fasziendistorsionsmodell (FDM)'),fas[11],heading(fas[12]),fas[13],heading('Typische Beschwerden, bei denen Faszienbehandlungen helfen können'),bullets(l('page-4').map((item,i)=>item+' '+fas[15+i]))]),image:'/assets/service-physio.jpg',order:10});
const craftaGroups=[[4],[5,6,7],[8,9],[10,11],[12],[13],[14]];
add('services','crafta',{title:'Craniofaziale Therapie (CRAFTA®)',tag:'KIEFER · KOPF · HALSWIRBELSÄULE',intro:crafta[2],body:text([heading(crafta[3]),...l('page-5').flatMap((title,i)=>['### '+title,craftaGroups[i].map(n=>crafta[n]).join(' ')])]),image:'/assets/service-crafta.jpg',order:11});
add('services','cmd',{title:'Craniomandibuläres Konzept (CMD)',tag:'KIEFERGELENK & VERBINDENDE STRUKTUREN',intro:cmd[1],body:text([heading(cmd[2]),bullets(l('page-6'))]),image:'/assets/service-cmd.jpg',order:12});
add('pages','about',{title:'Unser Team. Unsere gemeinsame Perspektive.',intro:p('behandlung')[2],body:text([...p('behandlung').slice(3,6),heading('Unsere Spezialisierung'),p('FStb6SVn9lNQkNfh')[4],p('FStb6SVn9lNQkNfh')[5],heading('Was die Citypraxis auszeichnet'),bullets(p('vorteile').slice(4)),heading('Unser Ziel'),...p('unser-ziel').slice(2,4)]),image:'/assets/practice-original.jpg',order:1});
add('pages','ablauf-wahltherapie',{title:'Private Wahltherapie',intro:'Kein Kasseninstitut',body:text([p('info-wahltherapie').slice(2).join(' '),heading('Verordnungsschein'),process[2]+' '+process[3],process[4],process[5],process.slice(6,10).join('\n'),heading(process[10]),process[11],process[12],process[13],heading(payment[0]),payment[1],heading('Bezahlung'),payment[3],heading(payment[4]),payment[5],heading('Absagefrist & Stornobedingungen'),payment[8],...payment.slice(9)]),order:5});
for(const [id,title,body] of [
 ['verordnung','Brauche ich eine ärztliche Verordnung?',process[4]],
 ['ersttermin','Was bringe ich zum ersten Termin mit?',text([process[12],payment[5]])],
 ['erstattung','Wie funktioniert die Rückerstattung?',payment[1]],
 ['zahlung','Wie kann ich bezahlen?',payment[3]],
 ['absage','Wie kann ich einen Termin absagen?',text(payment.slice(9))]
])add('faqs',id,{title,body,order:records.filter(r=>r.collection==='faqs').length});
add('prices','rueckenfit',{title:'Rückenfit Kurs',amount:'250',duration:'',details:'10 Einheiten plus 11. Einheit gratis',order:0});
const rates=[['physio-30','Physiotherapie 30 Minuten','27,24','31,20','23,00','25,56'],['physio-45','Physiotherapie 45 Minuten','40,85','46,80','34,51','38,43'],['physio-60','Physiotherapie 60 Minuten','54,47','62,40','46,01','51,12'],['hausbesuch','Hausbesuch','27,24','25,47','23,00','25,56'],['massage-15','Massage 15 Minuten','7,26','27,56','11,50','12,78'],['massage-30','Massage 30 Minuten','7,26','41,34','20,43','25,56'],['osteopathie','Osteopathie','–','–','–','16,34']];
rates.forEach(([id,title,oegkk,bvaeb,kfa,svs],order)=>add('reimbursements',id,{title,oegkk,bvaeb,kfa,svs,asOf:'04/2023',order}));
writeFileSync('src/original-content.json',JSON.stringify(records,null,2)+'\n');
console.log(`Prepared ${records.length} source-backed records.`);
