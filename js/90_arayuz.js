/* Arayüz: adım adım ilerleyen akış. Her adım kullanıcı onayıyla açılır. Veriler yalnızca bellekte tutulur. */
(function(){
const {fmtTR,parseNum,donemOfTarih,defterAnahtar,normTarih}=KD;
const S={adim:1,onay:{},pdf:null,ars:null,pdfAd:'',arsAd:'',st:{},bt:{}},$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BOS={mukellef:{},yillar:[],sayfalar:[],ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const msg=(t,k)=>$('durum').innerHTML=t?`<div class="msg ${k||'in'}">${t}</div>`:'';
/* ---------- kaynaklı adımlar (KDV, muhtasar ...): belge, Excel, elle giriş, arşiv ---------- */
const son=(a,f)=>{for(let i=a.length-1;i>=0;i--)if(f(a[i]))return a[i];return null};
const KAY={elle:'Elle girilen',belge:'Belge',excel:'Excel',arsiv:'Arşiv'},ONCELIK=['elle','belge','excel','arsiv'];
/* e-Berat yükleme tercihi: vergi türü seçilmediyse VKN'den önerilir (10 hane → kurumlar, 11 hane/TCKN → gelir). */
const btVergiOneri=()=>{const n=String((S.pdf&&S.pdf.kf&&S.pdf.kf.vn)||'').replace(/\D/g,'');return n.length===10?'kurumlar':n.length===11?'gelir':'gelir'};
const btTercih=()=>({yukleme:S.bt.yukleme||'aylik',vergi:S.bt.vergi||btVergiOneri()});
const ST=id=>S.st[id]??=(id==='ortak'||id==='imalatci'?{X:null,El:{},Ekle:[],Cikar:{},Uyg:false,Edit:null,EkleAc:false,Err:'',Taslak:null,Sayac:0}:id==='ted'?{Liste:null,M:null,Xml:[],Xl:null,El:{},Ekle:[],Cikar:{},VdMap:{},Uyg:false,Edit:null,EkleAc:null,Err:'',Taslak:null}:{B:[],X:null,El:{},Sec:{},Edit:null,Err:'',Taslak:null});
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
  kontrol(v){const m=[],c=normT(S.pdf.kf.vd),w=normT(v.vd).split(' ')[0];if(!v.vd)m.push('Vergi dairesi boş.');else if(c&&w&&!c.includes(w))m.push(`Beyannamenin vergi dairesi (${v.vd}) tutanaktaki karşıt yapılan ilgili mükellefin vergi dairesinden (${S.pdf.kf.vd}) farklı görünüyor.`);if(!v.sayi)m.push('Çalışan sayısı 0.');return m}}};
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
 kartBilgi(x){if(/^Envanter/.test(x.key))return[];const su=eberatSuresi(x.key.slice(-7),undefined,btTercih());return su?[{k:su.doldu?'wr':'in',t:`e-Berat son yükleme tarihi (${su.etiket}): ${su.son}${su.kaynak==='hesap'?' (GİB notunda bu dönem yok; kuralla hesaplandı)':''} — bugün itibarıyla ${su.doldu?'dolmuştur; berat yüklenmiş olmalı.':'dolmamıştır; “süresi dolmadı” seçeneği kullanılabilir.'} Resmî süre uzatımları ayrıca geçerli olabilir.`}]:[]},
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
  if(ek.length){const rk=cfg.rowKey||(x=>x.donem);r={...r,[cfg.arsKey]:[...r[cfg.arsKey].filter(x=>!ek.some(y=>y.donem===rk(x))),...ek]}}});
 const td=ST('ted'),D=donemler(S.pdf).fatura;
 if(td.Uyg)r={...r,uygulanamaz:{...(r.uygulanamaz||{}),tedarikci:true},tedarikciler:r.tedarikciler.filter(x=>!D.includes(x.donem))};
 else{const H=tedHesapla(),dd=D.filter(d=>H[d].mod||H[d].secili.length);if(dd.length)r={...r,tedarikciler:[...r.tedarikciler.filter(x=>!dd.includes(x.donem)),...dd.flatMap(d=>H[d].secili.map(x=>({...x.alan,donem:d})))]}}
 [LST.ortak,LST.imalatci].forEach(cfg=>{const st=ST(cfg.id);
  if(cfg.uyg&&st.Uyg){r={...r,uygulanamaz:{...(r.uygulanamaz||{}),[cfg.id]:true},[cfg.arsKey]:[]};return}
  if(st.X||st.Ekle.length||Object.keys(st.El).length||Object.keys(st.Cikar).length)r={...r,[cfg.arsKey]:listeHesapla(cfg).secili.map(x=>x.alan)}});
 return r}
/* ---------- Adım 6: satış muavini → faturaların defter kayıt tarihi, yevmiye no ve ödeme şekli ---------- */
const nrmNo=s=>String(s||'').toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9]/g,''),ODEME=['Nakit','Banka','Çek','Senet','C/H','Diğer'];
const FAT={id:'fatura',excel:'fatura',dosyaOku:async f=>muavinBelge(kdvMetin(await pdfItems(f))),excelOku:(wb,o)=>faturaExcelOku(wb,o)};
const SRC={elle:'Elle',muavin:'Muavin',excel:'Excel',pdf:'PDF',yok:'—'};
/* Alan başına kaynak önceliği: elle > muavin > yüklenen Excel > tutanak PDF'i */
function faturaDurum(){const st=ST('fatura'),B=st.B.filter(b=>b.tur==='muavin'&&!b.hata),ms=muavinEsle(S.pdf.inv,B),xm=st.X&&st.X.ok?st.X.map:{};
 const satir=S.pdf.inv.map(i=>{const key=faturaAnahtar(i),mv=ms[key]||{},ex=xm[nrmNo(i.no)],el=st.El[key];
  const al=f=>el&&el[f]?[el[f],'elle']:mv.veri&&mv.veri[f]?[String(mv.veri[f]),'muavin']:ex&&ex[f]?[ex[f],'excel']:i[f]?[i[f],'pdf']:['','yok'];
  const fark=['dk','yevNo','odeme'].filter(f=>new Set([el&&el[f],mv.veri&&mv.veri[f],ex&&ex[f],i[f]].filter(Boolean).map(String)).size>1);
  return{i,key,mv,ex,el,dk:al('dk'),yev:al('yevNo'),od:al('odeme'),fark,muavin:B.length>0}});
 return{satir,B}}
const efektifInv=()=>faturaDurum().satir.map(x=>({...x.i,dk:x.dk[0],yevNo:x.yev[0],odeme:x.od[0]}));
const efPdf=()=>S.pdf?{...S.pdf,inv:efektifInv()}:S.pdf;
function faturaForm(x){const st=ST('fatura'),T=st.Taslak,v=T||{dk:x.dk[0],yevNo:x.yev[0],odeme:x.od[0].split(',').map(t=>t.trim()).filter(Boolean)};
 return `<div class="card" style="background:var(--bg)"><h3>${esc(x.i.no)} — Düzenle</h3><div class="g"><label>Defter kayıt tarihi<input class="fi" data-kf="dk" value="${esc(v.dk)}" placeholder="gg.aa.yyyy"></label><label>Yevmiye no<input class="fi" data-kf="yevNo" value="${esc(v.yevNo)}"></label><div style="grid-column:span 2"><span style="font-size:12px;color:var(--m)">Ödeme şekli ve ödemeye ilişkin bilgiler</span><div class="chips" style="margin-top:4px">${ODEME.map(o=>`<label style="flex-direction:row;gap:4px;align-items:center;font-size:13px;color:var(--t)"><input type="checkbox" data-ko="${o}"${v.odeme.includes(o)?' checked':''} style="width:auto">${o}</label>`).join('')}</div></div></div>${st.Err?`<div class="msg er" style="margin-top:8px">${esc(st.Err)}</div>`:''}<p class="note">C/H: cari hesap (ödenmemiş kısım). Boş bıraktığınız alan için sırasıyla muavin, Excel ve tutanak PDF’indeki değer kullanılır.</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-ka="fkaydet:fatura:${esc(x.key)}">Kaydet</button><button class="btn2" data-ka="fiptal:fatura:">İptal</button></div></div>`}
