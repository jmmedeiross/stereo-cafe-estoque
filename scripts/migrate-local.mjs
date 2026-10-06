import {readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

if(!existsSync('dist/server/wrangler.json'))throw new Error('Execute npm run build antes de preparar o banco local.');
const command=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
function execute(args){const r=spawnSync(process.execPath,[...command,...args],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout;}
execute(['--command','CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)']);
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
  const checked=execute(['--command',`SELECT name FROM local_migrations WHERE name='${name.replaceAll("'","''")}'`,'--json']);
  const rows=JSON.parse(checked);if(rows.some(row=>row.results?.some(r=>r.name===name)))continue;
  console.log('Aplicando',name);execute(['--file','drizzle/'+name]);execute(['--command',`INSERT INTO local_migrations (name) VALUES ('${name.replaceAll("'","''")}')`]);
}
console.log('Banco local pronto. Execute npm run dev e entre com a conta local.');
