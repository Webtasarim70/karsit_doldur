/* e-Karşıt "Karşıt İnceleme Tutanağı Cevabı" PDF'i — 1-7. tabloları okur.
   Girdi: pdf.js öğeleri {k:-sayfa*1000+y, x, y, w, s} (02_ekarsit_pdf.js ile aynı).
   Çıktı: arşiv modeliyle aynı biçimde {ortaklar, defterler, isciler, kdv, imalatcilar, tedarikciler} + imalatciYok + uyari.
   Cevap yazısı değilse (dolu tablo başlıkları yoksa) null döner. Sütunlar, tek örnek PDF'ten çıkarılan sabit konumlara göre ayrılır. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {parseNum,normTarih,normDonem,donemOfTarih}=K;
const HDR=/^(Adı Soyadı \/?|Ünvanı|Vergi\/T\.C\. Kimlik|Vergi\/T\.C\.|Kimlik|Numarası|Bağlı Olduğu İl|Bağlı Olduğu Vergi Dairesi|Bağlı Olduğu|Vergi Dairesi|Pay Oranı|Açıklama|Defterin Nev'i|Başlangıç|Bitiş|Tasdik|Tasdik Numarası \/|Tasdik Tarihi|Defter Türü|Dönemi|Makamı|Berat Numarası|Dönem|Çalışan İşçi Sayısı|Beyannamenin Verildiği Vergi Dairesi|Teslim ve|Hizmet|Karşılığını|Teşkil Eden|Bedel|Özel Matrah|Şekline Tabi|İşl\. Matr\. Dahil|Olm\. Bedel|KDV|Matrahı|Hesaplanan|İlave|Edilecek|Toplam|İndirimler|Toplamı|Ödenmesi|Gereken|Sonraki|Döneme|Devreden|Tahakkuk|Fişinin|Önceki Dönem ve İlgili Dönem KDV Beyan Bilgileri|Bağlı Bulunduğu|Sanayi Odası|Belge Tarihi|Belge Numarası|Belge Türü|Faturanın|Tarihi|Serisi|Faturanın Matrahı|Faturanın KDV Tutarı|Gümrük|Beyannamesi\/|Serbest Bölge|İşlem Formu|Tescil)$/;
/* Tablo tanımları: kolonlar [anahtar, merkez-x, birleştirme('' = bitişik: kimlik/sayı/tarih, ' ' = metin)], ilk sütun için x sınırı */
const T1={cols:[['ad',62,' '],['vkn',149,''],['il',245,' '],['vd',347,' '],['pay',446,''],['aciklama',531,' ']],first:110,anchor:['vkn',/^\d{10,11}$/]};
const T2={cols:[['nevi',56,' '],['bas',124,''],['bit',180,''],['makam',235,' '],['tarih',298,''],['no',377,''],['aciklama',460,' '],['tur',540,' ']],first:100,anchor:['bas',/^\d{2}\.\d{4}$/]};
const T4={cols:[['donem',70,''],['sayi',178,''],['vd',350,' ']],anchor:['donem',/^\d{2}\.\d{4}$/]};
const T5={cols:[['donem',42,''],['teslim',90,''],['ozel',151,''],['matrah',202,''],['hesap',253,''],['ilave',309,''],['toplam',361,''],['indirim',412,''],['odenecek',464,''],['devreden',515,''],['tahakkuk',561,'']],anchor:['donem',/^\d{2}\.\d{4}$/],split:true,hdr:[/^Dönem$/,/^Karşılığını$/,/^Şekline$/,/^Matrahı$/,/^Hesaplanan$/,/^İlave Edilecek$/,/^Toplam KDV$/,/^İndirimler$/,/^Ödenmesi$/,/^Döneme$/,/^Tahakkuk$/]};
const T6={cols:[['ad',62,' '],['vkn',131,''],['oda',206,' '],['tarih',284,''],['no',360,''],['tur',442,' '],['aciklama',530,' ']],first:100,anchor:['vkn',/^\d{10,11}$/]};
const T7={cols:[['ad',48,' '],['vkn',98,''],['vd',150,' '],['tarih',199,''],['seri',240,''],['no',284,''],['matrah',349,''],['kdv',431,''],['gumTarih',501,''],['gumNo',557,'']],first:75,anchor:['tarih',/^\d{2}\.\d{2}\.\d{4}$/]};
const DON=/^\d{2}\.\d{4}$/;
/* Birleşik öğeleri ("12.2025 34.189.686,78 1.902.2") sözcüklere böler; x konumu karakter oranından kestirilir. */
const bol=i=>{const t=i.s.trim();if(!/\s/.test(t))return[i];const L=i.s.length,out=[];let m;const re=/\S+/g;while((m=re.exec(i.s)))out.push({...i,s:m[0],x:i.x+(m.index+m[0].length/2)/L*i.w,w:0});return out};
const bag=(a,p,bit)=>!a?p:(bit?(a.endsWith('-')?a+p:a+' '+p):a+p);
/* items: başlıksız öğeler; T: tablo tanımı; cent: başlıktan bulunan sütun merkezleri (yoksa sabit).
   Satırlar, her satırda dikeyde ortalanmış tek satırlık bir hücreden (T.anchor) kurulur; her öğe en yakın satıra gider.
   Sayfa başında, çapası olmayan öğe kümesi bir önceki sayfadaki satırın devamıdır (hücre sayfaya bölünmüştür). */
