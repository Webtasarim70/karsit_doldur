/* Yerel test: node tests/cikti.js <pdf> <xlsx> <çıktı klasörü> [yıl-kaydır]
   Son parametre verilirse fatura tarihlerinin yılı değiştirilir (arşivde verisi olan bir döneme kaydırıp çıktıyı denemek için). */
const fs=require('fs'),ExcelJS=require('exceljs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const parseEK=require('../js/02_ekarsit_pdf.js'),{parseArsiv}=require('../js/03_arsiv.js'),{kapsam,secim}=require('../js/04_kapsam.js'),{excelCikti}=require('../js/07_excel_cikti.js'),{zip}=require('../js/06_zip.js');
(async()=>{const[pdfF,xlF,dir,yil]=process.argv.slice(2);fs.mkdirSync(dir,{recursive:true});
 const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(pdfF)),verbosity:0}).promise,items=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const pdf=parseEK(items),wb=new ExcelJS.Workbook();await wb.xlsx.readFile(xlF);const ars=parseArsiv(wb);
 if(yil)pdf.inv.forEach(i=>i.tarih=i.tarih.replace(/\.\d{4}$/,'.'+yil));
 const sec=secim(pdf,ars),k=kapsam(pdf,ars);k.tablolar.forEach(t=>console.log(t.durum.padEnd(6),t.ad.padEnd(20),`${t.var}/${t.gerekli}`,t.eksik.slice(0,4).join(', ')));
 const files=await excelCikti(sec,{vkn:pdf.kf.vn,tarih:new Date(2026,10,10)});
 files.forEach(f=>{fs.writeFileSync(`${dir}/${f.ad}`,f.data);console.log(f.satir,'satır',f.ad)});
 fs.writeFileSync(`${dir}/hepsi.zip`,zip(files.map(f=>({name:f.ad,data:f.data}))));console.log('zip ok')})();
