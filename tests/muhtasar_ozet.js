/* node tests/muhtasar_ozet.js <pdf...> — Muhtasar ve Prim Hizmet Beyannamesi okuyucu özeti */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),{kdvMetin}=require('../js/08_kdv.js'),{muhtasarBelge}=require('../js/11_muhtasar.js');
(async()=>{for(const f of process.argv.slice(2)){const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const b=muhtasarBelge(kdvMetin(items));console.log('\n##',f.split('/').pop(),'| sayfa',d.numPages,'→',b?JSON.stringify(b):'TANINMADI')}})();
