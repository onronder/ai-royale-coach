# Revize karar: "İlk oturumda bir öneri, bir maç, bir sonuç"

Fiyat (4,99 USD/ay) ve 3 günlük Polar denemesi aynı kalır. İş üç faza bölünür; her faz ayrı onay ve ayrı yayın olarak ilerler. Bu plan onaylanınca **yalnızca Faz 1 (P0)** uygulanır.

## Faz 1 (P0) — Verilen sözü teslim et

### 1. "Yenilemeyi kapat" artık erişimi hemen bitirmez
- Ayarlardaki iptal, Polar'da aboneliği hemen sonlandırmak yerine **dönem sonunda bitecek** şekilde işaretler (Polar update: `cancel_at_period_end: true`).
- Deneme kullanıcısı ekranda gördüğü bitiş tarihine kadar denemeyi kullanır ve ücret alınmaz; ücretli kullanıcı ödediği dönemin sonuna kadar kullanır.
- Ayarlarda "Yenilemeyi tekrar aç" düğmesi (Polar update: `cancel_at_period_end: false`).
- Polar'dan "iptal geri alındı" bildirimi geldiğinde deneme kullanıcısı **deneme** olarak kalır (bugün yanlışlıkla `active` yazılıyor).
- Uygulama girişi, AI özellikleri ve Ayarlar aynı tek erişim kuralını kullanır: süre dolmamış deneme/ücretli abonelik = erişim; gerçekten sonlandırılmış veya süresi bitmiş = yeni AI üretimi kapalı.
- Geç veya çift gelen Polar bildirimleri, kullanıcının daha yeni aboneliğini bozmaz (olay zamanı ve abonelik kimliği kontrolü).
- İptal onay e-postası "Ücret alınmayacak · şu tarihe kadar kullanabilirsin" bilgisini doğru tarihle verir.

### 2. Kart ve ücret koşulları girişten önce açık
- Ana sayfa ve demo sayfasında iki net çağrı: "Kartsız demoyu incele" ve "Kendi destenle 3 gün dene · ardından 4,99 USD/ay".
- Yanıltıcı "ücretsiz / kart gerekmez" ifadeleri deneme bağlamından kaldırılır; 5 dilde aynı koşullar.
- Ana sayfada yazılan oyuncu etiketi kayıt ve ödeme boyunca korunur, tekrar istenmez.

### 3. Ödeme ve ürün olaylarını ölç
- Polar siparişleri tutar, müşteri, abonelik kimliğiyle ayrı kaydedilir; aynı sipariş iki kez sayılmaz. Sıfır tutarlı deneme faturaları gerçek ödemeden ayrılır.
- Ayrı olaylar: deneme başladı, yenileme kapatıldı, erişim bitti, ilk pozitif ödeme, yenileme.
- Ürün olayları: AI önerisi görüntülendi, AI üretimi başarısız, deneme kota reddi.
- Yeni kayıtlarda edinim kaynağı (UTM/referrer) saklanır; geçmiş hesaplar "bilinmiyor".
- Admin Trials panelinde: ilk pozitif ödeme oranı (deneme bitişinden 7 gün sonra), kota reddi sayısı, "rapor gördü → kota reddi → iptal" sırası.

### Kabul kontrolleri (Faz 1)
- Test aboneliğiyle: ilk dakikada yenilemeyi kapat → erişim sürüyor, AI çalışıyor, bitişte kapanıyor; yeniden aç → deneme durumu korunuyor.
- Çift bildirim testi tek kayıt üretiyor.
- Erişim kuralı için birim testleri (deneme, iptal edilmiş ama süresi süren, gerçekten bitmiş, ücretli).
- Polar'ın "yaklaşan tahsilat" hatırlatma ayarı açık mı — sizin Polar panelinden kontrol etmeniz gerekiyor (bizim erişimimiz yok).

## Faz 2 (P1) — İlk oturumda tamamlanabilir görev (sonraki onay)
- Otomatik profil özeti günlük deneme hakkından **düşülmez**; önbellek, hata, tekrar deneme, çift tıklama hak tüketmez.
- İlk görev: mevcut desteye göre bir kart değişikliği + gerekçe + aynı öneri hakkında bir takip sorusu.
- Hedef 5 maçtan **1 maça** iner: öneriden sonra doğru etiket ve önerilen desteyle oynanan ilk yeni maç eşleşir; skor, rakip deste, kupa değişimi gösterilir. Maç henüz gelmediyse "Yeni maçını bekliyoruz · son kontrol: …".
- Ön koşul: profil ve maç geçmişi ayrı güncelleme zamanı kullanır, maçlar oynandığı ana göre tekilleşir, eski sonuç yeni gibi gösterilmez; koç maç verisinde olmayan olayları anlatmaz.

## Faz 3 (P2) — Yenilemesi kapalı oyuncuya dönüş yolu (sonraki onay)
- İptal sonrası isteğe bağlı tek soru (ör. "Ücret alınmasın diye kapattım, denemeye devam edeceğim").
- İkinci gün uygulamada son görev; izin veren oyuncuya somut öneri/bekleyen maç sonucu varsa tek e-posta.
- Başarı ölçüsü: göreve dönüş ve ilk ödeme.

## Technical details (Faz 1)
- `cancel-subscription`: `DELETE` yerine `PATCH /v1/subscriptions/{id}` `{cancel_at_period_end: true}`; yeni `resume-subscription` (veya aynı fonksiyonda `action`) `false` ile. Polar dokümanı uygulama öncesi tekrar doğrulanır.
- `user_subscriptions`: yeni nullable kolonlar `cancel_at_period_end bool default false`, `canceled_at`, `ends_at`, `last_event_at`; webhook'ta `last_event_at` eskiyse güncelleme atlanır.
- `polar-webhook` `subscription.uncanceled`: Polar payload'undaki durum (`trialing`/`active`) kullanılır, sabit `active` yazılmaz.
- Tek kaynak erişim fonksiyonu `_shared/access.ts` (`checkAiAccess`, `get-subscription-status` bunu kullanır); `RequireSubscription` ve Ayarlar bu fonksiyonun sonucunu okur.
- Yeni tablo `polar_orders` (order_id unique, amount, currency, customer_id, subscription_id, billing_reason, created_at) + `product_events` (user_id, event_name, props, created_at), GRANT + RLS (admin okuma, kullanıcı kendi ürün olayını ekler, service_role tam).
- `profiles.acquisition_source` (nullable) — kayıtta localStorage'daki UTM/referrer yazılır.
- Geçmiş 33 `order.paid` olayı için Polar API'den sipariş tutarları çekilerek `polar_orders` doldurulur (tek seferlik backfill fonksiyonu).