function faturaElleOku(key){const st=ST('fatura'),g=k=>(document.querySelector(`[data-kf="${k}"]`)||{value:''}).value.trim(),odeme=ODEME.filter(o=>(document.querySelector(`[data-ko="${o}"]`)||{}).checked);
 st.Taslak={dk:g('dk'),yevNo:g('yevNo'),odeme};const dk=g('dk')?normTarih(g('dk')):'';
 if(dk&&!/^\d{2}\.\d{2}\.\d{4}$/.test(dk)){st.Err='Defter kayıt tarihi gg.aa.yyyy biçiminde olmalı.';return null}
 return{dk,yevNo:g('yevNo'),odeme:odeme.join(', ')}}
function s6(){const st=ST('fatura'),d=faturaDurum(),pdf=S.pdf,X=st.X;
 const ad=n=>normT(n).split(' ').slice(0,2).join(' '),adlar=[pdf.firma.adi,pdf.c&&pdf.c.adi].filter(Boolean).map(normT);
 const bel=st.B.map((b,i)=>{let du,k;if(!b.tur){du='Tanınmadı: muavin (hesap ekstresi) PDF’i değil';k='er'}else if(b.hata){du='Okunamadı: '+esc(b.hata);k='er'}else{const uy=b.hesaplar.filter(h=>!adlar.some(a=>a.includes(ad(h.ad))));du=uy.length?`Hesap adı B)/C) firmalarla eşleşmiyor görünüyor (${esc(uy[0].ad.slice(0,32))}); fatura numarasıyla eşleşen satırlar kullanılacak`:'Kullanılacak';k=uy.length?'wr':'ok'}
  return `<tr><td>${esc(b.ad)}</td><td>${b.tur&&!b.hata?b.hesaplar.map(h=>esc(h.kod+' / '+h.ad.slice(0,36))).join('<br>'):'—'}</td><td class="n">${b.satir??'—'}</td><td><span class="chip ${k}">${du}</span></td><td><button class="x" data-ka="bsil:fatura:${i}" title="Kaldır">✕</button></td></tr>`}).join('');
 let h=`<section><h2>6. Satış muavini ve fatura bilgileri</h2><p class="note" style="margin:0 0 10px">Tutanaktaki her fatura için <b>defter kayıt tarihi</b>, <b>yevmiye no</b> ve <b>ödeme şekli</b> gerekir. Muavin (120 Alıcılar) faturayı numarasıyla bulur; ödeme şekli, muavindeki tahsilatların en eski borçtan başlayarak faturalara dağıtılmasıyla önerilir (ödenmemiş kısım “C/H”). Önerileri kontrol edip gerekirse düzeltin.</p><div class="up">`+
  drop('dB_fatura','fB_fatura','Satış muavini (120 Alıcılar) PDF’i','.pdf,application/pdf',st.B.length?`${st.B.length} belge yüklendi`:'','Sürükleyin veya seçin; birden fazla dosya','kb:fatura',1)+
  drop('dX_fatura','fX_fatura','e-Karşıt faturalar Excel’i (isteğe bağlı)','.xlsx',X?X.ad:'','Daha önce hazırlanmış “MUKELLEFIN_KARSIT_INCELEMEYE_KONU_OLAN_FATURALARINA…” dosyası','kx:fatura')+'</div>'+
  (bel?`<div class="tw" style="margin-top:10px"><table><thead><tr><th>Dosya</th><th>Hesap</th><th class="n">Satır</th><th>Durum</th><th></th></tr></thead><tbody>${bel}</tbody></table></div>`:'')+
  (X?`<div style="margin-top:10px"><div class="chips"><span class="chip ${X.ok?'ok':'er'}">Excel: ${esc(X.ad)} — ${X.ok?X.satir+' fatura kullanılacak':'kullanılamıyor'}</span><button class="x" data-ka="xsil:fatura:" title="Excel’i kaldır">✕</button></div>${X.uyari.map(u=>`<div class="msg ${u.k==='er'?'er':u.k==='wr'?'wr':'in'}" style="margin-top:6px">${esc(u.t)}</div>`).join('')}</div>`:'')+'</section>';
 const tam=d.satir.filter(x=>x.dk[0]&&x.yev[0]&&x.od[0]).length;
 h+=`<section><h2>Tablo 3: Faturalar</h2><div class="chips" style="margin-bottom:8px"><span class="chip ${tam===d.satir.length?'ok':'er'}">Tamamlanan: <b>${tam}/${d.satir.length}</b></span></div><div class="tw"><table class="kdvt"><thead><tr><th>Fatura tarihi</th><th>Fatura no</th><th class="n">Tutar (KDV dahil)</th><th>Defter kayıt tarihi</th><th>Yevmiye no</th><th>Ödeme şekli</th><th>Kaynak</th><th>Notlar</th><th></th></tr></thead><tbody>`+
  d.satir.map(x=>{const mv=x.mv,nt=[];
   if(x.muavin&&mv.durum==='yok')nt.push(['er','Muavinde bulunamadı']);if(mv.durum==='coklu')nt.push(['wr','Muavinde birden fazla eşleşme']);if(mv.durum==='tutar')nt.push(['wr',`Muavin tutarı (${fmtTR(mv.borc)}) fatura tutarından farklı`]);
   if(mv.belirsiz)nt.push(['wr','Tahsilat türü açıklamadan anlaşılamadı (Diğer)']);if(x.fark.length)nt.push(['wr','Kaynaklar farklı: '+x.fark.map(f=>({dk:'kayıt tarihi',yevNo:'yevmiye no',odeme:'ödeme'}[f])).join(', ')]);
   const eks=[['dk','kayıt tarihi'],['yev','yevmiye no'],['od','ödeme şekli']].filter(([k])=>!x[k][0]).map(a=>a[1]);if(eks.length)nt.push(['er','Eksik: '+eks.join(', ')]);
   const ay=x.od[1]==='muavin'&&mv.ayrinti?mv.ayrinti.map(o=>`${o.tarih} ${o.y} ${fmtTR(o.tutar)}`).concat(mv.kalan>0.005?[`Kalan ${fmtTR(mv.kalan)} (C/H)`]:[]):[];
   const kay=[...new Set([x.dk[1],x.yev[1],x.od[1]].filter(k=>k!=='yok').map(k=>SRC[k]))].join(', ')||'—';
   return `<tr><td>${esc(x.i.tarih)}</td><td>${esc(x.i.no)}</td><td class="n">${fmtTR((parseNum(x.i.matrah)||0)+(parseNum(x.i.kdv)||0))}</td><td>${esc(x.dk[0])||'—'}</td><td>${esc(x.yev[0])||'—'}</td><td>${esc(x.od[0])||'—'}${ay.length?`<div class="note" style="margin:2px 0 0;font-size:11px">${ay.map(esc).join('<br>')}</div>`:''}</td><td>${kay}</td><td>${nt.map(n=>`<span class="chip ${n[0]}" style="display:block;margin:2px 0">${esc(n[1])}</span>`).join('')}</td><td style="white-space:nowrap"><button class="btn2" data-ka="fduz:fatura:${esc(x.key)}">Düzenle</button>${x.el?` <button class="x" data-ka="felsil:fatura:${esc(x.key)}" title="Elle girişi sil">✕</button>`:''}</td></tr>`}).join('')+'</tbody></table></div>'+
  (st.Edit?faturaForm(d.satir.find(x=>x.key===st.Edit)||d.satir[0]):'')+'</section>';
 return h}
