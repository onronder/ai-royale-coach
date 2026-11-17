# Yönetim • Kayıttan gelire

- Ekran adımları (teklif görüldü, denemeyi başlat, fiyat penceresi, Polar'a devam) yalnız ilk edinimde, hesap başına ilk kez kaydedilir; ölçüm başlangıcından önceki kayıtlar "ölçülmedi" gösterilir. Polar ödeme bağlantısı yalnız sunucuda (`create-checkout`) kaydedilir; kart girildiğini kanıtlamaz.
- Mali adımlar yalnız `polar_orders` ve `trial_conversion_periods`'tan: pozitif net (`amount - refunded`) ödenmiş sipariş; paket değişimi ilk ödeme sayılmaz; ilk yenileme = ilk ödemeden sonraki ilk pozitif `subscription_cycle`.
- Tüm sayılar ve detay listeleri aynı SQL kaynağından (`revenue_cohort` + `revenue_metric_match`), bu yüzden KPI toplamı = detay toplamı. Raporlar bir "as of" anına göre okunabilir; sonradan gelen kayıtlar olgun kohortu değiştirmez.
- MRR: doğrulanmış Polar MRR kaynağı yok → "Veri yok" ve neden. Tahsilat para birimi başına ayrı, iadeler ayrı.
- Kampanya erişimi `admin_marketing_reach()` (0028) olduğu gibi gösterilir; "24–48 saat önce doğrulanmış, deneme yok" kitlesi ayrı sayılır ve gönderilebilir sayı sunucunun `marketing_decision` kararıdır.

## Test
- `bun test tests` (uygulama testleri; winback testi `WINBACK_PG` yalıtılmış Postgres ister)
- `REVENUE_API=http://127.0.0.1:8001 bun tests/integration/revenue/run.mjs` — yalnız atılabilir taslak arka ucu; sahte hesaplar oluşturur, gerçek API ile SQL işlevlerini çağırır, sonunda siler.

## Yayın sırası
1. Taslağı incele/kabul et → 0029 ve 0030 canlı veritabanına uygulanır (ölçüm başlangıcı o an).
2. `create-checkout` işlevini aynı sürümden dağıt.
3. Siteyi yayınla.
