import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, generationBody, parseGeneration } from './composition.mjs';
const source = { theme: 'Perdão', baseText: 'Efésios 4:32', introduction: 'Introdução', points: [1,2,3].map(n=>({title:`Ponto ${n}`,body:'Explicação'})),application:'Aplicação',conclusion:'Conclusão',references:['Efésios 4:32'],questions:['Como aplicar?'] };
test('duration validation and source whitelist exclude private notes',()=>{
  assert.throws(()=>validateRequest({outline:source,duration:99}));
  assert.equal(validateRequest({outline:{...source,notes:'privado'},duration:40}).outline.notes,undefined);
  assert.throws(()=>validateRequest({outline:{...source,introduction:'x'.repeat(12001)},duration:40}));
});
test('request has bounded output, no remote storage, no tools and duration target',()=>{
  const body=generationBody(source,40,'configured-model');assert.equal(body.store,false);assert.equal(body.max_output_tokens,20000);assert.equal(body.tools,undefined);assert.match(body.instructions,/4800/);assert.equal(body.text.format.strict,true);
});
const response = result => ({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]});
test('long generation preserves original references, titles, and source',()=>{
  const before=JSON.stringify(source);const paragraph='palavra '.repeat(800).trim();const result=Object.fromEntries(['introduction','point1','point2','point3','application','conclusion'].map(k=>[k,paragraph]));
  const draft=parseGeneration(response(result),source,40);assert.deepEqual(draft.references,source.references);assert.equal(draft.points[1].title,source.points[1].title);assert.equal(JSON.stringify(source),before);
});
test('short, incomplete, refused and oversized generation cannot be saved as long message',()=>{
  assert.throws(()=>parseGeneration({status:'incomplete'},source,40));
  assert.throws(()=>parseGeneration({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]},source,40));
  const short=Object.fromEntries(['introduction','point1','point2','point3','application','conclusion'].map(k=>[k,'curto']));assert.throws(()=>parseGeneration(response(short),source,40));
  assert.throws(()=>parseGeneration(response({...short,introduction:'x'.repeat(12001)}),source,40));
});
