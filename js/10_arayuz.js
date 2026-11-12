/* Arayüz: adım adım ilerleyen akış. Her adım kullanıcı onayıyla açılır. Veriler yalnızca bellekte tutulur. */
(function(){
const {fmtTR,parseNum,donemOfTarih}=KD;
const S={adim:1,onay:{},pdf:null,ars:null,pdfAd:'',arsAd:'',kdvB:[],kdvSec:{},kdvX:null,kdvEl:{},kdvEdit:null,kdvErr:'',kdvTaslak:null},$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BOS={mukellef:{},yillar:[],sayfalar:[],ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const msg=(t,k)=>$('durum').innerHTML=t?`<div class="msg ${k||'in'}">${t}</div>`:'';
/* ---------- belgelerden gelen verilerle birleştirilmiş (efektif) arşiv ---------- */
const son=(a,f)=>{for(let i=a.length-1;i>=0;i--)if(f(a[i]))return a[i];return null};
const KOLON5=[['teslim','Teslim ve hizmet bedeli'],['ozel','Özel matrah dahil olmayan bedel'],['matrah','KDV matrahı'],['hesap','Hesaplanan KDV'],['ilave','İlave edilecek KDV'],['toplam','Toplam KDV'],['indirim','İndirimler toplamı'],['odenecek','Ödenmesi gereken KDV'],['devreden','Sonraki döneme devreden'],['tahakkuk','Tahakkuk fişi no']];
const KAY={elle:'Elle girilen',belge:'Belge',excel:'Excel',arsiv:'Arşiv'},ONCELIK=['elle','belge','excel','arsiv'];
function kdvKontrol(v){const m=[],t=(v.hesap||0)+(v.ilave||0);if(Math.abs(t-(v.toplam||0))>0.01)m.push(`Toplam KDV (${fmtTR(v.toplam||0)}) ile hesaplanan + ilave KDV (${fmtTR(t)}) uyuşmuyor.`);if(!v.tahakkuk)m.push('Tahakkuk fişi no boş; e-Karşıt’ta bu alan gerekir.');return m}
/* Her gerekli KDV dönemi için kaynaklar: elle > belge > yüklenen Excel > arşiv. Varsayılan en öncelikli kaynak; farklıysa kullanıcı seçer. */
function kdvDurum(){const vp=(S.pdf.kf.vn||'').trim(),D=donemler(S.pdf).kdv,ars=S.ars||BOS,xr=S.kdvX&&S.kdvX.ok?S.kdvX.satirlar:[];
 const gecerli=S.kdvB.filter(b=>b.tur&&b.vkn===vp&&D.includes(b.donem)),R=kdvSatirlari(gecerli);
 const satir=D.map(d=>{const b=R.satir.find(x=>x.donem===d),tk=gecerli.some(x=>x.donem===d&&x.tur==='tahakkuk'),bey=gecerli.some(x=>x.donem===d&&x.tur==='beyanname');
  const kay={elle:S.kdvEl[d]||null,belge:b&&b.veri||null,excel:son(xr,x=>x.donem===d),arsiv:son(ars.kdv,x=>x.donem===d)},av=ONCELIK.filter(k=>kay[k]);
  const fk=KOLON5.map(x=>x[0]).filter(k=>{const v=av.map(z=>kay[z][k]);return k==='tahakkuk'?new Set(v.filter(Boolean)).size>1:Math.max(...v.map(x=>x||0))-Math.min(...v.map(x=>x||0))>0.005});
  const sec=av.includes(S.kdvSec[d])?S.kdvSec[d]:(av[0]||'yok');
  return{donem:d,bey,tk,kay,av,fk,sec,kullanilan:kay[sec]||null}});
 return{satir,uyari:R.uyari}}
function efektif(){const a=S.ars||BOS;if(!S.pdf)return a;const ek=kdvDurum().satir.filter(x=>x.sec!=='arsiv'&&x.kullanilan).map(x=>({...x.kullanilan,donem:x.donem}));
 return ek.length?{...a,kdv:[...a.kdv.filter(x=>!ek.some(y=>y.donem===x.donem)),...ek]}:a}
/* ---------- gösterim yardımcıları (Adım 1 salt okunur) ---------- */
const dl=(o,rows)=>'<dl>'+rows.filter(r=>!r[2]||o[r[0]]).map(([k,l])=>`<dt>${l}</dt><dd>${esc(o[k])||'—'}</dd>`).join('')+'</dl>';
const kart=(t,o,rows,ek)=>`<div class="card"><h3>${t}</h3>${dl(o,rows)}${ek||''}</div>`;
const FIRMA=[['adi','Ünvan'],['vn','Vergi/T.C. Kimlik No'],['vd','Vergi Dairesi'],['adres','Adres'],['tel','Telefon']];
const TUR={dPdf:'pdf',dArs:'ars',dKdv:'kdv',dKdvX:'kdvx'};
const drop=(id,fid,ba,acc,ad,alt)=>`<label class="drop${ad?' ok':''}" id="${id}" data-tur="${TUR[id]}"><b>${ba}</b>${alt}<input type="file" id="${fid}" accept="${acc}"${id==='dKdv'?' multiple':''}><small>${esc(ad)}</small></label>`;
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
/* ---------- Adım 3: KDV beyanname + tahakkuk ---------- */
const cip=(ok,ad,iste)=>`<span class="chip ${ok?'ok':iste?'er':''}">${ad}: ${ok?'var':'yok'}</span>`;
function kdvForm(x){const v=x.kullanilan||{};return `<div class="card" style="background:var(--bg)"><h3>${x.donem} — ${x.kullanilan?'Değerleri düzenle':'Elle giriş'}</h3><div class="g">`+
 KOLON5.map(([k,l])=>`<label>${l}<input class="fi" data-kdvf="${k}" value="${esc(S.kdvTaslak&&S.kdvTaslak[k]!==undefined?S.kdvTaslak[k]:(k==='tahakkuk'?v[k]||'':(x.kullanilan?fmtTR(v[k]||0):'')))}" placeholder="${k==='tahakkuk'?'ör. 2026082201Gen0000015':'0,00'}"></label>`).join('')+
 `</div>${S.kdvErr?`<div class="msg er" style="margin-top:8px">${esc(S.kdvErr)}</div>`:''}<p class="note">Tutarları 1.234,56 biçiminde yazın; boş bırakılan tutar 0 sayılır. Kaydedince bu dönem için “Elle girilen” kaynak kullanılır.</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-kdvkaydet="${x.donem}">Kaydet</button><button class="btn2" data-kdviptal="1">İptal</button></div></div>`}
function s3(){const vp=(S.pdf.kf.vn||'').trim(),D=donemler(S.pdf).kdv,d=kdvDurum();
 const bel=S.kdvB.map((b,i)=>{let du,k;if(!b.tur){du='Tanınmadı: KDV beyannamesi veya tahakkuk fişi değil';k='er'}else if(b.vkn!==vp){du=`Ç) mükellefe ait değil (VKN ${esc(b.vkn||'?')}); kullanılmayacak`;k='er'}else if(!D.includes(b.donem)){du='Bu tutanağın KDV dönemleri dışında; kullanılmayacak';k='wr'}else{du='Kullanılacak';k='ok'}
  return `<tr><td>${esc(b.ad)}</td><td>${b.tur==='beyanname'?'Beyanname':b.tur==='tahakkuk'?'Tahakkuk fişi':'—'}</td><td>${b.bicim==='eski'?'Eski':b.bicim==='yeni'?'Yeni':'—'}</td><td>${esc(b.vkn||'—')}</td><td>${esc(b.donem||'—')}</td><td><span class="chip ${k}">${du}</span></td><td><button class="x" data-kdvsil="${i}" title="Kaldır">✕</button></td></tr>`}).join('');
 const X=S.kdvX;
 let h=`<section><h2>3. KDV bilgileri</h2><p class="note" style="margin:0 0 10px">Gerekli dönemler: <b>${D.join(', ')}</b> (fatura dönemi ve bir önceki dönem). Veriyi belgeden, daha önce hazırladığınız KDV Excel’inden veya elle girerek verebilirsiniz. Arşivde olan dönemler için ek veri vermek zorunlu değildir.</p><div class="up">`+
  drop('dKdv','fKdv','KDV beyannamesi ve tahakkuk fişi (PDF)','.pdf,application/pdf',S.kdvB.length?`${S.kdvB.length} belge yüklendi`:'','Sürükleyin veya seçin; birden fazla dosya (eski ve yeni biçim)')+
  drop('dKdvX','fKdvX','e-Karşıt KDV Excel’i (isteğe bağlı)','.xlsx',X?X.ad:'','Daha önce hazırlanmış “ÖNCEKİ DÖNEM VE İLGİLİ DÖNEM KDV…” dosyası')+'</div>'+
  (bel?`<div class="tw" style="margin-top:10px"><table><thead><tr><th>Dosya</th><th>Tür</th><th>Biçim</th><th>VKN</th><th>Dönem</th><th>Durum</th><th></th></tr></thead><tbody>${bel}</tbody></table></div>`:'')+d.uyari.map(u=>`<div class="msg wr" style="margin-top:8px">${esc(u)}</div>`).join('')+
  (X?`<div style="margin-top:10px"><div class="chips"><span class="chip ${X.ok?'ok':'er'}">Excel: ${esc(X.ad)} — ${X.ok?new Set(X.satirlar.map(z=>z.donem)).size+' dönem kullanılacak':'kullanılamıyor'}</span><button class="x" data-kdvxsil="1" title="Excel’i kaldır">✕</button></div>${X.uyari.map(u=>`<div class="msg ${u.k==='er'?'er':u.k==='wr'?'wr':'in'}" style="margin-top:6px">${esc(u.t)}</div>`).join('')}</div>`:'')+'</section>';
 h+='<section><h2>Tablo 5: Dönem bazında KDV bilgileri</h2>'+d.satir.map(x=>{
  const row=(z)=>{const r=x.kay[z];return `<tr><td><b>${KAY[z]}</b>${x.sec===z?' ✓':''}</td>${KOLON5.map(([k])=>`<td class="n${x.fk.includes(k)?' fark':''}">${k==='tahakkuk'?esc(r[k]||'—'):sayi(r[k])}</td>`).join('')}</tr>`};
  const kont=x.kullanilan?kdvKontrol(x.kullanilan):[];
  const not=x.sec==='yok'?`<div class="msg er">Bu dönem için veri yok: ${x.tk&&!x.bey?'beyanname':'beyanname ve tahakkuk fişi'} yükleyin, Excel yükleyin veya elle girin.</div>`:
   (x.kay.belge&&!x.tk?'<div class="msg wr">Tahakkuk fişi yüklenmedi; belgedeki tahakkuk no boş.</div>':'')+(x.tk&&!x.bey&&!x.kay.belge?'<div class="msg wr">Yalnızca tahakkuk fişi yüklendi; beyanname olmadan değerler okunamaz.</div>':'');
  const secim=x.av.length>1&&x.fk.length?`<p class="note" style="margin:8px 0 0">Kaynaklar arasında fark var (sarı hücreler). Kullanılacak kaynak: <select data-kdvsec="${x.donem}">${x.av.map(z=>`<option value="${z}"${x.sec===z?' selected':''}>${KAY[z]}</option>`).join('')}</select></p>`:'';
  return `<div class="card"><h3>${x.donem}</h3><div class="chips">${cip(x.bey,'Beyanname',1)}${cip(x.tk,'Tahakkuk fişi',1)}${cip(!!x.kay.excel,'Excel')}${cip(!!x.kay.arsiv,'Arşiv')}${cip(!!x.kay.elle,'Elle')}</div>`+
   (x.av.length?`<div class="tw"><table class="kdvt"><thead><tr><th>Kaynak</th>${KOLON5.map(([,l])=>`<th class="n">${l}</th>`).join('')}</tr></thead><tbody>${x.av.map(row).join('')}</tbody></table></div>`:'')+not+secim+
   (x.kullanilan?`<p class="note" style="margin:6px 0 0">Excel’e yazılacak: <b>${KAY[x.sec]}</b> değerleri.</p>`:'')+kont.map(m=>`<div class="msg wr" style="margin-top:6px">${esc(m)}</div>`).join('')+
   (S.kdvEdit===x.donem?kdvForm(x):`<p style="margin:8px 0 0;display:flex;gap:8px"><button class="btn2" data-kdvduz="${x.donem}">${x.kullanilan?'Değerleri düzenle':'Elle gir'}</button>${x.kay.elle?`<button class="btn2" data-kdvelsil="${x.donem}">Elle girişi sil</button>`:''}</p>`)+'</div>'}).join('')+'</section>';
 return h}
/* ---------- Adım 4-8: henüz hazır değil ---------- */
const YOK=[[4,'Muhtasar','Tablo 4 (çalışan sayısı).'],[5,'e-Berat','Tablo 2 (e-Defter Yevmiye/Kebir). XML veya görüntüleme PDF’i.'],[6,'Satış muavini (120)','Tablo 3 (defter kayıt tarihi, yevmiye no, ödeme şekli).'],[7,'Tedarikçi','Tablo 7. 191 muavin, indirilecek KDV listesi, e-fatura XML.'],[8,'İmalatçı, ortak, defter (elle)','Tablo 1, 2 ve 6; “imalatçı değildir” seçeneği.']];
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
const ADIM=[{id:1,ad:'e-Karşıt PDF',r:s1,hazir:()=>!!S.pdf&&S.pdf.inv.some(i=>donemOfTarih(i.tarih))},{id:2,ad:'Arşiv',r:s2,hazir:()=>!arsUyumsuz()},{id:3,ad:'KDV beyanname + tahakkuk',r:s3,hazir:()=>true},
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
async function pdfOku(file){const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),verbosity:0}).promise,items=[];
 for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 return parseEK(items)}
async function kdvOku(file){const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),verbosity:0}).promise,items=[];
 for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 const b=kdvBelge(kdvMetin(items));return{ad:file.name,tur:null,...(b||{})}}
