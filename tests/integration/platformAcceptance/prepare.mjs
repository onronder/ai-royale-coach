// Local-only copy. Never deploy this directory or its transport bootstrap.
import {cp,readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),target='/tmp/royale-err35-local';
const config=await readFile(target+'/supabase/config.toml','utf8');
if(!config.includes('project_id = "royale-err35-local"'))throw Error('Local rehearsal project required');
await cp(root+'/supabase/functions',target+'/supabase/functions',{recursive:true});
await mkdir(target+'/supabase/functions/_acceptance',{recursive:true});
await cp(root+'/tests/fixtures/provider/battles-2026-11-18.json',target+'/supabase/functions/_acceptance/battles.json');
await cp(root+'/tests/integration/platformAcceptance/transport.ts',target+'/supabase/functions/_acceptance/transport.ts');
const entries=[];
for(const d of await readdir(root+'/supabase/functions',{withFileTypes:true})){
 if(!d.isDirectory()||d.name.startsWith('_'))continue;
 const source=await readFile(path.join(root,'supabase/functions',d.name,'index.ts'),'utf8');
 entries.push({name:d.name,sha256:createHash('sha256').update(source).digest('hex')});
 await writeFile(path.join(target,'supabase/functions',d.name,'index.ts'),"import '../_acceptance/transport.ts';\n"+source);
}
const sourceConfig=await readFile(root+'/supabase/config.toml','utf8');
const gates=[...sourceConfig.matchAll(/\[functions\.([^\]]+)\]\s*verify_jwt\s*=\s*(true|false)/g)].map(m=>m[0]).join('\n');
await writeFile(target+'/supabase/config.toml',config.split('# ACCEPTANCE FUNCTIONS')[0]+'\n# ACCEPTANCE FUNCTIONS\n'+gates+'\n');
await writeFile(target+'/functions.env',['LOVABLE_API_KEY=isolated-fake-key','CLASH_ROYALE_API_KEY=isolated-fake-key','POLAR_ACCESS_TOKEN=isolated-fake-key','POLAR_WEBHOOK_SECRET=isolated-fake-key','RESEND_API_KEY=isolated-fake-key','RESEND_WEBHOOK_SECRET=isolated-fake-key','MARKETING_UNSUBSCRIBE_SECRET=isolated-fake-key','LOG_LEVEL=error'].join('\n'),{mode:0o600});
await writeFile('/tmp/royale-err35-private/function-manifest.json',JSON.stringify(entries,null,2));
console.log(JSON.stringify({functions:entries.length,target,providerTransport:'fake, all other egress denied'}));
