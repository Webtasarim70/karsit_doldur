# Karşıt Doldur — Yapılacaklar

> Geliştirmeler `develop` dalında yapılır; `main`'e aktarım yalnızca açıkça istenince.
> Her adım kullanıcı testi ve onayıyla tamamlanır; onaylanmadan sonraki adıma geçilmez.

## Adımlar

- [ ] **Adım 1 — e-Karşıt PDF** (geliştirildi, onay bekliyor): salt okunur gösterim (A, B, C, Ç, sözleşme, fatura listesi, dönemler); Ç telefon notu; 4 farklı PDF'te doğrulandı
- [ ] **Adım 2 — Arşiv** (ilk sürüm var; adım 1 onayından sonra gözden geçirilecek)
- [ ] **Adım 3 — KDV beyanname + tahakkuk** (eski ve yeni biçim)
- [ ] **Adım 4 — Muhtasar**
- [ ] **Adım 5 — e-Berat** (XML ve görüntüleme PDF'i)
- [ ] **Adım 6 — Satış muavini (120)**: defter kayıt tarihi, yevmiye no, ödeme şekli
- [ ] **Adım 7 — Tedarikçi** (191 muavin, indirilecek KDV listesi, e-fatura XML)
- [ ] **Adım 8 — Elle girişler** (ortak, defter, imalatçı; "imalatçı değildir" seçeneği)
- [ ] **Adım 9 — Kapsam ve çıktı**: 7 Excel + ZIP hazır (ilk sürüm); güncel arşiv çıktısı yok
- [ ] "Uygulanamaz" tablo durumu (imalatçı değildir vb.)
- [ ] Dolu cevap PDF'inden arşive aktarma (isteğe bağlı)

## Yapıldı

- [x] Plan, repo yapısı, test betikleri (`tests/run.js`, `tests/cikti.js`, `tests/pdf_ozet.js`)
- [x] e-Karşıt PDF okuyucu: 4 firma/yıl, toplam doğrulaması, fatura tablosu başlık sızıntısı giderildi
- [x] Arşiv okuyucu, kapsam hesabı, 7 Excel üretimi (gerçek şablon biçimi), ZIP
