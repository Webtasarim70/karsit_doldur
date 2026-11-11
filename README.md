# Karşıt Doldur

e-Karşıt tutanak PDF'sini ve mevcut arşiv dosyasını yükleyin; e-Karşıt sistemine yüklenecek Excel dosyalarını ve güncellenmiş arşivi alın.

## Ne yapacak?

- e-Karşıt PDF'sinden mükellef, sözleşme ve fatura bilgilerini okur; fatura tarihlerinden tutanak dönemlerini belirler.
- Arşiv dosyasındaki bilgileri kullanır; eksikleri yüklenen beyanname, tahakkuk, muhtasar, e-berat ve muavin belgelerinden tamamlar.
- e-Karşıt'a yüklenecek 7 Excel dosyasını gerçek şablon biçiminde üretir.
- Arşivi aynı bilgilerle günceller.

## Kullanım

1. `index.html` dosyasını tarayıcıda açın (Chrome/Edge önerilir) veya GitHub Pages ile yayınlayın.
2. e-Karşıt tutanak PDF'ini ve (varsa) arşiv `.xlsx` dosyasını yükleyin.
3. Ekranda tutanak özeti, tespit edilen dönemler, faturalar ve 7 tablonun hazır/eksik durumu görünür.
4. "Excel dosyalarını indir" ile 7 e-Karşıt Excel dosyası ZIP olarak indirilir.

Yerel test (arayüzsüz): `npm install`, `node tests/run.js yerel/<pdf> yerel/<xlsx>` (kapsam raporu) ve `node tests/cikti.js yerel/<pdf> yerel/<xlsx> <klasör> [yıl]` (Excel çıktıları). Gerçek dosyalar `yerel/` klasöründe tutulur; `.gitignore` bunu dışlar.

## Durum

Planlama aşaması. Ayrıntılar için `PLAN.md`, iş listesi için `YAPILACAKLAR.md`.

## Gizlilik

Dosyalar internete gönderilmez; işlemler tarayıcıda yapılır. Gerçek arşiv, PDF ve Excel dosyaları bu repoya eklenmemelidir (`.gitignore` bunları dışlar).

## Kaynak

[ekarsit](https://github.com/Webtasarim70/ekarsit) projesindeki PDF ve Excel modüllerinden yararlanılır.

## Çalışma düzeni

Geliştirme `develop` dalında yürütülür; `main` dalına yalnızca açıkça istendiğinde aktarılır.
