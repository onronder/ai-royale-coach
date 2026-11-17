# PR #14 yayını ve yönetim ekranı düzeni

PR #14 projede (birleşme `0622673`). Plan, yayın notundaki sırayı izler. Her aşama ayrı kaydedilir; site yayını sizde kalır.

## 1. Yayın öncesi kontrol (salt okunur)
- Projedeki `0024_trial_conversion.sql` ve dört işlevin `0622673` ile aynı olduğunu doğrula.
- Uygulama testlerini, kampanya izni testlerini ve dönüşüm kabul testini geçici veritabanında sahte sağlayıcıyla çalıştır.
- Canlı veritabanında 0024'ün henüz uygulanmadığını katalogdan kontrol et.

## 2. Canlı veritabanı
- 0024'ü normal geçiş mekanizmasıyla tek seferde uygula (0009/0011'deki gibi; tekrar kopya eklenmez).
- Tablolar, işlevler, yetkiler ve geçiş geçmişini doğrula. Hata olursa dur ve tam nedeni bildir.
- Mevcut bir deneme, dönem sonu değişmiş bir abonelik ve ödeme zamanı belirsiz bir kayıtla raporu salt okunur kontrol et; kimlik veya adres göstermeden.

## 3. Dört sunucu işlevi
- `polar-webhook`, `backfill-polar-orders`, `create-checkout`, `send-email` aynı revizyondan dağıtılır.
- Basit erişim kontrolü: imzasız/anonim çağrılar reddedilmeli. Gerçek ödeme, gönderim veya backfill çalıştırılmaz.
- Polar anahtarının `customer_sessions:write` yetkisi gizli değer gösterilmeden kontrol edilir; doğrulanamazsa açıkça belirtilir.
- Dağıtım zamanı (UTC) ve revizyon yayın notuna yazılır.

## 4. Yönetim ekranı görsel düzeni (önizlemede)
Denemeler ve Geri Kazanım ekranları, yayın notundaki metne göre:
- Üstte üç özet: başlayan deneme (deneme ve ayrı hesap sayısı etiketli), yedi günü dolup ödeme yapan, tarihi belirsiz ödeme.
- Koç adımları ayrı: kartı gören, öneri isteyen, eşleşen maç sonucu alan.
- Filtreler: deneme sürüyor, yenileme kapalı, ödeme gecikmiş, geri kazanım adayı.
- "Uygulamada aday" ve "Bugün e-postaya uygun" ayrı başlıklar altında.
- Yükleniyor, hata ve ölçüm geçmişi yok için ayrı durumlar.
- Yalnızca mevcut veri kaynakları; yeni gelir hesabı yok. Beş dil korunur.
- Mobil ve masaüstü ekran görüntüleri örnek verilerle paylaşılır.

## 5. Sizin adımınız ve kabul
- Siteyi Lovable'dan yayımlarsınız; sonra Denemeler/Geri Kazanım, Koç ekranı ve ödeme kurtarma düğmesi salt okunur kontrol edilir.
- Polar müşteri oturumu ve ilk doğal ödemenin rapora yansıması o zaman doğrulanır.

## Kapsam dışı
Kampanya ayarları, teklif/deney açma, indirim, e-posta gönderimi, gerçek tahsilat, oyuncu kayıtlarını düzenleme, site yayını.
