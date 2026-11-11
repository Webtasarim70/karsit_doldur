# Karşıt Doldur — Yapılacaklar

> Proje çalışma defteri. Geliştirmeler `develop` dalında yapılır; `main`'e aktarım yalnızca açıkça istenince.

## Bekleyen girdiler (test için)

- [x] Örnek arşiv dosyası (`ARSIV_TUZLA…`, yalnızca ARŞİV 2025 sayfası)
- [ ] KDV beyannamesi PDF, KDV tahakkuk PDF, muhtasar PDF
- [ ] e-Berat dosyası (XML veya PDF)
- [ ] Muavin (PDF veya Excel) ve e-fatura XML örnekleri
- [x] İki e-Karşıt PDF örneği (1 fatura / 9 fatura)

## Aşama 1 — Yükleme ve PDF analizi

- [x] Modül yapısı (`js/01_ortak.js` … `js/04_kapsam.js`, `tests/run.js`); toptan kopyalama yerine küçük modüller (bkz. PLAN.md)
- [x] `index.html` ve arayüz iskeleti (PDF + arşiv yükleme, özet, dönemler, faturalar, kapsam)
- [ ] Toplu yükleme ve belge türü tanıma
- [x] e-Karşıt PDF analizi (A, B, C, Ç, birden fazla sözleşme, fatura tablosu, TOPLAM kontrolü)
- [x] Dönem kapsamı (fatura ayı, önceki ay, yıl)

## Aşama 2 — Arşiv ve eksik paneli

- [x] Arşiv okuma (karışık sayı biçimleri normalize) ve VKN eşleşme kontrolü
- [x] Tablo bazında arşiv/eksik durumu (komut satırı)
- [x] Eksik paneli (arayüz; yalnızca gösterim, belge yükleme Aşama 3)

## Aşama 3 — Belgelerden tamamlama

- [ ] KDV beyanname + tahakkuk birleştirme
- [ ] Muhtasar çalışan sayısı
- [ ] e-Berat (Yevmiye/Kebir)
- [ ] Muavin ile fatura bilgileri (kayıt tarihi, yevmiye no, ödeme şekli)
- [ ] Tedarikçi (aylık en yüksek 10 alım)

## Aşama 4 — Çıktı

- [x] 7 Excel (gerçek şablon biçimi, tutarlar gerçek sayı, defter/belge türü kodları); arşivde bulunan satırlarla
- [ ] Excel'lere belgelerden gelen eksik satırların eklenmesi (Aşama 3 bağımlı)
- [ ] Arşiv güncelleme (fark onayı, ARŞİV dışı sayfaları koruma)
- [x] ZIP çıktısı (arayüzde 5. bölüm)

## Aşama 5 — Belgeler ve test

- [ ] Geliştirici dokümanı
- [ ] Uçtan uca test (gerçek örneklerle)
- [ ] Mobil/tablet kontrolü

## Tamamlananlar

- [x] Plan hazırlandı (`PLAN.md`)
