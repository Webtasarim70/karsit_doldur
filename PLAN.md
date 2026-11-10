# Karşıt Doldur — Plan

Bu belge projenin tasarım kararlarını ve ekarsit reposundan alınan teknik bilgileri içerir. AI ile devam edilirken önce bu dosya okunmalıdır.

## Amaç

Kullanıcı **e-Karşıt tutanak PDF'sini** ve **mevcut arşiv Excel'ini** yükler. Sistem, e-Karşıt'a yüklenecek **7 Excel dosyasını** ve **güncellenmiş arşiv dosyasını** üretir. Eksik bilgiler yüklenen beyanname, tahakkuk, muhtasar, e-berat, muavin ve XML belgelerinden tamamlanır; arşiv de aynı bilgilerle güncellenir.

Arşiv, tutanaktaki **Ç) nezdinde karşıt inceleme yapılan mükellefe** aittir (ekarsit kodunda `cUnvan`/`cVkn`). Arşiv yüklenince VKN eşleşmesi kontrol edilir; eşleşmezse uyarı verilir.

## Akış

1. **Yükleme:** e-Karşıt PDF, arşiv dosyası, isteğe bağlı belgeler (toplu sürükle-bırak; belge türü otomatik tanınır).
2. **PDF analizi:** A, B, C, Ç, sözleşme ve fatura tablosu okunur. Fatura aylarından dönemler çıkar.
3. **Arşivle eşleştirme:** Her tablo için arşivde veri var mı bakılır; eksikler tek panelde listelenir.
4. **Eksikleri tamamlama:** Yüklenen belgelerden, bulunamayanlar elle.
5. **Önizleme ve onay:** Her satırın kaynağı görünür (arşiv / belge / elle); düzenlenebilir.
6. **Çıktı (ZIP):** 7 Excel + güncellenmiş arşiv.

## Dönem kuralları (ekarsit'ten)

- Fatura dönemleri tutanaktaki fatura tablosundan (fatura tarihlerinden) belirlenir; yıllar bu aylardan türetilir.
- KDV kapsamı: her fatura dönemi + hemen önceki dönem (tekilleştirilir).
- Her kontrol ayı için iki e-Defter kaydı: `e-Defter Yevmiye Defteri` ve `e-Defter Defteri Kebir`. Başlangıç ve bitiş dönemi ayrı ayrı `MM.YYYY` olmalı ve o ayla eşleşmeli; yıllık aralık aylık kontrolü karşılamaz.
- Envanter Defteri yıl bazında kontrol edilir.
- e-Berat kaydı var ama ETTN yoksa kırmızı değil sarı uyarı.
- Muhtasar tam dönem bazında kontrol edilir.
- Tedarikçi tablosu: ay başına belge bazında en yüksek tutarlı 10 alım (PDF dipnotu).

## 7 tablonun veri kaynağı

| Tablo | Öncelik sırası |
|---|---|
| 1 Ortaklık | arşiv, yoksa elle |
| 2 Yasal defter | arşiv (Envanter, noter tasdik) + e-berat (Yevmiye/Kebir), yoksa elle |
| 3 Faturalar | PDF'deki tablo; Defter Kayıt Tarihi, Yevmiye No, Ödeme Şekli muavinden |
| 4 Muhtasar çalışan | arşiv, yoksa muhtasar PDF (vergi dairesi Ç bölümünden) |
| 5 KDV | arşiv, yoksa beyanname PDF; tahakkuk no tahakkuk PDF'inden |
| 6 İmalatçı | arşiv, yoksa elle |
| 7 Tedarikçi | arşiv, yoksa e-fatura XML'den aylık en yüksek 10 alım |

Çıktı dosya adları (ekarsit `buildOutputFiles`): `<VKN>_<TABLO_ADI>_<GG_AA_YYYY>.xlsx`

