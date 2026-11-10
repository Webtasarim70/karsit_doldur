/* e-Karşıt PDF konum tabanlı ayrıştırıcı — PROTOTİP
   Girdi: pdf.js getTextContent() öğeleri → {k: -sayfaNo*1000 + y, x, y, w, s}
   Çıktı: {ymm, firma(B), c(C), kf(Ç), tarih, sayi, contracts[], inv[]}
   Tek örnek e-Karşıt PDF'inde doğrulandı; diğer PDF'lerle test edilmeli. */
function parseEK(items){
const U=s=>s.toLocaleUpperCase('tr-TR'),ctr=i=>i.x+i.w/2;
const it=items.filter(i=>i.s.trim()&&i.y>55).sort((a,b)=>b.k-a.k||a.x-b.x);
const H=re=>it.find(i=>re.test(U(i.s.trim())));
const hA=H(/^A\)/),hB=H(/^B\)/),hS=H(/TASDİK DÖNEMİ SÖZLEŞME/),hC=H(/^C\)/),hCc=H(/^Ç\)/),hO=H(/ORTAKLIK BİLGİLERİ/),h3=H(/^3-/),h4=H(/^4-/);
const sec=(a,b)=>a?it.filter(i=>i.k<a.k&&(!b||i.k>b.k)):[];
const join=(a,sep)=>a.slice().sort((p,q)=>Math.abs(p.k-q.k)>3?q.k-p.k:p.x-q.x).map(i=>i.s.trim()).join(sep).replace(/\s+/g,' ').trim();
const LB=[[/^ADI VE SOYADI/,'adi'],[/^VERGİ\s*\/\s*T/,'vn'],[/^VERGİ DAİRESİ/,'vd'],[/^MÜHÜR/,'muhur'],[/^SİCİL/,'sicil'],[/^BAĞLI/,'oda'],[/^ADRES/,'adres'],[/^TELEFON/,'tel']];
function kv(s){const lb=s.filter(i=>i.x<100).map(i=>({y:i.k,key:(LB.find(l=>l[0].test(U(i.s.trim())))||[])[1]})).filter(l=>l.key),g={};
s.filter(i=>i.x>=100).forEach(v=>{if(!lb.length)return;const l=lb.reduce((a,b)=>Math.abs(b.y-v.k)<Math.abs(a.y-v.k)?b:a);(g[l.key]??=[]).push(v)});
const o={};for(const k in g)o[k]=join(g[k],' ');return o}
const r={ymm:kv(sec(hA,hB)),firma:kv(sec(hB,hS||hC)),c:kv(sec(hC,hCc)),kf:kv(sec(hCc,hO||h3))};
const dt=it.find(i=>/\d{2}\.\d{2}\.\d{4}/.test(i.s)&&i.x>400&&i.y>690);r.tarih=dt?dt.s.match(/\d{2}\.\d{2}\.\d{4}/)[0]:'';
const sn=it.find(i=>/EKARSIT/i.test(i.s));r.sayi=sn?sn.s.trim():'';
/* sözleşmeler */
r.contracts=[];if(hS){const s=sec(hS,hC),HW=/^(Sözleşme|Başlangıç Dönemi|Sözleşme Bitiş|Dönemi|Tasdik Sözleşmesinin|Tarihi|Seri - Sıra Numarası|Tasdik|Sözleşmesinin|Sisteme Girildiği|Tarih)$/;
const hd=s.filter(i=>HW.test(i.s.trim()));if(hd.length){const bot=Math.min(...hd.map(i=>i.k)),c=re=>{const x=hd.find(i=>re.test(i.s.trim()));return x?ctr(x):null};
const C=[c(/^Başlangıç/)??75,c(/^Sözleşme Bitiş/)??172,c(/^Tarihi$/)??282,c(/^Seri/)??400,c(/^Sisteme/)??511],K=['bas','bit','tarih','seri','sistem'];
const rows=[];s.filter(i=>i.k<bot-2).forEach(i=>{let g=rows.find(q=>Math.abs(q.k-i.k)<4);if(!g)rows.push(g={k:i.k,c:{}});const n=C.reduce((a,v,j)=>Math.abs(v-ctr(i))<Math.abs(C[a]-ctr(i))?j:a,0);(g.c[K[n]]??=[]).push(i)});
rows.forEach(g=>{const o={};K.forEach(k=>o[k]=join(g.c[k]||[],' '));if(/^\d{2}\.\d{4}$/.test(o.bas))r.contracts.push(o)})}}
/* faturalar */
r.inv=[];if(h3){const s=sec(h3,h4||hO),HW=/^(Faturanın|Tarihi|Serisi|Numarası|Tutarı \(TL\)|K\.D\.V\. \(TL\)|Defter Kayıt|Defter KayıtTarihi|Yevmiye|Ödeme Şekli ve|Ödemeye İlişkin|Bilgiler|Açıklama|Hatalı Satır|Tarih)$/;
const tp=s.find(i=>/^TOPLAM/i.test(i.s.trim())),body=s.filter(i=>!HW.test(i.s.trim())&&(!tp||i.k>tp.k+2&&!/^TOPLAM/i.test(i.s.trim())));
const hs=s.filter(i=>HW.test(i.s.trim())),by=(re)=>hs.filter(i=>re.test(i.s.trim())).sort((a,b)=>a.x-b.x);
const T=by(/^Tarihi$/),N=by(/^Numarası$/),g=(a,i,d)=>a[i]?ctr(a[i]):d;
const C=[g(T,0,46),g(by(/^Serisi$/),0,93),g(N,0,146),g(by(/^Tutarı/),0,205),g(by(/^K\.D\.V/),0,262),g(T,1,321),g(N,1,377),g(by(/^Bilgiler$/),0,437),497,g(by(/^Hatalı/),0,552)],K=['tarih','seri','no','tutar','kdv','dk','yev','od','ack','hat'];
const near=i=>C.reduce((a,v,j)=>Math.abs(v-ctr(i))<Math.abs(C[a]-ctr(i))?j:a,0);
const an=body.filter(i=>/^\d{2}\.\d{2}\.\d{4}$/.test(i.s.trim())&&near(i)===0).map(i=>i.k);
const rows=an.map(k=>({k,c:{}}));
body.forEach(i=>{const g=rows.reduce((a,b)=>Math.abs(b.k-i.k)<Math.abs(a.k-i.k)?b:a);(g.c[K[near(i)]]??=[]).push(i)});
rows.forEach(g=>{const f=k=>join(g.c[k]||[],' ');let no=join(g.c.no||[],''),se=f('seri');if(se&&!no.startsWith(se))no=se+' '+no;
r.inv.push({tarih:f('tarih'),no,matrah:f('tutar'),kdv:f('kdv'),yev:[f('dk'),f('yev')].filter(Boolean).join('/'),od:(/çek/i.test(f('od'))?'Çek':/banka|havale|eft/i.test(f('od'))?'Banka':/nakit/i.test(f('od'))?'Nakit':'')})})}
return r}
if(typeof module!=='undefined')module.exports=parseEK;
