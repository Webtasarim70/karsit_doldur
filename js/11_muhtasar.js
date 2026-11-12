/* Muhtasar ve Prim Hizmet Beyannamesi okuyucusu.
   parseMuhtasarPdfDetailed / normalizeMuhtasarText: ekarsit projesinden (js/02_pdf_parsers.js) alınmıştır.
   Çalışan sayısı = "Çalışan Bilgisi" satırlarındaki Toplam Çalışan Sayısı toplamı. Alt kısım bu repoya özgü sarmalayıcıdır. */
(function(g){
const K=typeof module!=='undefined'?require('./01_ortak.js'):g.KD;
function normalizeMuhtasarText(text) {
  return String(text || '').replace(/\r/g, '');
}
function parseMuhtasarPdfDetailed(text) {
  const raw = normalizeMuhtasarText(text);
  const T = raw.replace(/[ \t]+/g, ' ');
  const result = { vkn:'', unvan:'', vergiDairesi:'', donem:'', yil:'', ay:'', rows:[], totalCount:0, gelirMuafToplam:0, sgkMuafToplam:0 };
  const lines = raw.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);

  // VKN
  const v = T.match(/Vergi\s+Kimlik\s+Numarası\s+(\d{8,11})/i);
  if (v) result.vkn = v[1];

  // Mükellef unvanı: PDF'de alan iki ayrı satıra bölünebilir.
  const u1Line = lines.find(x => /Soyadı\s*\(Unvanı\)/i.test(x));
  const u2Line = lines.find(x => /Adı\s*\(Unvanın Devamı\)/i.test(x));
  if (u1Line) result.unvan = u1Line.replace(/^.*?Soyadı\s*\(Unvanı\)\s*/i,'').trim();
  if (u2Line) result.unvan = [result.unvan, u2Line.replace(/^.*?Adı\s*\(Unvanın Devamı\)\s*/i,'').trim()].filter(Boolean).join(' ');
  result.unvan = result.unvan
    .replace(/(^|\s)L\s+ŞİRKETİ(?=\s|$)/gi, '$1LTD.ŞTİ.')
    .replace(/\bLTD\s*\.?\s*ŞTİ\.?/gi, 'LTD.ŞTİ.')
    .replace(/\s+/g,' ').trim();

  // Vergi dairesi: Muhtasar PDF'sinde bu alan PDF.js tarafından farklı
  // satırlara bölünebilir. Örneğin kaynakta "KARAMAN DÖNEM TİPİ ..." ile
  // "Vergi Dairesi Müdürlüğü" ayrı metin öğeleri olarak gelebilir.
  // Bu uygulamada tabloya yalnızca vergi dairesi adı yeterlidir; bu nedenle
  // hedef değer özellikle "KARAMAN" gibi DÖNEM TİPİ öncesindeki ada indirgenir.
  // Vergi dairesi: gerçek PDF metninde ilk satır açıkça
  // "KARAMAN DÖNEM TİPİ Yıl 2026" şeklindedir. PDF.js bunu bazen tek satır,
  // bazen de ayrı metin parçaları halinde verir. Bu yüzden önce DÖNEM TİPİ
  // ifadesinin hemen önündeki metni doğrudan alıyoruz. Sonuç yalnızca adıdır:
  // örn. "KARAMAN"; "Vergi Dairesi Müdürlüğü" eklenmez.
  const vdDirect = T.match(/(?:^|\s)([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ .'-]{1,60}?)\s+DÖNEM\s*TİPİ\b/i);
  if (vdDirect) {
    const name = vdDirect[1].replace(/\s+/g,' ').trim();
    if (name && !/^(MUHTASAR|VE|PRİM|HİZMET|BEYANNAME)$/i.test(name)) result.vergiDairesi = name;
  }

  // PDF.js başlık parçalarını ayırmışsa, "Vergi Dairesi Müdürlüğü" metninin
  // hemen öncesindeki satırı/öğeyi ara. Özellikle kaynak PDF'deki
  // "KARAMAN" parçasını yakalamayı hedefler.
  if (!result.vergiDairesi) {
    for (let i=0; i<lines.length; i++) {
      if (!/Vergi\s+Dairesi\s+Müdürlüğü/i.test(lines[i])) continue;
      for (let j=Math.max(0,i-5); j<i; j++) {
        const x = lines[j].replace(/DÖNEM\s*TİPİ.*$/i,'').trim();
        const mvd = x.match(/^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9.\- ]{1,40})$/);
        if (mvd && !/VERGİ|DAİRESİ|MÜDÜRLÜĞÜ|YIL|AY|DÖNEM|TİPİ|MUHTASAR|PRİM|HİZMET|BEYANNAME/i.test(mvd[1])) {
          result.vergiDairesi = mvd[1].replace(/\s+/g,' ').trim();
          break;
        }
      }
      if (result.vergiDairesi) break;
    }
  }

  // Son güvenlik ağı: ham metinde "KARAMAN DÖNEM TİPİ" gibi ayrışmamış
  // başlığı ara. Bu örnekte beklenen sonuç tam olarak KARAMAN'dır.
  if (!result.vergiDairesi) {
    const vdLoose = T.match(/\b([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ .'-]{1,40})\s+DÖNEM\s*TİPİ/i);
    if (vdLoose) result.vergiDairesi = vdLoose[1].replace(/\s+/g,' ').trim();
  }

  // Dönem: öncelik Yıl + Ay alanları; HESAP DÖNEMİ gibi başka tarihler kullanılmaz.
  const y = T.match(/\bYıl\s+(20\d{2})\b/i);
  if (y) result.yil = y[1];
  const ayMap = {ocak:'01',şubat:'02',mart:'03',nisan:'04',mayıs:'05',haziran:'06',temmuz:'07',ağustos:'08',eylül:'09',ekim:'10',kasım:'11',aralık:'12'};
  const am = T.match(/\bAy\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\b/i);
  if (am) result.ay = ayMap[am[1].toLocaleLowerCase('tr-TR')] || '';
  if ((!result.ay || !result.yil)) {
    const nm = T.match(/\b(0?[1-9]|1[0-2])\s*[\/.\-]\s*(20\d{2})\b/);
    if (nm) { result.ay = String(nm[1]).padStart(2,'0'); result.yil = nm[2]; }
  }
  if (result.ay && result.yil) result.donem = `${result.ay}.${result.yil}`;

  // Vergi Bildirimi çalışan satırları.
  // ÖNEMLİ: Muhtasar PDF'nin bu örneğinde PDF.js metin öğeleri görsel satıra
  // göre değil, küçük Y farklarıyla dönebiliyor. Örneğin:
  //   "1. Ay - Asgari"
  //   "Ücretli"
  //   "9 0 0 137.239,65 ..."
  // veya "1. Ay - Asgari 9 0 0" + "Ücretli" şeklinde gelebiliyor.
  // Bu nedenle yalnızca tek satırlık regex yerine etiket satırının çevresindeki
  // birkaç metin satırını birlikte değerlendiriyoruz.
  const workerPrefix = /^(\d+)\.?\s*Ay\s*-\s*(Asgari|Diğer)\b/i;
  const seenWorker = new Set();

  const pushWorker = (labelRaw, nums) => {
    if (!nums || nums.length < 3) return;
    const labelBase = labelRaw.replace(/\s+/g,' ').trim();
    const label = /\bÜcretli$/i.test(labelBase) ? labelBase : `${labelBase} Ücretli`;
    const key = `${label}|${nums[0]}|${nums[1]}|${nums[2]}`;
    if (seenWorker.has(key)) return;
    seenWorker.add(key);
    result.rows.push({
      calisanBilgisi: label,
      toplamCalisanSayisi: Number(nums[0]),
      gelirMuafIstisnaSayisi: Number(nums[1]),
      sgkMuafIstisnaSayisi: Number(nums[2])
    });
  };

  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const m = line.match(workerPrefix);
    if (!m) continue;

    // Etiket + takip eden 3 satırı birleştir. Böylece "Ücretli" ve sayılar
    // ayrı PDF.js satırlarında olsa bile ilk üç çalışan sayısı alınır.
    const windowLines = [line];
    for (let j=1; j<=3 && i+j<lines.length; j++) windowLines.push(lines[i+j]);
    const windowText = windowLines.join(' ');

    // Önce etiketin kendisinden sonraki bölümdeki ilk üç tam sayıyı ara.
    const afterLabel = windowText.slice(m[0].length);
    const nums = [];
    const reNum = /(?:^|\s)(\d{1,5})(?=\s|$)/g;
    let nm;
    while ((nm = reNum.exec(afterLabel)) !== null && nums.length < 3) {
      nums.push(nm[1]);
    }
    pushWorker(m[0].replace(/\s+/g,' ').trim(), nums);
  }

  // Son çare: bazı PDF çıkarımlarında "Ücretli" etiketi ile sayılar daha
  // uzakta olabilir. Düzleştirilmiş metin üzerinde de yalnızca çalışan
  // etiketinden sonraki kısa pencerede ilk üç sayıyı ara.
  if (!result.rows.length) {
    const flat = raw.replace(/\s+/g, ' ').trim();
    const reWorker = /(\d+\.?\s*Ay\s*-\s*(?:Asgari|Diğer))(?:\s+Ücretli)?\s+([0-9]{1,5})\s+([0-9]{1,5})\s+([0-9]{1,5})\b/gi;
    let wm;
    while ((wm = reWorker.exec(flat)) !== null) {
      pushWorker(wm[1].replace(/\s+/g,' ').trim(), [wm[2],wm[3],wm[4]]);
    }
  }

  result.totalCount = result.rows.reduce((a,r)=>a+r.toplamCalisanSayisi,0);
  result.gelirMuafToplam = result.rows.reduce((a,r)=>a+r.gelirMuafIstisnaSayisi,0);
  result.sgkMuafToplam = result.rows.reduce((a,r)=>a+r.sgkMuafIstisnaSayisi,0);
  return result;
}

/* ---------- bu repoya özgü sarmalayıcı ---------- */
const AYLAR={ocak:1,şubat:2,mart:3,nisan:4,mayıs:5,haziran:6,temmuz:7,ağustos:8,eylül:9,ekim:10,kasım:11,aralık:12};
const donemStr=(y,a)=>{while(a>12){a-=12;y++}return String(a).padStart(2,'0')+'.'+y};
function muhtasarTani(metin){return metin.replace(/\s+/g,' ').toLocaleUpperCase('tr-TR').slice(0,600).includes('MUHTASAR VE PRİM HİZMET BEYANNAMESİ')}
/* → {tur:'muhtasar', vkn, vergiDairesi, bicim:'Aylık'|'3 Aylık', donem(gösterim), satirlar:[{donem,sayi}], uyari:[], onay} | null */
function muhtasarBelge(metin){if(!muhtasarTani(metin))return null;
 const r=parseMuhtasarPdfDetailed(metin),f=metin.replace(/\s+/g,' '),uyari=[];
 const uc=/DÖNEM\s*TİPİ[^]{0,80}?\b(3\s*Aylık|Üç\s*Aylık)/i.test(f)||/\b(3\s*Aylık|Üç\s*Aylık)\b/i.test(f.slice(0,700));
 const o=/Onay\s+Zamanı\s*:?\s*(\d{2})[./](\d{2})[./](\d{4})\s*-?\s*(\d{2}:\d{2}:\d{2})/i.exec(metin);
 const b={tur:'muhtasar',bicim:uc?'3 Aylık':'Aylık',vkn:r.vkn,unvan:r.unvan,vergiDairesi:r.vergiDairesi,onay:o?`${o[3]}${o[2]}${o[1]} ${o[4]}`:'',donem:r.donem,satirlar:[],uyari};
 if(!r.rows.length){b.hata='Çalışan bilgisi satırları okunamadı.';return b}
 if(!uc){if(r.donem)b.satirlar=[{donem:r.donem,sayi:r.totalCount}];else b.hata='Dönem okunamadı.';return b}
 /* 3 aylık: satır etiketindeki "N. Ay" ile ay bazında topla (bu biçim için örnek belge yok; kullanıcı kontrol etmeli) */
 const ay0=r.ay?+r.ay:null,yil=+r.yil,S={};r.rows.forEach(x=>{const m=/^(\d+)\./.exec(x.calisanBilgisi);if(m)S[+m[1]]=(S[+m[1]]||0)+x.toplamCalisanSayisi});
 if(!ay0||!yil){b.hata='3 aylık beyanname: başlangıç ayı okunamadı.';return b}
 Object.keys(S).sort((a,c)=>a-c).forEach(i=>b.satirlar.push({donem:donemStr(yil,ay0+ +i-1),sayi:S[i]}));
 b.donem=b.satirlar.length?b.satirlar[0].donem+'–'+b.satirlar[b.satirlar.length-1].donem:r.donem;
 uyari.push('3 aylık beyanname: ay bazında çalışan sayıları satır etiketlerinden (1. Ay, 2. Ay, 3. Ay) hesaplandı; bu biçim için örnek belge bulunmadığından değerleri kontrol edin.');
 return b}
const api={muhtasarTani,muhtasarBelge,parseMuhtasarPdfDetailed};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,api);
})(typeof window!=='undefined'?window:globalThis);
