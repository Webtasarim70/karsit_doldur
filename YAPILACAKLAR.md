# Karşıt Doldur — Yapılacaklar

> Geliştirmeler `develop` dalında yapılır; `main`'e aktarım yalnızca açıkça istenince.
> Her adım kullanıcı testi ve onayıyla tamamlanır; onaylanmadan sonraki adıma geçilmez.

## Adımlar

- [x] **Adım 1 — e-Karşıt PDF** (onaylandı): salt okunur gösterim; Ç telefon notu; 4 farklı PDF'te doğrulandı
- [x] **Adım 2 — Arşiv** (onaylandı): yalnızca bu tutanağın gerektirdiği kayıtlar, "Arşivde var/yok"; VKN uyuşmazsa devam edilemez
- [x] **Adım 3 — KDV** (onaylandı): belge, yüklenen KDV Excel'i veya elle giriş; okunan değerleri elle düzeltme; kaynak seçimi; uyarılar
- [x] **Adım 4 — Muhtasar** (onaylandı): beyanname PDF (çoklu), yüklenen Excel, elle giriş/düzeltme
- [x] **Adım 5 — e-Berat ve yasal defterler** (onaylandı): e-Berat XML/PDF, yüklenen Excel, elle giriş (Envanter dahil), "berat süresi dolmadı"
- [ ] **Adım 6 — Satış muavini (120)** (geliştirildi; kullanıcı testi bekliyor): fatura eşleştirme, defter kayıt tarihi, yevmiye no, tahsilatlardan ödeme şekli önerisi (FIFO), yüklenen Excel, elle düzenleme
- [ ] **Adım 7 — Tedarikçi** (geliştirildi; kullanıcı testi bekliyor): İndirilecek KDV Listesi (xls/xlsx), 191 muavin doğrulaması, e-fatura XML (vergi dairesi, döviz), e-Karşıt Excel'i, VKN bazlı vergi dairesi, dönem başına en yüksek 10 alım, elle düzenleme/ekleme/çıkarma, "uygulanamaz"
- [ ] **Adım 8 — Elle girişler** (ortak, imalatçı; "imalatçı değildir" seçeneği)
- [ ] **Adım 9 — Kapsam ve çıktı**: 7 Excel + ZIP hazır (ilk sürüm); güncel arşiv çıktısı yok
- [ ] Diğer tablolar için de Excel yükleme (Adım 4-8; `excelTani` altyapısı hazır)
- [ ] "Uygulanamaz" durumu: tedarikçi için yapıldı (Adım 7); imalatçı için Adım 8'de
- [ ] Dolu cevap PDF'inden arşive aktarma (isteğe bağlı)

## Yapıldı

- [x] Plan, repo yapısı, test betikleri (`tests/run.js`, `tests/cikti.js`, `tests/pdf_ozet.js`)
- [x] e-Karşıt PDF okuyucu: 4 firma/yıl, toplam doğrulaması, fatura tablosu başlık sızıntısı giderildi
- [x] Arşiv okuyucu, kapsam hesabı, 7 Excel üretimi (gerçek şablon biçimi), ZIP