async function arsivOku(file){const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());return parseArsiv(wb)}
async function yukle(tur,file){if(!file)return;
 if(tur==='kdv'){const L=[].concat(file);msg(`${L.length} belge okunuyor…`);
  for(const f of L){try{const b=await kdvOku(f);S.kdvB=S.kdvB.filter(x=>!(x.ad===b.ad&&x.donem===b.donem));S.kdvB.push(b)}catch(e){console.error(e);S.kdvB.push({ad:f.name,tur:null})}}
  msg('');return render()}
 if(tur==='kdvx'){msg(`${esc(file.name)} okunuyor…`);
  try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());const r=await kdvExcelOku(wb,{dosya:file.name,vkn:(S.pdf.kf.vn||'').trim(),donemler:donemler(S.pdf).kdv});S.kdvX={ad:file.name,...r};msg('')}
  catch(e){console.error(e);S.kdvX={ad:file.name,ok:false,satirlar:[],uyari:[{k:'er',t:/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':e.message}]};msg('')}
  return render()}
 msg(`${esc(file.name)} okunuyor…`);
 try{if(tur==='pdf'){const r=await pdfOku(file);if(!r.inv.length&&!r.kf.adi)throw new Error('Bu dosyada e-Karşıt tutanak bilgileri bulunamadı. Doğru PDF’i seçtiğinizden emin olun.');S.pdf=r;S.pdfAd=file.name;S.onay={};S.kdvB=[];S.kdvSec={};S.kdvX=null;S.kdvEl={};S.kdvEdit=null;S.kdvErr='';S.kdvTaslak=null}
  else{const a=await arsivOku(file);if(!a.sayfalar.length)throw new Error('Dosyada “ARŞİV YYYY” adlı sayfa bulunamadı. Arşiv dosyasını seçtiğinizden emin olun.');S.ars=a;S.arsAd=file.name}
  msg('')}
 catch(e){console.error(e);msg(esc(/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':(e.name==='InvalidPDFException'||/Invalid PDF/i.test(e.message))?'Bu dosya geçerli bir PDF gibi görünmüyor.':e.message),'er')}
 render()}
/* ---------- olaylar (kök üzerinde) ---------- */
document.addEventListener('change',e=>{const t=e.target;if(t.id==='fPdf'||t.id==='fArs'){yukle(t.id==='fPdf'?'pdf':'ars',t.files[0]);t.value=''}
 if(t.id==='fKdv'){yukle('kdv',[...t.files]);t.value=''}
 if(t.id==='fKdvX'){yukle('kdvx',t.files[0]);t.value=''}
 if(t.dataset&&t.dataset.kdvsec){S.kdvSec[t.dataset.kdvsec]=t.value;render()}});
['dragover','dragleave','drop'].forEach(n=>document.addEventListener(n,e=>{const d=e.target.closest&&e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.toggle('on',n==='dragover');if(n==='drop')yukle(d.dataset.tur,d.dataset.tur==='kdv'?[...e.dataTransfer.files]:e.dataTransfer.files[0])}));
document.addEventListener('click',async e=>{const b=e.target;
 if(b.dataset.adim)return git(+b.dataset.adim);

 if(b.dataset.kdvxsil){S.kdvX=null;return render()}
 if(b.dataset.kdvduz){S.kdvEdit=b.dataset.kdvduz;S.kdvErr='';S.kdvTaslak=null;return render()}
 if(b.dataset.kdviptal){S.kdvEdit=null;S.kdvErr='';S.kdvTaslak=null;return render()}
 if(b.dataset.kdvelsil){delete S.kdvEl[b.dataset.kdvelsil];delete S.kdvSec[b.dataset.kdvelsil];return render()}
 if(b.dataset.kdvkaydet){const d=b.dataset.kdvkaydet,v={donem:d,kaynak:'elle'};let hata='';S.kdvTaslak={};
  document.querySelectorAll('[data-kdvf]').forEach(i=>{const k=i.dataset.kdvf;S.kdvTaslak[k]=i.value;if(k==='tahakkuk')v[k]=i.value.trim();else{const t=i.value.trim(),n=t===''?0:parseNum(t);if(n==null)hata=`“${KOLON5.find(x=>x[0]===k)[1]}” alanı sayı değil: ${t}`;else v[k]=n}});
  if(hata){S.kdvErr=hata;return render()}
  S.kdvEl[d]=v;S.kdvSec[d]='elle';S.kdvEdit=null;S.kdvErr='';S.kdvTaslak=null;return render()}
 if(b.dataset.kdvsil!=null){S.kdvB.splice(+b.dataset.kdvsil,1);return render()}
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
