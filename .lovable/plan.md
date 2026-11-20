# Black Friday açılış banner'ı – %75 indirim (BLACKROYALE75)

## Ne yapılacak
- Dikkat çekici, markaya uygun bir Black Friday banner'ı: "Tüm planlarda %75 indirim – Kasım sonuna kadar", geri sayım sayacı, kopyalanabilir **BLACKROYALE75** kodu ve "Hemen yararlan" butonu.
- Görüneceği yerler:
  1. Ana sayfa (giriş öncesi): sayfanın en üstünde büyük açılış banner'ı.
  2. Uygulama içi (giriş sonrası): üstte ince, kapatılabilir şerit (kapatma tercihi hatırlanır).
  3. Fiyatlandırma / abonelik ekranı: fiyatların yanında kampanya vurgusu.
- Buton ödeme ekranını açar; kod ödeme ekranına yazılmaya hazır (mevcut indirim kodu alanı kullanılır). Kod kopyala butonu da olur.
- 5 dilde metinler (mevcut dil desteğiyle).
- Kampanya 30 Kasım 23:59 (İstanbul saati) bitince banner kendiliğinden kaybolur.

## Dokunulmayanlar
- Fiyatlar, abonelik kuralları, deneme süresi, e-posta kampanya anahtarı ve veritabanı değişmez. Kod Polar'da tanımlı kabul edilir; doğrulamayı siz Polar'da yaparsınız.
- Site yayınlama sizin onayınızla.

## Teknik ayrıntılar
- Tek kaynaklı kampanya ayarı (`src/lib/campaign.ts`: kod, bitiş zamanı, aktiflik) ve bitiş kontrolü için küçük bir test (30 Kasım 23:59 İstanbul öncesi aktif, sonrası pasif).
- `BlackFridayBanner` bileşeni (hero ve şerit varyantı), semantik renk token'ları; `Index.tsx`, uygulama kabuğu (DashboardHeader civarı) ve abonelik/fiyat bileşenine yerleştirme.
- Checkout akışı zaten `allow_discount_codes` ile kod girişine izin veriyor; backend fonksiyonu değiştirilmez.
- Masaüstü ve telefon ekran görüntüleriyle doğrulama.
