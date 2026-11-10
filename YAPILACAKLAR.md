# Karşıt Doldur — Yapılacaklar

> Proje çalışma defteri. Geliştirmeler `develop` dalında yapılır; `main`'e aktarım yalnızca açıkça istenince.

## Bekleyen girdiler (test için)

- [ ] Örnek arşiv dosyası (`ARSIV_…xlsx`; veriler anonimleştirilebilir)
- [ ] KDV beyannamesi PDF, KDV tahakkuk PDF, muhtasar PDF
- [ ] e-Berat dosyası (XML veya PDF)
- [ ] Muavin (PDF veya Excel) ve e-fatura XML örnekleri
- [ ] Birden fazla e-Karşıt PDF örneği (çok fatura / çok sayfa)

## Aşama 1 — Yükleme ve PDF analizi

- [ ] Proje iskeleti (`index.html`, `css/`, `js/`) ve ekarsit'ten gereken modüllerin bağımlılık haritası
- [ ] Toplu yükleme ve belge türü tanıma
- [ ] e-Karşıt PDF analizi (A, B, C, Ç, sözleşme, fatura tablosu)
- [ ] Dönem kapsamı (fatura ayı, önceki ay, yıl)

## Aşama 2 — Arşiv ve eksik paneli

- [ ] Arşiv okuma ve VKN eşleşme kontrolü
- [ ] Tablo bazında arşiv/eksik durumu ve eksik paneli

## Aşama 3 — Belgelerden tamamlama

- [ ] KDV beyanname + tahakkuk birleştirme
- [ ] Muhtasar çalışan sayısı
- [ ] e-Berat (Yevmiye/Kebir)
- [ ] Muavin ile fatura bilgileri (kayıt tarihi, yevmiye no, ödeme şekli)
- [ ] Tedarikçi (aylık en yüksek 10 alım)

## Aşama 4 — Çıktı

- [ ] 7 Excel (gerçek şablon biçimi, tutarlar gerçek sayı)
- [ ] Arşiv güncelleme (fark onayı, ARŞİV dışı sayfaları koruma)
- [ ] ZIP çıktısı

## Aşama 5 — Belgeler ve test

- [ ] Geliştirici dokümanı
- [ ] Uçtan uca test (gerçek örneklerle)
- [ ] Mobil/tablet kontrolü

## Tamamlananlar

- [x] Plan hazırlandı (`PLAN.md`)