- `MUKELLEFIN_ORTAKLIK_BILGILERI`
- `MUKELLEFIN_YASAL_DEFTERLERE_ILISKIN_BILGILERI`
- `MUKELLEFIN_KARSIT_INCELEMEYE_KONU_OLAN_FATURALARINA_ILISKIN_BILGILERI`
- `MUKELLEFIN_MUHTASAR_BEYANNAMESINDE_YER_ALAN_CALISAN_KISI_SAYILARI`
- `ONCEKI_DONEM_VE_ILGILI_DONEM_KDV_BEYAN_BILGILERI`
- `MALIN_IMALATCISI_OLAN_MUKELLEF_HAKKINDA_BILGILER`
- `ILGILI_DONEMDE_SATILAN_MALLARIN_TEDARIK_EDILDIGI_FIRMALAR_HAKKINDA_BILGILER`

Excel'ler, ekarsit'te gömülü olan **gerçek e-Karşıt şablonlarından** türetilir (şablon yalnızca biçim kaynağıdır; örnek satırlar taşınmaz). Fatura şablonundaki "Ödeme Şekli Referans" sayfası aynen kopyalanır. Generic workbook üretilmez.

## Excel sütunları (ekarsit `COLS`)

**Ortaklık** (`COLS.ortak`): `adSoyad` = Adı Soyadı / Ünvanı; `vkn` = Vergi/T.C. Kimlik No; `il` = Bağlı Olduğu İl; `vergiDairesi` = Bağlı Olduğu Vergi Dairesi; `payOrani` = Pay Oranı; `aciklama` = Açıklama

**Yasal defter** (`COLS.defter`): `nevi` = Defterin Nev'i; `baslangic` = Başlangıç Dönemi; `bitis` = Bitiş Dönemi; `tasdikMakami` = Tasdik Makamı; `tasdikTarihi` = Tasdik Tarihi; `tasdikNo` = Tasdik No / Berat No; `aciklama` = Açıklama; `defterTuruAciklama` = Defter Türü Açıklama

**Faturalar** (`COLS.fatura`): `tarih` = Faturanın Tarihi; `seri` = Faturanın Serisi; `no` = Faturanın Numarası; `tutar` = Faturanın Tutarı (TL); `kdv` = K.D.V(TL); `defterKayitTarihi` = Defter Kayıt Tarihi; `yevmiyeNo` = Yevmiye Numarası; `odemeSekli` = Ödeme Şekli ve Ödemeye İlişkin Bilgiler; `aciklama` = Açıklama; `hataliSatir` = Hatalı Satır Açıklama

**Muhtasar çalışan** (`COLS.isci`): `donem` = Dönem (AA.YYYY); `sayi` = Çalışan İşçi Sayısı; `vergiDairesi` = Beyannamenin Verildiği Vergi Dairesi

**KDV** (`COLS.kdv`): `donem` = Dönem; `teslimBedel` = Teslim ve Hizmet Karşılığını Teşkil Eden Bedel; `ozelMatrah` = Özel Matrah Şekline Tabi İşl. Matr. Dahil Olm. Bedel; `kdvMatrahi` = KDV Matrahı; `hesaplananKdv` = Hesaplanan KDV; `ilaveKdv` = İlave Edilecek KDV; `toplamKdv` = Toplam KDV; `indirimler` = İndirimler Toplamı; `odenecekKdv` = Ödenmesi Gereken KDV; `devredenKdv` = Sonraki Döneme Devreden KDV; `tahakkukNo` = Tahakkuk Fişinin Numarası

**İmalatçı** (`COLS.imalatci`): `adSoyad` = Adı Soyadı / Ünvanı; `vkn` = Vergi/T.C. Kimlik No; `sanayiOdasi` = Bağlı Bulunduğu Sanayi Odası; `belgeTarihi` = Belge Tarihi; `belgeNo` = Belge Numarası; `belgeTuru` = Belge Türü; `aciklama` = Açıklama

**Tedarikçi** (`COLS.tedarikci`): `adSoyad` = Adı Soyadı/Ünvanı; `vkn` = Vergi/T.C. Kimlik Numarası; `vergiDairesi` = Bağlı Olduğu Vergi Dairesi; `faturaTarihi` = Faturanın Tarihi; `faturaSeri` = Faturanın Serisi; `faturaNo` = Faturanın Numarası; `faturaMatrahi` = Faturanın Matrahı; `faturaKdv` = Faturanın KDV Tutarı; `gumrukTarihi` = Gümrük Beyannamesi/Serbest Bölge İşlem Formu Tarihi; `gumrukTescilNo` = Gümrük Beyannamesi/Serbest Bölge İşlem Formu Tescil Numarası

