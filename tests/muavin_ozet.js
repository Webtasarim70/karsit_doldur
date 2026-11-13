/* node tests/muavin_ozet.js <ekarsit.pdf> <muavin.pdf> — muavin okuyucu ve fatura eşleştirme özeti */
const fs=require('fs'),pdfjs=require('pdfjs-dist/legacy/build/pdf.js'),{kdvMetin}=require('../js/08_kdv.js'),parseEK=require('../js/02_ekarsit_pdf.js'),M=require('../js/13_muavin.js'),K=require('../js/01_ortak.js');
const oku=async f=>{const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise,it=[];for(let p=1;p<=d.numPages;p++){const tc=await(await d.getPage(p)).getTextContent();tc.items.forEach(i=>it.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}return it};
(async()=>{const[a,b]=process.argv.slice(2),pdf=parseEK(await oku(a)),bel=M.muavinBelge(kdvMetin(await oku(b)));
 console.log('muavin:',bel?bel.hesaplar.map(h=>`${h.kod} / ${h.ad.slice(0,34)} satır:${h.rows.length} devir:${K.fmtTR(h.ac)}`):'TANINMADI',bel&&bel.hata||'');
 const r=M.muavinEsle(pdf.inv,[bel]);
 pdf.inv.forEach(i=>{const x=r[M.faturaAnahtar(i)];console.log(i.tarih,i.no.slice(-8).padEnd(9),K.fmtTR(x.toplam).padStart(12),x.durum.padEnd(5),x.satir?`${x.veri.dk} yev:${String(x.veri.yevNo).padEnd(6)} ödeme: ${(x.veri.odeme).padEnd(8)} kalan:${K.fmtTR(x.kalan)} ${x.ayrinti.map(o=>o.y+' '+K.fmtTR(o.tutar)).join('; ')}`:'')})})();
