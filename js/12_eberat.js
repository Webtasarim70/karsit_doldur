/* e-Berat (e-Defter beratı) okuyucusu: XML ve "e-Belge Görüntüleme" PDF'i.
   parseEberatPdfText ve yardımcıları ekarsit projesinden (js/06_tutanak_and_workflow.js) alınmıştır.
   XML okuyucu ve alt kısım bu repoya özgüdür (DOM gerektirmez). */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
function eberatClean(v){ return String(v||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim(); }
function eberatDateText(v){
  const x=eberatClean(v).replace(/[.\-]/g,'/');
  const m=x.match(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})/);
  return m ? `${m[1]} / ${m[2]} / ${m[3]}` : '';
}
function eberatDocType(raw){
  const x=String(raw||'').toLocaleLowerCase('tr-TR').trim();
  if(x.includes('journal') || x.includes('yevmiye')) return 'Yevmiye Defteri';
  if(x.includes('ledger') || x.includes('general') || x.includes('kebir') || x.includes('büyük defter')) return 'Büyük Defter';
  return '';
}
function eberatNormalizeRecord(r){
  const start=r.baslangicDonemi||'';
  const end=r.bitisDonemi||start;
  let docType=eberatDocType(r.dokumanTipi||'');
  if(!docType){
    const u=String(r.tekilNo||'').toUpperCase();
    if(u.startsWith('YEV')) docType='Yevmiye Defteri';
    else if(u.startsWith('KEB')) docType='Büyük Defter';
  }
  return {
    vkn:eberatClean(r.vkn),
    unvan:eberatClean(r.unvan),
    dokumanTipi:docType,
    donem:eberatClean(r.donem),
    baslangicDonemi:start,
    bitisDonemi:end,
    olusturmaTarihi:eberatClean(r.olusturmaTarihi),
    tekilNo:eberatClean(r.tekilNo),
    ettn:eberatClean(r.ettn),
    aciklama:eberatClean(r.aciklama),
    kaynak:r.kaynak||'',
    kaynakDosya:r.kaynakDosya||''
  };
}
function parseEberatPdfText(text){
  const clean=String(text||'').replace(/\u00a0/g,' ');
  const lines=clean.split(/\r?\n/).map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
  const pick=(re)=>{const m=clean.match(re);return m?m[1].replace(/\s+/g,' ').trim():'';};
  const dateRe=/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})/;

  // PDF iki sütunlu olduğundan aynı satırdaki sağ sütun metni sol sütunun
  // değerine karışabilir. Alanları mümkün olduğunca etiketin bulunduğu
  // satırdan, ilgili sağ sütun etiketini keserek okuyoruz.
  let vkn='', unvan='';
  const mi=lines.findIndex(x=>/MÜKELLEF BİLGİLERİ/i.test(x));
  if(mi>=0){
    const section=lines.slice(mi+1, Math.min(lines.length,mi+30));
    const vi=section.findIndex(x=>/\bVKN\s*:/i.test(x));
    if(vi>=0) vkn=(section[vi].match(/\bVKN\s*:\s*([0-9]{10,11})/i)||[])[1]||'';
    const ui=section.findIndex((x,j)=>j>vi && /\bUNVAN\s*:/i.test(x));
    if(ui>=0){
      let first=(section[ui].match(/\bUNVAN\s*:\s*(.*?)(?=\s+(?:UNVAN|TELEFON|FAX|E-POSTA)\s*:|$)/i)||[])[1]||'';
      const parts=[]; if(first) parts.push(first);
      for(let j=ui+1;j<section.length;j++){
        const z=section[j];
        if(/^(TELEFON|FAX|E-POSTA)\s*:/i.test(z) || /^DOKÜMAN BİLGİLERİ/i.test(z) || /^VKN\s*:/i.test(z)) break;
        // Sağ sütundaki sonraki UNVAN alanını mükellef unvanına katma.
        if(/^UNVAN\s*:/i.test(z)) break;
        if(z && !/^(OLUŞTURAN|DÖNEMİ|OLUŞTURMA|TARİHİ)\b/i.test(z)) parts.push(z);
      }
      unvan=parts.join(' ').replace(/\s+/g,' ').trim();
    }
  }
  if(!vkn) vkn=pick(/\bVKN\s*:\s*([0-9]{10,11})/i);
  if(!unvan){
    const um=clean.match(/MÜKELLEF BİLGİLERİ[\s\S]{0,900}?\bUNVAN\s*:\s*(.*?)(?=\s+UNVAN\s*:|\s+(?:TELEFON|FAX|E-POSTA)\s*:|\s+DOKÜMAN BİLGİLERİ|$)/i);
    if(um) unvan=um[1].replace(/\s+/g,' ').trim();
  }

  // Belge türü yalnızca iki standart değer olabilir.
  let rawDoc='';
  const di=lines.findIndex(x=>/^DOKÜMAN\s*TİPİ\s*:/i.test(x));
  if(di>=0) rawDoc=(lines[di].match(/^DOKÜMAN\s*TİPİ\s*:\s*(.*?)(?=\s+OLUŞTURAN\s*:|$)/i)||[])[1]||'';
  if(!rawDoc) rawDoc=pick(/DOKÜMAN\s*TİPİ\s*:\s*(.*?)(?=\s+OLUŞTURAN\s*:|\n|$)/i);
  const tekil=pick(/TEKİL\s*NO\s*:\s*([^\n]+)/i).split(/\s+(?:KAYNAK|OLUŞTURMA|ETTN)\s*:/i)[0].trim();
  const dokumanTipi=eberatDocType(rawDoc) || (String(tekil).toUpperCase().startsWith('YEV')?'Yevmiye Defteri':String(tekil).toUpperCase().startsWith('KEB')?'Büyük Defter':'');

  // DÖNEMİ satırı esas alınır; HESAP DÖNEMİ hiçbir şekilde kullanılmaz.
  let dm=null;
  const periodRe=/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})\s*-\s*(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})/;
  const pi=lines.findIndex(x=>/^DÖNEMİ\s*:/i.test(x));
  if(pi>=0) dm=lines[pi].match(periodRe);
  if(!dm) dm=clean.match(/DÖNEMİ\s*:\s*([\s\S]{0,120}?)/i)?.[1]?.match(periodRe)||null;
  const donem=dm ? `${dm[1]} / ${dm[2]} / ${dm[3]} - ${dm[4]} / ${dm[5]} / ${dm[6]}` : '';
  const baslangicDonemi=dm ? `${dm[2]}.${dm[3]}` : '';
  const bitisDonemi=dm ? `${dm[5]}.${dm[6]}` : '';

  // OLUŞTURMA TARİHİ, PDF'de bazen "OLUŞTURMA" ve "TARİHİ" olarak
  // iki ayrı satıra bölünür. Etiketten sonraki birkaç satırda ilk tarihi ara.
  let olusturmaTarihi='';
  const oi=lines.findIndex(x=>/\bOLUŞTURMA\b/i.test(x) && !/OLUŞTURAN/i.test(x));
  if(oi>=0){
    for(let j=oi;j<Math.min(lines.length,oi+5);j++){
      if(/\bHESAP\s*$/i.test(lines[j])) break;
      const m=lines[j].match(dateRe);
      if(m){olusturmaTarihi=eberatDateText(m[0]);break;}
    }
  }
  if(!olusturmaTarihi){
    const om=clean.match(/OLUŞTURMA(?:\s+TARİHİ)?\s*:?\s*(?:\n\s*)?(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})/i);
    if(om) olusturmaTarihi=eberatDateText(om[1]);
  }

  const ettn=pick(/ETTN\s*:\s*([0-9a-f]{8}-[0-9a-f-]{27,})/i);

  // Açıklama çok satırlı olabilir. "DEFTER : ... BOYUTU" sağ sütununu
  // açıklamaya katmamak için DEFTER etiketinde kesiyoruz.
  let aciklama='';
  const ai=lines.findIndex(x=>/^AÇIKLAMA\s*:/i.test(x));
  if(ai>=0){
    const first=(lines[ai].match(/^AÇIKLAMA\s*:\s*(.*)$/i)||[])[1]||'';
    const parts=[];
    if(first) parts.push(first.split(/\s+DEFTER\s*:/i)[0].trim());
    for(let j=ai+1;j<Math.min(lines.length,ai+6);j++){
      const z=lines[j];
      if(/^(YEVMİYE|HESAP|VERGİ DETAYI|İLGİLİ|DEFTER|BERAT'A)\b/i.test(z)) break;
      if(/^AÇIKLAMA\s*:/i.test(z)) break;
      if(z) parts.push(z);
    }
    aciklama=parts.join(' ').replace(/\s+/g,' ').trim();
  }
  if(!aciklama){
    const am=clean.match(/AÇIKLAMA\s*:\s*([\s\S]*?)(?=\s+(?:DEFTER\s*:|YEVMİYE\s+MADDESİ|VERGİ DETAYI|BERAT'A\s+KONU)|$)/i);
    if(am) aciklama=am[1].replace(/\s+/g,' ').trim();
  }
  return eberatNormalizeRecord({vkn,unvan,dokumanTipi,donem,baslangicDonemi,bitisDonemi,olusturmaTarihi,tekilNo:tekil,ettn,aciklama,kaynak:'PDF',kaynakDosya:''});
}

/* ---------- bu repoya özgü bölüm ---------- */
const UUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const SD_NOTU='Mükellef e-Defter uygulamasına dahil olup ilgili döneme ilişkin e-Defter ve berat dosyasının oluşturulma ve imzalanması ile aynı sürede Gelir İdaresi Başkanlığı Bilgi İşlem Sistemine yüklenmesi için ilgili mevzuatta belirlenen süre iş bu yazı tarihi itibarıyla dolmadığından, GİB sistemine yüklenmemiştir.”';
const iso2tr=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');return m?`${m[3]}.${m[2]}.${m[1]}`:''},iso2d=s=>{const m=/^(\d{4})-(\d{2})-/.exec(s||'');return m?`${m[2]}.${m[1]}`:''};
/* XML berat → belge (berat değilse null) */
function eberatXml(text){if(!/<(?:[\w-]+:)?berat\b/i.test(text)||!/periodCoveredStart/i.test(text))return null;
 const all=n=>[...text.matchAll(new RegExp('<(?:[\\w-]+:)?'+n+'\\b[^>]*>([^<]*)<','gi'))].map(m=>m[1].trim()),one=n=>all(n)[0]||'';
 const ids=all('uniqueID'),tip=eberatDocType(one('entriesType'))||(/^YEV/i.test(ids.find(x=>/^(YEV|KEB)/i.test(x))||'')?'Yevmiye Defteri':/^KEB/i.test(ids.find(x=>/^(YEV|KEB)/i.test(x))||'')?'Büyük Defter':'');
 return eberatBelge({vkn:one('identifier'),dokumanTipi:tip,baslangic:iso2d(one('periodCoveredStart')),bitis:iso2d(one('periodCoveredEnd')),olusturma:iso2tr(one('creationDate')),tekilNo:ids.find(x=>/^(YEV|KEB)/i.test(x))||'',ettn:ids.find(x=>UUID.test(x))||'',aciklama:one('entriesComment')},'XML')}
/* PDF görüntüleme metni → belge (e-Berat değilse null) */
function eberatPdf(metin){if(!/E-DEFTER\s+BERATI/i.test(metin))return null;const r=parseEberatPdfText(metin);
 return eberatBelge({vkn:r.vkn,unvan:r.unvan,dokumanTipi:r.dokumanTipi,baslangic:r.baslangicDonemi,bitis:r.bitisDonemi,olusturma:K.normTarih(String(r.olusturmaTarihi||'').replace(/\s/g,'')),tekilNo:r.tekilNo,ettn:r.ettn,aciklama:r.aciklama},'PDF')}
function eberatBelge(r,bicim){const b={tur:'eberat',bicim,...r,donem:r.baslangic&&r.bitis?(r.baslangic===r.bitis?r.baslangic:r.baslangic+'–'+r.bitis):''};
 if(!b.dokumanTipi)b.hata='Defter türü (Yevmiye/Kebir) okunamadı.';
 else if(!b.baslangic||!b.bitis)b.hata='Berat dönemi okunamadı.';
 else if(b.baslangic!==b.bitis)b.hata=`Beratın dönemi tek ay değil (${b.donem}); e-Karşıt için aylık berat gerekir.`;
 return b}
const eberatAnahtar=b=>b.hata?null:`${b.dokumanTipi==='Yevmiye Defteri'?'Yevmiye':'Kebir'} ${b.baslangic}`;
const eberatSatir=b=>({nevi:b.dokumanTipi==='Yevmiye Defteri'?'e-Defter Yevmiye Defteri':'e-Defter Defteri Kebir',bas:b.baslangic,bit:b.bitis,makam:'GİB',tarih:b.olusturma,no:b.tekilNo,aciklama:b.ettn||'',tur:''});
/* Temel kural (ekarsit ile aynı): ilgili ayı izleyen ikinci ayın son günü. Resmî süre uzatımları ayrıca geçerli olabilir. */
function eberatSuresi(donem,bugun){const m=/^(\d{2})\.(\d{4})$/.exec(donem||'');if(!m)return null;const d=new Date(+m[2],+m[1]+2,0,23,59,59,999);
 return{son:K.normTarih(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')),doldu:(bugun||new Date())>d}}
const api={eberatXml,eberatPdf,eberatAnahtar,eberatSatir,eberatSuresi,SD_NOTU,UUID_RE:UUID};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
