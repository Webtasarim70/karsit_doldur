/* Daha önce üretilmiş (veya e-Karşıt şablonundan doldurulmuş) Excel dosyalarını okur.
   excelTani: dosyanın hangi e-Karşıt tablosuna ait olduğunu başlık satırından bulur.
   kdvExcelOku: KDV tablosunu okur ve uyarılar üretir. */
(function(g){
const N=typeof module!=='undefined';
const K=N?require('./01_ortak.js'):g.KD,TPL=N?require('./05_sablonlar.js'):g.TPL_XLSX,EJ=N?require('exceljs'):g.ExcelJS;
const {U,parseNum,normDonem,normTarih,defterAnahtar}=K;
const AD={ortak:'1- Ortaklık',defter:'2- Yasal defter',fatura:'3- Faturalar',isci:'4- Muhtasar çalışan',kdv:'5- KDV',imalatci:'6- İmalatçı',tedarikci:'7- Tedarikçi'};
const norm=s=>U(String(s??'')).replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
const u8=b=>N?new Uint8Array(Buffer.from(b,'base64')):Uint8Array.from(atob(b),c=>c.charCodeAt(0));
function hv(c){let v=c&&c.value;if(v==null)return'';if(typeof v==='object'&&!(v instanceof Date)){if(v.richText)v=v.richText.map(t=>t.text).join('');else if('result'in v)v=v.result;else if(v.text!=null)v=v.text;else v=''}return v}
const satir=(ws,r,n)=>{const a=[];for(let c=1;c<=n;c++)a.push(hv(ws.getRow(r).getCell(c)));return a};
let _H=null;
async function sablonBasliklari(){if(_H)return _H;_H={};for(const id of Object.keys(TPL)){const wb=new EJ.Workbook();await wb.xlsx.load(u8(TPL[id]).buffer);const ws=wb.worksheets[0];_H[id]=satir(ws,1,ws.columnCount).map(norm)}return _H}
/* → {id, skor} ; id yoksa eşleşme yok (skor < 0.7) */
async function excelTani(wb){const H=await sablonBasliklari(),ws=wb.worksheets[0];if(!ws)return{id:null,skor:0};
 const h=satir(ws,1,Math.max(ws.columnCount,12)).map(norm);let best={id:null,skor:0};
 for(const id of Object.keys(H)){const sk=H[id].filter((x,i)=>x&&h[i]===x).length/H[id].length;if(sk>best.skor)best={id,skor:sk}}
 return best.skor>=0.7?best:{id:null,skor:best.skor}}
/* Tablo tanımları: sütun anahtarı:tür  (d=dönem anahtarı, n=tutar, i=tam sayı, t=metin) */
const SPEC={
 kdv:{ad:AD.kdv,kolon:'donem:d teslim:n ozel:n matrah:n hesap:n ilave:n toplam:n indirim:n odenecek:n devreden:n tahakkuk:t'.split(' '),metin:'tahakkuk fişi no',donemAd:'KDV dönemleri'},
 defter:{ad:AD.defter,kolon:'nevi:t bas:p bit:p makam:t tarih:g no:t aciklama:t tur:t'.split(' '),anahtarFn:true,metin:'tasdik/berat no',donemAd:'yasal defter kayıtları'},
 isci:{ad:AD.isci,kolon:'donem:d sayi:i vd:t'.split(' '),metin:'vergi dairesi',donemAd:'fatura dönemleri'}};
/* opt: {dosya, vkn (Ç mükellef), anahtarlar (gerekli dönemler)} → {ok, satirlar, uyari:[{k:'er'|'wr'|'in',t}]} */
async function tabloExcelOku(wb,id,opt){const sp=SPEC[id],U_=[],er=t=>U_.push({k:'er',t}),wr=t=>U_.push({k:'wr',t}),inf=t=>U_.push({k:'in',t}),RED=()=>({ok:false,satirlar:[],uyari:U_});
 const ws=wb.worksheets[0];if(!ws){er('Dosyada sayfa bulunamadı.');return RED()}
 const tani=await excelTani(wb);
 if(!tani.id){er(`Bu dosya e-Karşıt tablo şablonlarından hiçbiriyle eşleşmiyor (başlık satırı uyuşmuyor). e-Karşıt’a yüklenecek “${sp.ad}” Excel dosyasını seçin.`);return RED()}
 if(tani.id!==id){er(`Bu dosya “${AD[tani.id]}” tablosuna ait görünüyor; bu adımda “${sp.ad}” tablosu bekleniyor.`);return RED()}
 const m=/^(\d{10,11})_/.exec(opt.dosya||'');
 if(m&&opt.vkn&&m[1]!==opt.vkn){er(`Dosya adındaki VKN (${m[1]}) tutanaktaki Ç) mükellefin VKN’si (${opt.vkn}) ile eşleşmiyor; başka mükellefin dosyası olabilir.`);return RED()}
 if(!m)wr('Dosya adında VKN yok; dosyanın bu mükellefe ait olduğu doğrulanamadı. Satırların doğru firmaya ait olduğundan emin olun.');
 const out=[],gorulen={};let bos=0,sayiDegil=0,gecersiz=0,dis=0,metinBos=0,taninmayan=0;
 for(let r=2;r<=ws.rowCount;r++){const a=satir(ws,r,sp.kolon.length);if(a.every(x=>x===''||x==null))continue;
  if(sp.anahtarFn){const o={kaynak:'excel'};sp.kolon.forEach((kt,i)=>{const[k,t]=kt.split(':');o[k]=t==='p'?normDonem(a[i]):t==='g'?normTarih(a[i]):String(a[i]??'').trim()});
   const key=defterAnahtar(o);if(!key){taninmayan++;continue}o.donem=key;
   if(!o.no&&!/yüklenmemiştir/i.test(o.aciklama))metinBos++;
   if(gorulen[key])wr(`${key} kaydı dosyada birden fazla kez var; sonuncusu kullanılacak.`);gorulen[key]=1;
   if(opt.anahtarlar&&!opt.anahtarlar.includes(key)){dis++;continue}out.push(o);continue}
  const d=normDonem(a[0]);if(!/^\d{2}\.\d{4}$/.test(d)){gecersiz++;continue}
  const o={donem:d,kaynak:'excel'};
  sp.kolon.slice(1).forEach((kt,i)=>{const[k,t]=kt.split(':'),v=a[i+1];
   if(t==='t'){o[k]=String(v??'').trim();if(!o[k])metinBos++;return}
   if(v===''||v==null){o[k]=0;bos++;return}
   const n=parseNum(v);if(n==null){o[k]=0;sayiDegil++}else o[k]=t==='i'?Math.round(n):n});
  if(gorulen[d])wr(`${d} dönemi dosyada birden fazla kez var; sonuncusu kullanılacak.`);gorulen[d]=1;
  if(opt.anahtarlar&&!opt.anahtarlar.includes(d)){dis++;continue}
  out.push(o)}
 if(taninmayan)wr(`${taninmayan} satırın defter türü/dönemi tanınmadı (yalnızca aylık e-Defter Yevmiye/Kebir ve Envanter satırları kullanılır); atlandı.`);
 if(gecersiz)wr(`${gecersiz} satırın dönemi “AA.YYYY” biçiminde olmadığı için atlandı.`);
 if(dis)wr(`${dis} satır bu tutanağın ${sp.donemAd} dışında olduğu için kullanılmayacak.`);
 if(sayiDegil)wr(`${sayiDegil} hücre sayı olarak okunamadı ve 0 alındı; değerleri kontrol edin.`);
 if(bos)wr(`${bos} sayısal hücre boş ve 0 alındı.`);
 if(metinBos)wr(`${metinBos} satırda ${sp.metin} boş.`);
 if(!out.length&&!dis&&!gecersiz&&!taninmayan){er('Dosyada veri satırı bulunamadı.');return RED()}
 if(!out.length){er(`Dosyadaki hiçbir satır, bu tutanağın ${sp.donemAd} arasında yer almıyor.`);return RED()}
 if(opt.anahtarlar){const yok=opt.anahtarlar.filter(d=>!out.some(x=>x.donem===d));if(yok.length)inf(`Dosyada bulunmayan gerekli dönemler: ${yok.join(', ')}.`)}
 return{ok:true,satirlar:out,uyari:U_}}
const kdvExcelOku=(wb,o)=>tabloExcelOku(wb,'kdv',{dosya:o.dosya,vkn:o.vkn,anahtarlar:o.donemler});
const api={excelTani,tabloExcelOku,kdvExcelOku,TABLO_AD:AD,SPEC};if(N)module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