function tablo(items,T,cent){
 const cols=T.cols.map((c,j)=>[c[0],cent&&cent[j]!=null?cent[j]:c[1],c[2]]),its=T.split?items.flatMap(bol):items;
 const ctr=i=>i.x+i.w/2,col=i=>T.first&&i.x<T.first?0:cols.reduce((a,v,j)=>Math.abs(v[1]-ctr(i))<Math.abs(cols[a][1]-ctr(i))?j:a,T.first?1:0),pg=i=>Math.ceil(-i.k/1000);
 const aj=cols.findIndex(c=>c[0]===T.anchor[0]),an=[...new Set(its.filter(i=>T.anchor[1].test(i.s.trim())&&col(i)===aj).map(i=>i.k))].sort((a,b)=>b-a);
 const rows=an.map(k=>({k,c:cols.map(()=>[])})),CAP=45,sahip=new Map();
 const sayfalar=[...new Set(its.map(pg))].sort((a,b)=>a-b);
 /* İlk sütun (ad/ünvan) çok satıra sarılır: ardışık satırlar bir blok sayılır, blok kendi aralığındaki çapanın satırına gider; çapası olmayan sayfa başı bloğu önceki sayfadaki satırın devamıdır. */
 if(T.first){const c0=its.filter(i=>col(i)===0).sort((a,b)=>b.k-a.k),bl=[],ls=[];
  c0.forEach(i=>{const l=ls[ls.length-1];if(l&&pg(l[0])===pg(i)&&l[0].k-i.k<=3)l.push(i);else ls.push([i])});
  /* aynı hücredeki satırlar eşit aralıklıdır (örn. 8,15); satır sınırlarında aralık farklıdır → ortak satır aralığı (en sık değer) dışındaki boşluklar blok sınırıdır */
  const gp=[];ls.forEach((l,q)=>{if(q&&pg(ls[q-1][0])===pg(l[0])){const g=ls[q-1][0].k-l[0].k;if(g<12)gp.push(Math.round(g*10)/10)}});
  const fr={};gp.forEach(v=>fr[v]=(fr[v]||0)+1);const mod=Object.entries(fr).sort((a,b)=>b[1]-a[1])[0],lp=mod&&mod[1]>=3?+mod[0]:null;
  let cur=[];ls.forEach((l,q)=>{if(q){const g=ls[q-1][0].k-l[0].k,yeni=pg(ls[q-1][0])!==pg(l[0])||g>12||(lp!=null&&Math.abs(g-lp)>0.3);if(yeni){bl.push(cur);cur=[]}}cur.push(...l)});if(cur.length)bl.push(cur);
  bl.forEach((b,bi)=>{const hi=b[0].k,lo=b[b.length-1].k,p=pg(b[0]);let r=an.findIndex(k=>k<=hi+6&&k>=lo-6);
   const ai=an.map((k,x)=>({k,x})).filter(a=>a.k<=hi+6&&a.k>=lo-6);
   if(ai.length>=2){/* satırlar arası boşluk yoksa birden çok satırın adı tek blok olur: satırları, her grubun ortası kendi çapasına denk gelecek biçimde ardışık gruplara böl (DP) */
    const ln=[];b.forEach(i=>{const l=ln[ln.length-1];if(l&&l[0].k-i.k<=3)l.push(i);else ln.push([i])});const n=ln.length,m=ai.length;
    if(n>=m){const y=ln.map(l=>l[0].k);/* tek satırlık hücrenin satırı, çok satırlı adın orta satırına (çift sayıda ise iki orta satırdan birine) denk gelir */
     const cs=(a,c,j)=>{const q=c-a,mids=q%2?[a+(q-1)/2]:[a+q/2-1,a+q/2];return Math.min(...mids.map(x=>(y[x]-ai[j].k)**2))},D=Array.from({length:m+1},()=>Array(n+1).fill(Infinity)),P=Array.from({length:m+1},()=>Array(n+1).fill(0));D[0][0]=0;
     for(let j=1;j<=m;j++)for(let c=j;c<=n;c++)for(let a=j-1;a<c;a++){const v=D[j-1][a]+cs(a,c,j-1);if(v<D[j][c]){D[j][c]=v;P[j][c]=a}}
     let c=n;for(let j=m;j>=1;j--){const a=P[j][c];for(let q=a;q<c;q++)ln[q].forEach(i=>sahip.set(i,ai[j-1].x));c=a}return}}
   if(r<0){const ilk=!bl.slice(0,bi).some(o=>pg(o[0])===p);if(ilk){const o=an.map((k,x)=>({k,x})).filter(a=>Math.ceil(-a.k/1000)<p).pop();if(o)r=o.x}if(r<0){const m=(hi+lo)/2;r=an.reduce((a,k,x)=>Math.abs(k-m)<Math.abs(an[a]-m)?x:a,0)}}
   if(r>=0)b.forEach(i=>sahip.set(i,r))})}
 sayfalar.slice(1).forEach(p=>{const L=its.filter(i=>pg(i)===p).sort((a,b)=>b.k-a.k),kum=[];let pr=null;for(const i of L){if(pr!=null&&pr-i.k>12)break;kum.push(i);pr=i.k}
  if(!kum.length)return;const hi=kum[0].k+6,lo=kum[kum.length-1].k-6,var_=an.some(k=>k<=hi&&k>=lo);
  if(!var_){const onceki=an.map((k,r)=>({k,r})).filter(a=>Math.ceil(-a.k/1000)<p).pop();if(onceki)kum.forEach(i=>{if(!sahip.has(i))sahip.set(i,onceki.r)})}});
 its.forEach(i=>{let b=sahip.has(i)?sahip.get(i):-1;
  if(b<0)for(let r=0;r<an.length;r++){const up=r?Math.min((an[r-1]-an[r])/2,CAP):CAP,dn=r<an.length-1?Math.min((an[r]-an[r+1])/2,CAP):CAP;if(i.k<=an[r]+up&&i.k>=an[r]-dn&&(b<0||Math.abs(i.k-an[r])<Math.abs(i.k-an[b])))b=r}
  if(b>=0)rows[b].c[col(i)].push(i)});
 return rows.map(r=>{const o={};cols.forEach((c,j)=>{o[c[0]]=r.c[j].sort((a,b)=>b.k-a.k||a.x-b.x).map(i=>i.s.trim()).reduce((a,p)=>bag(a,p,c[2]===' '),'').replace(/\s+/g,' ').trim()});return o})}
