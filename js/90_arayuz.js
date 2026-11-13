/* Arayüz: adım adım ilerleyen akış. Her adım kullanıcı onayıyla açılır. Veriler yalnızca bellekte tutulur. */
(function(){
const {fmtTR,parseNum,donemOfTarih,defterAnahtar}=KD;
const S={adim:1,onay:{},pdf:null,ars:null,pdfAd:'',arsAd:'',st:{}},$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BOS={mukellef:{},yillar:[],sayfalar:[],ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const msg=(t,k)=>$('durum').innerHTML=t?`<div class="msg ${k||'in'}">${t}</div>`:'';
/* ---------- kaynaklı adımlar (KDV, muhtasar ...): belge, Excel, elle giriş, arşiv ---------- */
const son=(a,f)=>{for(let i=a.length-1;i>=0;i--)if(f(a[i]))return a[i];return null};
const KAY={elle:'Elle girilen',belge:'Belge',excel:'Excel',arsiv:'Arşiv'},ONCELIK=['elle','belge','excel','arsiv'];
const ST=id=>S.st[id]??={B:[],X:null,El:{},Sec:{},Edit:null,Err:'',Taslak:null};
const normT=s=>String(s||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const CFG={
 kdv:{id:'kdv',adim:3,ad:'KDV bilgileri',tablo:'Tablo 5: Dönem bazında KDV bilgileri',arsKey:'kdv',excel:'kdv',
  anahtar:()=>donemler(S.pdf).kdv,anahtarMetin:'Gerekli dönemler',anahtarEk:'(fatura dönemi ve bir önceki dönem)',disMetin:'KDV dönemleri',
  kolon:[['teslim','Teslim ve hizmet bedeli','n'],['ozel','Özel matrah dahil olmayan bedel','n'],['matrah','KDV matrahı','n'],['hesap','Hesaplanan KDV','n'],['ilave','İlave edilecek KDV','n'],['toplam','Toplam KDV','n'],['indirim','İndirimler toplamı','n'],['odenecek','Ödenmesi gereken KDV','n'],['devreden','Sonraki döneme devreden','n'],['tahakkuk','Tahakkuk fişi no','t']],
  belgeBaslik:'KDV beyannamesi ve tahakkuk fişi (PDF)',belgeIpucu:'Sürükleyin veya seçin; birden fazla dosya (eski ve yeni biçim)',excelBaslik:'e-Karşıt KDV Excel’i (isteğe bağlı)',excelIpucu:'Daha önce hazırlanmış “ÖNCEKİ DÖNEM VE İLGİLİ DÖNEM KDV…” dosyası',
  giris:'Veriyi belgeden, daha önce hazırladığınız KDV Excel’inden veya elle girerek verebilirsiniz. Arşivde olan dönemler için ek veri vermek zorunlu değildir.',
  okuyucu:items=>kdvBelge(kdvMetin(items)),belgeKeys:b=>b.donem?[b.donem]:[],tanimsiz:'Tanınmadı: KDV beyannamesi veya tahakkuk fişi değil',
  turAd:b=>b.tur==='beyanname'?'Beyanname':'Tahakkuk fişi',bicimAd:b=>b.bicim==='eski'?'Eski':b.bicim==='yeni'?'Yeni':'—',
  bosChips:[{ad:'Beyanname',ok:false,iste:1},{ad:'Tahakkuk fişi',ok:false,iste:1}],
  belgeVeri(docs){const R=kdvSatirlari(docs),map={};R.satir.forEach(x=>{const tk=docs.some(b=>b.donem===x.donem&&b.tur==='tahakkuk'),bey=!!x.beyanname;
    map[x.donem]={veri:x.veri,chips:[{ad:'Beyanname',ok:bey,iste:1},{ad:'Tahakkuk fişi',ok:tk,iste:1}],notlar:x.veri&&!tk?['Tahakkuk fişi yüklenmedi; belgedeki tahakkuk no boş.']:(tk&&!bey?['Yalnızca tahakkuk fişi yüklendi; beyanname olmadan değerler okunamaz.']:[]),yok:tk&&!bey?'beyanname':'beyanname ve tahakkuk fişi'}});return{map,uyari:R.uyari}},
  kontrol(v){const m=[],t=(v.hesap||0)+(v.ilave||0);if(Math.abs(t-(v.toplam||0))>0.01)m.push(`Toplam KDV (${fmtTR(v.toplam||0)}) ile hesaplanan + ilave KDV (${fmtTR(t)}) uyuşmuyor.`);if(!v.tahakkuk)m.push('Tahakkuk fişi no boş; e-Karşıt’ta bu alan gerekir.');return m}},
 isci:{id:'isci',adim:4,ad:'Muhtasar',tablo:'Tablo 4: Dönem bazında çalışan işçi sayısı',arsKey:'isciler',excel:'isci',
  anahtar:()=>donemler(S.pdf).fatura,anahtarMetin:'Gerekli dönemler',anahtarEk:'(yalnızca fatura dönemleri)',disMetin:'fatura dönemleri',
  kolon:[['sayi','Çalışan işçi sayısı','i'],['vd','Beyannamenin verildiği vergi dairesi','t']],
  belgeBaslik:'Muhtasar ve Prim Hizmet Beyannamesi (PDF)',belgeIpucu:'Sürükleyin veya seçin; birden fazla dosya (her dönem için bir beyanname)',excelBaslik:'e-Karşıt çalışan sayısı Excel’i (isteğe bağlı)',excelIpucu:'Daha önce hazırlanmış “MUKELLEFIN_MUHTASAR_BEYANNAMESINDE…” dosyası',
  giris:'Çalışan sayısı, beyannamedeki “Çalışan Bilgisi” satırlarındaki toplam çalışan sayısı toplamıdır. Veriyi beyannameden, daha önce hazırladığınız Excel’den veya elle girerek verebilirsiniz.',
  okuyucu:items=>muhtasarBelge(kdvMetin(items)),belgeKeys:b=>(b.satirlar||[]).map(x=>x.donem),tanimsiz:'Tanınmadı: Muhtasar ve Prim Hizmet Beyannamesi değil',
  turAd:()=>'Muhtasar',bicimAd:b=>b.bicim||'—',
  bosChips:[{ad:'Beyanname',ok:false,iste:1}],
  belgeVeri(docs,K){const map={},uyari=[];docs.slice().sort((a,b)=>(a.onay||'')<(b.onay||'')?-1:1).forEach(b=>b.satirlar.forEach(x=>{if(!K.includes(x.donem))return;
    if(map[x.donem])uyari.push(`${x.donem}: birden fazla muhtasar beyannamesi yüklendi; onay zamanı en yeni olan kullanıldı.`);
    map[x.donem]={veri:{donem:x.donem,sayi:x.sayi,vd:b.vergiDairesi||''},chips:[{ad:'Beyanname',ok:true,iste:1}],notlar:b.uyari||[]}}));return{map,uyari}},
  kontrol(v){const m=[],c=normT(S.pdf.kf.vd),w=normT(v.vd).split(' ')[0];if(!v.vd)m.push('Vergi dairesi boş.');else if(c&&w&&!c.includes(w))m.push(`Beyannamenin vergi dairesi (${v.vd}) tutanaktaki Ç) vergi dairesinden (${S.pdf.kf.vd}) farklı görünüyor.`);if(!v.sayi)m.push('Çalışan sayısı 0.');return m}}};
CFG.defter={id:'defter',adim:5,ad:'e-Berat ve yasal defterler',tablo:'Tablo 2: Yasal defterler',arsKey:'defterler',excel:'defter',rowKey:defterAnahtar,
 anahtar:()=>defterGerekli(donemler(S.pdf)).map(x=>x.ad),anahtarMetin:'Gerekli defterler',anahtarEk:'(fatura aylarının e-Defter Yevmiye ve Kebir beratları, fatura yıllarının Envanter Defteri)',disMetin:'yasal defter kayıtları',
 kolon:[['nevi','Defterin nev’i','t'],['bas','Başlangıç dönemi','t'],['bit','Bitiş dönemi','t'],['makam','Tasdik makamı','t'],['tarih','Tasdik tarihi','t'],['no','Tasdik/berat no','t'],['aciklama','Açıklama (ETTN)','t'],['tur','Defter türü açıklama','t']],
 belgeBaslik:'e-Berat (XML veya e-Belge Görüntüleme PDF’i)',belgeIpucu:'Sürükleyin veya seçin; her ay için Yevmiye ve Kebir beratı (birden fazla dosya)',belgeKabul:'.xml,.pdf,application/pdf,text/xml',excelBaslik:'e-Karşıt yasal defter Excel’i (isteğe bağlı)',excelIpucu:'Daha önce hazırlanmış “MUKELLEFIN_YASAL_DEFTERLERE…” dosyası',
 giris:'e-Defter satırları e-Berat dosyasından (XML veya PDF), Envanter Defteri satırı ise arşivden, Excel’den veya elle (noter tasdik bilgisi) alınır. Berat süresi henüz dolmamışsa kartta “süresi dolmadı” seçeneği vardır.',
 dosyaOku:async f=>{const b=/\.xml$/i.test(f.name)?eberatXml(await f.text()):eberatPdf(kdvMetin(await pdfItems(f)));return b||null},
 belgeKeys:b=>{const k=b.hata?null:eberatAnahtar(b);return k?[k]:[]},tanimsiz:'Tanınmadı: e-Berat (XML veya e-Belge Görüntüleme PDF’i) değil',
 turAd:b=>b.dokumanTipi==='Yevmiye Defteri'?'Yevmiye beratı':b.dokumanTipi==='Büyük Defter'?'Kebir beratı':'e-Berat',bicimAd:b=>b.bicim||'—',
 bosChips:key=>/^Envanter/.test(key)?[]:[{ad:'e-Berat',ok:false,iste:1}],
 yokMetni:key=>/^Envanter/.test(key)?'Envanter Defteri noter tasdik bilgisini Excel’den yükleyin veya elle girin':'e-Berat dosyasını yükleyin, Excel yükleyin, elle girin veya “süresi dolmadı” seçeneğini kullanın',
 belgeVeri(docs,K){const map={},uyari=[];docs.slice().sort((a,b)=>(a.olusturma||'')<(b.olusturma||'')?-1:1).forEach(b=>{const key=eberatAnahtar(b);if(!key||!K.includes(key))return;
   if(map[key])uyari.push(`${key}: birden fazla berat yüklendi; sonuncusu kullanıldı.`);
   map[key]={veri:eberatSatir(b),chips:[{ad:'e-Berat',ok:true,iste:1}],notlar:b.ettn?[]:['Beratta ETTN bulunamadı; Açıklama alanına ETTN yazılmalı.']}});return{map,uyari}},
 kontrol(v){const m=[];if(!/süre iş bu yazı|yüklenmemiştir/i.test(v.aciklama||'')){if(!UUID_RE.test(v.aciklama||''))m.push('ETTN eksik: e-Defter satırlarında Açıklama alanında ETTN bulunmalı.');if(!v.no)m.push('Tasdik/berat no boş.');if(!v.tarih)m.push('Tasdik tarihi boş.')}return m},
 varsayilan:key=>{const m=/^(Yevmiye|Kebir) (\d{2}\.\d{4})$/.exec(key);if(m)return{nevi:m[1]==='Yevmiye'?'e-Defter Yevmiye Defteri':'e-Defter Defteri Kebir',bas:m[2],bit:m[2],makam:'GİB',tur:''};const e=/^Envanter (\d{4})$/.exec(key);return e?{nevi:'ENVANTER DEFTERİ',bas:'01.'+e[1],bit:'12.'+e[1],tur:''}:{}},
 dogrula:(v,key)=>defterAnahtar(v)===key?'':`Defterin nev’i ve dönemi bu kayıtla (${key}) uyuşmuyor: Yevmiye/Kebir için başlangıç ve bitiş dönemi aynı ay (AA.YYYY) olmalı, Envanter için nev’de “Envanter” geçmeli ve yıl ${key.slice(-4)} olmalı.`,
 kartBilgi(x){if(/^Envanter/.test(x.key))return[];const su=eberatSuresi(x.key.slice(-7));return su?[{k:su.doldu?'wr':'in',t:`e-Berat yükleme süresi (temel kural): ${su.son} — bugün itibarıyla ${su.doldu?'dolmuştur; berat yüklenmiş olmalı.':'dolmamıştır; “süresi dolmadı” seçeneği kullanılabilir.'} Resmî süre uzatımları ayrıca geçerli olabilir.`}]:[]},
 ozel:key=>{const m=/^(Yevmiye|Kebir) (\d{2}\.\d{4})$/.exec(key);return m?{...CFG.defter.varsayilan(key),tarih:'',no:'',aciklama:SD_NOTU}:null},ozelAd:'Berat süresi dolmadı (yüklenmedi) olarak işaretle'};
function fkVar(c,vals){return c[2]==='t'?new Set(vals.filter(Boolean)).size>1:Math.max(...vals.map(x=>x||0))-Math.min(...vals.map(x=>x||0))>0.005}
/* Her anahtar (dönem) için kaynaklar: elle > belge > yüklenen Excel > arşiv. Varsayılan en öncelikli kaynak; farklıysa kullanıcı seçer. */
function durumK(cfg){const st=ST(cfg.id),vp=(S.pdf.kf.vn||'').trim(),K=cfg.anahtar(),ars=S.ars||BOS,xr=st.X&&st.X.ok?st.X.satirlar:[];
 const rk=cfg.rowKey||(x=>x.donem),gecerli=st.B.filter(b=>b.tur&&!b.hata&&b.vkn===vp&&cfg.belgeKeys(b).some(k=>K.includes(k))),bv=cfg.belgeVeri(gecerli,K);
 const satir=K.map(key=>{const b=bv.map[key]||{},kay={elle:st.El[key]||null,belge:b.veri||null,excel:son(xr,x=>x.donem===key),arsiv:son(ars[cfg.arsKey],x=>rk(x)===key)},av=ONCELIK.filter(k=>kay[k]);
  const fk=cfg.kolon.filter(c=>fkVar(c,av.map(z=>kay[z][c[0]]))).map(c=>c[0]),sec=av.includes(st.Sec[key])?st.Sec[key]:(av[0]||'yok');
  return{key,chips:b.chips||(typeof cfg.bosChips==='function'?cfg.bosChips(key):cfg.bosChips),notlar:b.notlar||[],yok:b.yok||(cfg.yokMetni?cfg.yokMetni(key):''),kay,av,fk,sec,kullanilan:kay[sec]||null}});
 return{satir,uyari:bv.uyari}}
function efektif(){const a=S.ars||BOS;if(!S.pdf)return a;let r=a;
 Object.values(CFG).forEach(cfg=>{const ek=durumK(cfg).satir.filter(x=>x.sec!=='arsiv'&&x.kullanilan).map(x=>({...x.kullanilan,donem:x.key}));
  if(ek.length){const rk=cfg.rowKey||(x=>x.donem);r={...r,[cfg.arsKey]:[...r[cfg.arsKey].filter(x=>!ek.some(y=>y.donem===rk(x))),...ek]}}});return r}
/* ---------- gösterim yardımcıları (Adım 1 salt okunur) ---------- */
const dl=(o,rows)=>'<dl>'+rows.filter(r=>!r[2]||o[r[0]]).map(([k,l])=>`<dt>${l}</dt><dd>${esc(o[k])||'—'}</dd>`).join('')+'</dl>';
const kart=(t,o,rows,ek)=>`<div class="card"><h3>${t}</h3>${dl(o,rows)}${ek||''}</div>`;
const FIRMA=[['adi','Ünvan'],['vn','Vergi/T.C. Kimlik No'],['vd','Vergi Dairesi'],['adres','Adres'],['tel','Telefon']];
const drop=(id,fid,ba,acc,ad,alt,tur,multi)=>`<label class="drop${ad?' ok':''}" id="${id}" data-tur="${tur||(id==='dPdf'?'pdf':'ars')}"><b>${ba}</b>${alt}<input type="file" id="${fid}" accept="${acc}"${multi?' multiple':''}><small>${esc(ad)}</small></label>`;
/* ---------- dönem ve doğrulama kutusu ---------- */
function donHtml(){const p=S.pdf,k=kapsam(p,BOS),D=k.donemler,uy=k.uyari.filter(u=>!u.startsWith('Arşiv'));
 const tp=p.toplam.length>=2?(uy.some(u=>u.startsWith('PDF toplamı'))?'':'<span class="chip">✓ Satır toplamı PDF TOPLAM ile eşleşti</span>'):'<span class="chip er">PDF’te TOPLAM satırı okunamadı</span>';
 return `<div class="chips"><span class="chip">Fatura dönemi: <b>${D.fatura.join(', ')||'—'}</b></span><span class="chip">KDV dönemleri: <b>${D.kdv.join(', ')||'—'}</b></span><span class="chip">Yıl: <b>${D.yillar.join(', ')||'—'}</b></span><span class="chip">Toplam: <b>${fmtTR(k.tutar.matrah)} / ${fmtTR(k.tutar.kdv)}</b></span>${tp}</div>`+uy.map(u=>`<div class="msg er" style="margin-top:8px">${esc(u)}</div>`).join('')}
/* ---------- Adım 1: e-Karşıt PDF ---------- */
function roTablo(t,cols,L,bos){return `<div class="card"><h3>${t}</h3>`+(L.length?`<div class="tw"><table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${L.map(r=>`<tr>${cols.map(([k,,f])=>`<td>${esc(f?f(r[k]):r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="note">${bos}</p>`)+'</div>'}
function s1(){let h=`<section><h2>1. e-Karşıt tutanak PDF’i</h2>${drop('dPdf','fPdf','e-Karşıt tutanak PDF’i','.pdf,application/pdf',S.pdfAd,'Sürükleyin veya tıklayıp seçin')}</section>`;
 if(!S.pdf)return h;const p=S.pdf,ymm=[['adi','Adı ve Soyadı'],['vn','Vergi/T.C. Kimlik No'],['vd','Vergi Dairesi'],['muhur','Mühür No'],['sicil','Sicil No'],['oda','Bağlı Olduğu Oda'],['adres','Adres'],['tel','Telefon'],['sirket','YMM şirketi (VKN / Ünvan)',1]];
 const telNot=p.kf.tel?'':'<div class="msg wr" style="margin:8px 0 0">Ç) telefon numarası PDF’te boş gelir. e-Karşıt sistemine her tutanakta elle girmeniz gerekir.</div>';
 h+=`<section><div class="grid4">`+kart('Tutanak',p,[['sayi','Sayı'],['tarih','Tarih']])+kart('A) Karşıt incelemeyi yapan YMM',p.ymm,ymm)+kart('B) Tasdik hizmeti verilen mükellef',p.firma,FIRMA)+
  (p.c&&p.c.adi?kart('C) Mal/hizmet teslim edilen mükellef',p.c,FIRMA):'')+kart('Ç) Nezdinde karşıt inceleme yapılan mükellef',p.kf,FIRMA,telNot)+`</div></section>`+
  `<section>`+roTablo('Tasdik dönemi sözleşme bilgileri',[['tip','Tür',t=>t==='kdvIadesi'?'KDV iadesi':'Tasdik'],['bas','Başlangıç dönemi'],['bit','Bitiş dönemi'],['tarih','Sözleşme tarihi'],['seri','Seri-sıra no'],['sistem','Sisteme girildiği tarih']],p.contracts,'Sözleşme bilgisi okunamadı.')+
  roTablo('3- Karşıt incelemeye konu faturalar',[['tarih','Faturanın tarihi'],['seri','Serisi'],['no','Numarası'],['matrah','Tutarı (TL)'],['kdv','K.D.V. (TL)'],['dk','Defter kayıt tarihi'],['yevNo','Yevmiye no'],['odeme','Ödeme şekli']],p.inv,'Fatura okunamadı.')+
  `<div class="card"><h3>Tespit edilen dönemler</h3><div id="don">${donHtml()}</div></div></section>`;
 return h}
/* ---------- Adım 2: Arşiv ---------- */
const durum=v=>v?'<span class="chip ok">Arşivde var</span>':'<span class="chip er">Arşivde yok</span>';
const sayi=v=>v==null?'':fmtTR(v);
function arsUyumsuz(){const a=S.ars,vp=(S.pdf.kf.vn||'').trim(),va=a?(a.mukellef.vkn||'').trim():'';return !!(a&&va&&vp&&va!==vp)}
function s2(){let h=`<section><h2>2. Mevcut arşiv (.xlsx)</h2>${drop('dArs','fArs','Arşiv dosyası','.xlsx',S.arsAd,'İsteğe bağlı: arşiviniz yoksa bu adımı onaylayıp devam edebilirsiniz')}`+(S.ars?'<p style="margin:10px 0 0"><button class="btn2" id="bArsKaldir">Arşivi kaldır</button></p>':'')+'</section>';
 const a=S.ars;if(!a)return h;
 const vp=(S.pdf.kf.vn||'').trim(),va=(a.mukellef.vkn||'').trim(),e=arsivEslesme(S.pdf,a),D=e.donemler;
 h+=(arsUyumsuz()?`<div class="msg er">Arşivdeki VKN (${esc(va)}) tutanaktaki Ç) mükellef VKN’si (${esc(vp)}) ile eşleşmiyor. Bu arşivle devam edilemez; doğru arşivi seçin veya arşivi kaldırın.</div>`:(va&&va===vp?'<div class="msg ok">Arşiv, Ç) mükellefle eşleşti.</div>':'<div class="msg wr">Arşivde mükellef VKN’si okunamadı; mükellefle eşleştiği doğrulanamadı.</div>'));
 const yokYil=D.yillar.filter(y=>!a.yillar.includes(y));
 if(yokYil.length)h+=`<div class="msg wr">Arşivde ARŞİV ${yokYil.join(', ')} sayfası yok; bu yıla ait veriler sonraki adımlarda eklenecek ve arşive yeni sayfa olarak yazılacak.</div>`;
 const T=(t,cols,rows,bos)=>`<div class="card"><h3>${t}</h3>`+(rows.length?`<div class="tw"><table><thead><tr>${cols.map(c=>`<th${c[2]?' class="n"':''}>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(([k,,n])=>`<td${n?' class="n"':''}>${k==='_d'?r._d:esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="note">${bos}</p>`)+'</div>';
 h+=`<section><h2>Arşivden okunanlar</h2><p class="note" style="margin:0 0 10px">Aşağıda yalnızca bu tutanağın gerektirdiği kayıtlar gösterilir. “Arşivde yok” olanlar sonraki adımlardaki belgelerden tamamlanacaktır.</p>`+
  `<div class="card"><h3>Mükellef</h3>${dl(a.mukellef,[['unvan','Ünvan'],['vkn','Vergi/T.C. Kimlik No'],['vd','Vergi Dairesi'],['adres','Adres'],['tel','Telefon']])}<div class="chips" style="margin-top:8px"><span class="chip">Arşiv yılları: <b>${a.yillar.join(', ')}</b></span></div></div>`+
  T('1- Ortaklık bilgileri',[['ad','Adı Soyadı / Ünvanı'],['vkn','Vergi/T.C. Kimlik No'],['il','Bağlı olduğu il'],['vd','Bağlı olduğu vergi dairesi'],['pay','Pay oranı'],['aciklama','Açıklama']],e.ortak,'Arşivde ortak bilgisi yok.')+
  T('2- Yasal defterler (bu tutanak için gerekenler)',[['ad','Gerekli defter'],['_d','Durum'],['nevi','Defterin nev’i'],['bas','Başlangıç'],['bit','Bitiş'],['makam','Tasdik makamı'],['tarih','Tasdik tarihi'],['no','Tasdik/berat no']],e.defter.map(x=>({ad:x.ad,_d:durum(x.satir),...(x.satir||{})})),'Gerekli defter yok.')+
  T('4- Muhtasar çalışan sayıları',[['donem','Dönem'],['_d','Durum'],['sayi','Çalışan işçi sayısı',1],['vd','Beyannamenin verildiği vergi dairesi']],e.isci.map(x=>({donem:x.donem,_d:durum(x.satir),sayi:x.satir?x.satir.sayi:'',vd:x.satir?x.satir.vd:''})),'')+
  T('5- KDV beyan bilgileri (fatura dönemi ve önceki dönem)',[['donem','Dönem'],['_d','Durum'],['teslim','Teslim ve hizmet bedeli',1],['matrah','KDV matrahı',1],['hesap','Hesaplanan KDV',1],['indirim','İndirimler toplamı',1],['odenecek','Ödenmesi gereken',1],['devreden','Sonraki döneme devreden',1],['tahakkuk','Tahakkuk fişi no']],e.kdv.map(x=>{const r=x.satir||{};return{donem:x.donem,_d:durum(x.satir),teslim:sayi(r.teslim),matrah:sayi(r.matrah),hesap:sayi(r.hesap),indirim:sayi(r.indirim),odenecek:sayi(r.odenecek),devreden:sayi(r.devreden),tahakkuk:r.tahakkuk||''}}),'')+
  T('6- İmalatçı bilgileri',[['ad','Adı Soyadı / Ünvanı'],['vkn','Vergi/T.C. Kimlik No'],['oda','Sanayi odası'],['tarih','Belge tarihi'],['no','Belge no'],['tur','Belge türü']],e.imalatci,'Arşivde imalatçı belgesi yok.')+
  T('7- Tedarikçi bilgileri (dönem başına en yüksek 10 alım)',[['donem','Dönem'],['_d','Durum'],['n','Satır sayısı',1]],e.tedarikci.map(x=>({donem:x.donem,_d:durum(x.satirlar.length),n:x.satirlar.length})),'')+'</section>';
 return h}
/* ---------- Adım 3-4: kaynaklı adımlar (genel çizim) ---------- */
const cip=(ok,ad,iste)=>`<span class="chip ${ok?'ok':iste?'er':''}">${ad}: ${ok?'var':'yok'}</span>`;
function formK(cfg,x){const st=ST(cfg.id),v=x.kullanilan||(cfg.varsayilan?cfg.varsayilan(x.key):{});return `<div class="card" style="background:var(--bg)"><h3>${x.key} — ${x.kullanilan?'Değerleri düzenle':'Elle giriş'}</h3><div class="g">`+
 cfg.kolon.map(([k,l,t])=>`<label>${l}<input class="fi" data-kf="${k}" value="${esc(st.Taslak&&st.Taslak[k]!==undefined?st.Taslak[k]:(t==='t'?v[k]||'':(x.kullanilan?(t==='n'?fmtTR(v[k]||0):String(v[k]??0)):'')))}" placeholder="${t==='n'?'0,00':t==='i'?'0':''}"></label>`).join('')+
 `</div>${st.Err?`<div class="msg er" style="margin-top:8px">${esc(st.Err)}</div>`:''}<p class="note">${cfg.kolon.some(c=>c[2]==='n')?'Tutarları 1.234,56 biçiminde yazın; boş bırakılan tutar 0 sayılır. ':''}Kaydedince bu ${cfg.disMetin.replace(/leri$|ları$/,'')} için “Elle girilen” kaynak kullanılır.</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-ka="kaydet:${cfg.id}:${x.key}">Kaydet</button><button class="btn2" data-ka="iptal:${cfg.id}:">İptal</button></div></div>`}
function kaynakli(cfg){const st=ST(cfg.id),vp=(S.pdf.kf.vn||'').trim(),K=cfg.anahtar(),d=durumK(cfg),X=st.X;
 const bel=st.B.map((b,i)=>{let du,k;if(!b.tur){du=cfg.tanimsiz;k='er'}else if(b.hata){du='Okunamadı: '+esc(b.hata);k='er'}else if(b.vkn!==vp){du=`Ç) mükellefe ait değil (VKN ${esc(b.vkn||'?')}); kullanılmayacak`;k='er'}else if(!cfg.belgeKeys(b).some(x=>K.includes(x))){du=`Bu tutanağın ${cfg.disMetin} dışında; kullanılmayacak`;k='wr'}else{du='Kullanılacak';k='ok'}
  return `<tr><td>${esc(b.ad)}</td><td>${b.tur?cfg.turAd(b):'—'}</td><td>${b.tur?cfg.bicimAd(b):'—'}</td><td>${esc(b.vkn||'—')}</td><td>${esc(b.donem||'—')}</td><td><span class="chip ${k}">${du}</span></td><td><button class="x" data-ka="bsil:${cfg.id}:${i}" title="Kaldır">✕</button></td></tr>`}).join('');
 let h=`<section><h2>${cfg.adim}. ${cfg.ad}</h2><p class="note" style="margin:0 0 10px">${cfg.anahtarMetin}: <b>${K.join(', ')}</b> ${cfg.anahtarEk}. ${cfg.giris}</p><div class="up">`+
  drop('dB_'+cfg.id,'fB_'+cfg.id,cfg.belgeBaslik,cfg.belgeKabul||'.pdf,application/pdf',st.B.length?`${st.B.length} belge yüklendi`:'',cfg.belgeIpucu,'kb:'+cfg.id,1)+
  drop('dX_'+cfg.id,'fX_'+cfg.id,cfg.excelBaslik,'.xlsx',X?X.ad:'',cfg.excelIpucu,'kx:'+cfg.id)+'</div>'+
  (bel?`<div class="tw" style="margin-top:10px"><table><thead><tr><th>Dosya</th><th>Tür</th><th>Biçim</th><th>VKN</th><th>Dönem</th><th>Durum</th><th></th></tr></thead><tbody>${bel}</tbody></table></div>`:'')+d.uyari.map(u=>`<div class="msg wr" style="margin-top:8px">${esc(u)}</div>`).join('')+
  (X?`<div style="margin-top:10px"><div class="chips"><span class="chip ${X.ok?'ok':'er'}">Excel: ${esc(X.ad)} — ${X.ok?new Set(X.satirlar.map(z=>z.donem)).size+' dönem kullanılacak':'kullanılamıyor'}</span><button class="x" data-ka="xsil:${cfg.id}:" title="Excel’i kaldır">✕</button></div>${X.uyari.map(u=>`<div class="msg ${u.k==='er'?'er':u.k==='wr'?'wr':'in'}" style="margin-top:6px">${esc(u.t)}</div>`).join('')}</div>`:'')+'</section>';
 h+=`<section><h2>${cfg.tablo}</h2>`+d.satir.map(x=>{
  const row=z=>{const r=x.kay[z];return `<tr><td><b>${KAY[z]}</b>${x.sec===z?' ✓':''}</td>${cfg.kolon.map(([k,,t])=>`<td class="n${x.fk.includes(k)?' fark':''}">${t==='t'?esc(r[k]||'—'):t==='n'?sayi(r[k]):esc(r[k]??'')}</td>`).join('')}</tr>`};
  const kont=x.kullanilan?cfg.kontrol(x.kullanilan):[];
  const not=x.sec==='yok'?`<div class="msg er">Bu dönem için veri yok: ${x.yok?x.yok+' yükleyin':'belge yükleyin'}, Excel yükleyin veya elle girin.</div>`:x.notlar.map(n=>`<div class="msg wr">${esc(n)}</div>`).join('');
  const secim=x.av.length>1&&x.fk.length?`<p class="note" style="margin:8px 0 0">Kaynaklar arasında fark var (sarı hücreler). Kullanılacak kaynak: <select data-ksec="${cfg.id}:${x.key}">${x.av.map(z=>`<option value="${z}"${x.sec===z?' selected':''}>${KAY[z]}</option>`).join('')}</select></p>`:'';
  return `<div class="card"><h3>${x.key}</h3><div class="chips">${x.chips.map(c=>cip(c.ok,c.ad,c.iste)).join('')}${cip(!!x.kay.excel,'Excel')}${cip(!!x.kay.arsiv,'Arşiv')}${cip(!!x.kay.elle,'Elle')}</div>`+
   (x.av.length?`<div class="tw"><table class="kdvt"><thead><tr><th>Kaynak</th>${cfg.kolon.map(([,l,t])=>`<th class="n">${l}</th>`).join('')}</tr></thead><tbody>${x.av.map(row).join('')}</tbody></table></div>`:'')+not+secim+
   (x.kullanilan?`<p class="note" style="margin:6px 0 0">Excel’e yazılacak: <b>${KAY[x.sec]}</b> değerleri.</p>`:'')+kont.map(m=>`<div class="msg wr" style="margin-top:6px">${esc(m)}</div>`).join('')+(cfg.kartBilgi?cfg.kartBilgi(x).map(n=>`<div class="msg ${n.k}" style="margin-top:6px">${esc(n.t)}</div>`).join(''):'')+
   (st.Edit===x.key?formK(cfg,x):`<p style="margin:8px 0 0;display:flex;gap:8px"><button class="btn2" data-ka="duz:${cfg.id}:${x.key}">${x.kullanilan?'Değerleri düzenle':'Elle gir'}</button>${cfg.ozel&&cfg.ozel(x.key)?`<button class="btn2" data-ka="ozel:${cfg.id}:${x.key}">${cfg.ozelAd}</button>`:''}${x.kay.elle?`<button class="btn2" data-ka="elsil:${cfg.id}:${x.key}">Elle girişi sil</button>`:''}</p>`)+'</div>'}).join('')+'</section>';
 return h}
const s3=()=>kaynakli(CFG.kdv),s4=()=>kaynakli(CFG.isci),s5=()=>kaynakli(CFG.defter);
/* ---------- Adım 4-8: henüz hazır değil ---------- */
const YOK=[[6,'Satış muavini (120)','Tablo 3 (defter kayıt tarihi, yevmiye no, ödeme şekli).'],[7,'Tedarikçi','Tablo 7. 191 muavin, indirilecek KDV listesi, e-fatura XML.'],[8,'İmalatçı ve ortak (elle)','Tablo 1 ve 6; “imalatçı değildir” seçeneği.']];
const yokS=(id,ad,not)=>()=>`<section><h2>${id}. ${ad}</h2><p>Bu adım henüz hazır değil; sıradaki geliştirmelerde eklenecek.</p><p class="note">${not}</p></section>`;
/* ---------- Adım 9: kapsam ve çıktı ---------- */
function s9(){const p=S.pdf,a=S.ars,ef=efektif(),k=kapsam(p,ef);let uy=k.uyari;if(!a)uy=uy.filter(u=>!u.startsWith('Arşiv'));const h=[];
 uy.forEach(u=>h.push(`<div class="msg ${/eşleşmiyor|farklı/.test(u)?'er':'wr'}">${esc(u)}</div>`));
 if(!a)h.push('<div class="msg in">Arşiv yüklenmedi; tablolar arşivsiz değerlendirildi.</div>');
 h.push('<section><h2>9. Kapsam: hangi veriler hazır, hangileri eksik?</h2>'+(a?`<p class="note" style="margin:0 0 10px">Arşiv: ${esc(a.mukellef.unvan||'—')} · yıllar: ${a.yillar.join(', ')}</p>`:'')+
  '<div class="tabs">'+k.tablolar.map(t=>`<div class="tab ${t.durum}"><h3><span>${esc(t.ad)}</span><span class="rz">${{tamam:'Tamam',kismen:'Kısmen',eksik:'Eksik'}[t.durum]} · ${t.var}/${t.gerekli}</span></h3>`+(t.not?`<p>${esc(t.not)}</p>`:'')+(t.eksik.length?`<div class="chips">${t.eksik.slice(0,10).map(e=>`<span class="chip er">${esc(e)}</span>`).join('')}${t.eksik.length>10?`<span class="chip">+${t.eksik.length-10} daha</span>`:''}</div>`:'')+`<p>Kaynak: ${esc(t.kaynak)}</p></div>`).join('')+'</div></section>');
 const sec=secim(p,ef),dur={tamam:'Hazır',kismen:'Eksik veri var',eksik:'Eksik veri var'},bos=k.tablolar.some(t=>t.durum!=='tamam');
 h.push('<section><h2>e-Karşıt Excel dosyaları</h2><div class="tw"><table><thead><tr><th>Tablo</th><th class="n">Satır</th><th>Durum</th></tr></thead><tbody>'+k.tablolar.map(t=>`<tr><td>${esc(t.ad)}</td><td class="n">${sec[t.id].length}</td><td>${dur[t.durum]}</td></tr>`).join('')+'</tbody></table></div><p style="margin:10px 0 0"><button id="bIndir" class="btn">Excel dosyalarını indir (ZIP)</button></p>'+(bos?'<p class="note">Eksik veri olan tablolar, şablon biçiminde yalnızca mevcut satırlarla üretilir. Eksikleri tamamlamadan e-Karşıt’a yüklemeyin.</p>':'')+'</section>');
 return h.join('')}
const ADIM=[{id:1,ad:'e-Karşıt PDF',r:s1,hazir:()=>!!S.pdf&&S.pdf.inv.some(i=>donemOfTarih(i.tarih))},{id:2,ad:'Arşiv',r:s2,hazir:()=>!arsUyumsuz()},{id:3,ad:'KDV',r:s3,hazir:()=>true},{id:4,ad:'Muhtasar',r:s4,hazir:()=>true},{id:5,ad:'e-Berat ve defterler',r:s5,hazir:()=>true},
 ...YOK.map(([id,ad,not])=>({id,ad,r:yokS(id,ad,not),yok:true,hazir:()=>true})),{id:9,ad:'Kapsam ve çıktı',r:s9,hazir:()=>true}];
const acik=n=>n===1||!!S.onay[n-1];
/* ---------- çizim ---------- */
function render(){
 $('adimlar').innerHTML=ADIM.map(a=>`<button class="st${S.adim===a.id?' on':''}${S.onay[a.id]?' ok':''}" data-adim="${a.id}"${acik(a.id)?'':' disabled'}>${S.onay[a.id]?'✓ ':''}${a.id}. ${a.ad}</button>`).join('');
 const a=ADIM.find(x=>x.id===S.adim);$('govde').innerHTML=a.r();
 const son=a.id===9;
 $('alt').innerHTML=`<button class="btn2" id="bGeri"${a.id===1?' disabled':''}>← Geri</button>`+(son?'<span></span>':`<button class="btn" id="bIleri"${a.hazir()?'':' disabled'}>${a.yok?'Bu adımı atla':'Onayla ve devam et'} →</button>`)}
function git(n){S.adim=n;msg('');render();window.scrollTo(0,0)}
/* ---------- dosya yükleme ---------- */
async function pdfItems(file){const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),verbosity:0}).promise,items=[];
 for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 return items}
async function arsivOku(file){const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());return parseArsiv(wb)}
const hataMetni=e=>/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':(e.name==='InvalidPDFException'||/Invalid PDF/i.test(e.message))?'Bu dosya geçerli bir PDF gibi görünmüyor.':e.message;
/* tur: 'pdf' | 'ars' | 'kb:<adım>' (belgeler, çoklu) | 'kx:<adım>' (e-Karşıt Excel) */
async function yukle(tur,file){if(!file)return;
 const[t,id]=tur.split(':');
 if(t==='kb'){const cfg=CFG[id],st=ST(id),L=[].concat(file);msg(`${L.length} belge okunuyor…`);
  for(const f of L){try{const b=cfg.dosyaOku?await cfg.dosyaOku(f):cfg.okuyucu(await pdfItems(f));const x={ad:f.name,tur:null,...(b||{})};st.B=st.B.filter(y=>!(y.ad===x.ad&&y.donem===x.donem));st.B.push(x)}catch(e){console.error(e);st.B.push({ad:f.name,tur:null})}}
  msg('');return render()}
 if(t==='kx'){const cfg=CFG[id],st=ST(id);msg(`${esc(file.name)} okunuyor…`);
  try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());st.X={ad:file.name,...await tabloExcelOku(wb,cfg.excel,{dosya:file.name,vkn:(S.pdf.kf.vn||'').trim(),anahtarlar:cfg.anahtar()})}}
  catch(e){console.error(e);st.X={ad:file.name,ok:false,satirlar:[],uyari:[{k:'er',t:hataMetni(e)}]}}
  msg('');return render()}
 msg(`${esc(file.name)} okunuyor…`);
 try{if(t==='pdf'){const r=parseEK(await pdfItems(file));if(!r.inv.length&&!r.kf.adi)throw new Error('Bu dosyada e-Karşıt tutanak bilgileri bulunamadı. Doğru PDF’i seçtiğinizden emin olun.');S.pdf=r;S.pdfAd=file.name;S.onay={};S.st={}}
  else{const a=await arsivOku(file);if(!a.sayfalar.length)throw new Error('Dosyada “ARŞİV YYYY” adlı sayfa bulunamadı. Arşiv dosyasını seçtiğinizden emin olun.');S.ars=a;S.arsAd=file.name}
  msg('')}
 catch(e){console.error(e);msg(esc(hataMetni(e)),'er')}
 render()}
/* elle girişte okunan değerleri doğrular: sayı (n), tam sayı (i), metin (t) */
function elleOku(cfg,key){const st=ST(cfg.id),v={donem:key,kaynak:'elle'};let hata='';st.Taslak={};
 document.querySelectorAll('[data-kf]').forEach(i=>{const k=i.dataset.kf,c=cfg.kolon.find(x=>x[0]===k),t=i.value.trim();st.Taslak[k]=i.value;
  if(c[2]==='t'){v[k]=t;return}
  const n=t===''?0:parseNum(t);if(n==null||(c[2]==='i'&&(!Number.isInteger(n)||n<0)))hata=`“${c[1]}” alanı ${c[2]==='i'?'0 veya daha büyük bir tam sayı':'sayı'} olmalı: ${t}`;else v[k]=n});
 if(!hata&&cfg.dogrula)hata=cfg.dogrula(v,key)||'';
 if(hata){st.Err=hata;return null}return v}
/* ---------- olaylar (kök üzerinde) ---------- */
document.addEventListener('change',e=>{const t=e.target;if(t.id==='fPdf'||t.id==='fArs'){yukle(t.id==='fPdf'?'pdf':'ars',t.files[0]);t.value=''}
 if(t.id&&t.id.startsWith('fB_')){yukle('kb:'+t.id.slice(3),[...t.files]);t.value=''}
 if(t.id&&t.id.startsWith('fX_')){yukle('kx:'+t.id.slice(3),t.files[0]);t.value=''}
 if(t.dataset&&t.dataset.ksec){const[id,key]=t.dataset.ksec.split(':');ST(id).Sec[key]=t.value;render()}});
['dragover','dragleave','drop'].forEach(n=>document.addEventListener(n,e=>{const d=e.target.closest&&e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.toggle('on',n==='dragover');if(n==='drop')yukle(d.dataset.tur,d.dataset.tur.startsWith('kb:')?[...e.dataTransfer.files]:e.dataTransfer.files[0])}));
document.addEventListener('click',async e=>{const b=e.target;
 if(b.dataset.adim)return git(+b.dataset.adim);
 if(b.dataset.ka){const[op,id,key]=b.dataset.ka.split(':'),st=ST(id),cfg=CFG[id];
  if(op==='xsil'){st.X=null}
  else if(op==='bsil'){st.B.splice(+key,1)}
  else if(op==='duz'){st.Edit=key;st.Err='';st.Taslak=null}
  else if(op==='iptal'){st.Edit=null;st.Err='';st.Taslak=null}
  else if(op==='elsil'){delete st.El[key];delete st.Sec[key]}
  else if(op==='ozel'){st.El[key]=cfg.ozel(key);st.Sec[key]='elle'}
  else if(op==='kaydet'){const v=elleOku(cfg,key);if(v){st.El[key]=v;st.Sec[key]='elle';st.Edit=null;st.Err='';st.Taslak=null}}
  return render()}
 if(b.id==='bGeri')return git(S.adim-1);
 if(b.id==='bArsKaldir'){S.ars=null;S.arsAd='';delete S.onay[2];return render()}
 if(b.id==='bIleri'){S.onay[S.adim]=true;return git(S.adim+1)}
 if(b.id==='bIndir'){b.disabled=true;const t0=b.textContent;b.textContent='Hazırlanıyor…';
  try{const files=await excelCikti(secim(S.pdf,efektif()),{vkn:S.pdf.kf.vn,tarih:new Date()}),z=zip(files.map(f=>({name:f.ad,data:f.data}))),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([z],{type:'application/zip'}));a.download=`${(S.pdf.kf.vn||'mukellef').replace(/\D/g,'')}_e-Karsit_Excel.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
  catch(err){console.error(err);msg('Excel dosyaları üretilemedi: '+esc(err.message),'er')}
  b.disabled=false;b.textContent=t0}});
render();
window.KD_APP={S,render};
})();
