/* node tests/arsiv_yaz.js <ekarsit.pdf> <arsiv.xlsx> <çıktı.xlsx> [yıl-kaydır] — güncellenmiş arşiv gidiş-dönüş testi */
const fs=require('fs'),ExcelJS=require('exceljs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const parseEK=require('../js/02_ekarsit_pdf.js'),{parseArsiv}=require('../js/03_arsiv.js'),{donemler,arsivEslesme}=require('../js/04_kapsam.js'),Y=require('../js/15_arsiv_yaz.js'),K=require('../js/01_ortak.js');
(async()=>{const[pf,xf,out,yil]=process.argv.slice(2),d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(pf)),verbosity:0}).promise,it=[];
 for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>it.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const pdf=parseEK(it);if(yil)pdf.inv.forEach(i=>i.tarih=i.tarih.replace(/\.\d{4}$/,'.'+yil));
 const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(xf);const ars=parseArsiv(wb),D=donemler(pdf);
 /* etkin model: arşiv + yeni 2026 kayıtları (örnek) */
 const ef={...ars,kdv:[...ars.kdv,{donem:D.fatura[0],teslim:1234.5,ozel:0,matrah:1000,hesap:200,ilave:0,toplam:200,indirim:50,odenecek:150,devreden:0,tahakkuk:'T-1'}],isciler:[...ars.isciler,{donem:D.fatura[0],sayi:55,vd:'TUZLA'}],tedarikciler:[...ars.tedarikciler,{donem:D.fatura[0],ad:'TEST A.Ş.',vkn:'1234567890',vd:'X (Y)',tarih:'05.'+D.fatura[0],seri:'',no:'TST2026000000001',matrah:5000,kdv:1000,gumTarih:'',gumNo:''}]};
 const yillar=[...new Set([...D.fatura,...D.kdv].map(K.yilOf))];
 const r=await Y.arsivYaz({orijinal:new Uint8Array(fs.readFileSync(xf)),orijinalAd:xf.split('/').pop(),ef,muk:{unvan:pdf.kf.adi,vkn:pdf.kf.vn,vd:pdf.kf.vd,adres:pdf.kf.adres,tel:pdf.kf.tel},yillar,eskiSayfalar:ars.sayfalar});
 fs.writeFileSync(out,r.data);console.log('dosya:',r.ad,r.data.length,'bayt | etkilenen yıllar:',yillar.join(','));
 r.sayfalar.forEach(s=>console.log(' ',s.yil,s.yeniSayfa?'(yeni sayfa)':'(güncellendi)',Object.entries(s.fark).map(([k,o])=>`${k}:+${o.eklenen}/~${o.degisen.length}/=${o.ayni}/-${o.silinen}`).join(' ')));
 /* gidiş-dönüş: yeniden oku ve modelle karşılaştır */
 const w2=new ExcelJS.Workbook();await w2.xlsx.readFile(out);const a2=parseArsiv(w2);console.log('sayfalar:',w2.worksheets.map(w=>w.name).join(', '),'| okunan yıllar:',a2.yillar.join(','));
 for(const y of yillar){const s=a2.sayfalar.find(x=>x.yil===y),m=Y.sayfaModeli(ef,y);if(!s){console.log(' yıl',y,'okunamadı');continue}
  const say={ortak:s.ortaklar.length,defter:s.defterler.length,isci:s.isciler.length,kdv:s.kdv.length,imalatci:s.imalatcilar.length,tedarikci:s.tedarikciler.length},bek={ortak:m.ortak.length,defter:m.defter.length,isci:m.isci.length,kdv:m.kdv.length,imalatci:m.imalatci.length,tedarikci:m.tedarikci.length};
  console.log(' yıl',y,JSON.stringify(say)===JSON.stringify(bek)?'✓ satır sayıları tutuyor':'✗ FARKLI',JSON.stringify(say),'| mükellef:',s.mukellef.vkn);
  if(y==='2026'||yil){const k=s.kdv.find(x=>x.donem===D.fatura[0]);console.log('   KDV örnek satır:',JSON.stringify(k),'| işçi:',JSON.stringify(s.isciler.find(x=>x.donem===D.fatura[0])),'| tedarikçi:',JSON.stringify(s.tedarikciler[0]))}}})();
