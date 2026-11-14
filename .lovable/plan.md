# Faz 1 ve 2 kapanış planı (inceleme raporuna göre)

Sıra raporla aynı: önce kullanıcıyı ve geliri etkileyen üç konu, sonra küçük maddeler, en son gerçek deneme hesabıyla kabul testi.

## 1. Eski sürümde takılan kullanıcılar
Uygulama kendini cihaza kaydedip önbellekte tutuyor (PWA). Bu yüzden eski kullanıcılar eski ekranı görmeye devam edebiliyor.
- Yeni sürüm yayınlanınca açık sekmeler yenilensin ve eski önbellek temizlensin. Sayfa açılırken yeni sürüm kontrol edilsin.
- Sayfanın ana dosyası hiç önbelleğe alınmasın, hep sunucudan gelsin.
- Kabul: daha önce siteyi kullanmış bir tarayıcı normal açılışta yeni dosyayı yüklüyor.

## 2. Gecikmiş "bitti" bildirimi yeni aboneliği kapatmasın
Şu an `subscription.revoked/ended` kullanıcı kimliğine göre tüm erişimi kapatıyor.
- Sadece bildirimdeki abonelik, kayıtlı aboneliğin kendisiyse işlem yapılsın. Farklı ya da daha yeni bir abonelik varsa bildirim kayda geçsin ama yok sayılsın.
- Erişim kapatma, deneme kullanıldı işareti ve e-posta aynı korumanın arkasına alınsın.
- Teste eklenecek: eski abonelik için gelen geç bildirim, yeni aktif ya da deneme aboneliğini değiştirmiyor.

## 3. Gelir kartı ve ilk ödeme hesabı
- Siparişlerde Polar'ın **net** tutarı saklansın, brüt yerine. Durum (paid/void/refunded) olduğu gibi kaydedilsin.
- Gelir sadece `paid` ve tutarı sıfırdan büyük siparişlerden hesaplansın. void, refunded ve sıfır tutarlılar ayrı sayılsın.
- "İlk ödeme" yalnızca şu durumda sayılsın: aynı aboneliğe ait, deneme bitişinden sonra gelmiş, paid ve pozitif ilk sipariş.
- Mevcut sipariş kayıtları Polar'dan yeniden çekilip düzeltilsin.
- Kabul: aynı dönem için kart 4 pozitif paid sipariş ve 27,92 USD net göstermeli, 10 uygun denemeden 0 ilk ödeme çıkmalı. Rapordaki sahte void örneği 0 ödeyen vermeli.

## 4. Süresi biten kullanıcıya kayıtlı özet
- Genel Bakış'ta süresi biten oyuncu ödeme ekranı yerine son kayıtlı profil özetini salt okunur görsün. Üstte "yeniden abone ol" uyarısı olsun.
- Yeni analiz üretimi kapalı kalsın.

## 5. Küçük Faz 1 maddeleri
- Ana sayfada yazılan oyuncu etiketi kayıt adımına taşınsın ve kayıttan sonra otomatik bağlansın.
- "Kredi kartı gerekmez / Ücretsiz kullanım / Ücretsiz Başla" metinleri 5 dilde düzeltilsin: "3 gün ücretsiz dene, ardından 4,99 USD/ay". Demo butonu ayrı kalsın.
- Polar'ın yaklaşan tahsilat e-postasının açık olduğu yalnızca senin Polar panelinden doğrulanabilir. Bunun için kontrol notu verilecek.
- Bağımlılık kilit dosyası güncellenecek, böylece temiz kurulum çalışacak.

## 6. Kabul testi (yönetici olmayan deneme hesabı)
Zincir: otomatik özet → öneri → takip sorusu → gerçek maç → sonuç → süre sonunda kayıtlı sonucu okuma.
- Kota ve erişim adımlarını test hesabıyla ben doğrulayacağım.
- Gerçek maçı oyunda senin oynaman gerekiyor. Sonucun ekrana düştüğünü ben kontrol edeceğim.

## Teknik ayrıntılar
- `vite.config.ts`: VitePWA'da `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches` açılacak. index.html network-first olacak, `controllerchange` olunca yeniden yüklenecek.
- `polar-webhook`: revoked/ended işlenirken `user_subscriptions.polar_subscription_id = event.data.id` koşulu aranacak. `amount = net_amount ?? total_amount`, ayrıca `tax`/`gross` sütunları eklenecek.
- Yeni bir migration gelir RPC'sini değiştirecek: `status='paid' AND amount>0`, `subscription_id` eşleşmesi ve `created_at >= trial_end`.
- Testler: geç bildirim koruması ve gelir/ilk ödeme kuralları (gerçek değerler).