## Arşiv formatı

- `ARŞİV YYYY` adlı sayfalar (yıl başına bir sayfa). Okuyucu adı `ARŞİV|ARSIV` içeren sayfaları alır; başka adlı sayfalar yok sayılır.
- Üst blok: B sütunu etiket, C sütunu değer (ADI VE SOYADI / ÜNVANI, VERGİ/T.C. KİMLİK NUMARASI, VERGİ DAİRESİ, ADRES, TELEFON NUMARASI).
- Bölümler: `Ortak Bilgileri`, `Defter Bilgileri`, `İŞCİ SAYILARI`, `KDV BEYANNAMESİ BİLGİLERİ`, `İMALATÇI FİRMA BİLGİLERİ`, `TEDARİKÇİ FİRMA BİLGİLERİ` (tedarikçi: ay başlığı `AA/YYYY` + satırlar).
- **Fatura tablosu arşive yazılmaz.**
- Dönem biçimi arşivde `AA.YYYY`.

## Arşiv güncelleme kuralları

- Mevcut kayıt silinmez; yalnızca eklenir veya güncellenir (`mergeArchive` anahtarları: ortak = ad+VKN; defter = nev+başlangıç+bitiş; işçi ve KDV = dönem; imalatçı = ad+VKN+belge no; tedarikçi = dönem+fatura no+ad).
- Belgeden gelen değer arşivdekinden farklıysa sessizce ezilmez; fark gösterilip onay alınır.
- ARŞİV dışındaki sayfalar korunur (karar bekliyor, aşağıya bakın).
- İsteğe bağlı `GÜNCELLEME KAYDI` sayfası (adı ARŞİV içermediği için okuyucu görmez).

## e-Karşıt PDF yapısı (tek örnek PDF'te denendi)

