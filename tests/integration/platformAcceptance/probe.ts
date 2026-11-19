// Read-only private cache export -> non-identifying capability counts.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {observeBattles} from '../../../supabase/functions/_shared/battle-observation';
const file=process.argv[2],output=process.argv[3];
if(!file?.startsWith('/')||!output?.startsWith('/'))throw Error('Explicit local input and output paths required');
const raw=await readFile(file),rows=JSON.parse(raw.toString());
const counts={cacheRows:rows.length,profiles:0,battlePayloads:0,twoByTwo:0,duel:0,multiDeck:0,boat:0,validWindowObservations:0,excluded:0,duplicates:0,heroField:0,activeFormField:0,towerParticipants:0};
const cardFields=new Set<string>();
for(const row of rows){
 if(row.player_data&&Object.keys(row.player_data).length)counts.profiles++;
 const battles=Array.isArray(row.battles_data)?row.battles_data:[];
 counts.battlePayloads+=battles.length;
 const observed=observeBattles(battles,row.player_tag);counts.validWindowObservations+=observed.total;counts.excluded+=observed.excluded;counts.duplicates+=battles.length-observed.total-observed.excluded;
 for(const b of battles){
  if(b.team?.length===2&&b.opponent?.length===2)counts.twoByTwo++;
  const mode=`${b.type} ${b.gameMode?.name}`;
  if(/duel/i.test(mode))counts.duel++;if(/multideck/i.test(mode))counts.multiDeck++;if(/boatbattle/i.test(mode))counts.boat++;
  for(const p of [...(b.team??[]),...(b.opponent??[])]){
   if(p.supportCards?.length)counts.towerParticipants++;
   for(const card of p.cards??[]){Object.keys(card).forEach(k=>cardFields.add(k));if('heroLevel'in card)counts.heroField++;if('activeForm'in card)counts.activeFormField++;}
  }
 }
}
await writeFile(output,JSON.stringify({source:'Read-only export from isolated restored rehearsal; historical cache, not a new provider request',sha256:createHash('sha256').update(raw).digest('hex'),counts,cardFields:[...cardFields].sort(),limitation:'No active Hero/slot field observed; forms remain unknown. Battle count is cache payloads, not globally unique played games.'},null,2));
console.log(JSON.stringify(counts));
