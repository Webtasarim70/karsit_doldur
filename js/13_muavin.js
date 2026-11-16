/* Satış muavini (120 Alıcılar) okuyucusu ve tahsilat dağıtımı.
   parseMuavinPdfText ve yardımcıları ekarsit projesinden (js/05_crosschecks_ebarat_kdv_muhtasar.js) alınmıştır.
   Hesap ayırma, fatura eşleştirme ve ödeme şekli çıkarımı bu repoya özgüdür. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
const {U,parseNum}=K;
function muavinNormalizeNo(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function muavinParseAmount(v){
  const x=String(v||'').trim().replace(/\./g,'').replace(',','.');
  const n=Number(x); return Number.isFinite(n)?n:null;
}
function muavinDate(v){ const m=String(v||'').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?`${m[1]}.${m[2]}.${m[3]}`:''; }
function muavinAmountsFromLine(line){
  const re=/-?\d{1,3}(?:\.\d{3})*,\d{2}/g, a=[]; let m;
  while((m=re.exec(line))) a.push({text:m[0],index:m.index,value:muavinParseAmount(m[0])});
  return a;
}
function parseMuavinPdfText(text){
  const lines=String(text||'').replace(/\u00a0/g,' ').split(/\r?\n/).map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
  const rows=[];
  for(const line of lines){
    const head=line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\S+)\s+(.*)$/);
    if(!head) continue;
    const amounts=muavinAmountsFromLine(line);
    if(amounts.length<2) continue;
    const firstAmt=amounts[0].index;
    const desc=head[4].slice(0, Math.max(0, firstAmt-(line.indexOf(head[4])))).trim();
    // Layout: BORÇ, ALACAK, BAKİYE. The first two are the transaction amounts.
    rows.push({tarih:muavinDate(head[1]),yevmiyeNo:head[2],fisNo:head[3],aciklama:desc,borc:amounts[0].value,alacak:amounts[1].value,bakiye:amounts[2]?.value??null,kaynak:'PDF'});
  }
  return rows;
}

/* ---------- bu repoya özgü bölüm ---------- */
const REF=['Nakit','Banka','Çek','Senet','C/H','Diğer'];   /* e-Karşıt "Ödeme Şekli Referans": 1-6 */
const nrm=muavinNormalizeNo;
/* Metni hesaplara böler: "HESAP KODU ADI : 120.01.23.005 / ÜNVAN"; her hesap için satırlar ve devir (NAKLEDİLEN TOPLAM borç − alacak) */
function muavinHesaplar(metin){const H=[];let cur=null;
 for(const ln0 of String(metin||'').replace(/\u00a0/g,' ').split(/\r?\n/)){const ln=ln0.replace(/\s+/g,' ').trim();
  const m=/HESAP KODU ADI\s*:\s*(\S+)\s*\/\s*(.+)$/i.exec(ln);if(m){if(!cur||cur.kod!==m[1]){cur={kod:m[1],ad:m[2].trim(),sat:[],ac:null};H.push(cur)}continue}
  if(!cur)continue;const a=/NAKLED[İI]LEN\s+TOPLAM\s*:\s*(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})/i.exec(ln);if(a&&cur.ac==null)cur.ac=muavinParseAmount(a[1])-muavinParseAmount(a[2]);cur.sat.push(ln)}
 H.forEach(h=>{h.rows=parseMuavinPdfText(h.sat.join('\n'));delete h.sat;h.ac=h.ac||0});return H}
/* PDF metni → belge (muavin değilse null) */
function muavinBelge(metin){if(!/MUAV[İI]N\s+DEFTER/i.test(String(metin).toLocaleUpperCase('tr-TR').replace(/İ/g,'İ'))&&!/MUAVİN DEFTER/i.test(metin))return null;
 const hesaplar=muavinHesaplar(metin),n=hesaplar.reduce((a,h)=>a+h.rows.length,0),b={tur:'muavin',hesaplar,satir:n};
 if(!hesaplar.length)b.hata='Hesap bilgisi (HESAP KODU ADI) bulunamadı.';else if(!n)b.hata='Muavin satırları okunamadı.';return b}
