/* Yerel test: node tests/run.js <ekarsit.pdf> <arsiv.xlsx>   (gerçek dosyalar yerel/ klasöründe tutulur, repoya girmez) */
const fs=require('fs'),path=require('path'),ExcelJS=require('exceljs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const parseEK=require('../js/02_ekarsit_pdf.js'),{parseArsiv}=require('../js/03_arsiv.js'),{kapsam}=require('../js/04_kapsam.js');
(async()=>{const[pdfF,xlF]=process.argv.slice(2);if(!pdfF||!xlF){console.log('Kullanım: node tests/run.js <pdf> <xlsx>');process.exit(1)}
 const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(pdfF)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const pdf=parseEK(items),wb=new ExcelJS.Workbook();await wb.xlsx.readFile(xlF);const ars=parseArsiv(wb);
 if(process.env.JSON)console.log(JSON.stringify({pdf,ars},null,1));
 const k=kapsam(pdf,ars);console.log('Fatura:',pdf.inv.length,'| PDF TOPLAM:',pdf.toplam.join(' / '),'| satır toplamı:',k.tutar.matrah.toFixed(2),'/',k.tutar.kdv.toFixed(2));console.log('Mükellef (Ç):',pdf.kf.adi,pdf.kf.vn,'| Arşiv:',ars.mukellef.unvan,ars.mukellef.vkn);
 console.log('Dönemler:',JSON.stringify(k.donemler),'| Arşiv yılları:',ars.yillar.join(','));
 k.tablolar.forEach(t=>console.log(`${t.durum.padEnd(6)} ${t.ad.padEnd(20)} ${t.var}/${t.gerekli} ${t.not} ${t.eksik.length?'EKSİK: '+t.eksik.join(', '):''}`));
 k.uyari.forEach(u=>console.log('UYARI:',u))})();
