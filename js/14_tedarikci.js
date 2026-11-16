/* Tedarikçi (Tablo 7): İndirilecek KDV Listesi, 191 muavin, e-fatura XML, e-Karşıt Excel'i ve arşivden aday alımlar;
   dönem başına en yüksek 10 alım (matrah) seçimi. Okuyucular bu repoya özgüdür. */
(function(g){
const N=typeof module!=='undefined',K=N?require('./01_ortak.js'):g.KD,{U,parseNum,normTarih,donemOfTarih}=K;
const nn=s=>U(String(s??'')).replace(/İ/g,'I').replace(/Ç/g,'C').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/[^A-Z0-9]/g,'');
const tarihOf=v=>typeof v==='number'&&v>20000&&v<80000?normTarih(new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000)):normTarih(v);
const txt=v=>v==null?'':(v instanceof Date?normTarih(v):String(v).trim());
const r2=n=>Math.round(n*100)/100;
/* Başlık satırını bulur: kural {anahtar: normalleştirilmiş başlık için RegExp}; en az gerekli anahtarlar eşleşmeli */
function basliklar(rows,kural,gerekli){for(let r=0;r<Math.min(rows.length,20);r++){const h=(rows[r]||[]).map(nn),idx={};
  for(const k in kural){const i=h.findIndex(x=>kural[k].test(x));if(i>=0)idx[k]=i}
  if(gerekli.every(k=>idx[k]!=null))return{r,idx}}return null}
/* ---- İndirilecek KDV Listesi (xls/xlsx satırları → aday alımlar) ---- */
function kdvListesiOku(rows){const b=basliklar(rows,{tarih:/ALISFATURASININTARIHI/,seri:/ALISFATURASININSERISI/,no:/ALISFATURASININSIRANO/,ad:/SATICININADI?SOYAD/,vkn:/SATICININVERGIKIMLIK/,matrah:/KDVHARICTUTARI/,kdv:/^KDVSI$/,ggb:/GGBTESCIL/,donem:/INDIRIMHAKKININKULLANILDIGIKDVDONEMI/},['tarih','no','matrah']);
 if(!b)return{ok:false,satirlar:[],uyari:[{k:'er',t:'İndirilecek KDV Listesi başlıkları bulunamadı (Alış Faturasının Tarihi / Sıra No\'su / KDV Hariç Tutarı). Doğru dosyayı seçtiğinizden emin olun.'}]};
 const i=b.idx,out=[];let atlanan=0;
 for(let r=b.r+1;r<rows.length;r++){const x=rows[r]||[],tarih=tarihOf(x[i.tarih]),no=txt(x[i.no]);if(!tarih||!/^\d{2}\.\d{2}\.\d{4}$/.test(tarih)||!no){if(x.some(v=>v!==''&&v!=null))atlanan++;continue}
  const d=i.donem!=null?/^(\d{4})(\d{2})$/.exec(txt(x[i.donem])):null;
  out.push({kaynak:'liste',no,seri:i.seri!=null?txt(x[i.seri]):'',tarih,ad:i.ad!=null?txt(x[i.ad]):'',vkn:i.vkn!=null?txt(x[i.vkn]).replace(/\.0$/,''):'',matrah:parseNum(x[i.matrah]),kdv:i.kdv!=null?parseNum(x[i.kdv]):null,gumNo:i.ggb!=null?txt(x[i.ggb]):'',donem:d?`${d[2]}.${d[1]}`:donemOfTarih(tarih)})}
 return{ok:out.length>0,satirlar:out,uyari:out.length?[]:[{k:'er',t:'Listede fatura satırı bulunamadı.'}]}}
/* ---- 191 muavin: fatura (evrak) bazında KDV toplamı ---- */
function muavin191Oku(rows){const b=basliklar(rows,{tarih:/EVRAKTARIHI/,seri:/^SERI$/,no:/EVRAKNO/,vkn:/VERGITCNO|VERGITC/,ad:/ACIKLAMA/,borc:/BORCTUTARI/,alacak:/ALACAKTUTARI/},['no','borc','alacak']);
 if(!b)return{ok:false,satirlar:[],uyari:[{k:'er',t:'191 muavin başlıkları bulunamadı (Evrak No / Borç Tutarı / Alacak Tutarı). Doğru dosyayı seçtiğinizden emin olun.'}]};
 const i=b.idx,M=new Map();
 for(let r=b.r+1;r<rows.length;r++){const x=rows[r]||[],no=txt(x[i.no]),bo=parseNum(x[i.borc]),al=parseNum(x[i.alacak]);if(!no||(bo==null&&al==null))continue;
  const key=nn(no);let e=M.get(key);if(!e){e={kaynak:'m191',no,seri:i.seri!=null?txt(x[i.seri]):'',tarih:i.tarih!=null?tarihOf(x[i.tarih]):'',vkn:i.vkn!=null?txt(x[i.vkn]):'',ad:i.ad!=null?txt(x[i.ad]):'',kdv:0};M.set(key,e)}e.kdv=r2(e.kdv+(bo||0)-(al||0))}
 const out=[...M.values()].map(e=>({...e,donem:donemOfTarih(e.tarih)}));
 return{ok:out.length>0,satirlar:out,uyari:out.length?[]:[{k:'er',t:'191 muavinde fatura satırı bulunamadı.'}]}}