/* Başlık sözcüklerinden sütun merkezleri (tablo sayfaları arasında tekrarlanan başlıkta ilk görüleni alır). */
function merkezler(hItems,T){if(!T.hdr)return null;return T.hdr.map(re=>{const h=hItems.filter(i=>re.test(i.s.trim())).sort((a,b)=>b.k-a.k)[0];return h?h.x+h.w/2:null})}
function parseCevap(items){
 const it=items.filter(i=>i.s.trim()&&i.y>55).sort((a,b)=>b.k-a.k||a.x-b.x);
 const mk={};it.forEach(i=>{const m=/^([1-7])-/.exec(i.s.trim());if(m&&i.x<40&&!(m[1] in mk))mk[m[1]]=i});
 if(!mk[1]||!mk[2]||!mk[4]||!mk[5]||it.filter(i=>/aşağıdaki gibidir/i.test(i.s)).length<3)return null;
 const bolumH=n=>{const a=mk[n];if(!a)return[];const nx=Object.entries(mk).filter(([m])=>+m>n).map(([,v])=>v).filter(v=>v.k<a.k).sort((p,q)=>q.k-p.k)[0];return it.filter(i=>i.k<a.k-3&&(!nx||i.k>nx.k+3))};
 const bolum=n=>{const a=mk[n];if(!a)return[];const nx=Object.entries(mk).filter(([m])=>+m>n).map(([,v])=>v).filter(v=>v.k<a.k).sort((p,q)=>q.k-p.k)[0];
  return it.filter(i=>i.k<a.k-3&&(!nx||i.k>nx.k+3)&&!HDR.test(i.s.trim()))};
 const sonTop=(L)=>{const sf=i=>Math.ceil(-i.k/1000),tps={};L.filter(i=>/^TOPLAM/i.test(i.s.trim())).forEach(i=>{const p=sf(i);if(tps[p]==null||i.k>tps[p])tps[p]=i.k});const son=Math.max(0,...Object.keys(tps).map(Number));/* TOPLAM her sayfada tekrarlanabilir; son TOPLAM sayfasından sonraki sayfalar (dipnot vb.) alınmaz */
 return L.filter(i=>(!son||sf(i)<=son)&&(tps[sf(i)]==null||i.k>tps[sf(i)]+10))};
 const uyari=[];
 const ortaklar=tablo(bolum(1),T1).filter(r=>r.ad||r.vkn);
 const defterler=tablo(bolum(2),T2).filter(r=>r.nevi).map(r=>({...r,bas:normDonem(r.bas),bit:normDonem(r.bit),tarih:normTarih(r.tarih)}));
 const isciler=tablo(bolum(4),T4).filter(r=>DON.test(r.donem)).map(r=>({donem:normDonem(r.donem),sayi:parseNum(r.sayi),vd:r.vd}));
 const kdv=tablo(bolum(5),T5,merkezler(bolumH(5),T5)).filter(r=>DON.test(r.donem)).map(r=>({donem:normDonem(r.donem),teslim:parseNum(r.teslim),ozel:parseNum(r.ozel),matrah:parseNum(r.matrah),hesap:parseNum(r.hesap),ilave:parseNum(r.ilave),toplam:parseNum(r.toplam),indirim:parseNum(r.indirim),odenecek:parseNum(r.odenecek),devreden:parseNum(r.devreden),tahakkuk:r.tahakkuk}));
 const b6=bolum(6),imalatciYok=b6.some(i=>/^İmalatçı değildir/i.test(i.s.trim()));
 const imalatcilar=imalatciYok?[]:tablo(b6,T6).filter(r=>r.ad||r.vkn||r.no).map(r=>({...r,tarih:normTarih(r.tarih)}));
 const tedarikciler=tablo(sonTop(bolum(7)),T7).filter(r=>r.no||r.vkn||r.ad).map(r=>({donem:'',ad:r.ad,vkn:r.vkn,vd:r.vd,tarih:normTarih(r.tarih),seri:r.seri,no:r.no,matrah:parseNum(r.matrah),kdv:parseNum(r.kdv),gumTarih:normTarih(r.gumTarih),gumNo:r.gumNo}));
 if(!(ortaklar.length||defterler.length||isciler.length||kdv.length||imalatcilar.length||imalatciYok||tedarikciler.length))return null;/* tablolar boşsa bu, doldurulmamış e-Karşıt tutanağıdır */
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
