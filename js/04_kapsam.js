/* Kapsam: e-Karşıt PDF'indeki faturalara göre hangi veriler gerekli, arşivde neler var/eksik. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {U,parseNum,fmtTR,normTarih,donemOfTarih,prevDonem,donemSort,yilOf,normDonem}=K;
function donemler(pdf){const fatura=donemSort([...new Set(pdf.inv.map(i=>donemOfTarih(i.tarih)).filter(Boolean))]);
 const kdv=donemSort([...new Set(fatura.flatMap(d=>[d,prevDonem(d)]))]);return{fatura,kdv,yillar:[...new Set(fatura.map(yilOf))].sort()}}
const T=(id,ad,gerekli,eksik,not,kaynak)=>({id,ad,gerekli,var:gerekli-eksik.length,eksik,durum:!eksik.length?'tamam':eksik.length<gerekli?'kismen':'eksik',not:not||'',kaynak:kaynak||''});
function kapsam(pdf,ars){const D=donemler(pdf),uyari=[];
 const vp=(pdf.kf.vn||'').trim(),va=(ars.mukellef.vkn||'').trim();
 const vkn={pdf:vp,arsiv:va,eslesiyor:!!vp&&vp===va};if(!vkn.eslesiyor)uyari.push(`Arşivdeki VKN (${va||'yok'}) tutanaktaki Ç) mükellef VKN'si (${vp||'yok'}) ile eşleşmiyor.`);
 const tut={matrah:pdf.inv.reduce((a,i)=>a+(parseNum(i.matrah)||0),0),kdv:pdf.inv.reduce((a,i)=>a+(parseNum(i.kdv)||0),0)};
 if(pdf.toplam&&pdf.toplam.length>=2){const[m,k]=pdf.toplam.map(parseNum);if(Math.abs(m-tut.matrah)>0.01||Math.abs(k-tut.kdv)>0.01)uyari.push(`PDF toplamı (${fmtTR(m)} / ${fmtTR(k)}) satır toplamından (${fmtTR(tut.matrah)} / ${fmtTR(tut.kdv)}) farklı; fatura satırları eksik okunmuş olabilir.`)}
 const tablolar=[];
 tablolar.push(T('ortak','1 Ortaklık',1,ars.ortaklar.length?[]:['ortak bilgisi'],ars.ortaklar.length?`${ars.ortaklar.length} ortak`:'','arşiv'));
 const need=[];D.fatura.forEach(d=>{need.push({tur:'Yevmiye',d});need.push({tur:'Kebir',d})});D.yillar.forEach(y=>need.push({tur:'Envanter',y}));
 const has=n=>ars.defterler.some(x=>n.tur==='Envanter'?/ENVANTER/.test(U(x.nevi))&&x.bas<=`01.${n.y}`.replace(/^(\d+)\.(\d+)$/,(a,m,y)=>y+m)&&true:(n.tur==='Yevmiye'?/YEVM/:/KEB[İI]R/).test(U(x.nevi))&&x.bas===n.d&&x.bit===n.d);
 const hasEnv=y=>ars.defterler.some(x=>/ENVANTER/.test(U(x.nevi))&&yilOf(x.bas)<=y&&yilOf(x.bit)>=y);
 const dEks=need.filter(n=>!(n.tur==='Envanter'?hasEnv(n.y):ars.defterler.some(x=>(n.tur==='Yevmiye'?/YEVM/:/KEB[İI]R/).test(U(x.nevi))&&x.bas===n.d&&x.bit===n.d))).map(n=>n.tur==='Envanter'?`Envanter ${n.y}`:`${n.tur} ${n.d}`);
 tablolar.push(T('defter','2 Yasal defter',need.length,dEks,'','arşiv + e-berat'));
 tablolar.push(T('fatura','3 Faturalar',pdf.inv.length,[],`${pdf.inv.length} fatura, matrah ${fmtTR(tut.matrah)}, KDV ${fmtTR(tut.kdv)}`,'PDF'));
 tablolar.push(T('isci','4 Muhtasar çalışan',D.fatura.length,D.fatura.filter(d=>!ars.isciler.some(x=>x.donem===d)),'','arşiv / muhtasar PDF'));
 tablolar.push(T('kdv','5 KDV',D.kdv.length,D.kdv.filter(d=>!ars.kdv.some(x=>x.donem===d)),'','arşiv / beyanname + tahakkuk PDF'));
 tablolar.push(T('imalatci','6 İmalatçı',1,ars.imalatcilar.length?[]:['imalatçı belgesi'],ars.imalatcilar.length?`${ars.imalatcilar.length} belge`:'','arşiv / elle'));
 tablolar.push(T('tedarikci','7 Tedarikçi',D.fatura.length,D.fatura.filter(d=>!ars.tedarikciler.some(x=>x.donem===d)),'','arşiv / e-fatura XML'));
 const sayfa=D.yillar.filter(y=>!ars.yillar.includes(y));if(sayfa.length)uyari.push(`Arşivde ARŞİV ${sayfa.join(', ')} sayfası yok; bu yıllar yeni sayfa olarak eklenecek.`);
 return{vkn,donemler:D,arsivYillari:ars.yillar,tutar:tut,tablolar,uyari}}
const api={kapsam,donemler};if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
