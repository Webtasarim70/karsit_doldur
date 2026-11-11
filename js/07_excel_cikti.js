/* e-Karşıt Excel çıktıları: gerçek şablonlardan biçim/başlık alınır, yalnızca veri satırları yazılır.
   Metin sütunları metin (@), tutar sütunları gerçek sayı (#,##0.00) olarak yazılır. */
(function(g){
const N=typeof module!=='undefined';
const K=N?require('./01_ortak.js'):g.KD,TPL=N?require('./05_sablonlar.js'):g.TPL_XLSX,EJ=N?require('exceljs'):g.ExcelJS;
const {U,parseNum}=K;
const slug=s=>U(s).replace(/İ/g,'I').replace(/Ç/g,'C').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
const pay=v=>{const n=parseNum(v);return n==null?String(v??''):n.toFixed(4)};
/* [anahtar, tür]  t=metin, n=sayı, k=kod (E_DEFTER_YEVMIYE_DEFTERI biçimi), p=pay oranı */
const TABLO={
 ortak:['MUKELLEFIN_ORTAKLIK_BILGILERI',[['ad'],['vkn'],['il'],['vd'],['pay','p'],['aciklama']]],
 defter:['MUKELLEFIN_YASAL_DEFTERLERE_ILISKIN_BILGILERI',[['nevi','k'],['bas'],['bit'],['makam'],['tarih'],['no'],['aciklama'],['tur']]],
 fatura:['MUKELLEFIN_KARSIT_INCELEMEYE_KONU_OLAN_FATURALARINA_ILISKIN_BILGILERI',[['tarih'],['seri'],['no'],['matrah','n'],['kdv','n'],['dk'],['yevNo'],['odeme'],['aciklama'],['hatali']]],
 isci:['MUKELLEFIN_MUHTASAR_BEYANNAMESINDE_YER_ALAN_CALISAN_KISI_SAYILARI',[['donem'],['sayi'],['vd']]],
 kdv:['ONCEKI_DONEM_VE_ILGILI_DONEM_KDV_BEYAN_BILGILERI',[['donem'],['teslim','n'],['ozel','n'],['matrah','n'],['hesap','n'],['ilave','n'],['toplam','n'],['indirim','n'],['odenecek','n'],['devreden','n'],['tahakkuk']]],
 imalatci:['MALIN_IMALATCISI_OLAN_MUKELLEF_HAKKINDA_BILGILER',[['ad'],['vkn'],['oda'],['tarih'],['no'],['tur','k'],['aciklama']]],
 tedarikci:['ILGILI_DONEMDE_SATILAN_MALLARIN_TEDARIK_EDILDIGI_FIRMALAR_HAKKINDA_BILGILER',[['ad'],['vkn'],['vd'],['tarih'],['seri'],['no'],['matrah','n'],['kdv','n'],['gumTarih'],['gumNo']]]};
const u8=b=>N?new Uint8Array(Buffer.from(b,'base64')):Uint8Array.from(atob(b),c=>c.charCodeAt(0));
const stil=(a,b)=>{if(a&&b&&a.style)b.style=JSON.parse(JSON.stringify(a.style))};
const deger=(v,t)=>{if(t==='n'){const n=parseNum(v);return n==null?null:n}if(v==null)return'';if(t==='k')return slug(v);if(t==='p')return pay(v);if(typeof v==='number')return String(v);return String(v)};
async function tabloUret(id,rows){
 const src=new EJ.Workbook();await src.xlsx.load(u8(TPL[id]).buffer);const sw=src.worksheets[0],cols=TABLO[id][1];
 const wb=new EJ.Workbook();wb.creator='Karşıt Doldur';wb.created=new Date();
 const copy=(s,d,maxR,fn)=>{const mc=Math.max(s.columnCount,1);for(let c=1;c<=mc;c++){const w=s.getColumn(c).width;if(w!=null)d.getColumn(c).width=w}
  for(let r=1;r<=maxR;r++){const sr=s.getRow(r),dr=d.getRow(r);if(sr.height!=null)dr.height=sr.height;for(let c=1;c<=mc;c++)fn(sr.getCell(c),dr.getCell(c),r,c)}};
 const ws=wb.addWorksheet(sw.name),nc=sw.columnCount;
 copy(sw,ws,1,(s,d)=>{d.value=s.value;stil(s,d)});
 const sd=sw.getRow(2);
 rows.forEach((it,i)=>{const r=ws.getRow(i+2);if(sd.height!=null)r.height=sd.height;
  for(let c=1;c<=nc;c++){stil(sd.getCell(c),r.getCell(c))}
  cols.forEach(([k,t],j)=>{const v=deger(it[k],t),c=r.getCell(j+1);c.value=v;if(t==='n'&&!c.numFmt)c.numFmt='#,##0.00'})});
 for(let si=1;si<src.worksheets.length;si++){const s=src.worksheets[si],d=wb.addWorksheet(s.name);copy(s,d,s.rowCount,(a,b)=>{b.value=a.value;stil(a,b)})}
 return new Uint8Array(await wb.xlsx.writeBuffer())}
/* sec: kapsam.secim() çıktısı; meta: {vkn, tarih:Date} → [{ad, tablo, satir, data}] */
async function excelCikti(sec,meta){
 const t=meta.tarih||new Date(),d=[String(t.getDate()).padStart(2,'0'),String(t.getMonth()+1).padStart(2,'0'),t.getFullYear()].join('_'),vkn=String(meta.vkn||'mukellef').replace(/\D/g,'')||'mukellef',out=[];
 for(const id of Object.keys(TABLO)){const rows=sec[id]||[];out.push({ad:`${vkn}_${TABLO[id][0]}_${d}.xlsx`,tablo:id,satir:rows.length,data:await tabloUret(id,rows)})}
 return out}
const api={excelCikti,TABLO,slug};if(N)module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
