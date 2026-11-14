/* node tests/tedarikci_ozet.js <liste.xls|xlsx> <191.xlsx> <xml...> — tedarikçi okuyucuları ve seçim özeti (dönemler: DON=06.2026,03.2026) */
const fs=require('fs'),XLSX=require('xlsx'),ExcelJS=require('exceljs'),T=require('../js/14_tedarikci.js'),K=require('../js/01_ortak.js');
(async()=>{const[lf,mf,...xf]=process.argv.slice(2),sat=f=>XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync(f),{type:'buffer'}).Sheets[XLSX.read(fs.readFileSync(f),{type:'buffer'}).SheetNames[0]],{header:1,raw:true,defval:''});
 const L=T.kdvListesiOku(sat(lf)),M=T.muavin191Oku(sat(mf)),X=xf.map(f=>T.efaturaXml(fs.readFileSync(f,'utf8')));
 console.log('liste:',L.ok,L.satirlar.length,'satır | örnek:',JSON.stringify(L.satirlar[0]));console.log('191:',M.ok,M.satirlar.length,'fatura | örnek:',JSON.stringify(M.satirlar[0]));
 X.forEach((x,i)=>console.log('xml',i,x?JSON.stringify({...x,uyari:x.uyari.length}):'TANINMADI'));
 const D=(process.env.DON||'06.2026,03.2026').split(','),r=T.tedarikHesapla({liste:L.satirlar,m191:M.satirlar,xml:X.filter(Boolean),donemler:D});
 D.forEach(d=>{const o=r[d];console.log('\n##',d,'|',o.mod||'(kaynak yok)','| aday:',o.toplam,'| seçili:',o.secili.length,o.not.join(' '));o.secili.slice(0,12).forEach(s=>console.log('  ',s.alan.tarih,String(s.alan.no).padEnd(17),String(s.alan.vkn).padEnd(11),K.fmtTR(s.alan.matrah).padStart(13),K.fmtTR(s.alan.kdv).padStart(11),'vd:',(s.alan.vd||'-').padEnd(18),s.origin.join('+'),T.satirNotlari(s,true).map(n=>n[0]+':'+n[1].slice(0,28)).join(' | ')))})})();
