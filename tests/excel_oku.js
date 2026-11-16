/* node tests/excel_oku.js <vkn> <dönemler,virgülle> <xlsx...> — KDV Excel okuyucu denemesi */
const ExcelJS=require('exceljs'),{kdvExcelOku}=require('../js/09_excel_oku.js');
(async()=>{const[vkn,don,...fs]=process.argv.slice(2);for(const f of fs){const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(f);const r=await kdvExcelOku(wb,{dosya:f.split('/').pop(),vkn,donemler:don.split(',')});
 console.log('\n##',f.split('/').pop().slice(0,70),'→ ok:',r.ok,'| satır:',r.satirlar.map(s=>s.donem).join(' '));r.uyari.forEach(u=>console.log('   ',u.k.toUpperCase(),u.t))}})();
