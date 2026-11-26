const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const catalog = require('../src/data/bible-catalog.json');
const moduleValue = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/reading-reports-model.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleValue.exports, () => ({ validChapter: (book, n) => Number.isInteger(n) && n > 0 && n <= (catalog.find(b => b.name === book)?.chapters ?? 0) }), moduleValue);
const { createReportsRepository, decodeReport, summarizeReports, REPORT_KEY } = moduleValue.exports;
function memory() { const values = new Map(); return { values, getItem: async k => values.get(k) ?? null, setItem: async (k,v) => values.set(k,v) }; }
test('same chapter counts once per local day across editions and concurrent opens', async () => {
  const storage=memory(); let now=new Date(2026,9,30,12).getTime(); const repo=createReportsRepository(storage,()=>now);
  await Promise.all([repo.record('Salmos',23),repo.record('Salmos',23),repo.record('João',3)]);
  let result=summarizeReports(await repo.read(),new Date(now)); assert.equal(result.total,2); assert.equal(result.uniqueChapters,2); assert.equal(result.activeDays,1);
  now=new Date(2026,9,31,12).getTime(); await repo.record('Salmos',23);
  result=summarizeReports(await repo.read(),new Date(now)); assert.equal(result.total,3); assert.equal(result.uniqueChapters,2); assert.equal(result.activeDays,2);
});
test('month/year boundaries and six-month series keep distinct metrics',()=>{
  const data={version:1,startedAt:1,days:[{date:'2025-12-31',chapters:['Salmos:23']},{date:'2026-01-01',chapters:['João:3','Salmos:23']}]};
  const result=summarizeReports(data,new Date(2026,0,1,12)); assert.equal(result.total,2);assert.equal(result.months.length,6);assert.equal(result.months[4].key,'2025-12');assert.equal(result.months[4].total,1);assert.equal(result.months[5].total,2);assert.equal(result.elapsedDays,1);
  assert.equal(summarizeReports(null,new Date(2026,0,1,12)).total,0);
});
test('invalid or corrupt saved data is preserved instead of overwritten',async()=>{
  const storage=memory();storage.values.set(REPORT_KEY,'broken');const repo=createReportsRepository(storage);
  await assert.rejects(repo.read());await assert.rejects(repo.record('Salmos',23));assert.equal(storage.values.get(REPORT_KEY),'broken');
  assert.throws(()=>decodeReport(JSON.stringify({version:1,startedAt:1,days:[{date:'2026-02-30',chapters:['Salmos:23']}]})));
  assert.throws(()=>decodeReport(JSON.stringify({version:1,startedAt:1,days:[{date:'2026-02-28',chapters:['Inexistente:1']}]})));
});
test('old days expire after 400 civil days; future entries do not inflate current charts',async()=>{
  const storage=memory();let now=new Date(2025,0,1,12).getTime();const repo=createReportsRepository(storage,()=>now);await repo.record('Salmos',23);
  now=new Date(2026,9,30,12).getTime();await repo.record('João',3);const data=await repo.read();assert.equal(data.days.length,1);
  data.days.push({date:'2026-10-31',chapters:['Gênesis:1']});assert.equal(summarizeReports(data,new Date(now)).total,1);
});
