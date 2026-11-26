import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiRequest, parseGemini, generateWithGemini } from './gemini.mjs';
const source = { theme: 'Perdão',baseText:'Efésios 4:32',introduction:'Introdução',points:[1,2,3].map(n=>({title:`Ponto ${n}`,body:'Explicação'})),application:'Aplicação',conclusion:'Conclusão',references:['Efésios 4:32'],questions:['Como aplicar?'] };
const result = Object.fromEntries(['introduction','point1','point2','point3','application','conclusion'].map(key=>[key,'palavra '.repeat(800).trim()]));
const response = {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'Não incorporar raciocínio'},{text:JSON.stringify(result)}]}}]};
test('Gemini request uses fixed host, bounded output and structured JSON; model cannot redirect requests',()=>{
  const request=geminiRequest(source,40,'gemini-test');assert.equal(request.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');assert.equal(request.body.generationConfig.maxOutputTokens,20000);assert.equal(request.body.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');assert.match(request.body.systemInstruction.parts[0].text,/4800/);
  for(const model of ['../bad','https://example.com','gemini-x?key=secret','models/gemini-test','']) assert.throws(()=>geminiRequest(source,40,model));
});
test('Gemini output preserves references and source and excludes thought parts',()=>{
  const before=JSON.stringify(source);const draft=parseGemini(response,source,40);assert.deepEqual(draft.references,source.references);assert.equal(draft.points[0].title,source.points[0].title);assert.equal(JSON.stringify(source),before);assert.ok(!draft.introduction.includes('raciocínio'));
});
test('blocked, truncated, malformed or short output is rejected',()=>{
  for(const value of [{},{promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'MAX_TOKENS'}]},{candidates:[{finishReason:'STOP',content:{parts:[{text:'invalid'}]}}]},{candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]}]) assert.throws(()=>parseGemini(value,source,40));
});
test('secret is only in request header; transport errors never expose provider content',async()=>{
  let observed;
  const draft=await generateWithGemini({outline:source,duration:40,model:'gemini-test',apiKey:'test-not-real',fetcher:async(url,options)=>{observed={url,options};return {ok:true,json:async()=>response};}});
  assert.equal(observed.options.headers['x-goog-api-key'],'test-not-real');assert.ok(!observed.url.includes('test-not-real'));assert.ok(!observed.options.body.includes('test-not-real'));assert.equal(draft.theme,source.theme);
  await assert.rejects(generateWithGemini({outline:source,duration:40,model:'gemini-test',apiKey:'test-not-real',fetcher:async()=>({ok:false,status:429})}),/provider-quota/);
});