- Başlıklar: `A)` YMM, `B)` tasdik hizmeti verilen mükellef, sözleşme tablosu, `C)` nezdinde incelenen mükellefin mal/hizmet teslim ettiği mükellef, `Ç)` nezdinde incelenen mükellef. Başlık verinin **üstünde**; etiket sütunu x<100, değer sütunu x≥100, değerler etiket satırına dikey ortalı (çok satırlı değerler için en yakın etiket).
- Sözleşme tablosu 5 sütun: başlangıç, bitiş, tarih, seri-sıra no, sisteme girildiği tarih. Fatura dönemini kapsayan sözleşme seçilir.
- Fatura tablosu (bölüm 3): uzun fatura numarası iki satıra bölünebilir (konuma göre birleştirilir). `Faturanın Tutarı` = matrah (KDV oranıyla doğrulandı). Satırlar tarih hücresine en yakın konumla gruplanır.
- Kod: `js/02_ekarsit_pdf.js` (iki farklı PDF'te doğrulandı). ekarsit'teki metin tabanlı `parseTutanak` gerekirse yedek olarak kullanılır.

## ekarsit'ten yeniden kullanılacak parçalar

| Dosya | Fonksiyonlar |
|---|---|
| `01_core_state_helpers.js` | `COLS`, dönem yardımcıları (`parseDonem`, `fmtDonem`, `prevDonem`, `computeKdvDonemleri`, `donemFromFaturaTarihi`), `parseTutanak` |
| `02_pdf_parsers.js` | `parseKdvBeyannamePdf`, `parseKdvTahakkukPdfText`, `parseMuhtasarPdfDetailed` |
| `03_excel_archive.js` | `parseArchiveWorkbook`, `mergeArchive`, `OUTPUT_XLSX_TEMPLATES`, `buildOutputWorkbookFromRealTemplate` |
| `04_period_import_helpers.js` | `buildArchiveWorkbook` |
| `05_crosschecks_ebarat_kdv_muhtasar.js` | `buildOutputFiles`, muavin yardımcıları, `checkTedarikciDuplicates` |
| `06_tutanak_and_workflow.js` | e-berat ayrıştırıcıları (`parseEberatXmlText`, `parseEberatPdfText`, `eberatRowFromParsed`, `eberatDeadlineInfo`) |
| `12_efatura_tools.js`, `13_xml_kdv_listesi.js` | tedarikçi için e-fatura XML |
| `vendor/` | pdfjs, exceljs, xlsx |

**Karar (güncel):** ekarsit modülleri UI ve global duruma sıkı bağlı olduğundan toptan kopyalanmıyor. Bu repoda küçük, test edilebilir modüller yazılıyor (`js/01_ortak.js` … `js/04_kapsam.js`; Node'da `tests/run.js` ile denenir). ekarsit'ten yalnızca şunlar taşınacak: 7 gömülü e-Karşıt şablonu, belge ayrıştırıcıları (KDV beyanname/tahakkuk, muhtasar, e-berat) ve vendor kütüphaneleri.

## Bulgular (gerçek örnek dosyalarla, Aşama 1-2)

- **Arşiv, Ç) mükellefe aittir.** Örnek arşivin VKN'si yeni PDF'teki Ç) VKN'siyle eşleşti; eski PDF'te eşleşmeyince uyarı üretildi.
- **A bölümünde ek satır olabilir:** "YMM ŞİRKETİ VERGİ KİMLİK NUMARASI / ÜNVANI". Etiket listesinde yoksa değeri bir önceki alana (telefon) karışıyor.
- **Sözleşme tablosu birden fazla olabilir** ("KDV iadesi tasdik dönemi" ve "tasdik dönemi"); sütun başlıkları tablodan tabloya farklı yazılıyor, sütunlar başlık merkezinden bulunuyor.
- **Sayı alanı** her zaman "EKARSIT" içermiyor (örn. `2026-723`); "Sayı" etiketinin yanındaki değer alınıyor.
- **TOPLAM satırı:** tutar etiketle aynı hizada değil (6 birim yukarıda); ayrı bir bant olarak dışlanmazsa son faturanın KDV'sine karışıyor. PDF toplamı ile satır toplamı karşılaştırılıyor ve uyuşmazlık uyarı olarak çıkıyor.
- **Arşivde sayı biçimleri karışık:** aynı sütunda hem sayı hem `29.603.687,27` gibi metin var. Okurken sayıya normalize ediliyor; çıktıda gerçek sayı yazılacak.
- **ETTN**, arşivde e-Defter satırlarının "Açıklama" sütununda tutuluyor.
- **Arşiv yıl bazlı:** örnek arşivde yalnızca `ARŞİV 2025` var, tutanak ise 2026 (Temmuz-Ağustos) faturaları içeriyor. Bu durumda defter, muhtasar, KDV ve tedarikçi tablolarının tamamı yeni belgelerden tamamlanmalı; yalnızca ortaklık ve imalatçı arşivden gelir.
- **Arşivde tedarikçi bölümü boş** (yalnızca başlık); tedarikçi verisi e-fatura XML'den veya elle gelecek.

## Riskler ve kararlar

- `buildArchiveWorkbook` arşivi sıfırdan yazıyor; kullanıcının eklediği biçim/sayfalar kaybolabilir. Öneri: mevcut formatla yaz, ARŞİV dışı sayfaları aynen koru.
- Konum tabanlı PDF okuyucu tek PDF'te test edildi; farklı e-Karşıt PDF'leriyle (çok fatura, çok sayfa) doğrulanmalı.
- Tutarlar Excel'de gerçek sayı olarak yazılmalı (ekarsit `YAPILACAKLAR`'da açık iş).
- KDV beyannamesindeki tahakkuk no beyanname PDF'inden gelmiyor; tahakkuk PDF'inden dönem eşleştirmesiyle birleştirilir.

## Aşamalar

1. Yükleme, belge türü tanıma, PDF analizi, dönem kapsamı.
2. Arşiv okuma, eşleştirme, eksik paneli.
3. Belgelerden tamamlama (KDV, muhtasar, e-berat, muavin).
4. 7 Excel + arşiv güncelleme + ZIP.
5. Belgeler ve test.

## Çalışma kuralları

- Aktif dal `develop`; `main`'e aktarım yalnızca açıkça istenince.
- Her değişiklikte tüm JS dosyalarına `node --check`, kopya sembol kontrolü ve tarayıcıda uçtan uca deneme.
- Gerçek dosyalar (arşiv, PDF, Excel) repoya konmaz.
- Arayüz Türkçe; veriler yalnızca tarayıcıda işlenir.
