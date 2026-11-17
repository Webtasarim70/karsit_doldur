# Karşıt Doldur

e-Karşıt tutanak PDF'sini ve mevcut arşiv dosyasını yükleyin; e-Karşıt sistemine yüklenecek Excel dosyalarını ve güncellenmiş arşivi alın.

## Ne yapacak?

- e-Karşıt PDF'sinden mükellef, sözleşme ve fatura bilgilerini okur; fatura tarihlerinden tutanak dönemlerini belirler.
- Arşiv dosyasındaki bilgileri kullanır; eksikleri yüklenen beyanname, tahakkuk, muhtasar, e-berat ve muavin belgelerinden tamamlar.
- e-Karşıt'a yüklenecek 7 Excel dosyasını gerçek şablon biçiminde üretir.
- Arşivi aynı bilgilerle günceller.

## Kullanım

`index.html` dosyasını tarayıcıda açın (Chrome/Edge önerilir) veya GitHub Pages ile yayınlayın. Akış 9 adımdır; her adım "Onayla ve devam et" ile açılır:

1. **e-Karşıt PDF** — tutanak okunur; fatura tarihlerinden dönemler belirlenir. PDF, e-Karşıt’a yüklenmiş bir **cevap yazısı** ise 1-7. tablolardaki veriler de okunur ve sonraki adımlarda “Cevap yazısı” kaynağı olarak kullanılır.
2. **Arşiv** (isteğe bağlı) — mevcut arşiv `.xlsx`; VKN uyuşmazsa devam edilemez.
3. **KDV** — beyanname/tahakkuk PDF'leri (eski ve yeni biçim), daha önce hazırlanmış Excel veya elle.
4. **Muhtasar** — çalışan sayısı.
5. **e-Berat ve defterler** — e-Berat XML/PDF, Envanter, "berat süresi dolmadı".
6. **Satış muavini** — defter kayıt tarihi, yevmiye no, ödeme şekli.
7. **Tedarikçi** — İndirilecek KDV Listesi, 191 muavin, e-fatura XML; dönem başına en yüksek 10 alım.
8. **Ortak ve imalatçı**.
9. **Kapsam ve çıktı** — 7 e-Karşıt Excel dosyası (ZIP) ve **güncellenmiş arşiv**.

Her adımda belge, daha önce hazırlanmış Excel veya elle giriş kullanılabilir; kaynaklar farklıysa kullanıcı seçer. Dosyalar tarayıcıdan çıkmaz.

Yerel test (arayüzsüz): `npm install`, ardından `node tests/<ad>.js ...` (`run`, `cikti`, `pdf_ozet`, `kdv_ozet`, `muhtasar_ozet`, `eberat_ozet`, `muavin_ozet`, `tedarikci_ozet`, `excel_oku`, `arsiv_yaz`). Gerçek dosyalar `yerel/` klasöründe tutulur; `.gitignore` bunu dışlar.

## Durum

Planlama aşaması. Ayrıntılar için `PLAN.md`, iş listesi için `YAPILACAKLAR.md`.

## Gizlilik

Dosyalar internete gönderilmez; işlemler tarayıcıda yapılır. Gerçek arşiv, PDF ve Excel dosyaları bu repoya eklenmemelidir (`.gitignore` bunları dışlar).

## Kaynak

[ekarsit](https://github.com/Webtasarim70/ekarsit) projesindeki PDF ve Excel modüllerinden yararlanılır.

## Çalışma düzeni

Geliştirme `develop` dalında yürütülür; `main` dalına yalnızca açıkça istendiğinde aktarılır.