/* ---- e-Fatura / e-Arşiv XML (UBL-TR) ---- */
function efaturaXml(t){if(!/<(?:[\w-]+:)?Invoice\b/.test(t)||!/AccountingSupplierParty/.test(t))return null;
 const bol=n=>{const m=new RegExp('<cac:'+n+'>([^]*?)</cac:'+n+'>').exec(t);return m?m[1]:''},bir=(p,s)=>{const m=p.exec(s);return m?m[1].trim():''},sup=bol('AccountingSupplierParty'),cus=bol('AccountingCustomerParty');
 const no=bir(/<cbc:ID>([A-Za-z0-9]{3}\d{13})<\/cbc:ID>/,t)||bir(/<cbc:ID>([^<]{6,30})<\/cbc:ID>/,t),tarih=bir(/<cbc:IssueDate>([^<]*)</,t),cur=bir(/<cbc:DocumentCurrencyCode>([^<]*)</,t)||'TRY';
 const vd=bir(/<cac:TaxScheme>\s*<cbc:Name>([^<]*)</,sup),il=bir(/<cbc:CityName>([^<]*)</,sup),uyari=[];
 let kur=1;if(cur!=='TRY'){const k=parseNum(bir(/<cbc:CalculationRate>([^<]*)</,t));if(k)kur=k;else{kur=null;uyari.push(`Fatura ${cur} cinsinden; kur bulunamadığı için TL tutarları hesaplanamadı. Matrah ve KDV’yi elle girin.`)}}
 const mt=parseNum(bir(/<cbc:TaxExclusiveAmount[^>]*>([^<]*)</,t))??parseNum(bir(/<cbc:LineExtensionAmount[^>]*>([^<]*)</,t)),kd=parseNum(bir(/<cac:TaxTotal>\s*<cbc:TaxAmount[^>]*>([^<]*)</,t));
 if(cur!=='TRY'&&kur)uyari.push(`Fatura ${cur} cinsinden; TL karşılığı kur (${kur}) ile hesaplandı.`);
 if(/WithholdingTaxTotal/.test(t))uyari.push('Tevkifatlı fatura: KDV tutarını kontrol edin.');
 const b={tur:'efatura',kaynak:'xml',no,seri:'',tarih:/^\d{4}-/.test(tarih)?normTarih(tarih):'',vkn:bir(/schemeID="(?:VKN|TCKN)">([^<]*)</,sup),ad:bir(/<cac:PartyName>\s*<cbc:Name>([^<]*)</,sup),vd:vd?(il?`${vd} (${il})`:vd):'',aliciVkn:bir(/schemeID="(?:VKN|TCKN)">([^<]*)</,cus),
  matrah:mt!=null&&kur?r2(mt*kur):null,kdv:kd!=null&&kur?r2(kd*kur):null,doviz:cur,uyari};
 b.donem=donemOfTarih(b.tarih)||'';if(!b.no||!b.tarih)b.hata='Fatura numarası veya tarihi okunamadı.';return b}
/* ---- e-Karşıt tedarikçi Excel'i satırları (09_excel_oku.tedarikExcelOku sonrası) ve arşiv satırları aday olarak havuza girer ---- */
const ALAN=['ad','vkn','vd','tarih','seri','no','matrah','kdv','gumTarih','gumNo'],ONC={arsiv:0,cevap:0.5,m191:1,liste:2,excel:3,xml:4,elle:5};
/* girdi: {liste:[], m191:[], xml:[], excel:[], arsiv:[], el:{anahtar:{alan:değer}}, ekle:[{...}], cikar:{anahtar:true}, donemler:['07.2026',..]}
   çıktı: {donem:{mod, toplam, secili:[{key,alan,kay,origin,not:[],ek:bool}], cikarilan:[...]}} */
