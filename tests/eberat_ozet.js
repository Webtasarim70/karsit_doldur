/* node tests/eberat_ozet.js <xml|pdf...> — e-Berat okuyucu özeti */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),{kdvMetin}=require('../js/08_kdv.js'),E=require('../js/12_eberat.js');
(async()=>{for(const f of process.argv.slice(2)){let b;
 if(/\.xml$/i.test(f))b=E.eberatXml(fs.readFileSync(f,'utf8'));
 else{const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}b=E.eberatPdf(kdvMetin(items))}
 console.log('\n##',f.split('/').pop(),'→',b?JSON.stringify(b):'TANINMADI');if(b&&!b.hata)console.log('   anahtar:',E.eberatAnahtar(b),'| satır:',JSON.stringify(E.eberatSatir(b)),'| süre:',JSON.stringify(E.eberatSuresi(b.baslangic,new Date(2026,10,13))))}})();
