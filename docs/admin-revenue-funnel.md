# Yönetim • Kayıttan gelire

Hesap oluşturma ve ilk edinim adımları hesap başına ilk kez sayılır. Başlangıç günü filtreleri İstanbul saatiyledir. Ölçümden önce açılmış hesapların ekran adımları bilinmiyor olarak kalır. Polar bağlantısı sunucuda gözlenir. Bu, kart bilgisinin girildiğini göstermez. Ödeme kurtarma akışı ayrıdır.

Her adımın sayısı tekil hesapları gösterir. Önceki adımdan dönüşüm, karşılaştırılabilir hesaplarda iki adımı sırasıyla tamamlayanların ilk adımı tamamlayanlara oranıdır. Doğrudan ödeme bir deneme dönüşümü oluşturmaz. Sonuç listeleri aynı sorgudan gelir ve ayrıntılar açıldığı raporun zamanını kullanır.

Denemede D7, aynı abonelikte denemenin bitişinden yedi gün sonrasına kadar doğrulanmış pozitif ödemeyi ölçer (sağ sınır hariç). Henüz süresi dolmayanlarla tarihi belirsiz ödemeler ayrı gösterilir. Doğrulanmış ödeme ve mutabık kısmi iadeler döviz cinsine göre toplanır. Bilgisi eksik sipariş ayrıca sayılır. MRR kartı seçili kayıt grubundan bağımsızdır. Fittechs’in USD cinsinden raporlanan üç AI Royale ürünü için İstanbul gününe ait Polar Analytics MRR değerini gösterir. Yönetim bilgileri canlı kayıtlardan okunur. Daha sonra yapılan mutabakat, iade veya abonelik durumu değişikliği geçmiş kohortların güncel sonucunu değiştirebilir.

Kampanya erişimi doğrudan admin_marketing_reach() sonucudur. 24–48 saat önce doğrulanmış ve deneme başlatmamış hesaplar ayrı bir kitledir. İzin, abone erişimi ve güvenlik durumu ayrı boyutlardır. Gönderilebilir sayı için sunucunun kampanya kararı kullanılır.

## Yerel kabul

Aynı Unix soketiyle dış ağ dinlemeyen geçici PostgreSQL kullanılır. REVENUE_PG soket dizinini, REVENUE_PG_PORT portu belirtir (varsayılan 55432). `node tests/integration/revenue/run.mjs` tam geçiş zincirini kurar, sentetik hesaplarla gerçek raporları okur, 1000 ek kayıtla sorgu sürelerini verir ve kendi test veritabanını kaldırır. Testi gerçek sistem anahtarları gerektirmeden çalıştırın.

## Yayın

GitHub ana dalındaki 0029 ve 0030 yönetim geçişlerinin içeriği ve sırası korunur. Veritabanında hangi geçişlerin uygulanmış olduğunu kontrol edin. Eksik olanları sırayla uygulayın. 0031 kampanya gönderiminde hesap yaşını yeniden denetler. 0032 mevcut hesap ve edinim kayıtlarını koruyarak yönetim raporlarını günceller. Önceki hesabı kaldırılmış bir edinim kaydı varsa geçmiş kaydı korunur ve yabancı anahtar yeni kayıtları denetler.

Ardından bu sürümden `create-checkout` işlevini dağıtın ve ön yüzü yayımlayın. Veritabanı geçişi, işlev dağıtımı ve site yayını saatlerini ayrı kaydedin. Kampanya gönderim ayarı bu geçişlerden etkilenmez.

## Polar ödeme mutabakatı (0033)

Ücretli müşteri, seçilen kayıt grubunda iade sonrası pozitif bir ödenmiş siparişi olan tekil hesaptır. Kur çevrimi yapılmaz. Ödeme zamanı eksik olsa da doğrulanmış net tutar ilgili dövizin toplamına girer. Eksik tarih ayrıca gösterilir. Denemeden ödemeye geçiş aynı abonelikte deneme bitişinden sonraki doğrulanmış zamana dayanır. Sonucu belirsiz veya henüz değerlendirme süresi dolmamış bir deneme, ölçülen kayıp hesabına girmez. Bu dönemin filtresi hesapların kayıt tarihidir.

1. 0033 geçişini uygula ve aynı sürümden `backfill-polar-orders` işlevini dağıt. Mevcut Polar anahtarı AI Royale ürünleri için `orders:read` ve `events:read` erişimine sahip olmalı. Ürünler ödeme sayfasındaki `POLAR_PRODUCT_ID_1/2/3` ayarlarını kullanır.
2. `node --env-file=.env scripts/trial-reminder-schedule.mjs --polar-orders` çıktısını proje sahibi olarak bir kez uygula. Aynı görev adıyla yeniden kurmak görev sayısını artırmaz. Zamanlayıcı her 15 dakikada en fazla 50 siparişi eskiden yeniye eşitler ve son sayfadan sonra başa döner. Yönetimdeki eşitleme düğmesi tüm sayfaları tek seferde işler. Polar'a yalnızca okuma istekleri yapılır. Kampanya ayarlarına ve ödeme işlemlerine dokunulmaz.
3. Sistem kaynaklı `order.paid` olayının sipariş ve müşteri kimlikleri ile varsa abonelik ve ürün kimlikleri eşleşince olay zamanı kaydedilir. Eşleşmeyen kayıtlar sonraki taramada tekrar incelenir. Başarısız sayfa ilerletilmez. İlk tam taramayı ve hata halinde ilerlemeyi aşağıdaki salt okunur kontrollerle izle.

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname='polar-order-reconciliation';
SELECT next_page, queued_at, claimed_at, last_completed_at FROM public.polar_order_sync;
SELECT currency, count(DISTINCT user_id) AS customers,
       sum(public.polar_positive_net(status,amount,refunded_net_cents)) AS net_cents,
       count(*) FILTER (WHERE paid_at IS NULL) AS pending_dates
FROM public.polar_orders WHERE user_id IS NOT NULL AND public.polar_positive_net(status,amount,refunded_net_cents)>0
GROUP BY currency;
```

Son sorgu tüm hesapları kapsar. Yönetim paneli için aynı kayıt dönemi ve test hesabı filtresini seç. Üretim kanıtı için tarihleri sipariş kimliğiyle Polar sistem olaylarıyla karşılaştır. Elle tarih girme. Test için `REVENUE_PG=/path/to/socket node tests/integration/revenue/run.mjs` ve `bun test tests/polarReconciliation.test.ts` çalıştır.

## Polar Analytics MRR kartı

`polar-mrr` işlevini ön yüzden önce dağıt. Mevcut Polar anahtarı için `metrics:read` ve ödeme sayfasında kullanılan üç ürün kimliği gerekir. Yönetici ekranı açıkken değer 15 dakikada bir salt okunur yenilenir. Bu istek sipariş eşitlemesinden bağımsızdır. Yanıt yoksa kart hata ve yeniden deneme seçeneği gösterir. Doğrulanmış sıfır ayrı gösterilir.

Karşılaştırma için Polar Analytics’te aynı üç ürünü, İstanbul saat dilimini ve gün aralığını seç. O günün `Monthly Recurring Revenue` sütununu karşılaştır. CSV tutarları senttir. Yönetimdeki sipariş tutarı iadelerden sonra, Polar kesintilerinden öncedir. Polar Analytics’in `Net Revenue` ölçüsünün kapsamı farklıdır.
