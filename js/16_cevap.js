/* e-Karşıt "Karşıt İnceleme Tutanağı Cevabı" PDF'i — 1-7. tabloları okur.
   Girdi: pdf.js öğeleri {k:-sayfa*1000+y, x, y, w, s} (02_ekarsit_pdf.js ile aynı).
   Çıktı: arşiv modeliyle aynı biçimde {ortaklar, defterler, isciler, kdv, imalatcilar, tedarikciler} + imalatciYok + uyari.
   Cevap yazısı değilse (dolu tablo başlıkları yoksa) null döner. Sütunlar, tek örnek PDF'ten çıkarılan sabit konumlara göre ayrılır. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {parseNum,normTarih,normDonem,donemOfTarih}=K;
const HDR=/^(Adı Soyadı \/?|Ünvanı|Vergi\/T\.C\. Kimlik|Vergi\/T\.C\.|Kimlik|Numarası|Bağlı Olduğu İl|Bağlı Olduğu Vergi Dairesi|Bağlı Olduğu|Vergi Dairesi|Pay Oranı|Açıklama|Defterin Nev'i|Başlangıç|Bitiş|Tasdik|Tasdik Numarası \/|Tasdik Tarihi|Defter Türü|Dönemi|Makamı|Berat Numarası|Dönem|Çalışan İşçi Sayısı|Beyannamenin Verildiği Vergi Dairesi|Teslim ve|Hizmet|Karşılığını|Teşkil Eden|Bedel|Özel Matrah|Şekline Tabi|İşl\. Matr\. Dahil|Olm\. Bedel|KDV|Matrahı|Hesaplanan|İlave|Edilecek|Toplam|İndirimler|Toplamı|Ödenmesi|Gereken|Sonraki|Döneme|Devreden|Tahakkuk|Fişinin|Önceki Dönem ve İlgili Dönem KDV Beyan Bilgileri|Bağlı Bulunduğu|Sanayi Odası|Belge Tarihi|Belge Numarası|Belge Türü|Faturanın|Tarihi|Serisi|Faturanın Matrahı|Faturanın KDV Tutarı|Gümrük|Beyannamesi\/|Serbest Bölge|İşlem Formu|Tescil)$/;
/* Tablo tanımları: kolonlar [anahtar, merkez-x, birleştirme('' = bitişik: kimlik/sayı/tarih, ' ' = metin)], ilk sütun için x sınırı */
const T1={cols:[['ad',62,' '],['vkn',149,''],['il',245,' '],['vd',347,' '],['pay',446,''],['aciklama',531,' ']],first:110};
const T2={cols:[['nevi',56,' '],['bas',124,''],['bit',180,''],['makam',235,' '],['tarih',298,''],['no',377,''],['aciklama',460,' '],['tur',540,' ']],first:100};
const T4={cols:[['donem',70,''],['sayi',178,''],['vd',350,' ']],dnm:true};
const T5={cols:[['donem',42,''],['teslim',90,''],['ozel',151,''],['matrah',202,''],['hesap',253,''],['ilave',309,''],['toplam',361,''],['indirim',412,''],['odenecek',464,''],['devreden',515,''],['tahakkuk',561,'']],dnm:true};
const T6={cols:[['ad',62,' '],['vkn',131,''],['oda',206,' '],['tarih',284,''],['no',360,''],['tur',442,' '],['aciklama',530,' ']],first:105};
const T7={cols:[['ad',48,' '],['vkn',98,''],['vd',150,' '],['tarih',199,''],['seri',240,''],['no',284,''],['matrah',349,''],['kdv',431,''],['gumTarih',501,''],['gumNo',557,'']],first:75};
const DON=/^\d{2}\.\d{4}$/;
/* items: sıralı, başlıksız öğeler; T: tablo tanımı → [{anahtar:metin}] */
function tablo(items,T){
 const ctr=i=>i.x+i.w/2,col=i=>T.first&&i.x<T.first?0:T.cols.reduce((a,v,j)=>Math.abs(v[1]-ctr(i))<Math.abs(T.cols[a][1]-ctr(i))?j:a,T.first?1:0);
 let an=[];
 if(T.dnm)an=items.filter(i=>DON.test(i.s.trim())&&col(i)===0).map(i=>i.k);
 else{let pr=null;items.filter(i=>col(i)===0).sort((a,b)=>b.k-a.k).forEach(i=>{if(pr==null||pr-i.k>12)an.push(i.k);pr=i.k})}
 an=[...new Set(an)].sort((a,b)=>b-a);
 const rows=an.map(k=>({k,c:T.cols.map(()=>[])}));
 items.forEach(i=>{let b=-1;for(let r=0;r<an.length;r++){const up=r?Math.min((an[r-1]-an[r])/2,25):25,dn=r<an.length-1?Math.min((an[r]-an[r+1])/2,40):40;if(i.k<=an[r]+up&&i.k>=an[r]-dn){if(b<0||Math.abs(i.k-an[r])<Math.abs(i.k-an[b]))b=r}}
  if(b>=0)rows[b].c[col(i)].push(i)});
 return rows.map(r=>{const o={};T.cols.forEach((c,j)=>{o[c[0]]=r.c[j].sort((a,b)=>b.k-a.k||a.x-b.x).map(i=>i.s.trim()).join(c[2]).replace(/\s+/g,' ').trim()});return o})}
