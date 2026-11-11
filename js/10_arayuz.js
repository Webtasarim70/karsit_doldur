/* Arayüz: adım adım ilerleyen akış. Her adım kullanıcı onayıyla açılır. Veriler yalnızca bellekte tutulur. */
(function(){
const {fmtTR,parseNum,donemOfTarih}=KD;
const S={adim:1,onay:{},pdf:null,ars:null,pdfAd:'',arsAd:''},$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BOS={mukellef:{},yillar:[],sayfalar:[],ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const msg=(t,k)=>$('durum').innerHTML=t?`<div class="msg ${k||'in'}">${t}</div>`:'';
/* ---------- gösterim yardımcıları (Adım 1 salt okunur) ---------- */
const dl=(o,rows)=>'<dl>'+rows.filter(r=>!r[2]||o[r[0]]).map(([k,l])=>`<dt>${l}</dt><dd>${esc(o[k])||'—'}</dd>`).join('')+'</dl>';
const kart=(t,o,rows,ek)=>`<div class="card"><h3>${t}</h3>${dl(o,rows)}${ek||''}</div>`;
const FIRMA=[['adi','Ünvan'],['vn','Vergi/T.C. Kimlik No'],['vd','Vergi Dairesi'],['adres','Adres'],['tel','Telefon']];
const drop=(id,fid,ba,acc,ad,alt)=>`<label class="drop${ad?' ok':''}" id="${id}" data-tur="${id==='dPdf'?'pdf':'ars'}"><b>${ba}</b>${alt}<input type="file" id="${fid}" accept="${acc}"><small>${esc(ad)}</small></label>`;
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
function s2(){let h=`<section><h2>2. Mevcut arşiv (.xlsx)</h2>${drop('dArs','fArs','Arşiv dosyası','.xlsx',S.arsAd,'İsteğe bağlı: arşiviniz yoksa bu adımı onaylayıp devam edebilirsiniz')}</section>`;
 const a=S.ars;if(!a)return h;
 const vp=(S.pdf.kf.vn||'').trim(),va=(a.mukellef.vkn||'').trim();
 h+=`<section><h2>Arşivden okunanlar</h2>`+(va&&vp&&va!==vp?`<div class="msg er">Arşivdeki VKN (${esc(va)}) tutanaktaki Ç) mükellef VKN’si (${esc(vp)}) ile eşleşmiyor. Doğru arşivi seçtiğinizden emin olun.</div>`:(va&&va===vp?'<div class="msg ok">Arşiv, Ç) mükellefle eşleşti.</div>':''))+
  `<div class="card"><h3>Mükellef</h3><dl>${[['Ünvan','unvan'],['VKN','vkn'],['Vergi dairesi','vd'],['Adres','adres'],['Telefon','tel']].filter(r=>a.mukellef[r[1]]).map(r=>`<dt>${r[0]}</dt><dd>${esc(a.mukellef[r[1]])}</dd>`).join('')}</dl></div>`+
  `<div class="card"><h3>İçerik</h3><div class="chips"><span class="chip">Arşiv yılları: <b>${a.yillar.join(', ')}</b></span><span class="chip">Ortak: <b>${a.ortaklar.length}</b></span><span class="chip">Defter: <b>${a.defterler.length}</b></span><span class="chip">İşçi sayısı: <b>${a.isciler.length}</b></span><span class="chip">KDV: <b>${a.kdv.length}</b></span><span class="chip">İmalatçı: <b>${a.imalatcilar.length}</b></span><span class="chip">Tedarikçi: <b>${a.tedarikciler.length}</b></span></div></div></section>`;
 return h}
/* ---------- Adım 3-8: henüz hazır değil ---------- */
const YOK=[[3,'KDV beyanname + tahakkuk','Tablo 5 (KDV). Eski ve yeni biçimli beyanname ve tahakkuk fişleri; birden çok dönem.'],[4,'Muhtasar','Tablo 4 (çalışan sayısı).'],[5,'e-Berat','Tablo 2 (e-Defter Yevmiye/Kebir). XML veya görüntüleme PDF’i.'],[6,'Satış muavini (120)','Tablo 3 (defter kayıt tarihi, yevmiye no, ödeme şekli).'],[7,'Tedarikçi','Tablo 7. 191 muavin, indirilecek KDV listesi, e-fatura XML.'],[8,'İmalatçı, ortak, defter (elle)','Tablo 1, 2 ve 6; “imalatçı değildir” seçeneği.']];
const yokS=(id,ad,not)=>()=>`<section><h2>${id}. ${ad}</h2><p>Bu adım henüz hazır değil; sıradaki geliştirmelerde eklenecek.</p><p class="note">${not}</p></section>`;
/* ---------- Adım 9: kapsam ve çıktı ---------- */
function s9(){const p=S.pdf,a=S.ars,k=kapsam(p,a||BOS);let uy=k.uyari;if(!a)uy=uy.filter(u=>!u.startsWith('Arşiv'));const h=[];
 uy.forEach(u=>h.push(`<div class="msg ${/eşleşmiyor|farklı/.test(u)?'er':'wr'}">${esc(u)}</div>`));
 if(!a)h.push('<div class="msg in">Arşiv yüklenmedi; tablolar arşivsiz değerlendirildi.</div>');
 h.push('<section><h2>9. Kapsam: hangi veriler hazır, hangileri eksik?</h2>'+(a?`<p class="note" style="margin:0 0 10px">Arşiv: ${esc(a.mukellef.unvan||'—')} · yıllar: ${a.yillar.join(', ')}</p>`:'')+
  '<div class="tabs">'+k.tablolar.map(t=>`<div class="tab ${t.durum}"><h3><span>${esc(t.ad)}</span><span class="rz">${{tamam:'Tamam',kismen:'Kısmen',eksik:'Eksik'}[t.durum]} · ${t.var}/${t.gerekli}</span></h3>`+(t.not?`<p>${esc(t.not)}</p>`:'')+(t.eksik.length?`<div class="chips">${t.eksik.slice(0,10).map(e=>`<span class="chip er">${esc(e)}</span>`).join('')}${t.eksik.length>10?`<span class="chip">+${t.eksik.length-10} daha</span>`:''}</div>`:'')+`<p>Kaynak: ${esc(t.kaynak)}</p></div>`).join('')+'</div></section>');
 const sec=secim(p,a||BOS),dur={tamam:'Hazır',kismen:'Eksik veri var',eksik:'Eksik veri var'},bos=k.tablolar.some(t=>t.durum!=='tamam');
 h.push('<section><h2>e-Karşıt Excel dosyaları</h2><div class="tw"><table><thead><tr><th>Tablo</th><th class="n">Satır</th><th>Durum</th></tr></thead><tbody>'+k.tablolar.map(t=>`<tr><td>${esc(t.ad)}</td><td class="n">${sec[t.id].length}</td><td>${dur[t.durum]}</td></tr>`).join('')+'</tbody></table></div><p style="margin:10px 0 0"><button id="bIndir" class="btn">Excel dosyalarını indir (ZIP)</button></p>'+(bos?'<p class="note">Eksik veri olan tablolar, şablon biçiminde yalnızca mevcut satırlarla üretilir. Eksikleri tamamlamadan e-Karşıt’a yüklemeyin.</p>':'')+'</section>');
 return h.join('')}
const ADIM=[{id:1,ad:'e-Karşıt PDF',r:s1,hazir:()=>!!S.pdf&&S.pdf.inv.some(i=>donemOfTarih(i.tarih))},{id:2,ad:'Arşiv',r:s2,hazir:()=>true},
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
async function arsivOku(file){const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());return parseArsiv(wb)}
async function yukle(tur,file){if(!file)return;msg(`${esc(file.name)} okunuyor…`);
 try{if(tur==='pdf'){const r=await pdfOku(file);if(!r.inv.length&&!r.kf.adi)throw new Error('Bu dosyada e-Karşıt tutanak bilgileri bulunamadı. Doğru PDF’i seçtiğinizden emin olun.');S.pdf=r;S.pdfAd=file.name;S.onay={}}
  else{const a=await arsivOku(file);if(!a.sayfalar.length)throw new Error('Dosyada “ARŞİV YYYY” adlı sayfa bulunamadı. Arşiv dosyasını seçtiğinizden emin olun.');S.ars=a;S.arsAd=file.name}
  msg('')}
 catch(e){console.error(e);msg(esc(/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':(e.name==='InvalidPDFException'||/Invalid PDF/i.test(e.message))?'Bu dosya geçerli bir PDF gibi görünmüyor.':e.message),'er')}
 render()}
/* ---------- olaylar (kök üzerinde) ---------- */
document.addEventListener('change',e=>{const t=e.target;if(t.id==='fPdf'||t.id==='fArs'){yukle(t.id==='fPdf'?'pdf':'ars',t.files[0]);t.value=''}});
['dragover','dragleave','drop'].forEach(n=>document.addEventListener(n,e=>{const d=e.target.closest&&e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.toggle('on',n==='dragover');if(n==='drop')yukle(d.dataset.tur,e.dataTransfer.files[0])}));
document.addEventListener('click',async e=>{const b=e.target;
 if(b.dataset.adim)return git(+b.dataset.adim);
 if(b.id==='bGeri')return git(S.adim-1);
 if(b.id==='bIleri'){S.onay[S.adim]=true;return git(S.adim+1)}
 if(b.id==='bIndir'){b.disabled=true;const t0=b.textContent;b.textContent='Hazırlanıyor…';
  try{const files=await excelCikti(secim(S.pdf,S.ars||BOS),{vkn:S.pdf.kf.vn,tarih:new Date()}),z=zip(files.map(f=>({name:f.ad,data:f.data}))),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([z],{type:'application/zip'}));a.download=`${(S.pdf.kf.vn||'mukellef').replace(/\D/g,'')}_e-Karsit_Excel.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
  catch(err){console.error(err);msg('Excel dosyaları üretilemedi: '+esc(err.message),'er')}
  b.disabled=false;b.textContent=t0}});
render();
})();
