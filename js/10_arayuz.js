/* Arayüz: PDF + arşiv yükleme, tutanak özeti, dönemler, faturalar, kapsam raporu. Veriler yalnızca bellekte tutulur. */
(function(){
const {fmtTR,parseNum}=KD;
const S={pdf:null,ars:null},$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BOS={mukellef:{},yillar:[],sayfalar:[],ortaklar:[],defterler:[],isciler:[],kdv:[],imalatcilar:[],tedarikciler:[]};
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const msg=(t,k)=>$('durum').innerHTML=t?`<div class="msg ${k||'in'}">${t}</div>`:'';
function mark(id,ok,ad){$(id).classList.toggle('ok',ok);$(id==='dPdf'?'sPdf':'sArs').textContent=ad||''}
async function pdfOku(file){
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),verbosity:0}).promise,items=[];
 for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent();tc.items.forEach(i=>items.push({k:-p*1000+i.transform[5],x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}))}
 return parseEK(items)}
async function arsivOku(file){const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());return parseArsiv(wb)}
async function yukle(tur,file){
 if(!file)return;msg(`${esc(file.name)} okunuyor…`);
 try{
  if(tur==='pdf'){const r=await pdfOku(file);if(!r.inv.length&&!r.kf.adi)throw new Error('Bu dosyada e-Karşıt tutanak bilgileri bulunamadı. Doğru PDF’i seçtiğinizden emin olun.');S.pdf=r;mark('dPdf',true,file.name)}
  else{const a=await arsivOku(file);if(!a.sayfalar.length)throw new Error('Dosyada “ARŞİV YYYY” adlı sayfa bulunamadı. Arşiv dosyasını seçtiğinizden emin olun.');S.ars=a;mark('dArs',true,file.name)}
  msg('');
 }catch(e){console.error(e);msg(esc(/central directory|zip/i.test(e.message)?'Bu dosya geçerli bir Excel (.xlsx) dosyası gibi görünmüyor.':(e.name==='InvalidPDFException'||/Invalid PDF/i.test(e.message))?'Bu dosya geçerli bir PDF gibi görünmüyor.':e.message),'er')}
 render()}
function bag(o,rows){return '<dl>'+rows.filter(r=>o[r[1]]).map(r=>`<dt>${r[0]}</dt><dd>${esc(o[r[1]])}</dd>`).join('')+'</dl>'}
function render(){
 const p=S.pdf;if(!p){$('sonuc').innerHTML='';return}
 const k=kapsam(p,S.ars||BOS);let uy=k.uyari;if(!S.ars)uy=uy.filter(u=>!u.startsWith('Arşiv'));
 const h=[];
 uy.forEach(u=>h.push(`<div class="msg ${/eşleşmiyor|farklı/.test(u)?'er':'wr'}">${esc(u)}</div>`));
 if(!S.ars)h.push('<div class="msg in">Arşiv yüklenmedi; tablolar arşivsiz değerlendirildi.</div>');
 const k0=p.contracts.length;
 h.push('<section><h2>2. Tutanak özeti</h2><div class="grid4">'+
  `<div class="card"><b>Tutanak</b>${bag({sayi:p.sayi,tarih:p.tarih,soz:k0?`${k0} sözleşme`:''},[['Sayı','sayi'],['Tarih','tarih'],['Sözleşme','soz']])}</div>`+
  `<div class="card"><b>A) YMM</b>${bag(p.ymm,[['Ad','adi'],['Oda','oda'],['Mühür','muhur'],['Sicil','sicil'],['Şirket','sirket']])}</div>`+
  `<div class="card"><b>B) İade talep eden</b>${bag(p.firma,[['Ünvan','adi'],['VKN','vn'],['V.D.','vd']])}</div>`+
  (p.c&&p.c.adi?`<div class="card"><b>C) Mal teslim edilen</b>${bag(p.c,[['Ünvan','adi'],['VKN','vn'],['V.D.','vd']])}</div>`:'')+
  `<div class="card"><b>Ç) İncelenen firma</b>${bag(p.kf,[['Ünvan','adi'],['VKN','vn'],['V.D.','vd'],['Adres','adres']])}</div>`+
  '</div></section>');
 const D=k.donemler;
 h.push(`<section><h2>3. Tespit edilen dönemler</h2><div class="chips"><span class="chip">Fatura dönemi: <b>${D.fatura.join(', ')||'—'}</b></span><span class="chip">KDV dönemleri: <b>${D.kdv.join(', ')||'—'}</b></span><span class="chip">Yıl: <b>${D.yillar.join(', ')||'—'}</b></span></div>`+
  `<div class="tw"><table><thead><tr><th>Fatura tarihi</th><th>Fatura no</th><th class="n">Matrah (TL)</th><th class="n">KDV (TL)</th></tr></thead><tbody>${p.inv.map(i=>`<tr><td>${esc(i.tarih)}</td><td>${esc(i.no)}</td><td class="n">${esc(i.matrah)}</td><td class="n">${esc(i.kdv)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">TOPLAM (${p.inv.length} fatura)</td><td class="n">${fmtTR(k.tutar.matrah)}</td><td class="n">${fmtTR(k.tutar.kdv)}</td></tr></tfoot></table></div>`+
  (p.toplam.length>=2?(uy.some(u=>u.startsWith('PDF toplamı'))?'':'<p class="note">✓ Satır toplamları PDF’teki TOPLAM ile eşleşti.</p>'):'<p class="note">PDF’te TOPLAM satırı okunamadı; toplam doğrulanamadı.</p>')+'</section>');
 const a=S.ars;
 h.push('<section><h2>4. Kapsam: hangi veriler hazır, hangileri eksik?</h2>'+
  (a?`<p class="note" style="margin:0 0 10px">Arşiv: ${esc(a.mukellef.unvan||'—')} · yıllar: ${a.yillar.join(', ')} · ortak ${a.ortaklar.length}, defter ${a.defterler.length}, işçi ${a.isciler.length}, KDV ${a.kdv.length}, imalatçı ${a.imalatcilar.length}, tedarikçi ${a.tedarikciler.length}</p>`:'')+
  '<div class="tabs">'+k.tablolar.map(t=>`<div class="tab ${t.durum}"><h3><span>${esc(t.ad)}</span><span class="rz">${{tamam:'Tamam',kismen:'Kısmen',eksik:'Eksik'}[t.durum]} · ${t.var}/${t.gerekli}</span></h3>`+
   (t.not?`<p>${esc(t.not)}</p>`:'')+(t.eksik.length?`<div class="chips">${t.eksik.map(e=>`<span class="chip er">${esc(e)}</span>`).join('')}</div>`:'')+`<p>Kaynak: ${esc(t.kaynak)}</p></div>`).join('')+'</div>'+
  '<p class="note">Sonraki aşamada eksikler, yükleyeceğiniz belgelerden (KDV beyanname ve tahakkuk, muhtasar, e-berat, XML) tamamlanacak.</p></section>');
 $('sonuc').innerHTML=h.join('')}
[['pdf','dPdf','fPdf'],['ars','dArs','fArs']].forEach(([t,d,f])=>{
 $(f).addEventListener('change',e=>{yukle(t,e.target.files[0]);e.target.value=''});
 ['dragover','dragleave','drop'].forEach(n=>$(d).addEventListener(n,e=>{e.preventDefault();$(d).classList.toggle('on',n==='dragover');if(n==='drop')yukle(t,e.dataTransfer.files[0])}))});
})();
