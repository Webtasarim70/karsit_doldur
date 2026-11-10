/* Arşiv Excel okuyucu (ExcelJS Workbook → model). Sayfalar: "ARŞİV YYYY".
   Düzen: B etiket/değer, bölüm başlığı B sütununda; veri satırları ilk boş satıra kadar.
   Sayılar karışık biçimde olabilir (sayı veya "29.603.687,27" metni) → parseNum ile normalize edilir. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {U,parseNum,normTarih,normDonem}=K;
function cv(c){let v=c&&c.value;if(v==null)return'';if(typeof v==='object'&&!(v instanceof Date)){if(v.richText)v=v.richText.map(t=>t.text).join('');else if('result'in v)v=v.result;else if(v.text!=null)v=v.text;else v=''}return v==null?'':v}
const txt=v=>String(v instanceof Date?normTarih(v):v).trim();
const SEK=[[/^ORTAK BİLGİLERİ/,'ortak'],[/^DEFTER BİLGİLERİ/,'defter'],[/^İŞÇİ SAYILARI|^İŞCİ SAYILARI/,'isci'],[/^KDV BEYANNAMESİ/,'kdv'],[/^İMALATÇI/,'imalatci'],[/^TEDARİK[ÇC]İ/,'tedarikci']];
function parseSheet(ws,yil){
 const R=[];ws.eachRow({includeEmpty:true},(row,n)=>{const a=[];for(let c=1;c<=14;c++)a.push(cv(row.getCell(c)));R[n]=a});
 const rows=Array.from(R,r=>r||[]);const B=i=>txt(rows[i][1]??'');
 const out={yil,mukellef:{},ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
 const lab=[['ADI VE SOYADI','unvan'],['VERGI/T.C.','vkn'],['VERGİ/T.C.','vkn'],['VERGI DAIRESI','vd'],['VERGİ DAİRESİ','vd'],['ADRES','adres'],['TELEFON','tel']];
 for(let i=0;i<Math.min(rows.length,10);i++){const l=U(B(i)).replace(/İ/g,'I');const h=lab.find(x=>l.startsWith(x[0].replace(/İ/g,'I')));if(h)out.mukellef[h[1]]=txt(rows[i][2]??'')}
 const secs=[];for(let i=0;i<rows.length;i++){const s=SEK.find(x=>x[0].test(U(B(i))));if(s)secs.push({k:s[1],i})}
 secs.forEach(({k,i})=>{const data=[];for(let j=i+2;j<rows.length;j++){const r=rows[j];if(r.slice(0,12).every(x=>x===''))break;if(SEK.some(x=>x[0].test(U(B(j)))))break;data.push(r)}
  const t=r=>txt(r??'');
  if(k==='ortak')data.forEach(r=>t(r[1])&&out.ortaklar.push({ad:t(r[1]),vkn:t(r[2]),il:t(r[3]),vd:t(r[4]),pay:t(r[5]),aciklama:t(r[6])}));
  if(k==='defter')data.forEach(r=>t(r[1])&&out.defterler.push({nevi:t(r[1]),bas:normDonem(r[2]),bit:normDonem(r[3]),makam:t(r[4]),tarih:normTarih(r[5]),no:t(r[6]),aciklama:t(r[7]),tur:t(r[8])}));
  if(k==='isci')data.forEach(r=>t(r[1])&&out.isciler.push({donem:normDonem(r[1]),sayi:parseNum(r[2]),vd:t(r[3])}));
  if(k==='kdv')data.forEach(r=>t(r[1])&&out.kdv.push({donem:normDonem(r[1]),teslim:parseNum(r[2]),ozel:parseNum(r[3]),matrah:parseNum(r[4]),hesap:parseNum(r[5]),ilave:parseNum(r[6]),toplam:parseNum(r[7]),indirim:parseNum(r[8]),odenecek:parseNum(r[9]),devreden:parseNum(r[10]),tahakkuk:t(r[11])}));
  if(k==='imalatci')data.forEach(r=>t(r[1])&&out.imalatcilar.push({ad:t(r[1]),vkn:t(r[2]),oda:t(r[3]),tarih:normTarih(r[4]),no:t(r[5]),tur:t(r[6]),aciklama:t(r[7])}));
  if(k==='tedarikci'){let d='';for(let j=i+1;j<rows.length;j++){const r=rows[j],a=t(r[0]);if(r.slice(0,10).every(x=>x===''))continue;
   const m=/^(\d{1,2})\s*\/\s*(\d{4})/.exec(a);if(m){d=normDonem(m[1]+'.'+m[2]);continue}
   if(!t(r[1])||/ADI SOYADI/.test(U(r[1])))continue;
   out.tedarikciler.push({donem:d,ad:t(r[1]),vkn:t(r[2]),vd:t(r[3]),tarih:normTarih(r[4]),seri:t(r[5]),no:t(r[6]),tutar:parseNum(r[7])})}}
 });
 return out}
function parseArsiv(wb){const sayfalar=[];wb.eachSheet(ws=>{if(!/AR[ŞS][İI]V/i.test(ws.name))return;const y=(/(\d{4})/.exec(ws.name)||[])[1]||'';sayfalar.push(parseSheet(ws,y))});
 sayfalar.sort((a,b)=>a.yil<b.yil?-1:1);
 const son=[...sayfalar].reverse().find(s=>s.mukellef.vkn)||{mukellef:{}};
 const all=k=>sayfalar.flatMap(s=>s[k]);
 return {mukellef:son.mukellef,yillar:sayfalar.map(s=>s.yil),sayfalar,ortaklar:all('ortaklar'),defterler:all('defterler'),isciler:all('isciler'),kdv:all('kdv'),imalatcilar:all('imalatcilar'),tedarikciler:all('tedarikciler')}}
const api={parseArsiv};if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
