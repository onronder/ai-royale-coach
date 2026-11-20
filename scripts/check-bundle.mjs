import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const directory=process.argv[2]||'dist';
const manifest=JSON.parse(readFileSync(directory+'/.vite/manifest.json','utf8'));
function bytes(roots){
 const seen=new Set();
 function visit(key){if(!key||seen.has(key))return;const item=manifest[key];if(!item)throw new Error('Missing bundle '+key);seen.add(key);for(const dependency of item.imports||[])visit(dependency);}
 roots.forEach(visit);
 return [...seen].reduce((total,key)=>total+gzipSync(readFileSync(directory+'/'+manifest[key].file)).byteLength,0);
}
const dashboard=Object.keys(manifest).find(key=>manifest[key].name==='Dashboard');
if(!dashboard)throw new Error('Dashboard bundle missing');
const values={};
for(const language of ['en','tr','es','fr','pt']){
 const locales=[...new Set(['en',language])].map(lang=>'src/i18n/locales/'+lang+'.json').filter(key=>manifest[key]);
 values['entry_'+language]=bytes(['index.html',...locales]);
 values['dashboard_'+language]=bytes(['index.html',dashboard,...locales]);
}
if(process.argv.includes('--record')){console.log(JSON.stringify(values,null,2));process.exit(0);}
const reference=JSON.parse(readFileSync(new URL('../tests/bundle-baseline.json',import.meta.url),'utf8'));
let report='## JavaScript gzip comparison\n\nStatic dependency closures, including selected core language and English fallback; excludes CSS, images, API bodies and optional panels. Not a latency measurement.\n\n| Flow | Before (bytes) | Current | Change | Limit |\n|---|---:|---:|---:|---:|\n';
let failed=false;
for(const [key,value]of Object.entries(values)){
 const old=reference.before[key],limit=reference.limit[key];
 if(!Number.isFinite(old)||!Number.isFinite(limit)||value>limit)failed=true;
 report+=`| ${key} | ${old} | ${value} | ${((value/old-1)*100).toFixed(1)}% | ${limit} |\n`;
}
writeFileSync(directory+'/bundle-report.md',report);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
console.log(report);if(failed)throw new Error('Bundle budget exceeded or reference incomplete');
