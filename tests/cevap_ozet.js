/* node tests/cevap_ozet.js <cevap.pdf...> — cevap yazısı (1-7. tablolar) okuyucu özeti */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),{parseCevap}=require('../js/16_cevap.js');
(async()=>{for(const f of process.argv.slice(2)){const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const c=parseCevap(items);console.log('\n###',f.split('/').pop());if(!c){console.log(' cevap yazısı DEĞİL');continue}
 for(const k of ['ortaklar','defterler','isciler','kdv','imalatcilar','tedarikciler']){console.log(' '+k+' ('+c[k].length+')');c[k].forEach(r=>console.log('   ',JSON.stringify(r)))}
 console.log(' imalatciYok:',c.imalatciYok,'| uyarı:',c.uyari.join(' ; ')||'-')}})();
