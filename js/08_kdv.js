/* KDV beyannamesi ve tahakkuk fişi okuyucu.
   parseKdvBeyannamePdf / parseKdvTahakkukPdfText: ekarsit projesinden (js/02_pdf_parsers.js) alınmıştır; eski (1015 A) ve yeni
   (Dijital VD) beyanname biçimlerini ve eski/yeni tahakkuk fişlerini okur. Alt kısım bu repoya özgü sarmalayıcıdır. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
function parseKdvBeyannamePdf(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const flat = raw.replace(/[ \t]+/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = raw.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const result = {
    vkn:'', unvan:'', vergiDairesi:'', donem:'',
    teslimBedel:'', ozelMatrah:'', kdvMatrahi:'', hesaplananKdv:'',
    ilaveKdv:'', toplamKdv:'', indirimler:'', odenecekKdv:'',
    devredenKdv:'', tahakkukNo:''
  };

  const money = String.raw`(?:-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:,\d{2})?)`;
  const clean = v => String(v || '').replace(/\s+/g,' ').trim();
  const firstMoney = line => {
    const hits = String(line || '').match(new RegExp('(' + money + ')','g')) || [];
    return hits[0] || '';
  };
  const lastMoney = line => {
    const hits = String(line || '').match(new RegExp('(' + money + ')','g')) || [];
    return hits[hits.length-1] || '';
  };
  const isOldFormat = /Matrah\s+Toplamı/i.test(flat) || /Vergi\s+Kimlik\s+Numarası/i.test(flat);

  const moneyNearLine = (labelRegex, maxLines=5) => {
    const re = new RegExp(labelRegex, 'i');
    const idx = lines.findIndex(l => re.test(l));
    if (idx < 0) return '';
    for (let j=idx; j<Math.min(lines.length,idx+maxLines); j++) {
      const hit=firstMoney(lines[j]);
      if(hit) return hit;
    }
    return '';
  };
  const moneyAfter = (label, window=220) => {
    const re = new RegExp(label + `.{0,${window}}?(` + money + `)`, 'i');
    const hit=flat.match(re);
    return hit ? hit[1].trim() : '';
  };
  const moneyBeforeLine = (labelRegex, maxLines=8) => {
    const re=new RegExp(labelRegex,'i');
    const idx=lines.findIndex(l=>re.test(l));
    if(idx<0) return '';
    for(let j=idx-1;j>=Math.max(0,idx-maxLines);j--){
      const hit=lastMoney(lines[j]);
      if(hit) return hit;
    }
    return '';
  };
  const moneyOnOrAfterExactLabel = (labelRegex, stopRegexes=[], maxLines=12) => {
    const re=new RegExp(labelRegex,'i');
    const idx=lines.findIndex(l=>re.test(l));
    if(idx<0) return '';
    const same=firstMoney(lines[idx]);
    if(same) return same;
    for(let j=idx+1;j<Math.min(lines.length,idx+1+maxLines);j++){
      if(stopRegexes.some(rx=>new RegExp(rx,'i').test(lines[j]))) break;
      const hit=firstMoney(lines[j]);
      if(hit) return hit;
    }
    return '';
  };
  const moneyForTotalLabel = (labelRegex, nextSectionRegexes=[], maxLines=16) => {
    const re=new RegExp(labelRegex,'i');
    const idx=lines.findIndex(l=>re.test(l));
    if(idx<0) return '';
    const same=lastMoney(lines[idx]);
    if(same) return same;
    for(let j=idx+1;j<Math.min(lines.length,idx+1+maxLines);j++){
      if(nextSectionRegexes.some(rx=>new RegExp(rx,'i').test(lines[j]))) break;
      const hit=firstMoney(lines[j]);
      if(hit) return hit;
    }
    return '';
  };

  // ---------------- Mükellef bilgileri ----------------
  // Eski formda etiket, VKN'den sonra geldiği için "etiketten sonraki sayı"
  // yöntemi yanlışlıkla beyannameyi düzenleyenin TC/VKN'sini seçebilir.
  // Formun başındaki ilk 10/11 haneli kimlik numarası mükellefin VKN'sidir.
  const vknCandidates = [...flat.matchAll(/\b(\d{10,11})\b/g)].map(m=>m[1]);
  if(vknCandidates.length) result.vkn=vknCandidates[0];
  if(!result.vkn){
    const m = flat.match(/Vergi\s+Kimlik\s+(?:No|Numarası)\s*:?\s*(\d{8,11})/i);
    if(m) result.vkn=m[1];
  }

  m=flat.match(/Adı\s+Soyadı\/Ünvanı\s+(.+?)\s+E-Posta\s+Adresi/i);
  if(m) result.unvan=clean(m[1]);
  if(!result.unvan){
    const u1=lines.find(x=>/Soyadı\s*\(Unvanı\)/i.test(x));
    const u2=lines.find(x=>/Adı\s*\(Unvanın Devamı\)/i.test(x));
    result.unvan=clean([
      u1 ? u1.replace(/^.*?Soyadı\s*\(Unvanı\)\s*/i,'') : '',
      u2 ? u2.replace(/^.*?Adı\s*\(Unvanın Devamı\)\s*/i,'') : ''
    ].filter(Boolean).join(' '));
  }

  // ---------------- Dönem ----------------
  const aylar={'Ocak':'01','Şubat':'02','Mart':'03','Nisan':'04','Mayıs':'05','Haziran':'06','Temmuz':'07','Ağustos':'08','Eylül':'09','Ekim':'10','Kasım':'11','Aralık':'12'};
  const ayKey=x=>Object.keys(aylar).find(k=>k.toLocaleLowerCase('tr-TR')===String(x||'').toLocaleLowerCase('tr-TR'))||'';

  // ÖNEMLİ: Eski beyannamede dönem, Onay Zamanı'ndan değil açıkça yazan Yıl + Ay bilgisinden alınır.
  // Örn. "Yıl 2023 / Ay Ocak" => 01.2023; "Ay Şubat" => 02.2023.
  let yil='';
  const yMatch=flat.match(/\bYıl\s*:??\s*(20\d{2})/i);
  if(yMatch) yil=yMatch[1];
  let ay='';
  const aMatch=flat.match(/\bAy(?:lık)?\s*:?\s*((?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))\b/i);
  if(aMatch) ay=aMatch[1];
  const ak=ayKey(ay);
  if(yil && ak) result.donem=`${aylar[ak]}.${yil}`;

  if(!result.donem){
    // Satır tabanlı fallback; yine yalnızca Ay alanını kullanır.
    const yi=lines.findIndex(l=>/\bYıl\b/i.test(l));
    if(yi>=0){
      for(let j=yi;j<Math.min(lines.length,yi+4);j++){
        const ym=lines[j].match(/\b(20\d{2})\b/); if(ym){yil=ym[1];break;}
      }
    }
    const ai=lines.findIndex(l=>/^.*\bAy(?:lık)?\b.*$/i.test(l));
    if(ai>=0){
      for(let j=ai;j<Math.min(lines.length,ai+5);j++){
        // Eski PDF'de "Ay" ve "Ocak/Şubat/..." ayrı metin satırları olabilir.
        const am=lines[j].match(/\bAy(?:lık)?\s*:?\s*((?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))\b/i);
        if(am){ay=am[1];break;}
        const standalone=lines[j].match(/^(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)$/i);
        if(standalone){ay=standalone[1];break;}
      }
    }
    const k=ayKey(ay); if(yil&&k) result.donem=`${aylar[k]}.${yil}`;
  }

  // ---------------- KDV alanları ----------------
  result.teslimBedel = moneyNearLine(String.raw`^Teslim\s+ve\s+Hizmetlerin\s+Karşılığını\s+Teşkil\s+Eden\s+Bedel\s+\(aylık\)`,4)
    || moneyNearLine(String.raw`^Teslim\s+ve\s+Hizmetlerin\b`,4)
    || moneyAfter(String.raw`Teslim\s+ve\s+Hizmetlerin`,220);

  if(isOldFormat){
    // ESKİ KDV BEYANNAMESİ
    // PDF.js bazı eski beyanname PDF'lerinde hücreleri ters sırada verir:
    // "33.454,94 Toplam Katma Değer Vergisi" gibi. Bu nedenle eski formatta
    // artık "etiketin altında ilk rakam" veya toplu blok sırası kullanılmaz.
    // Her değer kendi etiketine bağlanır; aynı satırdaki rakam önceliklidir,
    // ardından yalnızca hemen komşu satırlar kontrol edilir.
    // Eski beyannamelerde PDF.js metin sırası güvenilir değildir:
    // bazı PDF'lerde aynı satır "33.454,94 Toplam Katma Değer Vergisi",
    // bazılarında "Toplam Katma Değer Vergisi 33.454,94" olarak gelir.
    // Bu nedenle eski formatta artık etiketin satır başında olmasını
    // şart koşmuyoruz. Önce koordinatlarla oluşturulmuş mantıksal satırı
    // buluyor, sonra o satırdaki tutarı etiketten bağımsız olarak alıyoruz.
    const moneyOnSameLogicalLine = (labelRegex, opts={}) => {
      const re = new RegExp(labelRegex,'i');
      const idx = lines.findIndex(l => re.test(l));
      if(idx < 0) return '';

      // Aynı mantıksal satırda birden fazla para varsa, kullanıcıya ait
      // beyannamenin bu özet satırlarında genellikle tek tutar bulunur.
      const hits = String(lines[idx] || '').match(new RegExp('(' + money + ')','g')) || [];
      if(hits.length) return hits[hits.length-1];

      // PDF.js satır kırılması nedeniyle etiket ve tutar ayrı satıra düşerse
      // yalnızca çok yakın komşu satırlara bak. Geniş arama yapmıyoruz; böylece
      // başka bir KDV satırının tutarını yanlışlıkla alma riski azalıyor.
      const max = opts.maxLines || 1;
      for(let d=1; d<=max; d++){
        const next = lines[idx+d];
        if(next){
          const n = String(next).match(new RegExp('(' + money + ')','g')) || [];
          if(n.length) return n[0];
        }
        const prev = lines[idx-d];
        if(prev){
          const n = String(prev).match(new RegExp('(' + money + ')','g')) || [];
          if(n.length) return n[n.length-1];
        }
      }
      return '';
    };

    // Eski PDF'de bazı etiketler ve tutarlar PDF.js tarafından farklı
    // metin parçalarına ayrılabildiğinden, yalnızca aynı JS satırına güvenmiyoruz.
    // Etiketin hem SONRASINDA hem ÖNCESİNDE bulunan en yakın tutarı da kontrol ediyoruz.
    const moneyAroundLabel = (labelRegex, maxChars=180) => {
      const lr = String(labelRegex);
      const forward = new RegExp(lr + `\\s*` + `.{0,${maxChars}}?` + `(` + money + `)`, 'i').exec(flat);
      const backward = new RegExp(`(` + money + `)` + `.{0,${maxChars}}?` + lr, 'i').exec(flat);
      if (forward && backward) {
        // Etikete daha yakın olan eşleşmeyi tercih et.
        const fi = forward.index + forward[0].indexOf(forward[1]);
        const bi = backward.index + backward[0].indexOf(backward[1]);
        const liF = forward.index + forward[0].indexOf(forward[0].match(new RegExp(lr,'i'))[0]);
        const liB = backward.index + backward[0].indexOf(backward[0].match(new RegExp(lr,'i'))[0]);
        return Math.abs(fi-liF) <= Math.abs(bi-liB) ? forward[1] : backward[1];
      }
      return (forward && forward[1]) || (backward && backward[1]) || '';
    };

    // Eski beyannamede KDV MATRAHI, doğrudan "Matrah Toplamı" satırındaki
    // tutardır. PDF.js metni ters sırada verse dahi etiketi ve tutarı aynı
    // mantıksal satırdan / doğrudan komşu metin parçasından eşleştiriyoruz.
    const matrahToplamiDirect = new RegExp(
      String.raw`Matrah\s+Toplamı\s*(` + money + `)`, 'i'
    ).exec(flat);
    const matrahToplamiReverse = new RegExp(
      String.raw`(` + money + `)\s*Matrah\s+Toplamı`, 'i'
    ).exec(flat);
    result.kdvMatrahi = (matrahToplamiDirect && matrahToplamiDirect[1])
      || (matrahToplamiReverse && matrahToplamiReverse[1])
      || moneyOnSameLogicalLine(String.raw`Matrah\s+Toplamı\b`, {maxLines:2})
      || moneyAroundLabel(String.raw`Matrah\s+Toplamı\b`);

    // Eski formda bu üç alan birbirine çok yakındır. Her biri artık kendi
    // başlığıyla eşleştiriliyor; böylece değerlerin PDF.js tarafından ters
    // sırada dönmesi sonucu alanlar birbirine kaymıyor.
    result.hesaplananKdv = moneyOnSameLogicalLine(String.raw`Hesaplanan\s+Katma\s+Değer\s+Vergisi\b`, {maxLines:1});
    result.ilaveKdv = moneyOnSameLogicalLine(String.raw`Daha\s+Önce\s+İndirim\s+Konusu\s+Yapılan\s+KDV(?:’|')?nin\s+İlavesi\b`, {maxLines:2})
      || moneyOnSameLogicalLine(String.raw`Daha\s+Önce\s+İndirim\s+Konusu`, {maxLines:2})
      || moneyAroundLabel(String.raw`Daha\s+Önce\s+İndirim\s+Konusu\s+Yapılan\s+KDV(?:’|')?nin\s+İlavesi\b`);
    result.toplamKdv = moneyOnSameLogicalLine(String.raw`Toplam\s+Katma\s+Değer\s+Vergisi\b`, {maxLines:2})
      || moneyAroundLabel(String.raw`Toplam\s+Katma\s+Değer\s+Vergisi\b`);

    // İndirimler Toplamı: aynı satırdaki 975.079,98 alınır. Böylece
    // "Önceki Dönemden Devreden İndirilecek KDV" tutarı (9.972,17)
    // kesinlikle bu alana taşınmaz.
    result.indirimler = moneyOnSameLogicalLine(String.raw`İndirimler\s+Toplamı`, {maxLines:2})
      || moneyAroundLabel(String.raw`İndirimler\s+Toplamı`);

    // Sonuç bölümü de etiket bazında okunur. Böylece aradaki iade/tecil
    // tutarları yanlışlıkla Ödenecek veya Devreden KDV alanına girmez.
    result.odenecekKdv = moneyOnSameLogicalLine(String.raw`Ödenmesi\s+Gereken\s+Katma\s+Değer\s+Vergisi\b`, {maxLines:2})
      || moneyAroundLabel(String.raw`Ödenmesi\s+Gereken\s+Katma\s+Değer\s+Vergisi\b`);
    result.devredenKdv = moneyOnSameLogicalLine(String.raw`Sonraki\s+Döneme\s+Devreden\s+Katma\s+Değer\s+Vergisi\b`, {maxLines:2})
      || moneyAroundLabel(String.raw`Sonraki\s+Döneme\s+Devreden\s+Katma\s+Değer\s+Vergisi\b`);

    // Özel Matrah alanı, aylık teslim/hizmet bedeli DEĞİLDİR.
    // Eski beyannamede "Özel Matrah Şekline Tabi İşlemlerde Matraha Dahil
    // Olmayan Bedel" satırı doğrudan alınır. Örnekte değer 0,00'dır.
    result.ozelMatrah = moneyOnSameLogicalLine(
      String.raw`Özel\s+Matrah\s+Şekline\s+Tabi\s+İşlemlerde\s+Matraha\s+Dahil\s+Olmayan\s+Bedel`, {maxLines:2}
    ) || moneyAroundLabel(
      String.raw`Özel\s+Matrah\s+Şekline\s+Tabi\s+İşlemlerde\s+Matraha\s+Dahil\s+Olmayan\s+Bedel`
    ) || '0,00';
  }else{
    result.kdvMatrahi = moneyNearLine(String.raw`^Toplam\s+Matrah\b`,4) || moneyAfter(String.raw`Toplam\s+Matrah`,140);
    result.hesaplananKdv = moneyNearLine(String.raw`^Hesaplanan\s+KDV\b`,4) || moneyAfter(String.raw`Hesaplanan\s+KDV`,140);
    result.ilaveKdv = moneyNearLine(String.raw`^Daha\s+Önce\s+İndirim\s+Konusu`,5) || moneyAfter(String.raw`Daha\s+Önce\s+İndirim\s+Konusu`,180);
    result.toplamKdv = moneyNearLine(String.raw`^Toplam\s+KDV\b`,4) || moneyAfter(String.raw`Toplam\s+KDV`,140);
    result.indirimler = moneyNearLine(String.raw`^İndirimler\s+Toplamı\b`,4) || moneyAfter(String.raw`İndirimler\s+Toplamı`,140);
    result.odenecekKdv = moneyNearLine(String.raw`^Ödenmesi\s+Gereken\s+KDV\b`,4) || moneyAfter(String.raw`Ödenmesi\s+Gereken\s+KDV`,160);
    result.devredenKdv = moneyNearLine(String.raw`^Sonraki\s+Döneme\s+Devreden\b`,4) || moneyAfter(String.raw`Sonraki\s+Döneme\s+Devreden`,180);
    result.ozelMatrah = '';
  }

  result.tahakkukNo='';
  Object.keys(result).forEach(k=>result[k]=clean(result[k]));
  return result;
}
function parseKdvTahakkukPdfText(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const flat = raw.replace(/[ \t]+/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = raw.split('\n').map(x => x.replace(/\s+/g,' ').trim()).filter(Boolean);
  const result = { vkn:'', unvan:'', donem:'', tahakkukNo:'' };

  // Tahakkuk fişlerindeki uzun belge numarası; yeni ve eski formatlarda
  // rakam + harf kodu + rakam yapısındadır. Örn:
  // 2025112201Gen0000013 / 2026082401OY90000082
  const noMatches = flat.match(/\b\d{10}[A-Za-z]{2,4}\d{7,9}\b/g) || [];
  if(noMatches.length) result.tahakkukNo = noMatches[0];

  // VKN: iki formatta da açık etiket mevcut.
  let m = flat.match(/VERGİ\s+KİMLİK(?:\s+NUMARASI|\s+NO)?\s*:?\s*(\d{8,11})/i);
  if(m) result.vkn = m[1];
  if(!result.vkn){
    const idx = lines.findIndex(l => /VERGİ\s+KİMLİK/i.test(l));
    if(idx >= 0){
      for(let j=idx;j<Math.min(lines.length,idx+3);j++){
        const vm=lines[j].match(/\b(\d{8,11})\b/);
        if(vm){result.vkn=vm[1];break;}
      }
    }
  }

  // Vergilendirme dönemi iki tahakkuk formatında da farklı dizilebilir:
  // eski: "Vergilendirme Dönemi" başlığının altında 10/2025-10/2025
  // yeni: "VERGİLENDİRME 2026/07 - 2026/07 DÖNEMİ"
  // Bu nedenle etikete bitişik olmasını şart koşmadan dönem çiftini arıyoruz.
  m = flat.match(/\b(0?[1-9]|1[0-2])\s*[\/.]\s*(20\d{2})\s*[-–]\s*\1\s*[\/.]\s*20\d{2}\b/);
  if(m){
    result.donem = `${String(m[1]).padStart(2,'0')}.${m[2]}`;
  }
  if(!result.donem){
    m = flat.match(/\b(20\d{2})\s*[\/.]\s*(0?[1-9]|1[0-2])\s*[-–]\s*20\d{2}\s*[\/.]\s*\2\b/);
    if(m) result.donem = `${String(m[2]).padStart(2,'0')}.${m[1]}`;
  }
  if(!result.donem){
    // Etiket satırları PDF.js tarafından bölünürse yalnızca vergilendirme
    // dönemi bölümünün yakınındaki ilk geçerli ay/yıl çiftini kullan.
    const di=lines.findIndex(l=>/VERGİLENDİRME\s+DÖNEMİ|Vergilendirme\s+Dönemi/i.test(l));
    if(di>=0){
      for(let j=di;j<Math.min(lines.length,di+5);j++){
        let dm=lines[j].match(/\b(0?[1-9]|1[0-2])\s*[\/.]\s*(20\d{2})\s*[-–]\s*\1\b/);
        if(dm){ result.donem=`${String(dm[1]).padStart(2,'0')}.${dm[2]}`; break; }
        dm=lines[j].match(/\b(20\d{2})\s*[\/.]\s*(0?[1-9]|1[0-2])\s*[-–]\s*20\d{2}\s*[\/.]\s*\2\b/);
        if(dm){ result.donem=`${String(dm[2]).padStart(2,'0')}.${dm[1]}`; break; }
      }
    }
  }

  // Ünvan/isim bilgi amaçlıdır; tabloya yalnızca tahakkuk numarası aktarılır.
  m = flat.match(/SOYADI\s*\(UNVANI\)\s+(.+?)\s+(?:ANA\s+VERGİ\s+KODU|ADRES|MAKİNA\s+NO)/i);
  if(m) result.unvan = m[1].trim();
  if(!result.unvan){
    const si=lines.findIndex(l=>/SOYADI\s*\(UNVANI\)/i.test(l));
    if(si>=0) result.unvan=lines[si].replace(/^.*?SOYADI\s*\(UNVANI\)\s*/i,'').trim();
  }

  Object.keys(result).forEach(k=>result[k]=String(result[k]||'').replace(/\s+/g,' ').trim());
  return result;
}

/* ---------- bu repoya özgü sarmalayıcı ---------- */
/* pdf.js öğeleri {k,x,y,w,s} → satır satır metin (aynı y'deki öğeler soldan sağa) */
function kdvMetin(items){const it=items.filter(i=>i.s.trim()).sort((a,b)=>b.k-a.k||a.x-b.x),L=[];let cur=null,py=null;
 it.forEach(i=>{if(cur==null||Math.abs(i.k-py)>3){cur=[];L.push(cur)}cur.push(i);py=i.k});
 return L.map(l=>{l.sort((a,b)=>a.x-b.x);let s='',px=null;l.forEach(i=>{if(px!=null)s+=(i.x-px>12?'   ':' ');s+=i.s.trim();px=i.x+i.w});return s}).join('\n')}
/* Belge türü: 'tahakkuk' | 'beyanname' | null (tanınmadı). Biçim yalnızca beyanname için: 'eski' (1015 A) | 'yeni' (Dijital VD).
   Büyük/küçük harf eşleşmesi Türkçe kurallarla yapılır (İ/i, I/ı). Tür, belgenin başındaki başlığa bakılarak belirlenir. */
function kdvTani(metin){const f=metin.replace(/\s+/g,' ').toLocaleUpperCase('tr-TR'),bas=f.slice(0,500);
 if(bas.includes('TAHAKKUK FİŞİ'))return{tur:'tahakkuk',bicim:''};
 if(bas.includes('KATMA DEĞER VERGİSİ BEYANNAMESİ'))return{tur:'beyanname',bicim:/MATRAH TOPLAMI/.test(f)?'eski':'yeni'};
 return null}
function kdvBelge(metin){const t=kdvTani(metin);if(!t)return null;
 const r=t.tur==='beyanname'?parseKdvBeyannamePdf(metin):parseKdvTahakkukPdfText(metin);
 const m=/Onay\s+Zamanı\s*:?\s*(\d{2})[./](\d{2})[./](\d{4})\s*-?\s*(\d{2}:\d{2}:\d{2})/i.exec(metin);
 return{...r,tur:t.tur,bicim:t.bicim,onay:m?`${m[3]}${m[2]}${m[1]} ${m[4]}`:''}}
/* Belgelerden dönem başına tek satır: beyanname değerleri + tahakkuk no. Aynı dönemde birden fazla beyanname varsa onay zamanı en yeni olan alınır. */
function kdvSatirlari(belgeler){const D={},uyari=[];
 belgeler.filter(b=>b.donem).forEach(b=>{const d=D[b.donem]??={donem:b.donem,beyanname:null,tahakkuk:null};
  if(b.tur==='beyanname'){if(d.beyanname)uyari.push(`${b.donem}: birden fazla beyanname yüklendi; onay zamanı en yeni olan kullanıldı.`);if(!d.beyanname||b.onay>=d.beyanname.onay)d.beyanname=b}
  else{if(d.tahakkuk&&d.tahakkuk.tahakkukNo!==b.tahakkukNo)uyari.push(`${b.donem}: birden fazla tahakkuk fişi yüklendi; sonuncusu kullanıldı.`);d.tahakkuk=b}});
 const n=v=>K.parseNum(v)??0,satir=Object.values(D).map(d=>{const b=d.beyanname;return{donem:d.donem,beyanname:!!b,tahakkukBelge:!!d.tahakkuk,
  veri:b?{donem:d.donem,teslim:n(b.teslimBedel),ozel:n(b.ozelMatrah),matrah:n(b.kdvMatrahi),hesap:n(b.hesaplananKdv),ilave:n(b.ilaveKdv),toplam:n(b.toplamKdv),indirim:n(b.indirimler),odenecek:n(b.odenecekKdv),devreden:n(b.devredenKdv),tahakkuk:d.tahakkuk?d.tahakkuk.tahakkukNo:''}:null}});
 return{satir:K.donemSort(satir.map(s=>s.donem)).map(x=>satir.find(s=>s.donem===x)),uyari}}
const api={kdvMetin,kdvTani,kdvBelge,kdvSatirlari,parseKdvBeyannamePdf,parseKdvTahakkukPdfText};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
