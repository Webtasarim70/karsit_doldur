/* node tests/fatura_sira.js <tutanak.pdf...> — fatura satırları PDF'teki (sayfa, yukarıdan aşağıya) sırayla çıkıyor mu?
   e-Karşıt Excel'i sistemin verdiği şablonla aynı fatura sırasını korumalıdır. */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),parseEK=require('../js/02_ekarsit_pdf.js');
(async()=>{let hata=0;for(const f of process.argv.slice(2)){const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const r=parseEK(items),ilk=items.filter(i=>/^\d{2}\.\d{2}\.\d{4}$/.test(i.s.trim())&&i.x<75&&r.inv.some(v=>v.tarih===i.s.trim())).sort((a,b)=>b.k-a.k).map(i=>i.s.trim());
 const sira=r.inv.map(v=>v.tarih),ok=ilk.length===sira.length&&ilk.every((t,i)=>t===sira[i]);
 console.log(ok?'✓':'✗',f.split('/').pop(),'|',r.inv.length,'fatura','| PDF sırasıyla',ok?'aynı':'FARKLI');if(!ok)hata++}
 process.exit(hata?1:0)})();