function parseCevap(items){
 const it=items.filter(i=>i.s.trim()&&i.y>55).sort((a,b)=>b.k-a.k||a.x-b.x);
 const mk={};it.forEach(i=>{const m=/^([1-7])-/.exec(i.s.trim());if(m&&i.x<40&&!(m[1] in mk))mk[m[1]]=i});
 if(!mk[1]||!mk[2]||!mk[4]||!mk[5]||it.filter(i=>/aşağıdaki gibidir/i.test(i.s)).length<3)return null;
 const bolum=n=>{const a=mk[n];if(!a)return[];const nx=Object.entries(mk).filter(([m])=>+m>n).map(([,v])=>v).filter(v=>v.k<a.k).sort((p,q)=>q.k-p.k)[0];
  return it.filter(i=>i.k<a.k-3&&(!nx||i.k>nx.k+3)&&!HDR.test(i.s.trim()))};
 const sonTop=(L)=>{const tp=L.find(i=>/^TOPLAM/i.test(i.s.trim()));return tp?L.filter(i=>i.k>tp.k+10):L};
 const uyari=[];
 const ortaklar=tablo(bolum(1),T1).filter(r=>r.ad||r.vkn);
 const defterler=tablo(bolum(2),T2).filter(r=>r.nevi).map(r=>({...r,bas:normDonem(r.bas),bit:normDonem(r.bit),tarih:normTarih(r.tarih)}));
 const isciler=tablo(bolum(4),T4).filter(r=>DON.test(r.donem)).map(r=>({donem:normDonem(r.donem),sayi:parseNum(r.sayi),vd:r.vd}));
 const kdv=tablo(bolum(5),T5).filter(r=>DON.test(r.donem)).map(r=>({donem:normDonem(r.donem),teslim:parseNum(r.teslim),ozel:parseNum(r.ozel),matrah:parseNum(r.matrah),hesap:parseNum(r.hesap),ilave:parseNum(r.ilave),toplam:parseNum(r.toplam),indirim:parseNum(r.indirim),odenecek:parseNum(r.odenecek),devreden:parseNum(r.devreden),tahakkuk:r.tahakkuk}));
 const b6=bolum(6),imalatciYok=b6.some(i=>/^İmalatçı değildir/i.test(i.s.trim()));
 const imalatcilar=imalatciYok?[]:tablo(b6,T6).filter(r=>r.ad||r.vkn||r.no).map(r=>({...r,tarih:normTarih(r.tarih)}));
 const tedarikciler=tablo(sonTop(bolum(7)),T7).filter(r=>r.no||r.vkn||r.ad).map(r=>({donem:'',ad:r.ad,vkn:r.vkn,vd:r.vd,tarih:normTarih(r.tarih),seri:r.seri,no:r.no,matrah:parseNum(r.matrah),kdv:parseNum(r.kdv),gumTarih:normTarih(r.gumTarih),gumNo:r.gumNo}));
 if(!ortaklar.length)uyari.push('1. tabloda (ortaklık) satır okunamadı.');
 if(!defterler.length)uyari.push('2. tabloda (yasal defterler) satır okunamadı.');
 if(!isciler.length)uyari.push('4. tabloda (çalışan sayısı) satır okunamadı.');
 if(!kdv.length)uyari.push('5. tabloda (KDV) satır okunamadı.');
 if(!tedarikciler.length)uyari.push('7. tabloda (tedarikçi) satır okunamadı.');
 return{ortaklar,defterler,isciler,kdv,imalatcilar,imalatciYok,tedarikciler,uyari}}
/* Tedarikçi satırlarına dönem atar: tek fatura dönemi varsa hepsi o döneme; çoksa fatura tarihinin dönemi (dönemlerden biriyse), değilse boş bırakılır. */
function cevapDonemAta(c,D){const uy=[...c.uyari];
 const t=c.tedarikciler.map(r=>{let d=D.length===1?D[0]:donemOfTarih(r.tarih);if(!D.includes(d)){uy.push(`Tedarikçi faturası ${r.no||r.ad}: dönemi belirlenemedi (fatura tarihi ${r.tarih||'—'}); bu satır kullanılmayacak.`);d=''}return{...r,donem:d}}).filter(r=>r.donem);
 return{...c,tedarikciler:t,uyari:uy}}
const api={parseCevap,cevapDonemAta};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
