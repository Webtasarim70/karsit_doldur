/* node tests/pdf_ozet.js <pdf...> — e-Karşıt PDF okuyucu özeti (genel doğrulama) */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),parseEK=require('../js/02_ekarsit_pdf.js'),K=require('../js/01_ortak.js');
(async()=>{for(const f of process.argv.slice(2)){const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const r=parseEK(items),m=r.inv.reduce((a,i)=>a+(K.parseNum(i.matrah)||0),0),kd=r.inv.reduce((a,i)=>a+(K.parseNum(i.kdv)||0),0);
 console.log('\n###',f.split('/').pop(),'| sayfa',d.numPages);
 console.log(' sayı/tarih:',r.sayi,'/',r.tarih,'| A:',r.ymm.adi,'|',r.ymm.tel,'| şirket:',r.ymm.sirket||'-');
 console.log(' B:',r.firma.adi,r.firma.vn,'| C:',r.c.adi||'-',r.c.vn||'','| Ç:',r.kf.adi,r.kf.vn,'|',r.kf.vd);
 console.log(' sözleşme:',r.contracts.map(c=>`${c.tip}:${c.bas}-${c.bit}`).join(' ; ')||'YOK');
 console.log(' fatura:',r.inv.length,'| PDF toplam:',r.toplam.join(' / '),'| satır toplamı:',K.fmtTR(m),'/',K.fmtTR(kd),(r.toplam.length>=2&&Math.abs(K.parseNum(r.toplam[0])-m)<.01&&Math.abs(K.parseNum(r.toplam[1])-kd)<.01)?'✓ TUTUYOR':'✗ FARKLI');
 console.log(' ilk/son:',r.inv[0]&&JSON.stringify(r.inv[0]),'\n          ',r.inv.length>1&&JSON.stringify(r.inv[r.inv.length-1]))}})();