/* ---------- Adım 7: tedarikçi (Tablo 7) ---------- */
const TKAY={elle:'Elle',xml:'XML',excel:'Excel',liste:'Liste',m191:'191',arsiv:'Arşiv',vkn:'VKN eşl.'};
function tedGirdi(){const st=ST('ted'),vp=(S.pdf.kf.vn||'').trim();
 return{liste:st.Liste&&st.Liste.ok?st.Liste.satirlar:[],m191:st.M&&st.M.ok?st.M.satirlar:[],xml:st.Xml.filter(b=>b.tur==='efatura'&&!b.hata&&(!b.aliciVkn||b.aliciVkn===vp)),excel:st.Xl&&st.Xl.ok?st.Xl.satirlar:[],arsiv:(S.ars||BOS).tedarikciler,el:st.El,ekle:st.Ekle,cikar:st.Cikar,vdMap:st.VdMap,donemler:donemler(S.pdf).fatura}}
const tedHesapla=()=>tedarikHesapla(tedGirdi());
function tedForm(donem,key,s){const st=ST('ted'),v=st.Taslak||(s?{...Object.fromEntries(TED_ALAN.map(f=>[f,s.alan[f]==null?'':(f==='matrah'||f==='kdv'?fmtTR(s.alan[f]):s.alan[f])]))}:{}),ET={ad:'Satıcı ünvanı',vkn:'Vergi/T.C. Kimlik No',vd:'Bağlı olduğu vergi dairesi',tarih:'Fatura tarihi (gg.aa.yyyy)',seri:'Fatura serisi',no:'Fatura numarası',matrah:'Matrah (TL)',kdv:'KDV (TL)',gumTarih:'Gümrük beyannamesi/serbest bölge form tarihi',gumNo:'Gümrük beyannamesi/serbest bölge tescil no'};
 return `<div class="card" style="background:var(--bg)"><h3>${donem} — ${s?esc(s.alan.no)+' düzenle':'Elle satır ekle'}</h3><div class="g">${TED_ALAN.map(f=>`<label>${ET[f]}<input class="fi" data-tf="${f}" value="${esc(v[f]??'')}"${s&&f==='no'?' readonly':''}></label>`).join('')}</div>${st.Err?`<div class="msg er" style="margin-top:8px">${esc(st.Err)}</div>`:''}<p class="note">Tutarları 1.234,56 biçiminde yazın. Vergi dairesini “ÜSKÜDAR (İSTANBUL)” biçiminde yazabilirsiniz.</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-ka="tkaydet:ted:${esc(donem)}|${esc(key||'')}">Kaydet</button><button class="btn2" data-ka="tiptal:ted:">İptal</button></div></div>`}
function tedOku(donem,key){const st=ST('ted'),v={};st.Taslak={};document.querySelectorAll('[data-tf]').forEach(i=>{st.Taslak[i.dataset.tf]=i.value;v[i.dataset.tf]=i.value.trim()});let h='';
 ['matrah','kdv'].forEach(f=>{if(v[f]===''){v[f]=null}else{const n=parseNum(v[f]);if(n==null)h=`“${f==='matrah'?'Matrah':'KDV'}” alanı sayı değil: ${v[f]}`;else v[f]=n}});
 if(!h&&v.tarih){v.tarih=normTarih(v.tarih);if(!/^\d{2}\.\d{2}\.\d{4}$/.test(v.tarih))h='Fatura tarihi gg.aa.yyyy biçiminde olmalı.'}
 if(!h&&!key){if(!v.no)h='Fatura numarası boş olamaz.';else if(!v.tarih)h='Fatura tarihi boş olamaz.';else if(donemOfTarih(v.tarih)!==donem)h=`Fatura tarihi ${donem} dönemi içinde olmalı.`;else{const r=tedHesapla()[donem];if(r&&(r.secili.some(x=>x.key===nrmNo(v.no))||r.cikarilan.some(x=>x.key===nrmNo(v.no))))h='Bu fatura numarası listede zaten var; mevcut satırı düzenleyin.'}}
 if(h){st.Err=h;return null}
 v.donem=donem;return v}
