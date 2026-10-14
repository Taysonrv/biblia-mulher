const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(filename) {
  if(filename.endsWith('.json'))return require(filename);
  if(cache.has(filename))return cache.get(filename);
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:id=>load(path.resolve(path.dirname(filename),id.endsWith('.json')?id:id+'.ts'))});
  cache.set(filename,module.exports);return module.exports;
}
const { readingPlans, getReadingPlan, planContains, planChapterKey, planSummary, adjacentPlanReading } = load(path.resolve(__dirname,'../src/data/reading-plans.ts'));
const { createPlanRepository, PLAN_KEY } = load(path.resolve(__dirname,'../src/services/reading-plan-repository.ts'));
const bible = require('../src/data/almeida-1911.json');
const catalog = require('../src/data/bible-catalog.json');
const hope='hope-7-v1', john='john-21-v1', annual='bible-365-v1';
function setup(raw=null, now=()=>1000) {
  const state={raw,fail:false,writes:0};
  const untouched=new Map([['@biblia-mulher/reading/v1','existing favorite/note'],['@biblia-smart/reading-history/v1','existing history'],['@biblia-mulher/theme/v1','light']]);
  const storage={async getItem(key){assert.equal(key,PLAN_KEY);return state.raw;},async setItem(key,value){assert.equal(key,PLAN_KEY);if(state.fail)throw Error('disk');state.raw=value;state.writes++;}};
  return {state,untouched,storage,repo:createPlanRepository(storage,now)};
}
test('every planned reading exists offline and plan identifiers are unique',()=>{
  assert.equal(readingPlans.length,3);assert.equal(new Set(readingPlans.map(plan=>plan.id)).size,3);
  for(const plan of readingPlans)for(const [index,day] of plan.days.entries()){
    assert.equal(day.day,index+1);assert.ok(day.title);assert.ok(day.readings.length>0);
    for(const reading of day.readings)assert.ok(bible[reading.book]?.[reading.chapter]?.length,plan.id+' '+day.day);
  }
  assert.equal(getReadingPlan(hope).days.length,7);assert.equal(getReadingPlan(john).days.length,21);
});
test('365-day plan covers every canonical chapter once in order, with 3 or 4 chapters per day',()=>{
  const plan=getReadingPlan(annual);assert.equal(plan.days.length,365);
  const expected=catalog.flatMap(book=>Array.from({length:book.chapters},(_,i)=>book.name+':'+(i+1)));
  const actual=plan.days.flatMap(day=>{assert.ok(day.readings.length===3||day.readings.length===4);return day.readings.map(ref=>ref.book+':'+ref.chapter);});
  assert.equal(actual.length,1189);assert.equal(new Set(actual).size,1189);assert.equal(JSON.stringify(actual),JSON.stringify(expected));
});
test('plan navigation follows the assigned readings and preserves the day across transitions',()=>{
  const next=adjacentPlanReading(hope,1,'Salmos',23,1);assert.equal(next.book,'Salmos');assert.equal(next.chapter,121);assert.equal(next.day,2);
  assert.equal(adjacentPlanReading(hope,1,'Salmos',23,-1),null);assert.equal(adjacentPlanReading(hope,7,'Apocalipse',21,1),null);
  const annualNext=adjacentPlanReading(annual,1,'Gênesis',3,1);assert.equal(annualNext.chapter,4);assert.equal(annualNext.day,2);
  assert.equal(adjacentPlanReading(hope,2,'Salmos',23,1),null);
});
test('activate, complete, restart and reactivate retain progress and the original start time',async()=>{
  const {repo,storage}=setup();await repo.activate(hope);await repo.setComplete(hope,1,'Salmos',23,true);
  const restarted=createPlanRepository(storage,()=>9000);await restarted.activate(hope);const state=await restarted.read();
  assert.equal(state.activePlanId,hope);assert.equal(state.plans[0].startedAt,1000);assert.equal(state.plans[0].completed.length,1);
  assert.equal(planSummary(getReadingPlan(hope),state.plans[0].completed).next.day,2);
});
test('switching and pausing preserve each plan independently and do not touch other app storage',async()=>{
  const {repo,untouched}=setup();const before=JSON.stringify([...untouched]);
  await repo.activate(hope);await repo.setComplete(hope,1,'Salmos',23,true);await repo.activate(john);
  await repo.setComplete(john,1,'João',1,true);await repo.pause(hope);
  assert.equal((await repo.read()).activePlanId,john);await repo.pause(john);
  assert.equal((await repo.read()).activePlanId,null);await repo.activate(hope);
  const state=await repo.read();assert.equal(state.plans.length,2);assert.equal(state.plans.find(p=>p.planId===john).completed.length,1);
  assert.equal(state.plans.find(p=>p.planId===hope).completed.length,1);assert.equal(JSON.stringify([...untouched]),before);
});
test('opening or querying a plan never marks it completed or writes any state',async()=>{
  const {repo,state}=setup();await repo.read();planSummary(getReadingPlan(hope),[]);planContains(hope,1,'Salmos',23);
  assert.equal(state.writes,0);assert.equal(state.raw,null);
});
test('a multi-chapter day remains pending until all chapters are marked',async()=>{
  const {repo}=setup();await repo.activate(annual);await repo.setComplete(annual,1,'Gênesis',1,true);
  let summary=planSummary(getReadingPlan(annual),(await repo.read()).plans[0].completed);
  assert.equal(summary.daysDone,0);assert.equal(summary.next.day,1);assert.equal(summary.next.chapter,2);
  await repo.setComplete(annual,1,'Gênesis',2,true);await repo.setComplete(annual,1,'Gênesis',3,true);
  summary=planSummary(getReadingPlan(annual),(await repo.read()).plans[0].completed);
  assert.equal(summary.daysDone,1);assert.equal(summary.next.day,2);assert.equal(summary.next.chapter,4);
});
test('repeated and concurrent completion is idempotent; unmarking restores the earliest pending reading',async()=>{
  const {repo}=setup();await repo.activate(hope);
  await Promise.all([repo.setComplete(hope,1,'Salmos',23,true),repo.setComplete(hope,2,'Salmos',121,true),repo.setComplete(hope,1,'Salmos',23,true)]);
  let completed=(await repo.read()).plans[0].completed;assert.equal(completed.length,2);assert.equal(planSummary(getReadingPlan(hope),completed).next.day,3);
  await repo.setComplete(hope,1,'Salmos',23,false);completed=(await repo.read()).plans[0].completed;
  assert.equal(completed.length,1);assert.equal(planSummary(getReadingPlan(hope),completed).next.day,1);
});
test('completing all steps reaches 100 percent and unmarking reopens the plan',async()=>{
  const {repo}=setup();await repo.activate(hope);
  for(const day of getReadingPlan(hope).days)for(const ref of day.readings)await repo.setComplete(hope,day.day,ref.book,ref.chapter,true);
  let summary=planSummary(getReadingPlan(hope),(await repo.read()).plans[0].completed);
  assert.equal(summary.daysDone,7);assert.equal(summary.percent,100);assert.equal(summary.next,null);
  await repo.setComplete(hope,7,'Apocalipse',21,false);summary=planSummary(getReadingPlan(hope),(await repo.read()).plans[0].completed);
  assert.equal(summary.next.day,7);assert.equal(summary.daysDone,6);
  const full=getReadingPlan(annual).days.flatMap(day=>day.readings.map(ref=>planChapterKey(day.day,ref.book,ref.chapter)));
  assert.equal(planSummary(getReadingPlan(annual),full.slice(0,-1)).percent,99);
});
test('invalid routes, mismatched days and unstarted plans cannot save completion',async()=>{
  const {repo,state}=setup();await assert.rejects(repo.activate('unknown'));await assert.rejects(repo.setComplete(hope,1,'Salmos',23,true));assert.equal(state.raw,null);
  await repo.activate(hope);const saved=state.raw;
  for(const args of [[hope,2,'Salmos',23,true],[hope,0,'Salmos',23,true],[hope,1.5,'Salmos',23,true],['unknown',1,'Salmos',23,true],[hope,1,'Salmos',23,'yes']])await assert.rejects(repo.setComplete(...args));
  assert.equal(state.raw,saved);
});
test('corrupt and incompatible saved plans are preserved and never overwritten',async()=>{
  const entry={planId:hope,startedAt:1000,completed:[]};
  const cases=['broken',JSON.stringify({version:2,activePlanId:null,plans:[]}),JSON.stringify({version:1,activePlanId:'unknown',plans:[]}),
    ...[[entry,entry],[{...entry,startedAt:0}],[{...entry,completed:['1:João:1']}],[{...entry,completed:['1:Salmos:23','1:Salmos:23']}],[{...entry,planId:'unknown'}]].map(plans=>JSON.stringify({version:1,activePlanId:hope,plans}))];
  for(const raw of cases){const {repo,state}=setup(raw);await assert.rejects(repo.read());await assert.rejects(repo.activate(hope));assert.equal(state.raw,raw);assert.equal(state.writes,0);}
});
test('failed writes keep previous progress and the serial queue recovers for retry',async()=>{
  const {repo,state}=setup();await repo.activate(hope);const saved=state.raw;state.fail=true;
  await assert.rejects(repo.setComplete(hope,1,'Salmos',23,true));assert.equal(state.raw,saved);
  state.fail=false;await repo.setComplete(hope,1,'Salmos',23,true);assert.equal((await repo.read()).plans[0].completed.length,1);
});
test('read waits for pending storage and invalid clock values cannot start a plan',async()=>{
  let raw=null,finish;const storage={async getItem(){return raw;},async setItem(key,value){await new Promise(resolve=>finish=resolve);raw=value;}};
  const repo=createPlanRepository(storage,()=>1000);const write=repo.activate(hope),read=repo.read();
  await new Promise(resolve=>setImmediate(resolve));finish();await write;assert.equal((await read).activePlanId,hope);
  const invalid=setup(null,()=>NaN);await assert.rejects(invalid.repo.activate(hope));assert.equal(invalid.state.raw,null);
});
