import { therapistProfiles } from './therapist-profiles.mjs';
import { englishContent } from './english-content.mjs';

const sampleNames=['Anna Katharina Plank, BSc','Sophie Berger','Katharina Leitner','Laura Steiner','Julia Gruber','Clara Hofmann','Lena Wagner','Theresa Schuster','Marie Huber','Elisa Fuchs','Johanna Winter','Sarah Moser'];
export function refreshTeamIntroduction(record){
  if(!record)return record;
  const result={...record};
  if(result.intro==='In der Citypraxis erwartet Sie ein großes und engagiertes Team bestehend aus 12 spezialisierten TherapeutInnen, aus den Bereichen der Physiotherapie, Osteopathie, Logopädie und Heilmassage.')result.intro='In der Citypraxis erwartet Sie ein engagiertes Team aus den Bereichen Physiotherapie, Osteopathie, Logopädie und Heilmassage. Lernen Sie die Menschen hinter Ihrer Behandlung kennen.';
  if(result.introEn==='At Citypraxis, a large and dedicated team of 12 specialised therapists from physiotherapy, osteopathy, speech and language therapy and therapeutic massage welcomes you.')result.introEn='Our dedicated team brings together physiotherapy, osteopathy, speech and language therapy and therapeutic massage. Get to know the people behind your care.';
  return result;
}
export function isOriginalTeamSample(record){
  if(!record)return false;
  const index=sampleNames.indexOf(record.title);
  if(index<0)return false;
  const expected={id:`team-${index+1}`,title:sampleNames[index],role:index===0?'Physiotherapeutin · Craniosacraltherapeutin':['Physiotherapie','Osteopathie','Logopädie','Heilmassage'][index%4],body:index===0?'Physiotherapie und Craniosacraltherapie in der Citypraxis.':'Fiktives Beispielprofil. Die persönliche Vorstellung und Behandlungsschwerpunkte werden hier ergänzt.',qualifications:index===0?'BSc':'',image:`/assets/team-placeholder-${index%4+1}.jpg`,placeholder:true,fictional:index!==0,phone:index===0?'+43 670 4041236':'',email:index===0?'amandavoeltl@citypraxis.wien':'',order:index};
  for(const [key,value]of Object.entries(englishContent.team[expected.id]))expected[key+'En']=value;
  return Object.entries(expected).every(([key,value])=>record[key]===value)&&Object.keys(record).every(key=>key in expected);
}
export function teamImportPlan(rows){
  const existing=new Set(rows.map(row=>row.id));
  const parse=value=>typeof value==='string'?JSON.parse(value):value;
  return {
    add:therapistProfiles.filter(profile=>!existing.has(profile.id)),
    remove:rows.filter(row=>isOriginalTeamSample(parse(row.draft))&&isOriginalTeamSample(parse(row.published))),
    keep:rows.filter(row=>!isOriginalTeamSample(parse(row.draft))||!isOriginalTeamSample(parse(row.published))).map(row=>row.id)
  };
}
export function importTherapistsSqlite(db){
  const plan=teamImportPlan(db.prepare("SELECT * FROM content WHERE collection='team'").all());
  for(const row of plan.remove){
    db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('team',row.id,row.draft,'PDF therapist profile import');
    db.prepare("DELETE FROM content WHERE collection='team' AND id=?").run(row.id);
  }
  for(const profile of plan.add){
    const value=JSON.stringify(profile);
    db.prepare("INSERT INTO content(collection,id,draft,published) VALUES('team',?,?,?)").run(profile.id,value,value);
    db.prepare('INSERT OR IGNORE INTO media(id,path,name,alt) VALUES(?,?,?,?)').run(`therapist-${profile.id}`,profile.image,profile.title,profile.title);
  }
  const about=db.prepare("SELECT * FROM content WHERE collection='pages' AND id='about'").get();
  if(about){
    const draft=JSON.stringify(refreshTeamIntroduction(JSON.parse(about.draft))),published=about.published?JSON.stringify(refreshTeamIntroduction(JSON.parse(about.published))):null;
    if(draft!==about.draft||published!==about.published){
      db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('pages','about',about.draft,'PDF therapist profile import');
      db.prepare("UPDATE content SET draft=?,published=? WHERE collection='pages' AND id='about'").run(draft,published);
    }
  }
  return plan;
}