function tedarikHesapla(g_){const H=new Map(),el=g_.el||{};
 const ekle=(row,k)=>{const key=nn(row.no);if(!key)return;let e=H.get(key);if(!e){e={key,alan:{},kay:{},origin:new Set(),donemKdv:null,m:null,u:[]};H.set(key,e)}e.origin.add(k);
  ALAN.forEach(f=>{const v=row[f];if(v==null||v==='')return;if(e.alan[f]==null||ONC[k]>=ONC[e.kay[f]]){e.alan[f]=v;e.kay[f]=k}});
  if(k==='liste'&&row.donem)e.donemKdv=row.donem;if(k==='m191')e.m=row.kdv;if(k==='xml'&&row.uyari)row.uyari.forEach(u=>{if(!e.u.includes(u))e.u.push(u)})};
 [['arsiv',g_.arsiv],['cevap',g_.cevap],['m191',g_.m191],['liste',g_.liste],['excel',g_.excel],['xml',g_.xml]].forEach(([k,L])=>(L||[]).forEach(r=>ekle(r,k)));
 (g_.ekle||[]).forEach(r=>ekle(r,'elle'));
 Object.keys(el).forEach(key=>{const e=H.get(key);if(e)ALAN.forEach(f=>{const v=el[key][f];if(v!=null&&v!==''){e.alan[f]=v;e.kay[f]='elle'}})});
 /* Vergi dairesi VKN bazında taşınır: doğrudan alanı olmayan satır, aynı VKN'nin başka kayıttaki vergi dairesini alır (kullanıcı eşlemesi > diğer kaynaklar) */
 const vkn=new Map();H.forEach(e=>{if(e.alan.vd&&e.alan.vkn&&!vkn.has(e.alan.vkn))vkn.set(e.alan.vkn,e.alan.vd)});
 H.forEach(e=>{if(!e.alan.vd&&e.alan.vkn){const u=(g_.vdMap||{})[e.alan.vkn];if(u){e.alan.vd=u;e.kay.vd='elle'}else if(vkn.has(e.alan.vkn)){e.alan.vd=vkn.get(e.alan.vkn);e.kay.vd='vkn'}}});
 const dnm=e=>e.donemKdv||donemOfTarih(e.alan.tarih),sirala=a=>a.sort((x,y)=>{const t=s=>(s||'').split('.').reverse().join('');return t(x.alan.tarih)<t(y.alan.tarih)?-1:t(x.alan.tarih)>t(y.alan.tarih)?1:x.key<y.key?-1:1});
 const out={},liste=!!(g_.liste&&g_.liste.length),m191=!!(g_.m191&&g_.m191.length),rank=e=>e.alan.matrah??e.alan.kdv??0;
 (g_.donemler||[]).forEach(d=>{const hepsi=[...H.values()].filter(e=>dnm(e)===d),has=k=>hepsi.filter(e=>e.origin.has(k));let mod='',base=[],toplam=0,not=[];
  const kayn=hepsi.filter(e=>['liste','m191','xml'].some(k=>e.origin.has(k)));
  if(has('excel').length){mod='e-Karşıt Excel (olduğu gibi)';base=has('excel')}
  else if((liste||m191)&&kayn.filter(e=>e.origin.has('liste')||e.origin.has('m191')).length){mod=liste?'İndirilecek KDV Listesi (en yüksek 10 alım)':'191 muavin (en yüksek 10 alım, KDV’ye göre)';toplam=kayn.length;base=kayn.slice().sort((a,b)=>rank(b)-rank(a)).slice(0,10)}
  else if(has('cevap').length){mod='Cevap yazısı';base=has('cevap')}
   else if(has('arsiv').length){mod='Arşiv';base=has('arsiv')}
  else if(has('xml').length){mod='e-fatura XML (en yüksek 10 alım)';toplam=has('xml').length;base=has('xml').slice().sort((a,b)=>rank(b)-rank(a)).slice(0,10)}
  if((liste||m191)&&!kayn.filter(e=>e.origin.has('liste')||e.origin.has('m191')).length&&!has('excel').length)not.push(liste?'İndirilecek KDV Listesi bu dönemde fatura satırı içermiyor.':'191 muavin bu dönemde fatura satırı içermiyor.');
  const ek=has('elle'),set=new Map();base.concat(ek).forEach(e=>set.set(e.key,e));
  const tum=sirala([...set.values()]),cik=tum.filter(e=>(g_.cikar||{})[e.key]),sec=tum.filter(e=>!(g_.cikar||{})[e.key]);
  out[d]={mod,toplam,secili:sec.map(e=>({key:e.key,alan:e.alan,kay:e.kay,origin:[...e.origin],ek:e.origin.has('elle')&&!e.origin.has('liste')&&!e.origin.has('m191')&&!e.origin.has('xml')&&!e.origin.has('excel')&&!e.origin.has('arsiv')&&!e.origin.has('cevap'),m:e.m,u:e.u})),cikarilan:cik.map(e=>({key:e.key,alan:e.alan})),not}});
 return out}
/* Satır kontrolü: eksik zorunlu alanlar, 191 doğrulaması, XML uyarıları */
function satirNotlari(s,m191var){const n=[],a=s.alan,eks=[['ad','ünvan'],['vkn','VKN'],['vd','vergi dairesi'],['tarih','fatura tarihi'],['no','fatura no'],['matrah','matrah'],['kdv','KDV']].filter(([k])=>a[k]==null||a[k]==='').map(x=>x[1]);
 if(eks.length)n.push(['er','Eksik: '+eks.join(', ')]);
 if(m191var){if(s.m==null)n.push(['wr','191 muavinde bulunamadı']);else if(a.kdv!=null&&Math.abs(s.m-a.kdv)>0.01)n.push(['wr',`191 muavin KDV’si (${K.fmtTR(s.m)}) farklı`]);else n.push(['ok','191 muavinde doğrulandı'])}
 (s.u||[]).forEach(u=>n.push(['wr',u]));return n}
const api={kdvListesiOku,muavin191Oku,efaturaXml,tedarikHesapla,satirNotlari,TED_ALAN:ALAN,nn_:nn,tarihOf_:tarihOf};
if(N)module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
