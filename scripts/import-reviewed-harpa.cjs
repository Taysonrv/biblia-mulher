const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd();const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/HARPA-BATCH-2026-10-28.json'),'utf8'));
const revision='e8ff5ca2f9c9e7d9892c0c68f2ad45eea3273127';
const repo='https://github.com/DanielLiberato/Harpa-Crista-JSON-640-Hinos-Completa';
const textSource=`${repo}/blob/${revision}/harpa_crista_640_hinos.json`;
function clean(text) {
 if(typeof text!=='string')throw Error('Texto não é string.');
 const value=text.replace(/<br\s*\/?>/gi,'\n').replace(/(?:^|\n)\s*(?:Autor|Tradutor|Compositor)\s*:[\s\S]*$/i,'').split('\n').map(line=>line.trim()).join('\n').trim();
 if(/<[^>]+>|&(?:[a-z]+|#\d+);/i.test(value))throw Error('Marcação precisa de revisão manual.');
 return value;
}
(async()=>{
 const response=await fetch(`https://raw.githubusercontent.com/DanielLiberato/Harpa-Crista-JSON-640-Hinos-Completa/${revision}/harpa_crista_640_hinos.json`);
 if(!response.ok)throw Error('Fonte indisponível.');const raw=await response.text();const data=JSON.parse(raw);
 const catalogPath=path.join(root,'src/data/harpa.json');const current=JSON.parse(fs.readFileSync(catalogPath,'utf8'));const map=new Map(current.map(row=>[row.number,row]));
 const corrections=[];
 for(const item of manifest){
  const source=data[item.number];if(!source||typeof source.hino!=='string'||!source.verses)throw Error('Entrada ausente.');
  const title=source.hino.replace(/^\d+\s*-\s*/, '').trim();
  const keys=Object.keys(source.verses).sort((a,b)=>Number(a)-Number(b));if(!keys.every((key,i)=>key===String(i+1)))throw Error('Numeração de estrofes inválida.');
  const apply=text=>{let result=clean(text);for(const [before,after]of item.corrections??[]){if(result.includes(before)){result=result.replaceAll(before,after);corrections.push({number:item.number,before,after});}}return result;};
  const verses=keys.map(key=>apply(source.verses[key]));if(verses.some(text=>!text))throw Error('Estrofe vazia.');const chorus=source.coro?apply(source.coro):'';
  map.set(item.number,{number:item.number,title,author:item.author,portugueseCredit:item.portugueseCredit,category:item.category??'worship',verses,...(chorus?{chorus}:{}),rights:{status:'public-domain',territory:'BR',reviewedAt:'2026-10-28',basis:`Análise individual dos créditos e da versão em português, com último falecimento considerado em ${item.lastDeath}. Pela regra geral do art. 41 da Lei 9.610/1998, o prazo se encerrou ao final de ${item.lastDeath+70}. Trata-se de conclusão para uso do texto tradicional no Brasil, sem arranjos ou gravações.`,textNote:`Quebras de linha organizadas para leitura. ${item.note??'Grafia e pontuação seguem a transcrição tradicional conferida; não há reprodução de ilustrações ou comentários editoriais.'}`,sources:[...item.sources,{label:'Transcrição conferida — revisão fixa',url:textSource},{label:'Lei 9.610/1998, artigos 14 e 41',url:'https://www2.camara.leg.br/legin/fed/lei/1998/lei-9610-19-fevereiro-1998-365399-normaatualizada-pl.html'}]}});
 }
 const result=[...map.values()].sort((a,b)=>a.number-b.number);fs.writeFileSync(catalogPath,JSON.stringify(result,null,2)+'\n');
 const notes={328:{status:'pending',reason:'Tradução atribuída a Paulo Leivas Macalão (1982); autorização não documentada.',url:'https://www.hinologia.org/o-pao-da-vida-no-326-da-harpa-crista/'},533:{status:'pending',reason:'Letra portuguesa atribuída a Stuart Edmund McNair (1959); não tratar como domínio público por ser antiga.',url:'https://www.hymnary.org/text/cristo_nosso_salvador'},581:{status:'pending',reason:'A redação da transcrição diverge da versão Hafe identificada como domínio público no Hymnary; não substituir silenciosamente uma pela outra.',url:'https://hymnary.org/text/castelo_forte_e_nosso_deus_hafe'},4:{status:'pending',reason:'Original identificado, mas autoria da redação portuguesa desta transcrição ainda inconclusiva.'},390:{status:'pending',reason:'Créditos consultados indicam possível coautoria ainda não identificada.'}};
 const audit={reviewedAt:'2026-10-28',scope:'Inventário técnico de 640 entradas; revisão individual somente das entradas documentadas. Não representa parecer sobre todas as letras.',source:textSource,sha256:crypto.createHash('sha256').update(raw).digest('hex'),included:result.length,corrections,entries:Object.keys(data).filter(key=>/^\d+$/.test(key)).map(key=>({number:Number(key),title:data[key].hino,status:map.has(Number(key))?'included':notes[key]?.status??'not-reviewed',...(notes[key]??{})}))};
 fs.writeFileSync(path.join(root,'docs/HARPA-REVIEW.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(`Catálogo: ${result.length} letras; ${manifest.length} inclusões no lote. Correções documentadas: ${corrections.length}. Nenhum arquivo de dados pessoais foi alterado.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
