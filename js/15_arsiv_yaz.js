/* Güncellenmiş arşiv: etkilenen yıl sayfaları ("ARŞİV YYYY") mevcut arşivin düzenine uygun yeniden yazılır; diğer sayfalara dokunulmaz.
   Düzen (03_arsiv.js okuyucusuyla aynı): B3:C7 mükellef bloğu; bölüm başlığı (beyaz/koyu), sütun başlığı (açık gri), veri satırları; tutarlar TR metin. */
(function(g){
const N=typeof module!=='undefined',K=N?require('./01_ortak.js'):g.KD,EJ=N?require('exceljs'):g.ExcelJS,{fmtTR,parseNum,donemOfTarih,defterAnahtar,yilOf,donemSort,normDonem}=K;
const BOLUM=[
 {k:'ortak',ad:'Ortak Bilgileri',liste:'ortaklar',kol:[['ad','Adı Soyadı / Ünvanı'],['vkn','Vergi/T.C. Kimlik No'],['il','Bağlı Olduğu İl'],['vd','Bağlı Olduğu Vergi Dairesi'],['pay','Pay Oranı'],['aciklama','Açıklama']],anahtar:r=>(r.ad+'|'+r.vkn)},
 {k:'defter',ad:'Defter Bilgileri',liste:'defterler',kol:[['nevi',"Defterin Nev'i"],['bas','Başlangıç Dönemi'],['bit','Bitiş Dönemi'],['makam','Tasdik Makamı'],['tarih','Tasdik Tarihi'],['no','Tasdik No / Berat No'],['aciklama','Açıklama'],['tur','Defter Türü Açıklama']],anahtar:r=>(nevi(r.nevi)+'|'+r.bas+'|'+r.bit)},
 {k:'isci',ad:'İŞCİ SAYILARI',liste:'isciler',kol:[['donem','Dönem (AA.YYYY)'],['sayi','Çalışan İşçi Sayısı'],['vd','Beyannamenin Verildiği Vergi Dairesi']],anahtar:r=>r.donem,n:['sayi']},
 {k:'kdv',ad:'KDV BEYANNAMESİ BİLGİLERİ',liste:'kdv',kol:[['donem','Dönem'],['teslim','Teslim ve Hizmet Karşılığını Teşkil Eden Bedel'],['ozel','Özel Matrah Şekline Tabi İşl. Matr. Dahil Olm. Bedel'],['matrah','KDV Matrahı'],['hesap','Hesaplanan KDV'],['ilave','İlave Edilecek KDV'],['toplam','Toplam KDV'],['indirim','İndirimler Toplamı'],['odenecek','Ödenmesi Gereken KDV'],['devreden','Sonraki Döneme Devreden KDV'],['tahakkuk','Tahakkuk Fişinin Numarası']],anahtar:r=>r.donem,para:['teslim','ozel','matrah','hesap','ilave','toplam','indirim','odenecek','devreden']},
 {k:'imalatci',ad:'İMALATÇI FİRMA BİLGİLERİ',liste:'imalatcilar',kol:[['ad','Adı Soyadı / Ünvanı'],['vkn','Vergi/T.C. Kimlik No'],['oda','Bağlı Bulunduğu Sanayi Odası'],['tarih','Belge Tarihi'],['no','Belge Numarası'],['tur','Belge Türü'],['aciklama','Açıklama']],anahtar:r=>(r.ad+'|'+r.vkn+'|'+r.no)},
 {k:'tedarikci',ad:'TEDARİKÇİ FİRMA BİLGİLERİ',liste:'tedarikciler',kol:[['ad','Adı Soyadı / Ünvanı'],['vkn','Vergi/T.C. Kimlik No'],['vd','Bağlı Olduğu Vergi Dairesi'],['tarih','Faturanın Tarihi'],['seri','Faturanın Serisi'],['no','Faturanın Numarası'],['matrah','Faturanın Matrahı'],['kdv','Faturanın KDV Tutarı'],['gumTarih','Gümrük Beyannamesi/Serbest Bölge İşlem Formu Tarihi'],['gumNo','Gümrük Beyannamesi/Serbest Bölge İşlem Formu Tescil Numarası']],anahtar:r=>(r.donem+'|'+r.no+'|'+r.ad),para:['matrah','kdv']}];
const nz=s=>String(s??'').trim();
/* Excel/e-Karşıt kodlarını arşivin okunur biçimine çevirir (E_DEFTER_YEVMIYE_DEFTERI → e-Defter Yevmiye Defteri; SANAYI_SICIL_BELGESI → Sanayi Sicil Belgesi) */
const ASC=s=>K.U(s).replace(/İ/g,'I').replace(/Ç/g,'C').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/[^A-Z0-9]/g,'');
function nevi(s){const u=ASC(s),e=/^EDEFTER/.test(u);if(/ENVANTER/.test(u))return'ENVANTER DEFTERİ';if(/YEVM/.test(u))return e?'e-Defter Yevmiye Defteri':'Yevmiye Defteri';if(/KEBIR/.test(u))return e?'e-Defter Defteri Kebir':'Defteri Kebir';return nz(s)}
function belgeTuru(s){const u=ASC(s);return u==='SANAYISICILBELGESI'?'Sanayi Sicil Belgesi':u==='DIGER'?'Diğer':nz(s)}
const OKU={'defter.nevi':nevi,'imalatci.tur':belgeTuru};
/* Bir kaydın ait olduğu yıl: defter → başlangıç yılı; dönemli kayıtlar → dönem yılı; ortak/imalatçı yıla bağlı değil (null) */
function yilOfKayit(b,r){if(b.k==='defter')return r.bas?yilOf(normDonem(r.bas)):null;if(b.k==='isci'||b.k==='kdv'||b.k==='tedarikci')return r.donem?yilOf(normDonem(r.donem)):null;return null}
/* Etkin (birleştirilmiş) arşiv modelinden bir yıl sayfasının modeli */
function sayfaModeli(ef,yil){const m={};BOLUM.forEach(b=>{const L=(ef[b.liste]||[]).filter(r=>(b.k==='ortak'||b.k==='imalatci')||yilOfKayit(b,r)===yil),M=new Map();L.forEach(r=>M.set(b.anahtar(r),r));m[b.k]=[...M.values()]});return m}
function degerMetni(b,k,v){if(v==null||v==='')return'';if(OKU[b.k+'.'+k])return OKU[b.k+'.'+k](v);if((b.para||[]).includes(k)){const n=typeof v==='number'?v:parseNum(v);return n==null?String(v):fmtTR(n)}return String(v)}
/* Karşılaştırma için normalleştirilmiş kayıt */
const norm=(b,r)=>b.kol.map(([k])=>OKU[b.k+'.'+k]?OKU[b.k+'.'+k](r[k]):(b.para||[]).includes(k)?String(parseNum(r[k])??''):(b.n||[]).includes(k)?String(parseNum(r[k])??''):nz(r[k]).replace(/\s+/g,' ')).join('¦');
/* Eski sayfa (varsa) ile yeni sayfa arasındaki fark: bölüm başına {eklenen, degisen:[{eski,yeni}], ayni} */
function fark(eski,yeni){const out={};BOLUM.forEach(b=>{const E=new Map((eski?eski[b.k]:[]).map(r=>[b.anahtar(r),r])),o={eklenen:0,degisen:[],ayni:0,silinen:0};
 yeni[b.k].forEach(r=>{const e=E.get(b.anahtar(r));if(!e)o.eklenen++;else if(norm(b,e)!==norm(b,r))o.degisen.push({eski:e,yeni:r});else o.ayni++;E.delete(b.anahtar(r))});o.silinen=E.size;out[b.k]=o});return out}
const STIL={bas:{font:{bold:true,size:12,color:{argb:'FFFFFFFF'}},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF155E75'}}},sut:{font:{bold:true,size:10.5},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFE6EDEE'}}}};
function sayfaYaz(wb,ad,muk,m){const ws=wb.addWorksheet(ad);ws.getColumn(1).width=8;ws.getColumn(2).width=22;for(let c=3;c<=12;c++)ws.getColumn(c).width=26;
 [['ADI VE SOYADI / ÜNVANI',muk.unvan],['VERGI/T.C. KIMLIK NUMARASI',muk.vkn],['VERGI DAIRESI',muk.vd],['ADRES',muk.adres],['TELEFON NUMARASI',muk.tel]].forEach((x,i)=>{const r=ws.getRow(3+i);r.getCell(2).value=x[0];r.getCell(2).font={bold:true,size:11};r.getCell(3).value=nz(x[1])});
 let r=10;
 BOLUM.forEach(b=>{const t=ws.getRow(r);t.getCell(2).value=b.ad;t.getCell(2).font=STIL.bas.font;t.getCell(2).fill=STIL.bas.fill;r++;
  const veri=m[b.k];
  if(b.k==='tedarikci'){const G={};veri.forEach(x=>(G[x.donem]??=[]).push(x));
   donemSort(Object.keys(G)).forEach(d=>{const h=ws.getRow(r);h.getCell(1).value=d.replace('.','/');[1,...b.kol.map((_,i)=>i+2)].forEach(c=>{const x=h.getCell(c);x.font=STIL.sut.font;x.fill=STIL.sut.fill});b.kol.forEach(([k,l],i)=>h.getCell(i+2).value=l);r++;
    G[d].forEach((x,ix)=>{const w=ws.getRow(r);w.getCell(1).value=ix+1;b.kol.forEach(([k],i)=>w.getCell(i+2).value=degerMetni(b,k,x[k]));r++});r++});
   if(!veri.length){const h=ws.getRow(r);b.kol.forEach(([k,l],i)=>{const x=h.getCell(i+2);x.value=l;x.font=STIL.sut.font;x.fill=STIL.sut.fill});r+=2}
  }else{const h=ws.getRow(r);b.kol.forEach(([k,l],i)=>{const x=h.getCell(i+2);x.value=l;x.font=STIL.sut.font;x.fill=STIL.sut.fill});r++;
   const sirali=(b.k==='isci'||b.k==='kdv')?veri.slice().sort((x,y)=>K.donemKey(x.donem)<K.donemKey(y.donem)?-1:1):veri;
   sirali.forEach(x=>{const w=ws.getRow(r);b.kol.forEach(([k],i)=>w.getCell(i+2).value=degerMetni(b,k,x[k]));r++});r+=2}
  r+=1});
 return ws}
