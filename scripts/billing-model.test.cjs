const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const ts=require('typescript');
const moduleValue={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/billing-model.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports,Date,Error,Number,Promise});
const {premiumFromBilling,billingPeriod,createBillingQueue}=moduleValue.exports;const now=Date.parse('2026-10-23T12:00:00Z');
const info=()=>({entitlements:{verification:'VERIFIED',active:{premium:{isActive:true,expirationDate:new Date(now+60000).toISOString(),verification:'VERIFIED',isSandbox:false}}}});
test('only verified, current, expiring Premium entitlements grant access; cancellation keeps paid period',()=>{
 const result=premiumFromBilling(info(),'alice',false,now);assert.equal(result.accountId,'alice');assert.equal(result.tier,'premium');
 for(const mutate of [r=>r.entitlements.active.premium.isActive=false,r=>r.entitlements.active.premium.expirationDate=null,r=>r.entitlements.active.premium.expirationDate='bad',r=>r.entitlements.active.premium.expirationDate=new Date(now).toISOString(),r=>r.entitlements.active.premium.isSandbox=true,r=>delete r.entitlements.active.premium]){const r=info();mutate(r);assert.equal(premiumFromBilling(r,'alice',false,now),null);}
 const cancelled=info();cancelled.entitlements.active.premium.willRenew=false;assert.ok(premiumFromBilling(cancelled,'alice',false,now));
 const other=info();other.entitlements.active={premium_plus:other.entitlements.active.premium};assert.equal(premiumFromBilling(other,'alice',false,now),null);
});
test('unsigned or tampered responses fail closed; sandbox is allowed only explicitly',()=>{
 for(const verification of ['FAILED','NOT_REQUESTED','']) {const r=info();r.entitlements.verification=verification;assert.throws(()=>premiumFromBilling(r,'alice',true,now));const e=info();e.entitlements.active.premium.verification=verification;assert.throws(()=>premiumFromBilling(e,'alice',true,now));}
 const r=info();r.entitlements.active.premium.isSandbox=true;assert.ok(premiumFromBilling(r,'alice',true,now));
});
test('account changes reject in-flight and queued results; failed work does not poison the queue',async()=>{
 let owner='alice';const run=createBillingQueue(()=>owner);let finish;const wait=new Promise(resolve=>finish=resolve);
 const first=run('alice',async()=>{await wait;return 'wrong-account';});await Promise.resolve();owner='bob';const queued=run('alice',async()=>assert.fail('stale task ran'));finish();await assert.rejects(first);await assert.rejects(queued);assert.equal(await run('bob',async()=>42),42);
 await assert.rejects(run('',async()=>42));
});
test('the shared SDK is serialized and only supported recurrence periods are offered',async()=>{
 const run=createBillingQueue(()=>'alice');const order=[];await Promise.all([run('alice',async()=>{order.push(1);await Promise.resolve();order.push(2);}),run('alice',async()=>order.push(3))]);assert.deepEqual(order,[1,2,3]);
 assert.equal(billingPeriod('P1M'),'por mês');assert.equal(billingPeriod('P1Y'),'por ano');for(const period of [null,'P1W','P3M',''])assert.equal(billingPeriod(period),null);
});