function s7(){const st=ST('ted'),vp=(S.pdf.kf.vn||'').trim(),D=donemler(S.pdf).fatura,H=tedHesapla(),m191=!!(st.M&&st.M.ok);
 const dur=(X,ad)=>X?`<div style="margin-top:8px"><div class="chips"><span class="chip ${X.ok?'ok':'er'}">${ad}: ${esc(X.ad)} — ${X.ok?(X.satirlar.length+' satır'):'kullanılamıyor'}</span></div>${X.uyari.map(u=>`<div class="msg ${u.k==='er'?'er':u.k==='wr'?'wr':'in'}" style="margin-top:6px">${esc(u.t)}</div>`).join('')}</div>`:'';
 const xml=st.Xml.map((b,i)=>{let du,k;if(!b.tur){du='Tanınmadı: e-Fatura/e-Arşiv XML’i değil';k='er'}else if(b.hata){du='Okunamadı: '+esc(b.hata);k='er'}else if(b.aliciVkn&&b.aliciVkn!==vp){du=`Alıcı VKN (${esc(b.aliciVkn)}) karşıt yapılan ilgili mükellefle eşleşmiyor; kullanılmayacak`;k='er'}else if(!D.includes(b.donem)){du='Bu tutanağın fatura dönemleri dışında; kullanılmayacak';k='wr'}else{du='Kullanılacak';k='ok'}
  return `<tr><td>${esc(b.dosya)}</td><td>${esc(b.no||'—')}</td><td>${esc(b.tarih||'—')}</td><td>${esc((b.ad||'').slice(0,26))}<br>${esc(b.vkn||'—')}</td><td class="n">${b.matrah==null?'—':fmtTR(b.matrah)}</td><td class="n">${b.kdv==null?'—':fmtTR(b.kdv)}</td><td><span class="chip ${k}">${du}</span></td><td><button class="x" data-ka="xmlsil:ted:${i}" title="Kaldır">✕</button></td></tr>`}).join('');
 let h=`<section><h2>7. Tedarikçi bilgileri</h2><p class="note" style="margin:0 0 10px">Fatura dönemlerinde (<b>${D.join(', ')}</b>) satın alınan mallar için <b>dönem başına en yüksek 10 alım</b> (matrah) gerekir. Kaynaklar: İndirilecek KDV Listesi (alım listesi, matrah ve KDV), 191 muavin (KDV doğrulaması), e-fatura XML (vergi dairesi, tek tek fatura), daha önce hazırlanmış Excel veya arşiv. Vergi dairesi listede ve muavinde yer almaz; e-fatura XML’inden veya elle girilir (aynı VKN’ye tek seferde).</p>`+
  `<label style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="chkUyg"${st.Uyg?' checked':''} style="width:auto"> Bu firma için tedarikçi tablosu uygulanamaz (tabloyu boş üret)</label>`+
  `<div class="up">`+drop('dL_ted','fL_ted','İndirilecek KDV Listesi (.xls / .xlsx)','.xls,.xlsx',st.Liste?st.Liste.ad:'','Alım listesi: tarih, no, satıcı, VKN, matrah, KDV','tl:ted')+drop('dM_ted','fM_ted','191 muavin (.xlsx / .xls)','.xlsx,.xls',st.M?st.M.ad:'','KDV doğrulaması için (isteğe bağlı)','tm:ted')+
  drop('dXm_ted','fXm_ted','e-Fatura / e-Arşiv XML’leri','.xml,text/xml',st.Xml.length?`${st.Xml.length} dosya yüklendi`:'','Vergi dairesi ve fatura ayrıntıları; birden fazla dosya','tx:ted',1)+drop('dK_ted','fK_ted','e-Karşıt tedarikçi Excel’i (isteğe bağlı)','.xlsx',st.Xl?st.Xl.ad:'','Daha önce hazırlanmış “ILGILI_DONEMDE_SATILAN_MALLARIN_TEDARIK…” dosyası','tk:ted')+'</div>'+
  dur(st.Liste,'Liste')+dur(st.M,'191 muavin')+dur(st.Xl,'Excel')+
  (xml?`<div class="tw" style="margin-top:10px"><table><thead><tr><th>Dosya</th><th>Fatura no</th><th>Tarih</th><th>Satıcı</th><th class="n">Matrah (TL)</th><th class="n">KDV (TL)</th><th>Durum</th><th></th></tr></thead><tbody>${xml}</tbody></table></div>`:'')+'</section>';
 if(st.Uyg)return h+'<section><div class="msg in">Tedarikçi tablosu “uygulanamaz” olarak işaretlendi; Excel çıktısı boş şablon olarak üretilir.</div></section>';
 const vdEks=[...new Map(D.flatMap(d=>H[d].secili).filter(x=>!x.alan.vd&&x.alan.vkn).map(x=>[x.alan.vkn,x.alan.ad||'']))];
 if(vdEks.length)h+=`<section><h2>Vergi dairesi eksik satıcılar</h2><p class="note" style="margin:0 0 8px">Aynı VKN’ye sahip tüm satırlara uygulanır. Biçim: “ÜSKÜDAR (İSTANBUL)”.</p><div class="g">${vdEks.map(([v,a])=>`<label>${esc(v)} — ${esc(a.slice(0,40))}<input class="fi" data-vd="${esc(v)}" placeholder="Vergi dairesi (İL)"></label>`).join('')}</div></section>`;
 h+=D.map(d=>{const o=H[d];
  const rows=o.secili.map(sl=>{const nt=satirNotlari(sl,m191),kay=[...new Set(Object.values(sl.kay))].map(k=>TKAY[k]).join(', ');
   return `<tr><td>${esc(sl.alan.tarih||'—')}</td><td>${esc(sl.alan.no)}</td><td>${esc((sl.alan.ad||'—').slice(0,34))}</td><td>${esc(sl.alan.vkn||'—')}</td><td>${esc(sl.alan.vd||'—')}</td><td class="n">${sl.alan.matrah==null?'—':fmtTR(sl.alan.matrah)}</td><td class="n">${sl.alan.kdv==null?'—':fmtTR(sl.alan.kdv)}</td><td>${kay}</td><td>${nt.map(n=>`<span class="chip ${n[0]}" style="display:block;margin:2px 0">${esc(n[1])}</span>`).join('')}</td><td style="white-space:nowrap"><button class="btn2" data-ka="tduz:ted:${esc(d)}|${esc(sl.key)}">Düzenle</button> <button class="x" data-ka="tcikar:ted:${esc(sl.key)}" title="Listeden çıkar">✕</button></td></tr>`}).join('');
  return `<section><h2>Tablo 7: ${d}</h2><div class="chips" style="margin-bottom:8px"><span class="chip ${o.secili.length?'ok':'er'}">Seçili alım: <b>${o.secili.length}</b></span>${o.mod?`<span class="chip">Kaynak: <b>${esc(o.mod)}</b></span>`:''}${o.toplam>10?`<span class="chip">${o.toplam} alım arasından en yüksek 10’u seçildi</span>`:''}</div>`+o.not.map(n=>`<div class="msg wr" style="margin-bottom:8px">${esc(n)}</div>`).join('')+
   (o.secili.length?`<div class="tw"><table class="kdvt"><thead><tr><th>Fatura tarihi</th><th>Fatura no</th><th>Satıcı</th><th>VKN</th><th>Vergi dairesi</th><th class="n">Matrah</th><th class="n">KDV</th><th>Kaynak</th><th>Notlar</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="msg er">Bu dönem için tedarikçi satırı yok: liste, 191 muavin, XML veya Excel yükleyin, elle ekleyin ya da tabloyu “uygulanamaz” işaretleyin.</div>')+
   (o.cikarilan.length?`<div class="chips" style="margin-top:8px"><span class="note" style="margin:0">Çıkarılanlar:</span>${o.cikarilan.map(c=>`<span class="chip">${esc(c.alan.no)} <button class="x" data-ka="tgeri:ted:${esc(c.key)}" title="Geri al" style="color:var(--a)">↺</button></span>`).join('')}</div>`:'')+
   (st.Edit&&st.Edit.startsWith(d+'|')?tedForm(d,st.Edit.split('|')[1],o.secili.find(x=>x.key===st.Edit.split('|')[1])):(st.EkleAc===d?tedForm(d,'',null):`<p style="margin:8px 0 0"><button class="btn2" data-ka="tekleac:ted:${esc(d)}">+ Elle satır ekle</button></p>`))+'</section>'}).join('');
 return h}
/* ---------- Adım 8: ortaklık (Tablo 1) ve imalatçı (Tablo 6) ---------- */
const LST={
 ortak:{id:'ortak',ad:'1- Ortaklık bilgileri',arsKey:'ortaklar',alan:['ad','vkn','il','vd','pay','aciklama'],etiket:{ad:'Adı Soyadı / Ünvanı',vkn:'Vergi/T.C. Kimlik No',il:'Bağlı olduğu il',vd:'Bağlı olduğu vergi dairesi',pay:'Pay oranı (%)',aciklama:'Açıklama (örn. görevi)'},zorunlu:['ad','vkn','il','vd','pay'],
  anahtar:r=>nrmNo(r.vkn)+'|'+nrmNo(r.ad),ipucu:'Ortak bilgileri arşivden veya daha önce hazırladığınız Excel’den alınır; yoksa elle ekleyin. Pay oranları toplamı %100 olmalıdır.',excelIpucu:'Daha önce hazırlanmış “MUKELLEFIN_ORTAKLIK_BILGILERI…” dosyası'},
 imalatci:{id:'imalatci',ad:'6- İmalatçı bilgileri',arsKey:'imalatcilar',alan:['ad','vkn','oda','tarih','no','tur','aciklama'],etiket:{ad:'Adı Soyadı / Ünvanı',vkn:'Vergi/T.C. Kimlik No',oda:'Bağlı bulunduğu sanayi odası',tarih:'Belge tarihi (gg.aa.yyyy)',no:'Belge numarası',tur:'Belge türü',aciklama:'Açıklama'},zorunlu:['ad','vkn','oda','tarih','no','tur'],uyg:true,
  anahtar:r=>nrmNo(r.vkn)+'|'+nrmNo(r.ad)+'|'+nrmNo(r.no),ipucu:'Faturadaki malın imalatçısına ait belgeler (Sanayi Sicil Belgesi, kapasite raporu vb.) arşivden, Excel’den veya elle girilir. Kapasite raporu için belge türü “Diğer”, açıklama “Kapasite raporu” yazılır. Firma imalatçı değilse “imalatçı değildir” seçeneğini işaretleyin.',excelIpucu:'Daha önce hazırlanmış “MALIN_IMALATCISI_OLAN_MUKELLEF…” dosyası'}};
const lstSt=id=>ST(id);
function listeHesapla(cfg){const st=lstSt(cfg.id),ars=S.ars||BOS,xr=st.X&&st.X.ok?st.X.satirlar:null,gor=new Set();
 const tekil=(L)=>L.slice().reverse().filter(r=>{const k=cfg.anahtar(r);if(gor.has(k))return false;gor.add(k);return true}).reverse();
 const base=xr?xr.map((r,i)=>({id:'x'+i,kay:'excel',alan:{...r}})):tekil(ars[cfg.arsKey]).map((r,i)=>({id:'a'+i,kay:'arsiv',alan:{...r}})),
  ek=st.Ekle.map(r=>({id:r.id,kay:'elle',alan:{...r}})),
  all=[...base,...ek].map(x=>({id:x.id,kay:x.kay,alan:st.El[x.id]?{...x.alan,...st.El[x.id]}:x.alan,duz:!!st.El[x.id]}));
 return{secili:all.filter(x=>!st.Cikar[x.id]),cikarilan:all.filter(x=>st.Cikar[x.id]),mod:xr?'e-Karşıt Excel':base.length?'Arşiv':''}}
function listeNot(cfg,x){const n=[],a=x.alan,eks=cfg.zorunlu.filter(k=>!a[k]).map(k=>cfg.etiket[k].split(' (')[0].toLowerCase());if(eks.length)n.push(['er','Eksik: '+eks.join(', ')]);
 if(cfg.id==='ortak'&&a.pay&&parseNum(a.pay)==null)n.push(['er','Pay oranı sayı değil']);
 if(cfg.id==='imalatci'&&a.tarih&&!/^\d{2}\.\d{2}\.\d{4}$/.test(a.tarih))n.push(['er','Belge tarihi gg.aa.yyyy biçiminde değil']);return n}
function listeForm(cfg,x){const st=lstSt(cfg.id),v=st.Taslak||(x?x.alan:{});
 return `<div class="card" style="background:var(--bg)"><h3>${cfg.ad} — ${x?'Satırı düzenle':'Elle satır ekle'}</h3><div class="g">${cfg.alan.map(f=>f==='tur'?`<label>${cfg.etiket[f]}<select class="fi" data-lf="tur"><option value=""></option>${['Sanayi Sicil Belgesi','Diğer'].map(o=>`<option${(v.tur||'')===o||(slugEq(v.tur,o))?' selected':''}>${o}</option>`).join('')}</select></label>`:`<label style="${f==='ad'||f==='aciklama'?'grid-column:span 2':''}">${cfg.etiket[f]}<input class="fi" data-lf="${f}" value="${esc(v[f]??'')}"></label>`).join('')}</div>${st.Err?`<div class="msg er" style="margin-top:8px">${esc(st.Err)}</div>`:''}<div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-ka="lkaydet:${cfg.id}:${x?esc(x.id):''}">Kaydet</button><button class="btn2" data-ka="liptal:${cfg.id}:">İptal</button></div></div>`}
const slugEq=(a,b)=>a&&nrmNo(a)===nrmNo(b);
function listeOku(cfg,id){const st=lstSt(cfg.id),v={};st.Taslak={};document.querySelectorAll('[data-lf]').forEach(i=>{st.Taslak[i.dataset.lf]=i.value;v[i.dataset.lf]=i.value.trim()});let h='';
 if(v.tarih){v.tarih=normTarih(v.tarih);if(!/^\d{2}\.\d{2}\.\d{4}$/.test(v.tarih))h='Belge tarihi gg.aa.yyyy biçiminde olmalı.'}
 if(!h&&v.pay&&parseNum(v.pay)==null)h=`Pay oranı sayı olmalı: ${v.pay}`;
 if(!h&&!v.ad&&!v.vkn)h='Ünvan veya VKN yazın.';
 if(h){st.Err=h;return null}return v}
function listeBolum(cfg){const st=lstSt(cfg.id),vp=(S.pdf.kf.vn||'').trim(),H=listeHesapla(cfg),X=st.X;
 let h=`<section><h2>${cfg.ad}</h2><p class="note" style="margin:0 0 10px">${cfg.ipucu}</p>`;
 if(cfg.uyg)h+=`<label style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="chkUyg_${cfg.id}"${st.Uyg?' checked':''} style="width:auto"> İmalatçı değildir / bu tablo uygulanamaz (tabloyu boş üret)</label>`;
 if(st.Uyg)return h+'<div class="msg in">Tablo “uygulanamaz” olarak işaretlendi; Excel çıktısı boş şablon olarak üretilir.</div></section>';
 h+='<div class="up">'+drop('dE_'+cfg.id,'fE_'+cfg.id,'e-Karşıt Excel’i (isteğe bağlı)','.xlsx',X?X.ad:'',cfg.excelIpucu,'le:'+cfg.id)+'<div></div></div>'+
  (X?`<div style="margin-top:8px"><div class="chips"><span class="chip ${X.ok?'ok':'er'}">Excel: ${esc(X.ad)} — ${X.ok?X.satirlar.length+' satır':'kullanılamıyor'}</span><button class="x" data-ka="lxsil:${cfg.id}:" title="Excel’i kaldır">✕</button></div>${X.uyari.map(u=>`<div class="msg ${u.k==='er'?'er':'wr'}" style="margin-top:6px">${esc(u.t)}</div>`).join('')}</div>`:'');
 const top=cfg.id==='ortak'?H.secili.reduce((a,x)=>a+(parseNum(x.alan.pay)||0),0):null;
 h+=`<div class="chips" style="margin:10px 0 8px"><span class="chip ${H.secili.length?'ok':'er'}">Satır: <b>${H.secili.length}</b></span>${H.mod?`<span class="chip">Kaynak: <b>${H.mod}</b></span>`:''}${top!=null&&H.secili.length?`<span class="chip ${Math.abs(top-100)<0.01?'ok':'wr'}">Pay oranları toplamı: <b>%${fmtTR(top)}</b></span>`:''}</div>`;
 if(top!=null&&H.secili.length&&Math.abs(top-100)>=0.01)h+=`<div class="msg wr" style="margin-bottom:8px">Pay oranları toplamı %100 değil (%${esc(fmtTR(top))}). Eksik ortak veya hatalı oran olabilir.</div>`;
 h+=H.secili.length?`<div class="tw"><table class="kdvt"><thead><tr>${cfg.alan.map(f=>`<th>${cfg.etiket[f].split(' (')[0]}</th>`).join('')}<th>Kaynak</th><th>Notlar</th><th></th></tr></thead><tbody>${H.secili.map(x=>`<tr>${cfg.alan.map(f=>`<td>${esc(x.alan[f]||'—')}</td>`).join('')}<td>${x.kay==='excel'?'Excel':x.kay==='elle'?'Elle':'Arşiv'}${x.duz?' (düzenlendi)':''}</td><td>${listeNot(cfg,x).map(n=>`<span class="chip ${n[0]}" style="display:block;margin:2px 0">${esc(n[1])}</span>`).join('')}</td><td style="white-space:nowrap"><button class="btn2" data-ka="lduz:${cfg.id}:${esc(x.id)}">Düzenle</button> <button class="x" data-ka="lcikar:${cfg.id}:${esc(x.id)}" title="Satırı çıkar">✕</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="msg er">${cfg.id==='ortak'?'Ortak bilgisi yok: arşiv veya Excel yükleyin ya da elle ekleyin.':'İmalatçı belgesi yok: arşiv veya Excel yükleyin, elle ekleyin veya “imalatçı değildir” seçeneğini işaretleyin.'}</div>`;
 if(H.cikarilan.length)h+=`<div class="chips" style="margin-top:8px"><span class="note" style="margin:0">Çıkarılanlar:</span>${H.cikarilan.map(c=>`<span class="chip">${esc((c.alan.ad||c.alan.vkn||'').slice(0,24))} <button class="x" data-ka="lgeri:${cfg.id}:${esc(c.id)}" title="Geri al" style="color:var(--a)">↺</button></span>`).join('')}</div>`;
 h+=st.Edit?listeForm(cfg,H.secili.find(x=>x.id===st.Edit)):(st.EkleAc?listeForm(cfg,null):`<p style="margin:8px 0 0"><button class="btn2" data-ka="lekleac:${cfg.id}:">+ Elle satır ekle</button></p>`);
 return h+'</section>'}
const s8=()=>listeBolum(LST.ortak)+listeBolum(LST.imalatci);
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
 h+=(arsUyumsuz()?`<div class="msg er">Arşivdeki VKN (${esc(va)}) tutanaktaki karşıt yapılan ilgili mükellefin VKN’si (${esc(vp)}) ile eşleşmiyor. Bu arşivle devam edilemez; doğru arşivi seçin veya arşivi kaldırın.</div>`:(va&&va===vp?'<div class="msg ok">Arşiv, karşıt yapılan ilgili mükellefle eşleşti.</div>':'<div class="msg wr">Arşivde mükellef VKN’si okunamadı; mükellefle eşleştiği doğrulanamadı.</div>'));
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
 const bel=st.B.map((b,i)=>{let du,k;if(!b.tur){du=cfg.tanimsiz;k='er'}else if(b.hata){du='Okunamadı: '+esc(b.hata);k='er'}else if(b.vkn!==vp){du=`karşıt yapılan ilgili mükellefe ait değil (VKN ${esc(b.vkn||'?')}); kullanılmayacak`;k='er'}else if(!cfg.belgeKeys(b).some(x=>K.includes(x))){du=`Bu tutanağın ${cfg.disMetin} dışında; kullanılmayacak`;k='wr'}else{du='Kullanılacak';k='ok'}
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
const s3=()=>kaynakli(CFG.kdv),s4=()=>kaynakli(CFG.isci),s5=()=>{const t=btTercih(),oto=!S.bt.vergi,sel=(ad,o,v)=>`<select data-bt="${ad}">${Object.entries(o).map(([k,l])=>`<option value="${k}"${v===k?' selected':''}>${l}</option>`).join('')}</select>`,
 p=`<div class="card" style="background:var(--bg);margin:0 0 10px"><h3>e-Berat yükleme tercihi</h3><p class="note" style="margin:0 0 8px">“Berat süresi dolmadı” kararı için son yükleme tarihi bu seçimlere göre belirlenir (GİB takvimi).</p><div class="g"><label>Yükleme tercihi${sel('yukleme',BERAT_YUKLEME,t.yukleme)}</label><label>Mükellef türü${sel('vergi',BERAT_VERGI,t.vergi)}</label></div>${oto?`<p class="note" style="margin:6px 0 0">Mükellef türü, karşıt yapılan ilgili mükellefin VKN’sinden (${S.pdf.kf.vn||'—'}) önerildi; gerekirse değiştirin.</p>`:''}</div>`;
 return kaynakli(CFG.defter).replace('<div class="up">',p+'<div class="up">')};
/* ---------- Adım 4-8: henüz hazır değil ---------- */
const YOK=[];
const yokS=(id,ad,not)=>()=>`<section><h2>${id}. ${ad}</h2><p>Bu adım henüz hazır değil; sıradaki geliştirmelerde eklenecek.</p><p class="note">${not}</p></section>`;
/* ---------- Adım 9: kapsam ve çıktı ---------- */
/* ---------- Güncellenmiş arşiv: önizleme ve indirme ---------- */
const ARS_AD={ortak:'Ortak',defter:'Defter',isci:'İşçi sayısı',kdv:'KDV',imalatci:'İmalatçı',tedarikci:'Tedarikçi'};
function arsivPlan(){const p=efPdf(),D=donemler(p),ef=efektif(),yil=[...new Set([...D.fatura,...D.kdv].map(d=>d.slice(3)).concat(D.yillar))].sort(),eski=S.ars?S.ars.sayfalar:[];
 return{ef,sayfalar:yil.map(y=>{const es=eski.find(s=>s.yil===y),m=sayfaModeli(ef,y);return{yil:y,yeniSayfa:!es,fark:fark(es?{ortak:es.ortaklar,defter:es.defterler,isci:es.isciler,kdv:es.kdv,imalatci:es.imalatcilar,tedarikci:es.tedarikciler}:null,m)}})}}
function arsivBolum(){const pl=arsivPlan(),sil=pl.sayfalar.reduce((a,s)=>a+Object.values(s.fark).reduce((b,o)=>b+o.silinen,0),0),var_=pl.sayfalar.some(s=>!s.yeniSayfa);
 let h=`<section><h2>Güncellenmiş arşiv</h2><p class="note" style="margin:0 0 10px">${S.ars?`Mevcut arşiv (<b>${esc(S.arsAd)}</b>) bu tutanağın verileriyle güncellenir. Yalnızca etkilenen yıl sayfaları yazılır, diğer sayfalara dokunulmaz.`:'Arşiv yüklenmedi: bu tutanağın verilerinden <b>yeni bir arşiv</b> oluşturulur.'} Faturalar tablosu arşive yazılmaz.</p>`;
 if(var_)h+='<div class="msg wr">Güncellenecek yıl sayfaları yeniden yazılır; sayfadaki bilinen bölümler (ortak, defter, işçi, KDV, imalatçı, tedarikçi) dışındaki içerik (ek notlar vb.) korunmaz.</div>';
 if(sil)h+=`<div class="msg er">${sil} mevcut arşiv kaydı yeni sayfada yer almıyor ve silinecek (örneğin tedarikçi seçimi değiştiği veya satır çıkarıldığı için). Aşağıdaki tabloda “Silinen” sütununu kontrol edin.</div>`;
 h+=`<div class="tw"><table><thead><tr><th>Sayfa</th><th>Bölüm</th><th class="n">Eklenen</th><th class="n">Değişen</th><th class="n">Aynı</th><th class="n">Silinen</th></tr></thead><tbody>`+pl.sayfalar.map(s=>Object.entries(s.fark).map(([k,o],i)=>`<tr><td>${i?'':`<b>ARŞİV ${s.yil}</b> <span class="chip ${s.yeniSayfa?'ok':'wr'}">${s.yeniSayfa?'yeni sayfa':'güncellenecek'}</span>`}</td><td>${ARS_AD[k]}</td><td class="n">${o.eklenen||'—'}</td><td class="n${o.degisen.length?' fark':''}">${o.degisen.length||'—'}</td><td class="n">${o.ayni||'—'}</td><td class="n${o.silinen?' fark':''}">${o.silinen||'—'}</td></tr>`).join('')).join('')+'</tbody></table></div>';
 const deg=pl.sayfalar.flatMap(s=>Object.entries(s.fark).flatMap(([k,o])=>o.degisen.map(x=>({y:s.yil,k,...x}))));
 if(deg.length)h+=`<details style="margin-top:8px"><summary>Değişen kayıtlar (${deg.length})</summary><div class="tw"><table class="kdvt"><thead><tr><th>Sayfa</th><th>Bölüm</th><th>Kayıt</th><th>Eski değer</th><th>Yeni değer</th></tr></thead><tbody>${deg.slice(0,40).map(d=>{const b=ARSIV_BOLUM.find(x=>x.k===d.k),f=b.kol.filter(([c])=>String(d.eski[c]??'')!==String(d.yeni[c]??'')&&(parseNum(d.eski[c])==null||parseNum(d.eski[c])!==parseNum(d.yeni[c])));return `<tr><td>${d.y}</td><td>${ARS_AD[d.k]}</td><td>${esc(d.yeni.donem||d.yeni.ad||d.yeni.nevi||'')}</td><td>${f.map(([c,l])=>esc(l+': '+(d.eski[c]??'—'))).join('<br>')}</td><td>${f.map(([c,l])=>esc(l+': '+(d.yeni[c]??'—'))).join('<br>')}</td></tr>`}).join('')}</tbody></table></div></details>`;
 return h+`<p style="margin:10px 0 0"><button id="bArsIndir" class="btn">${S.ars?'Güncellenmiş arşivi indir (.xlsx)':'Yeni arşivi indir (.xlsx)'}</button></p></section>`}
function s9(){const p=efPdf(),a=S.ars,ef=efektif(),k=kapsam(p,ef);let uy=k.uyari;if(!a)uy=uy.filter(u=>!u.startsWith('Arşiv'));const h=[];
 uy.forEach(u=>h.push(`<div class="msg ${/eşleşmiyor|farklı/.test(u)?'er':'wr'}">${esc(u)}</div>`));
 if(!a)h.push('<div class="msg in">Arşiv yüklenmedi; tablolar arşivsiz değerlendirildi.</div>');
 h.push('<section><h2>9. Kapsam: hangi veriler hazır, hangileri eksik?</h2>'+(a?`<p class="note" style="margin:0 0 10px">Arşiv: ${esc(a.mukellef.unvan||'—')} · yıllar: ${a.yillar.join(', ')}</p>`:'')+
  '<div class="tabs">'+k.tablolar.map(t=>`<div class="tab ${t.durum}"><h3><span>${esc(t.ad)}</span><span class="rz">${{tamam:'Tamam',kismen:'Kısmen',eksik:'Eksik'}[t.durum]} · ${t.var}/${t.gerekli}</span></h3>`+(t.not?`<p>${esc(t.not)}</p>`:'')+(t.eksik.length?`<div class="chips">${t.eksik.slice(0,10).map(e=>`<span class="chip er">${esc(e)}</span>`).join('')}${t.eksik.length>10?`<span class="chip">+${t.eksik.length-10} daha</span>`:''}</div>`:'')+`<p>Kaynak: ${esc(t.kaynak)}</p></div>`).join('')+'</div></section>');
 const sec=secim(p,ef),dur={tamam:'Hazır',kismen:'Eksik veri var',eksik:'Eksik veri var'},bos=k.tablolar.some(t=>t.durum!=='tamam');
 h.push(arsivBolum());
 h.push('<section><h2>e-Karşıt Excel dosyaları</h2><div class="tw"><table><thead><tr><th>Tablo</th><th class="n">Satır</th><th>Durum</th></tr></thead><tbody>'+k.tablolar.map(t=>`<tr><td>${esc(t.ad)}</td><td class="n">${sec[t.id].length}</td><td>${dur[t.durum]}</td></tr>`).join('')+'</tbody></table></div><p style="margin:10px 0 0"><button id="bIndir" class="btn">Excel dosyalarını indir (ZIP)</button></p>'+(bos?'<p class="note">Eksik veri olan tablolar, şablon biçiminde yalnızca mevcut satırlarla üretilir. Eksikleri tamamlamadan e-Karşıt’a yüklemeyin.</p>':'')+'</section>');
 return h.join('')}
const ADIM=[{id:1,ad:'e-Karşıt PDF',r:s1,hazir:()=>!!S.pdf&&S.pdf.inv.some(i=>donemOfTarih(i.tarih))},{id:2,ad:'Arşiv',r:s2,hazir:()=>!arsUyumsuz()},{id:3,ad:'KDV',r:s3,hazir:()=>true},{id:4,ad:'Muhtasar',r:s4,hazir:()=>true},{id:5,ad:'e-Berat ve defterler',r:s5,hazir:()=>true},{id:6,ad:'Satış muavini',r:s6,hazir:()=>true},{id:7,ad:'Tedarikçi',r:s7,hazir:()=>true},{id:8,ad:'Ortak ve imalatçı',r:s8,hazir:()=>true},
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
async function arsivOku(file){const buf=await file.arrayBuffer(),wb=new ExcelJS.Workbook();await wb.xlsx.load(buf.slice(0));S.arsBuf=buf;return parseArsiv(wb)}
const hataMetni=e=>/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':(e.name==='InvalidPDFException'||/Invalid PDF/i.test(e.message))?'Bu dosya geçerli bir PDF gibi görünmüyor.':e.message;
/* tur: 'pdf' | 'ars' | 'kb:<adım>' (belgeler, çoklu) | 'kx:<adım>' (e-Karşıt Excel) */
async function yukle(tur,file){if(!file)return;
 const[t,id]=tur.split(':');
 if(['tl','tm','tx','tk'].includes(t))return yukleTed(t,[].concat(file));
 if(t==='le'){const cfg=LST[id],st=ST(id);msg(`${esc(file.name)} okunuyor…`);
  try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());st.X={ad:file.name,...await listeExcelOku(wb,id,{dosya:file.name,vkn:(S.pdf.kf.vn||'').trim()})}}
  catch(e){console.error(e);st.X={ad:file.name,ok:false,satirlar:[],uyari:[{k:'er',t:hataMetni(e)}]}}
  msg('');return render()}
 if(t==='kb'){const cfg=id==='fatura'?FAT:CFG[id],st=ST(id),L=[].concat(file);msg(`${L.length} belge okunuyor…`);
  for(const f of L){try{const b=cfg.dosyaOku?await cfg.dosyaOku(f):cfg.okuyucu(await pdfItems(f));const x={ad:f.name,tur:null,...(b||{})};st.B=st.B.filter(y=>!(y.ad===x.ad&&y.donem===x.donem));st.B.push(x)}catch(e){console.error(e);st.B.push({ad:f.name,tur:null})}}
  msg('');return render()}
 if(t==='kx'){const cfg=id==='fatura'?FAT:CFG[id],st=ST(id);msg(`${esc(file.name)} okunuyor…`);
  try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());const vkn=(S.pdf.kf.vn||'').trim();st.X={ad:file.name,...await(cfg.excelOku?cfg.excelOku(wb,{dosya:file.name,vkn,inv:S.pdf.inv}):tabloExcelOku(wb,cfg.excel,{dosya:file.name,vkn,anahtarlar:cfg.anahtar()}))}}
  catch(e){console.error(e);st.X={ad:file.name,ok:false,satirlar:[],uyari:[{k:'er',t:hataMetni(e)}]}}
  msg('');return render()}
 msg(`${esc(file.name)} okunuyor…`);
 try{if(t==='pdf'){const r=parseEK(await pdfItems(file));if(!r.inv.length&&!r.kf.adi)throw new Error('Bu dosyada e-Karşıt tutanak bilgileri bulunamadı. Doğru PDF’i seçtiğinizden emin olun.');S.pdf=r;S.pdfAd=file.name;S.onay={};S.st={}}
  else{const a=await arsivOku(file);if(!a.sayfalar.length)throw new Error('Dosyada “ARŞİV YYYY” adlı sayfa bulunamadı. Arşiv dosyasını seçtiğinizden emin olun.');S.ars=a;S.arsAd=file.name}
  msg('')}
 catch(e){console.error(e);msg(esc(hataMetni(e)),'er')}
 render()}
/* tablo dosyası (xls: SheetJS, xlsx: ExcelJS) → satır dizisi; tarihler xls'te seri numarası, xlsx'te Date olabilir */
async function tabloSatirlari(file){const buf=await file.arrayBuffer();
 if(/\.xls$/i.test(file.name)){const wb=XLSX.read(new Uint8Array(buf),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''})}
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf);const ws=wb.worksheets[0],R=[];ws.eachRow({includeEmpty:true},(row,n)=>{const a=[];for(let c=1;c<=Math.max(ws.columnCount,12);c++){let v=row.getCell(c).value;if(v&&typeof v==='object'&&!(v instanceof Date)){v=v.richText?v.richText.map(t=>t.text).join(''):('result' in v?v.result:(v.text??''))}a.push(v==null?'':v)}R[n-1]=a});return Array.from(R,r=>r||[])}
async function yukleTed(t,L){const st=ST('ted'),vp=(S.pdf.kf.vn||'').trim();msg(`${L.length} dosya okunuyor…`);
 try{if(t==='tl'){const f=L[0];st.Liste={ad:f.name,...kdvListesiOku(await tabloSatirlari(f))}}
  else if(t==='tm'){const f=L[0];st.M={ad:f.name,...muavin191Oku(await tabloSatirlari(f))}}
  else if(t==='tx'){for(const f of L){let b=null;try{b=efaturaXml(await f.text())}catch(e){console.error(e)}const x={dosya:f.name,tur:null,...(b||{})};st.Xml=st.Xml.filter(y=>y.dosya!==x.dosya);st.Xml.push(x)}}
  else if(t==='tk'){const f=L[0],wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());st.Xl={ad:f.name,...await tedarikExcelOku(wb,{dosya:f.name,vkn:vp,donemler:donemler(S.pdf).fatura})}}}
 catch(e){console.error(e);const u=[{k:'er',t:hataMetni(e)}],x={ad:L[0].name,ok:false,satirlar:[],uyari:u};if(t==='tl')st.Liste=x;else if(t==='tm')st.M=x;else if(t==='tk')st.Xl=x}
 msg('');render()}
/* elle girişte okunan değerleri doğrular: sayı (n), tam sayı (i), metin (t) */
function elleOku(cfg,key){const st=ST(cfg.id),v={donem:key,kaynak:'elle'};let hata='';st.Taslak={};
 document.querySelectorAll('[data-kf]').forEach(i=>{const k=i.dataset.kf,c=cfg.kolon.find(x=>x[0]===k),t=i.value.trim();st.Taslak[k]=i.value;
  if(c[2]==='t'){v[k]=t;return}
  const n=t===''?0:parseNum(t);if(n==null||(c[2]==='i'&&(!Number.isInteger(n)||n<0)))hata=`“${c[1]}” alanı ${c[2]==='i'?'0 veya daha büyük bir tam sayı':'sayı'} olmalı: ${t}`;else v[k]=n});
 if(!hata&&cfg.dogrula)hata=cfg.dogrula(v,key)||'';
 if(hata){st.Err=hata;return null}return v}
/* ---------- olaylar (kök üzerinde) ---------- */
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset&&t.dataset.bt){S.bt[t.dataset.bt]=t.value;render()}if(t.id==='fPdf'||t.id==='fArs'){yukle(t.id==='fPdf'?'pdf':'ars',t.files[0]);t.value=''}
 if(t.id&&t.id.startsWith('fB_')){yukle('kb:'+t.id.slice(3),[...t.files]);t.value=''}
 {const m=/^f(L|M|Xm|K)_ted$/.exec(t.id||'');if(m){yukle({L:'tl',M:'tm',Xm:'tx',K:'tk'}[m[1]]+':ted',m[1]==='Xm'?[...t.files]:t.files[0]);t.value=''}}
 {const m=/^fE_(ortak|imalatci)$/.exec(t.id||'');if(m){yukle('le:'+m[1],t.files[0]);t.value=''}}
 if(t.id==='chkUyg_imalatci'){ST('imalatci').Uyg=t.checked;render()}
 if(t.id==='chkUyg'){ST('ted').Uyg=t.checked;render()}
 if(t.dataset&&t.dataset.vd){const v=t.value.trim(),st=ST('ted');if(v)st.VdMap[t.dataset.vd]=v;else delete st.VdMap[t.dataset.vd];render()}
 if(t.id&&t.id.startsWith('fX_')){yukle('kx:'+t.id.slice(3),t.files[0]);t.value=''}
 if(t.dataset&&t.dataset.ksec){const[id,key]=t.dataset.ksec.split(':');ST(id).Sec[key]=t.value;render()}});