/* opt: {orijinal:ArrayBuffer|Uint8Array|null, orijinalAd, ef (etkin model), muk:{unvan,vkn,vd,adres,tel}, yillar:[...etkilenen], eskiSayfalar:[{yil,...model}] (parseArsiv().sayfalar)}
   → {data:Uint8Array, ad, sayfalar:[{yil,yeni,fark}]} */
async function arsivYaz(opt){const wb=new EJ.Workbook();wb.creator='Karşıt Doldur';if(opt.orijinal)await wb.xlsx.load(opt.orijinal.buffer&&!(opt.orijinal instanceof ArrayBuffer)?opt.orijinal.buffer.slice(opt.orijinal.byteOffset,opt.orijinal.byteOffset+opt.orijinal.byteLength):opt.orijinal);
 const sayfalar=[],eski=Object.fromEntries((opt.eskiSayfalar||[]).map(s=>[s.yil,{ortak:s.ortaklar,defter:s.defterler,isci:s.isciler,kdv:s.kdv,imalatci:s.imalatcilar,tedarikci:s.tedarikciler}]));
 const yillar=[...new Set(opt.yillar)].sort();
 yillar.forEach(y=>{const ad='ARŞİV '+y,var_=wb.worksheets.find(w=>w.name===ad),m=sayfaModeli(opt.ef,y),es=(opt.eskiSayfalar||[]).find(s=>s.yil===y),mk=(es&&es.mukellef&&es.mukellef.vkn)?es.mukellef:opt.muk;
  sayfalar.push({yil:y,yeni:m,fark:fark(eski[y]||null,m),yeniSayfa:!var_});if(var_)wb.removeWorksheet(var_.id);sayfaYaz(wb,ad,{...mk},m)});
 /* sayfa sırası: ARŞİV sayfaları yıla göre, sonra diğerleri */
 const ars=wb.worksheets.filter(w=>/^AR[ŞS][İI]V\s+\d{4}$/i.test(w.name)).sort((a,b)=>a.name.slice(-4)<b.name.slice(-4)?-1:1),dig=wb.worksheets.filter(w=>!ars.includes(w));
 [...ars,...dig].forEach((w,i)=>{w.orderNo=i});
 const buf=await wb.xlsx.writeBuffer();
 const taban=opt.orijinalAd?opt.orijinalAd.replace(/\.xlsx$/i,'')+'_guncel':'ARSIV_'+String(opt.muk.unvan||'mukellef').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ç/g,'C').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,60);
 return{data:new Uint8Array(buf),ad:taban+'.xlsx',sayfalar}}
const api={arsivYaz,sayfaModeli,fark,ARSIV_BOLUM:BOLUM};if(N)module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
