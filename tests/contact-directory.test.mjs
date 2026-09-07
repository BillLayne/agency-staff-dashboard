import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(repoRoot);
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
class MemoryStorage {
  data = new Map();
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
const entry = (id, value = '336-555-0100') => ({ id, company: 'Test Company', kind: 'phone', label: 'Test desk', value, createdAt: 1 });
const clone = (value) => JSON.parse(JSON.stringify(value));
const until = async (predicate) => { for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 5)); } throw Error('Timed out'); };
function environment(repo, storage = new MemoryStorage(), server = { entries: [], revision: 0 }) {
  const window = new EventTarget();
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const requests = [];
  const polls = [];
  let intercept = null;
  let offline = false;
  const context = vm.createContext({ console, Blob, Response, AbortController, crypto: webcrypto, URL,
    setTimeout, clearTimeout, setInterval: (callback, delay) => { polls.push(callback); return setInterval(callback, delay); }, clearInterval, window, document, localStorage: storage,
    fetch: async (url, options) => {
      assert.equal(url, '/api/contacts');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.cache, 'no-store');
      requests.push({ method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
      if (offline) throw new TypeError('Synthetic offline');
      const overridden = await intercept?.(options, server);
      if (overridden) return overridden;
      if (options.method === 'GET') return Response.json(server);
      const proposed = JSON.parse(options.body);
      if (proposed.revision !== server.revision) return Response.json({ ...server, error: 'conflict' }, { status: 409 });
      server.entries = proposed.entries; server.revision++;
      return Response.json(server);
    } });
  const run = (relative) => {
    const code = ts.transpileModule(fs.readFileSync(path.join(root, repo, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    const exports = {};
    const requireModule = () => data;
    vm.runInContext('(function(exports,require){' + code + '\n})', context)(exports, requireModule);
    return exports;
  };
  const data = run('data/carrierContacts.ts');
  const api = run('services/contactDirectory.ts');
  return { api, data, storage, server, requests, window, document, polls,
    set intercept(value) { intercept = value; }, set offline(value) { offline = value; } };
}
let passed = 0;
async function check(name, fn) { await fn(); console.log('PASS ' + name); passed++; }
(async () => {
for (const repo of [path.basename(repoRoot)]) {
 const prefix = repo + ': ';
 await check(prefix + '17 builtins, correction merge, safe links, full backup validation', async () => {
  const {api,data} = environment(repo);
  assert.equal(data.COMPANY_CONTACTS.length, 17);
  const correction = {...entry('correction'),company:'Nationwide Insurance',replacesDetail:data.COMPANY_CONTACTS[0].details[0]};
  const directory = api.mergeManualContacts([correction]);
  assert.equal(directory.length,17);
  assert.equal(directory[0].details[0].value, correction.value);
  assert.notEqual(data.COMPANY_CONTACTS[0].details[0].value, correction.value);
  assert.equal(api.detailHref({...entry('phone'), value:'(336) 555-0100 ext. 123'}),'tel:3365550100;ext=123');
  assert.equal(api.detailHref({...entry('phone'), value:'336-555-0100 x42'}),'tel:3365550100;ext=42');
  assert.equal(api.detailHref({...entry('phone'), value:'336-555-0100 or 336-555-0101'}),null);
  assert.equal(api.detailHref({...entry('link'),kind:'website',value:'javascript:alert(1)'}),null);
  assert.equal(api.parseContactBackup(api.createContactBackup([correction])).length,1);
  for (const invalid of [
    [{...entry('a'),replacesDetail:{kind:'phone',label:'Original'}}],
    [entry('a'),entry('a')], [{...entry('a'),createdAt:NaN}],
    {version:9,exportedAt:new Date().toISOString(),entries:[]},
    {version:1,exportedAt:'bad',entries:[]},
    {version:1,exportedAt:new Date().toISOString(),entries:[],unknown:'bad'}
  ]) assert.throws(() => api.parseContactBackup(JSON.stringify(invalid)));
 });
 await check(prefix + 'migration PUT confirmation, offline persistence, once-only remote authority', async () => {
  const env = environment(repo);
  const {api,storage,server} = env;
  const legacy = [entry('legacy')];
  storage.setItem(api.MANUAL_CONTACTS_STORAGE_KEY,JSON.stringify(legacy));
  env.offline = true;
  const store = api.createContactDirectoryStore();
  await store.refresh();
  assert.equal(store.getSnapshot().entries.length,1);
  assert.equal(storage.getItem(api.CONTACT_STORAGE_PREFIX + ':migration'),'queued');
  assert.equal(store.getSnapshot().pendingCount,1);
  assert.notEqual(store.getSnapshot().status,'saved');
  env.offline = false;
  await store.refresh();
  assert.equal(server.entries.length,1);
  assert.equal(store.getSnapshot().status,'saved');
  assert.equal(storage.getItem(api.CONTACT_STORAGE_PREFIX + ':migration'),'complete');
  server.entries=[];server.revision++;
  const next = api.createContactDirectoryStore();
  await next.refresh();
  assert.equal(next.getSnapshot().entries.length,0);
  assert.equal(server.entries.length,0);
  assert.equal(storage.getItem(api.MANUAL_CONTACTS_STORAGE_KEY),JSON.stringify(legacy));
 });
 await check(prefix + '409 unrelated upsert and removal rebase; delete never resurrects', async () => {
  const original = entry('a');
  const unrelated = entry('b','336-555-0200');
  const env = environment(repo,undefined,{entries:[original],revision:1});
  const store=env.api.createContactDirectoryStore();
  await store.refresh();
  let injected=false;
  env.intercept=(options,server)=>{
    if(options.method==='PUT' && !injected) {injected=true;server.entries.push(unrelated);server.revision++;}
  };
  store.removeEntry('a');
  await until(()=>store.getSnapshot().status==='saved');
  assert.deepEqual(clone(env.server.entries),[unrelated]);
  assert.equal(store.getSnapshot().pendingCount,0);
 });
 await check(prefix + '409 same-entry conflict blocks PUT; refresh preserves pending; explicit resolution', async () => {
  const original=entry('a');
  const env=environment(repo,undefined,{entries:[original],revision:1});
  const store=env.api.createContactDirectoryStore();await store.refresh();
  let injected=false;
  env.intercept=(options,server)=>{
    if(options.method==='PUT'&&!injected){injected=true;server.entries=[entry('a','336-555-0200')];server.revision++;}
  };
  store.upsertEntry(entry('a','336-555-0300'),original);
  await until(()=>store.getSnapshot().status==='conflict');
  const puts=env.requests.filter(r=>r.method==='PUT').length;
  await store.refresh();
  assert.equal(env.requests.filter(r=>r.method==='PUT').length,puts);
  assert.equal(store.getSnapshot().pendingCount,1);
  assert.equal(env.server.entries[0].value,'336-555-0200');
  store.resolveConflict(store.getSnapshot().conflicts[0].operationIds,'local');
  await until(()=>store.getSnapshot().status==='saved');
  assert.equal(env.server.entries[0].value,'336-555-0300');
 });
 await check(prefix + 'offline removal vs remote edit conflicts, remote choice retains newer value', async () => {
  const env=environment(repo,undefined,{entries:[entry('a')],revision:1});
  const store=env.api.createContactDirectoryStore();await store.refresh();
  env.offline=true;store.removeEntry('a');
  await until(()=>store.getSnapshot().status!=='syncing');
  env.server.entries=[entry('a','336-555-0900')];env.server.revision++;env.offline=false;
  const restored=env.api.createContactDirectoryStore();await restored.refresh();
  assert.equal(restored.getSnapshot().status,'conflict');
  restored.resolveConflict(restored.getSnapshot().conflicts[0].operationIds,'remote');
  await until(()=>restored.getSnapshot().status==='saved');
  assert.equal(env.server.entries[0].value,'336-555-0900');
 });
 await check(prefix + 'lost PUT response and chained operations retry idempotently', async () => {
  const env=environment(repo);
  const store=env.api.createContactDirectoryStore();await store.refresh();
  env.offline=true;
  store.upsertEntry(entry('a'));store.upsertEntry(entry('a','336-555-0400'));store.upsertEntry(entry('a','336-555-0500'));
  await until(()=>store.getSnapshot().status!=='syncing');
  let lost=false;
  env.offline=false;
  env.intercept=(options,server)=>{
    if(options.method==='PUT'&&!lost){lost=true;server.entries=JSON.parse(options.body).entries;server.revision++;throw Error('Lost synthetic response');}
  };
  await store.refresh();
  assert.equal(store.getSnapshot().pendingCount,3);
  await store.refresh();
  assert.equal(store.getSnapshot().status,'saved');
  assert.equal(env.server.entries.length,1);
  assert.equal(env.server.entries[0].value,'336-555-0500');
 });
 await check(prefix + 'cross-tab queues merge distinct edits without overwriting, subscriber notification', async () => {
  const env=environment(repo);
  const a=env.api.createContactDirectoryStore();await a.refresh();
  const b=env.api.createContactDirectoryStore();await b.refresh();
  env.offline=true;
  let events=0;
  const stop=a.subscribe(()=>events++);
  a.upsertEntry(entry('a'));b.upsertEntry(entry('b'));
  await until(()=>a.getSnapshot().status!=='syncing'&&b.getSnapshot().status!=='syncing');
  env.offline=false;await a.refresh();await b.refresh();
  assert.equal(env.server.entries.length,2);
  assert.equal(a.getSnapshot().pendingCount,0);
  assert(events>0);stop();
 });
 await check(prefix + 'backup merge conflicts on same ID and built-in correction target; no implicit overwrite', async () => {
  const env=environment(repo,undefined,{entries:[entry('a')],revision:1});
  const store=env.api.createContactDirectoryStore();await store.refresh();
  store.importBackup(JSON.stringify([entry('a','336-555-0300'),entry('b')]));
  await until(()=>store.getSnapshot().status==='conflict');
  assert.equal(env.server.entries.length,1);
  assert.equal(env.server.entries[0].value,'336-555-0100');
  const original=env.data.COMPANY_CONTACTS[0].details[0];
  const a={...entry('x'),company:'Nationwide',replacesDetail:original};
  const b={...entry('y'),company:'Nationwide Insurance',replacesDetail:original};
  assert.equal(env.api.rebaseContactOperations({entries:[a],revision:1},[
    {opId:'test',entryId:'y',base:null,value:b,createdAt:2}
  ]).conflicts.length,1);
 });
 await check(prefix + 'edits during in-flight PUT are not acknowledged early', async () => {
  const env=environment(repo);
  const store=env.api.createContactDirectoryStore();await store.refresh();
  let release, held=false;
  env.intercept=async(options)=>{
    if(options.method==='PUT'&&!held){held=true;await new Promise(resolve=>release=resolve);}
  };
  store.upsertEntry(entry('a'));
  await until(()=>held);
  store.upsertEntry(entry('a','336-555-0600'));
  store.upsertEntry(entry('b'));
  assert.equal(store.getSnapshot().pendingCount,3);
  release();
  await until(()=>store.getSnapshot().status==='saved');
  assert.equal(env.server.entries.length,2);
  assert.equal(env.server.entries.find(e=>e.id==='a').value,'336-555-0600');
 });
 await check(prefix + 'unmount aborts; immediate resubscribe recovers without waiting for poll', async () => {
  const env=environment(repo);
  let started=false, aborted=false;
  env.intercept=async(options)=>{
    if(!started){started=true;await new Promise((resolve,reject)=>{
      options.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));},{once:true});
    });}
  };
  const store=env.api.createContactDirectoryStore();
  const stop=store.subscribe(()=>{});
  await until(()=>started);stop();
  const stopAgain=store.subscribe(()=>{});
  await until(()=>store.getSnapshot().status==='saved');
  assert(aborted);stopAgain();
 });
 await check(prefix + 'hidden polling is quiet; visible refresh and storage events update subscribers', async () => {
  const env=environment(repo);
  const store=env.api.createContactDirectoryStore();
  const stop=store.subscribe(()=>{});await until(()=>store.getSnapshot().status==='saved');
  env.document.visibilityState='hidden';const before=env.requests.length;
  env.polls[0]();env.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(env.requests.length,before);
  env.server.entries=[entry('visible')];env.server.revision++;
  env.document.visibilityState='visible';env.document.dispatchEvent(new Event('visibilitychange'));
  await until(()=>store.getSnapshot().entries.length===1);
  env.document.visibilityState='hidden';
  const op={opId:'tab-operation',entryId:'another',base:null,value:entry('another'),createdAt:3};
  const key=env.api.CONTACT_STORAGE_PREFIX+':op:'+op.opId;env.storage.setItem(key,JSON.stringify(op));
  const event=new Event('storage');event.key=key;env.window.dispatchEvent(event);
  assert.equal(store.getSnapshot().entries.length,2);assert.equal(store.getSnapshot().pendingCount,1);stop();
 });
 await check(prefix + 'expired auth preserves unsent queue without claiming saved', async () => {
  const env=environment(repo);const store=env.api.createContactDirectoryStore();await store.refresh();
  env.intercept=()=>Response.json({error:'login'}, {status:401});
  store.upsertEntry(entry('auth-pending'));await until(()=>store.getSnapshot().status!=='syncing');
  assert.equal(store.getSnapshot().pendingCount,1);assert.notEqual(store.getSnapshot().status,'saved');
  assert.match(store.getSnapshot().error,/Sign in/);
 });
 await check(prefix + 'server-compatible field limits, URLs, email, aggregate count and body limit', async () => {
  const {api}=environment(repo);
  for(const [field,limit] of [['id',200],['company',200],['label',160],['value',1000]]) {
    assert.doesNotThrow(()=>api.validateContactEntries([{...entry('a'),[field]:'a'.repeat(limit)}]));
    assert.throws(()=>api.validateContactEntries([{...entry('a'),[field]:'a'.repeat(limit+1)}]));
  }
  for(const value of ['www.example.test','https://example.test/path','http://example.test']) {
    assert.doesNotThrow(()=>api.validateContactEntries([{...entry('a'),kind:'website',value}]));
  }
  for(const value of ['javascript:alert(1)','ftp://example.test','https://user:password@example.test','https://localhost','not a domain']) {
    assert.throws(()=>api.validateContactEntries([{...entry('a'),kind:'website',value}]));
  }
  assert.throws(()=>api.parseContactBackup(JSON.stringify([{...entry('a'),kind:'email',value:'incomplete@'}])));
  assert.throws(()=>api.parseContactBackup(JSON.stringify(Array.from({length:5001},(_,i)=>entry('id-'+i)))));
  assert.throws(()=>api.parseContactBackup(JSON.stringify(Array.from({length:1900},(_,i)=>({...entry('id-'+i),value:'a'.repeat(1000)})))));
  const env=environment(repo,undefined,{entries:Array.from({length:4999},(_,i)=>entry('id-'+i)),revision:1});
  const store=env.api.createContactDirectoryStore();await store.refresh();
  const before=store.getSnapshot().pendingCount;
  assert.throws(()=>store.importBackup(JSON.stringify([entry('new-1'),entry('new-2')])));
  assert.equal(store.getSnapshot().pendingCount,before);
  assert.equal(env.server.entries.length,4999);
 });
 await check(prefix + 'oversize legacy data stays visible and exportable until corrected', async () => {
  const env=environment(repo);
  const legacy={...entry('legacy'),label:'L'.repeat(161)};
  env.storage.setItem(env.api.MANUAL_CONTACTS_STORAGE_KEY,JSON.stringify([legacy]));
  const store=env.api.createContactDirectoryStore();await store.refresh();
  assert.equal(store.getSnapshot().entries[0].label.length,161);
  assert.equal(JSON.parse(store.exportBackup()).entries[0].label.length,161);
  assert.equal(env.requests.filter(request=>request.method==='PUT').length,0);
  assert.notEqual(store.getSnapshot().status,'saved');
  store.upsertEntry({...legacy,label:'Corrected label'},legacy);
  await until(()=>store.getSnapshot().status==='saved');
  assert.equal(env.server.entries[0].label,'Corrected label');
 });
 await check(prefix + 'invalid local queue fails closed; malformed response never saved', async () => {
  const env=environment(repo);
  env.storage.setItem(env.api.CONTACT_STORAGE_PREFIX+':op:broken','{bad');
  const store=env.api.createContactDirectoryStore();await store.refresh();
  assert.equal(store.getSnapshot().status,'error');
  assert.equal(env.requests.length,0);
  env.storage.removeItem(env.api.CONTACT_STORAGE_PREFIX+':op:broken');
  env.intercept=(options)=>options.method==='PUT'?Response.json({entries:[],revision:0}):undefined;
  await store.refresh();
  assert.notEqual(store.getSnapshot().status,'saved');
  assert.equal(env.storage.getItem(env.api.CONTACT_STORAGE_PREFIX+':migration'),'queued');
 });
}
console.log('\n'+passed+' synthetic checks passed. No network access used.');
})().catch(error=>{console.error(error);process.exitCode=1;});
