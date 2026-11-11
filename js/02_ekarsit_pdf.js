/* e-Karşıt tutanak PDF'i — konum tabanlı ayrıştırıcı
   Girdi: pdf.js getTextContent() öğeleri → {k: -sayfaNo*1000 + y, x, y, w, s}
   Çıktı: {ymm, firma(B), c(C), kf(Ç), tarih, sayi, contracts[], inv[], toplam[]}
   Başlık verinin ÜSTÜNDE; etiket sütunu x<100, değer sütunu x>=100. */
(function(g){
function parseEK(items){
const U=s=>s.toLocaleUpperCase('tr-TR'),ctr=i=>i.x+i.w/2;
const it=items.filter(i=>i.s.trim()&&i.y>55).sort((a,b)=>b.k-a.k||a.x-b.x);
const H=re=>it.find(i=>re.test(U(i.s.trim())));
const hSs=it.filter(i=>i.x>60&&/SÖZLEŞME BİLGİLERİ/.test(U(i.s.trim()))),hS=hSs[0],hA=H(/^A\)/),hB=H(/^B\)/),hC=H(/^C\)/),hCc=H(/^Ç\)/),hO=H(/ORTAKLIK BİLGİLERİ/),h3=H(/^3-/),h4=H(/^4-/);
const sec=(a,b)=>a?it.filter(i=>i.k<a.k&&(!b||i.k>b.k)):[];
const join=(a,sep)=>a.slice().sort((p,q)=>Math.abs(p.k-q.k)>3?q.k-p.k:p.x-q.x).map(i=>i.s.trim()).join(sep).replace(/\s+/g,' ').trim();
const LB=[[/^YMM\s*ŞİRKET/,'sirket'],[/^ADI VE SOYADI/,'adi'],[/^VERGİ\s*\/\s*T/,'vn'],[/^VERGİ DAİRESİ/,'vd'],[/^MÜHÜR/,'muhur'],[/^SİCİL/,'sicil'],[/^BAĞLI/,'oda'],[/^ADRES/,'adres'],[/^TELEFON/,'tel']];
function kv(s){const lb=s.filter(i=>i.x<100).map(i=>({y:i.k,key:(LB.find(l=>l[0].test(U(i.s.trim())))||[])[1]})).filter(l=>l.key),g={};
s.filter(i=>i.x>=100).forEach(v=>{if(!lb.length)return;const l=lb.reduce((a,b)=>Math.abs(b.y-v.k)<Math.abs(a.y-v.k)?b:a);(g[l.key]??=[]).push(v)});
const o={};for(const k in g)o[k]=join(g[k],' ');return o}
const r={ymm:kv(sec(hA,hB)),firma:kv(sec(hB,hS||hC)),c:kv(sec(hC,hCc)),kf:kv(sec(hCc,hO||h3))};
const dt=it.find(i=>/\d{2}\.\d{2}\.\d{4}/.test(i.s)&&i.x>400&&i.y>690);r.tarih=dt?dt.s.match(/\d{2}\.\d{2}\.\d{4}/)[0]:'';
const sy=it.find(i=>/^SAYI$/.test(U(i.s.trim()))&&i.x<60);r.sayi=sy?it.filter(i=>Math.abs(i.k-sy.k)<4&&i.x>sy.x+10&&i.x<400&&/\w/.test(i.s)).sort((a,b)=>a.x-b.x).map(i=>i.s.replace(/^[:\s]+/,'').trim()).join(' '):'';
/* sözleşmeler (birden fazla tablo olabilir) */
r.contracts=[];const heads=[...hSs,hC,hCc].filter(Boolean).sort((a,b)=>b.k-a.k);
hSs.forEach(h=>{const nx=heads.find(x=>x.k<h.k),s=sec(h,nx),hd=s.filter(i=>/Başlangıç|Bitiş|^Tarihi$|Seri|Sisteme/.test(i.s.trim())),c=re=>{const x=hd.find(i=>re.test(i.s.trim()));return x?ctr(x):null};
const C=[c(/Başlangıç/)??74,c(/Bitiş/)??164,c(/^Tarihi$/)??257,c(/Seri/)??380,c(/Sisteme/)??505],K=['bas','bit','tarih','seri','sistem'],near=i=>C.reduce((a,v,j)=>Math.abs(v-ctr(i))<Math.abs(C[a]-ctr(i))?j:a,0);
s.filter(i=>/^\d{2}\.\d{4}$/.test(i.s.trim())&&near(i)===0).forEach(an=>{const o={tip:/KDV İADESİ/.test(U(h.s))?'kdvIadesi':'tasdik'};K.forEach(k=>o[k]='');
s.filter(i=>Math.abs(i.k-an.k)<4).forEach(i=>{const k=K[near(i)];o[k]=(o[k]?o[k]+' ':'')+i.s.trim()});r.contracts.push(o)})});
/* faturalar */
r.inv=[];if(h3){const s=sec(h3,h4||hO),HW=/^(Faturanın|Tarihi|Serisi|Numarası|Tutarı \(TL\)|K\.D\.V\. \(TL\)|Defter Kayıt|Defter KayıtTarihi|Yevmiye|Ödeme Şekli ve|Ödemeye İlişkin|Bilgiler|Açıklama|Hatalı Satır|Tarih)$/;
const tp=s.find(i=>/^TOPLAM/i.test(i.s.trim())),sf=i=>Math.ceil(-i.k/1000),cand=s.filter(i=>!HW.test(i.s.trim())&&(!tp||i.k<tp.k-10||i.k>tp.k+10)&&!/^TOPLAM/i.test(i.s.trim()));
const hs=s.filter(i=>HW.test(i.s.trim())),by=(re)=>hs.filter(i=>re.test(i.s.trim())).sort((a,b)=>a.x-b.x);
const T=by(/^Tarihi$/),N=by(/^Numarası$/),g=(a,i,d)=>a[i]?ctr(a[i]):d;
const C=[g(T,0,46),g(by(/^Serisi$/),0,93),g(N,0,146),g(by(/^Tutarı/),0,205),g(by(/^K\.D\.V/),0,262),g(T,1,321),g(N,1,377),g(by(/^Bilgiler$/),0,437),497,g(by(/^Hatalı/),0,552)],K=['tarih','seri','no','tutar','kdv','dk','yev','od','ack','hat'];
const near=i=>C.reduce((a,v,j)=>Math.abs(v-ctr(i))<Math.abs(C[a]-ctr(i))?j:a,0);
const an0=cand.filter(i=>/^\d{2}\.\d{2}\.\d{4}$/.test(i.s.trim())&&near(i)===0),cut={};an0.forEach(i=>{const pg=sf(i);if(cut[pg]==null||i.k>cut[pg])cut[pg]=i.k});
const body=cand.filter(i=>cut[sf(i)]!=null&&i.k<cut[sf(i)]+12&&(!tp||i.k>tp.k+10));
const an=body.filter(i=>/^\d{2}\.\d{2}\.\d{4}$/.test(i.s.trim())&&near(i)===0).map(i=>i.k);
const rows=an.map(k=>({k,c:{}}));
body.forEach(i=>{const g=rows.reduce((a,b)=>Math.abs(b.k-i.k)<Math.abs(a.k-i.k)?b:a);(g.c[K[near(i)]]??=[]).push(i)});
rows.forEach(g=>{const f=k=>join(g.c[k]||[],' ');const no=join(g.c.no||[],''),se=f('seri'),od=f('od');
r.inv.push({tarih:f('tarih'),seri:se,no,matrah:f('tutar'),kdv:f('kdv'),dk:f('dk'),yevNo:f('yev'),odeme:od,aciklama:f('ack'),hatali:f('hat')})})}
const tpz=it.find(i=>/^TOPLAM/i.test(i.s.trim())&&h3&&i.k<h3.k&&(!h4||i.k>h4.k));r.toplam=tpz?it.filter(i=>Math.abs(i.k-tpz.k)<10&&/^[\d.,]+$/.test(i.s.trim())).sort((a,b)=>a.x-b.x).map(i=>i.s.trim()):[];
return r}


if(typeof module!=='undefined')module.exports=parseEK;else g.parseEK=parseEK;
})(typeof window!=='undefined'?window:globalThis);