['dragover','dragleave','drop'].forEach(n=>document.addEventListener(n,e=>{const d=e.target.closest&&e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.toggle('on',n==='dragover');if(n==='drop')yukle(d.dataset.tur,(d.dataset.tur.startsWith('kb:')||d.dataset.tur.startsWith('tx:'))?[...e.dataTransfer.files]:e.dataTransfer.files[0])}));
document.addEventListener('click',async e=>{const b=e.target;
 if(b.dataset.adim)return git(+b.dataset.adim);
 if(b.dataset.ka){const[op,id,key]=b.dataset.ka.split(':'),st=ST(id),cfg=CFG[id];
  if(op==='xsil'){st.X=null}
  else if(op==='bsil'){st.B.splice(+key,1)}
  else if(op==='duz'){st.Edit=key;st.Err='';st.Taslak=null}
  else if(op==='iptal'){st.Edit=null;st.Err='';st.Taslak=null}
  else if(op==='elsil'){delete st.El[key];delete st.Sec[key]}
  else if(op==='ozel'){st.El[key]=cfg.ozel(key);st.Sec[key]='elle'}
  else if(op==='lxsil'){st.X=null}
  else if(op==='lduz'){st.Edit=key;st.EkleAc=false;st.Err='';st.Taslak=null}
  else if(op==='lekleac'){st.EkleAc=true;st.Edit=null;st.Err='';st.Taslak=null}
  else if(op==='liptal'){st.Edit=null;st.EkleAc=false;st.Err='';st.Taslak=null}
  else if(op==='lcikar'){st.Cikar[key]=true}
  else if(op==='lgeri'){delete st.Cikar[key]}
  else if(op==='lkaydet'){const v=listeOku(LST[id],key);if(v){if(key)st.El[key]={...(listeHesapla(LST[id]).secili.find(x=>x.id===key)||{alan:{}}).alan,...v};else{st.Sayac++;st.Ekle.push({id:'e'+st.Sayac,...v})}st.Edit=null;st.EkleAc=false;st.Err='';st.Taslak=null}}
  else if(op==='xmlsil'){st.Xml.splice(+key,1)}
  else if(op==='tduz'){st.Edit=key;st.EkleAc=null;st.Err='';st.Taslak=null}
  else if(op==='tekleac'){st.EkleAc=key;st.Edit=null;st.Err='';st.Taslak=null}
  else if(op==='tiptal'){st.Edit=null;st.EkleAc=null;st.Err='';st.Taslak=null}
  else if(op==='tcikar'){st.Cikar[key]=true}
  else if(op==='tgeri'){delete st.Cikar[key]}
  else if(op==='tkaydet'){const[dn,k]=key.split('|'),v=tedOku(dn,k);if(v){if(k){const o={};TED_ALAN.forEach(f=>{if(f!=='no'&&v[f]!=null&&v[f]!=='')o[f]=v[f]});st.El[k]=o}else{st.Ekle.push(v);delete st.Cikar[nrmNo(v.no)]}st.Edit=null;st.EkleAc=null;st.Err='';st.Taslak=null}}
  else if(op==='fduz'){st.Edit=key;st.Err='';st.Taslak=null}
  else if(op==='fiptal'){st.Edit=null;st.Err='';st.Taslak=null}
  else if(op==='felsil'){delete st.El[key]}
  else if(op==='fkaydet'){const v=faturaElleOku(key);if(v){st.El[key]=v;st.Edit=null;st.Err='';st.Taslak=null}}
  else if(op==='kaydet'){const v=elleOku(cfg,key);if(v){st.El[key]=v;st.Sec[key]='elle';st.Edit=null;st.Err='';st.Taslak=null}}
  return render()}
 if(b.id==='bGeri')return git(S.adim-1);
 if(b.id==='bArsKaldir'){S.ars=null;S.arsAd='';S.arsBuf=null;delete S.onay[2];return render()}
 if(b.id==='bIleri'){S.onay[S.adim]=true;return git(S.adim+1)}
 if(b.id==='bArsIndir'){b.disabled=true;const t0=b.textContent;b.textContent='Hazırlanıyor…';
  try{const pl=arsivPlan(),pdf=S.pdf,r=await arsivYaz({orijinal:S.arsBuf?new Uint8Array(S.arsBuf):null,orijinalAd:S.arsAd||'',ef:pl.ef,muk:{unvan:pdf.kf.adi,vkn:pdf.kf.vn,vd:pdf.kf.vd,adres:pdf.kf.adres,tel:pdf.kf.tel},yillar:pl.sayfalar.map(s=>s.yil),eskiSayfalar:S.ars?S.ars.sayfalar:[]}),a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([r.data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=r.ad;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
  catch(err){console.error(err);msg('Arşiv üretilemedi: '+esc(err.message),'er')}
  b.disabled=false;b.textContent=t0;return}
 if(b.id==='bIndir'){b.disabled=true;const t0=b.textContent;b.textContent='Hazırlanıyor…';
  try{const files=await excelCikti(secim(efPdf(),efektif()),{vkn:S.pdf.kf.vn,tarih:new Date()}),z=zip(files.map(f=>({name:f.ad,data:f.data}))),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([z],{type:'application/zip'}));a.download=`${(S.pdf.kf.vn||'mukellef').replace(/\D/g,'')}_e-Karsit_Excel.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
  catch(err){console.error(err);msg('Excel dosyaları üretilemedi: '+esc(err.message),'er')}
  b.disabled=false;b.textContent=t0}});
render();
window.KD_APP={S,render};
})();