/* Tahsilat açıklamasından ödeme yöntemi; belirsiz → 'Diğer' (belirsiz:true) */
function odemeYontemi(acik){const t=String(acik||'').toLocaleUpperCase('tr-TR');
 if(/ÇEK/.test(t))return{y:'Çek'};if(/SENET/.test(t))return{y:'Senet'};if(/NAK[İI]T|KASA/.test(t))return{y:'Nakit'};
 if(/BANKA|HAVALE|EFT|V[İI]RMAN|KRED[İI] KARTI|\bPOS\b/.test(t))return{y:'Banka'};return{y:'Diğer',belirsiz:true}}
/* Bir hesapta tahsilatları en eski borçtan başlayarak (FIFO) borç satırlarına dağıtır → {satırİndeksi: {odemeler:[{y,tutar,tarih,acik,belirsiz}], kalan}} */
function muavinDagit(h){const items={},acik=[];let avans=h.ac<-0.005?-h.ac:0;
 if(h.ac>0.005)acik.push({acilis:true,kalan:h.ac,odemeler:[]});
 const dagit=(tutar,y,r,bel)=>{while(tutar>0.005&&acik.length){const o=acik[0],t=Math.min(o.kalan,tutar);o.kalan-=t;tutar-=t;if(!o.acilis)o.odemeler.push({y,tutar:t,tarih:r&&r.tarih||'',acik:r?r.aciklama:'Devreden alacak bakiyesi',belirsiz:!!bel});if(o.kalan<=0.005)acik.shift()}return tutar};
 h.rows.forEach((r,ix)=>{
  if((r.borc||0)>0.005){const it={odemeler:[],kalan:r.borc};items[ix]=it;acik.push(it);if(avans>0.005)avans=dagit(avans,'Diğer',null,true)}
  if((r.alacak||0)>0.005){const o=odemeYontemi(r.aciklama);dagit(r.alacak,o.y,r,o.belirsiz)}});
 return items}
const odemeMetni=it=>{const s=new Set(it.odemeler.map(o=>o.y));if(it.kalan>0.005||!s.size)s.add('C/H');return REF.filter(x=>s.has(x)).join(', ')};
/* Faturaları muavin satırlarıyla eşleştirir. inv: [{no,seri,tarih,matrah,kdv}] → {anahtar: {durum:'ok'|'yok'|'coklu'|'tutar', satir, hesap, veri:{dk,yevNo,odeme}, ayrinti:[...], kalan}} */
const faturaAnahtar=i=>nrm(i.no)+'|'+(i.tarih||'');
function muavinEsle(inv,belgeler){const out={},H=[];belgeler.forEach(b=>(b.hesaplar||[]).forEach(h=>H.push({h,d:muavinDagit(h)})));
 inv.forEach(i=>{const no=nrm(i.no),ks=[no,nrm((i.seri||'')+i.no)].filter(x=>x&&x.length>=4),M=[];
  H.forEach(({h,d})=>h.rows.forEach((r,ix)=>{if((r.borc||0)<=0.005)return;const a=nrm(r.aciklama);if(ks.some(k=>a.includes(k)))M.push({h,r,it:d[ix]})}));
  const tp=(parseNum(i.matrah)||0)+(parseNum(i.kdv)||0);let durum,m=null;
  if(!M.length)durum='yok';else{const tam=M.filter(x=>Math.abs(x.r.borc-tp)<=0.01);m=(tam.length===1?tam[0]:M[0]);durum=M.length>1&&tam.length!==1?'coklu':(Math.abs(m.r.borc-tp)>0.01?'tutar':'ok')}
  out[faturaAnahtar(i)]=m?{durum,hesap:{kod:m.h.kod,ad:m.h.ad},satir:m.r,borc:m.r.borc,toplam:tp,veri:{dk:m.r.tarih,yevNo:m.r.yevmiyeNo,odeme:odemeMetni(m.it)},ayrinti:m.it.odemeler,kalan:m.it.kalan,belirsiz:m.it.odemeler.some(o=>o.belirsiz)}:{durum,toplam:tp}});
 return out}
const api={muavinBelge,muavinHesaplar,muavinEsle,muavinDagit,odemeYontemi,odemeMetni,faturaAnahtar,REF_ODEME:REF,parseMuavinPdfText};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
