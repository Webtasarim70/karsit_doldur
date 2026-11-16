/* node tests/kdv_ozet.js <pdf...> — KDV beyanname/tahakkuk okuyucu özeti (pdf.js öğelerinden metin kurar, tarayıcıyla aynı yol) */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),{kdvMetin,kdvBelge,kdvSatirlari}=require('../js/08_kdv.js');
(async()=>{const B=[];for(const f of process.argv.slice(2)){const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const b=kdvBelge(kdvMetin(items));console.log('\n##',f.split('/').pop(),'→',b?JSON.stringify(b):'TANINMADI');if(b)B.push(b)}
 const r=kdvSatirlari(B);console.log('\nBİRLEŞİK SATIRLAR');r.satir.forEach(s=>console.log(JSON.stringify(s)));console.log('uyarı:',r.uyari)})();
