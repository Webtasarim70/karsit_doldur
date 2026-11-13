/* Kapsam ve seçim: e-Karşıt PDF'indeki faturalara göre hangi veriler gerekli, arşivde neler var/eksik,
   ve Excel çıktısına girecek satırlar (secim). */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {U,parseNum,fmtTR,donemOfTarih,prevDonem,donemSort,yilOf,donemKey}=K;
function donemler(pdf){const fatura=donemSort([...new Set(pdf.inv.map(i=>donemOfTarih(i.tarih)).filter(Boolean))]);
 const kdv=donemSort([...new Set(fatura.flatMap(d=>[d,prevDonem(d)]))]);return{fatura,kdv,yillar:[...new Set(fatura.map(yilOf))].sort()}}
const son=(a,f)=>{for(let i=a.length-1;i>=0;i--)if(f(a[i]))return a[i];return null}; /* en yeni arşiv yılı öncelikli */
const tekil=(a,f)=>{const s=new Set();return a.slice().reverse().filter(x=>{const k=f(x);if(s.has(k))return false;s.add(k);return true}).reverse()};
const yev=x=>/YEVM/.test(U(x.nevi)),keb=x=>/KEB[İI]R/.test(U(x.nevi)),env=x=>/ENVANTER/.test(U(x.nevi));
/* Gerekli defterler: yıl başına Envanter, fatura ayı başına e-Defter Yevmiye ve Kebir */
function defterGerekli(D){const n=[];D.yillar.forEach(y=>n.push({ad:`Envanter ${y}`,bul:ars=>son(ars.defterler,x=>env(x)&&yilOf(x.bas)<=y&&yilOf(x.bit)>=y)}));
 D.fatura.forEach(d=>{n.push({ad:`Yevmiye ${d}`,bul:ars=>son(ars.defterler,x=>yev(x)&&x.bas===d&&x.bit===d)});n.push({ad:`Kebir ${d}`,bul:ars=>son(ars.defterler,x=>keb(x)&&x.bas===d&&x.bit===d)})});return n}
const T=(id,ad,gerekli,eksik,not,kaynak)=>({id,ad,gerekli,var:gerekli-eksik.length,eksik,durum:!eksik.length?'tamam':eksik.length<gerekli?'kismen':'eksik',not:not||'',kaynak:kaynak||''});
const faturaTam=i=>!!(i.dk&&i.yevNo&&i.odeme);
function kapsam(pdf,ars){const D=donemler(pdf),uyari=[];
 const vp=(pdf.kf.vn||'').trim(),va=(ars.mukellef.vkn||'').trim();
 const vkn={pdf:vp,arsiv:va,eslesiyor:!!vp&&vp===va};if(!vkn.eslesiyor)uyari.push(`Arşivdeki VKN (${va||'yok'}) tutanaktaki Ç) mükellef VKN'si (${vp||'yok'}) ile eşleşmiyor.`);
 const tut={matrah:pdf.inv.reduce((a,i)=>a+(parseNum(i.matrah)||0),0),kdv:pdf.inv.reduce((a,i)=>a+(parseNum(i.kdv)||0),0)};
 if(pdf.toplam&&pdf.toplam.length>=2){const[m,k]=pdf.toplam.map(parseNum);if(Math.abs(m-tut.matrah)>0.01||Math.abs(k-tut.kdv)>0.01)uyari.push(`PDF toplamı (${fmtTR(m)} / ${fmtTR(k)}) satır toplamından (${fmtTR(tut.matrah)} / ${fmtTR(tut.kdv)}) farklı; fatura satırları eksik okunmuş olabilir.`)}
 const tablolar=[],dg=defterGerekli(D),fe=pdf.inv.filter(i=>!faturaTam(i)).map(i=>i.no);
 tablolar.push(T('ortak','1 Ortaklık',1,ars.ortaklar.length?[]:['ortak bilgisi'],ars.ortaklar.length?`${tekil(ars.ortaklar,o=>o.ad+o.vkn).length} ortak`:'','arşiv'));
 tablolar.push(T('defter','2 Yasal defter',dg.length,dg.filter(n=>!n.bul(ars)).map(n=>n.ad),'','arşiv + e-berat'));
 tablolar.push(T('fatura','3 Faturalar',pdf.inv.length,fe,`${pdf.inv.length} fatura, matrah ${fmtTR(tut.matrah)}, KDV ${fmtTR(tut.kdv)}`+(fe.length?' · defter kayıt tarihi, yevmiye no ve ödeme şekli muavinden tamamlanacak':''),'PDF + muavin'));
 tablolar.push(T('isci','4 Muhtasar çalışan',D.fatura.length,D.fatura.filter(d=>!ars.isciler.some(x=>x.donem===d)),'','arşiv / muhtasar PDF'));
 tablolar.push(T('kdv','5 KDV',D.kdv.length,D.kdv.filter(d=>!ars.kdv.some(x=>x.donem===d)),'','arşiv / beyanname + tahakkuk PDF'));
 tablolar.push(T('imalatci','6 İmalatçı',1,ars.imalatcilar.length?[]:['imalatçı belgesi'],ars.imalatcilar.length?`${ars.imalatcilar.length} belge`:'','arşiv / elle'));
 tablolar.push(T('tedarikci','7 Tedarikçi',D.fatura.length,D.fatura.filter(d=>!ars.tedarikciler.some(x=>x.donem===d)),'','arşiv / e-fatura XML'));
 const sayfa=D.yillar.filter(y=>!ars.yillar.includes(y));if(sayfa.length)uyari.push(`Arşivde ARŞİV ${sayfa.join(', ')} sayfası yok; bu yıllar yeni sayfa olarak eklenecek.`);
 return{vkn,donemler:D,arsivYillari:ars.yillar,tutar:tut,tablolar,uyari}}
/* Arşiv eşleştirmesi: tutanağın gerektirdiği her kayıt için arşivde bulunan satır (yoksa null) */
function arsivEslesme(pdf,ars){const D=donemler(pdf);
 return{donemler:D,
  ortak:tekil(ars.ortaklar,o=>o.ad+'|'+o.vkn),
  defter:defterGerekli(D).map(n=>({ad:n.ad,satir:n.bul(ars)})),
  isci:D.fatura.map(d=>({donem:d,satir:son(ars.isciler,x=>x.donem===d)})),
  kdv:D.kdv.map(d=>({donem:d,satir:son(ars.kdv,x=>x.donem===d)})),
  imalatci:tekil(ars.imalatcilar,x=>x.ad+'|'+x.vkn+'|'+x.no),
  tedarikci:D.fatura.map(d=>({donem:d,satirlar:ars.tedarikciler.filter(x=>x.donem===d).sort((a,b)=>(b.matrah||0)-(a.matrah||0)).slice(0,10)}))}}
/* Excel çıktısına girecek satırlar (arşivde bulunanlar; eksikler sonraki adımlarda belgelerden eklenir) */
function secim(pdf,ars){const e=arsivEslesme(pdf,ars);
 return{ortak:e.ortak,defter:e.defter.map(x=>x.satir).filter(Boolean),fatura:pdf.inv,isci:e.isci.map(x=>x.satir).filter(Boolean),kdv:e.kdv.map(x=>x.satir).filter(Boolean),imalatci:e.imalatci,tedarikci:e.tedarikci.flatMap(x=>x.satirlar)}}
const api={kapsam,donemler,secim,arsivEslesme,defterGerekli};if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
