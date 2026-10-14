const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!process.argv[2])throw Error('Informe o caminho do arquivo pg62383.txt.');
const output=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'src/data/almeida-1911.json');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'src/data/bible-catalog.json'),'utf8'));
const raw=fs.readFileSync(path.resolve(process.argv[2]),'utf8');
const checksum=crypto.createHash('sha256').update(raw).digest('hex');
if(checksum!=='bf9c6053bfb441d117a2a128d4edec9fbe935f415bc8f7bf4e1f3f9121790215')throw Error('A fonte difere da transcrição verificada. Confira a nova edição antes de importar.');
const clean=raw.replace(/\r/g,'');
const body=clean.slice(clean.indexOf('O PRIMEIRO LIVRO DE MOYSÉS CHAMADO GENESIS.'),clean.indexOf('\n\nNOTAS\n'));
// The transcription prints Hosea 11:5 inline after 11:4; retain its actual number.
const paragraphs=body.replace('mantimento. 5 Não', 'mantimento.\n\n5 Não')
  // Printed/transcribed as 31 between 33 and 35; Mark 4:34 is independently checked.
  .replace('\n31 E sem parabolas nunca lhes fallava', '\n34 E sem parabolas nunca lhes fallava')
  .split(/\n\s*\n/);
const headers=[];
for(let i=0;i<paragraphs.length;i++){
  const h=paragraphs[i].replace(/\[[^\]]*\]/g,'').trim();
  if(h.length>=4 && h.length<200 && h===h.toLocaleUpperCase('pt') && /[A-Z]/.test(h) && !/^[\d_*]/.test(h) && !/^(FIM DO|O NOVO TESTAMENTO|OS LIVROS DO)/.test(h)) headers.push({index:i,heading:h});
}
if(catalog.length!==66 || headers.length!==66)throw Error('Book headers: '+headers.length+' '+JSON.stringify(headers));
const source={};
for(let b=0;b<66;b++){
  const meta=catalog[b], chunks=paragraphs.slice(headers[b].index+1,headers[b+1]?.index??paragraphs.length);
  const book={}; let chapter=0; let verses=[]; const items=[];
  for(const para of chunks){
    let normalized=para.replace(/\[[^\]]*\]/g,'').replace(/_/g,'').trim();
    // Acrostic letter labels precede the printed verse numbers in Lamentations.
    normalized=normalized.replace(/^[A-Z]+\.\s*(?=\d)/, '');
    const match=normalized.match(/^(\d+)\s+([\s\S]*)$/);
    if(!match)continue;
    items.push({number:Number(match[1]),text:match[2].replace(/\s+/g,' ').trim()});
  }
  for(let i=0;i<items.length;i++){
    const {number,text}=items[i];
    const beginsChapter=!chapter || (number===chapter+1 && items[i+1]?.number===2);
    if(beginsChapter){
      if(number!==chapter+1)throw Error(meta.name+' invalid chapter '+number);
      chapter++; verses=[]; book[chapter]=verses;
    } else if(number!==verses.length+1)throw Error(meta.name+' '+chapter+' expected verse '+(verses.length+1)+' got '+number+' '+text.slice(0,80));
    verses.push(text);
  }
  if(chapter!==meta.chapters)throw Error(meta.name+' chapters '+chapter+' expected '+meta.chapters);
  source[meta.name]=book;
}
const prior=JSON.parse(fs.readFileSync(root+'/src/data/almeida-1911.json','utf8'));
const mismatches=[];
for(const [name,book] of Object.entries(prior))for(const [chapter,verses] of Object.entries(book)){
  if(name==='Salmos'&&chapter==='23'){source.Salmos[23]=verses;continue;}
  if(JSON.stringify(source[name][chapter])!==JSON.stringify(verses))mismatches.push(name+' '+chapter);
}
if(mismatches.length)throw Error('Existing chapters differ: '+mismatches);
const chapterTotal=Object.values(source).reduce((n,b)=>n+Object.keys(b).length,0);
const verseTotal=Object.values(source).flatMap(b=>Object.values(b)).reduce((n,v)=>n+v.length,0);
if(chapterTotal!==1189||verseTotal!==31105)throw Error('Contagem inesperada de capítulos ou versículos.');
fs.writeFileSync(output,JSON.stringify(source,null,2)+'\n');
console.log(JSON.stringify({books:66,chapters:chapterTotal,verses:verseTotal,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),longest:Math.max(...Object.values(source).flatMap(b=>Object.values(b)).map(v=>v.length))}));
