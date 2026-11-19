# Run maliyeti: kanıt ve uygulama sırası

Bu kayıt önce 35 maddelik doğruluk çalışmasının yerel kabulünü tamamlar; maliyet
değişiklikleri ayrı bakım sürümündedir. Üretimde ayar, cron, model, hak, ödeme
veya e-posta değişikliği yapılmadı. Gerçek AI çağrısı başlatılmadı.

## Kaynak ve kapsam

Kullanıcının paylaştığı 5–18 Kasım 2026 raporu ve
[aynı Lovable çalışma alanı görüşmesi](https://lovable.dev/chats/747b80fa-acb0-41ea-adc2-2812cc84487b)
incelendi. Aşağıdaki dönem tutarları rapor değerleridir; ham fatura dışa aktarımı
ve günlük kalemler bağımsız olarak yeniden toplanmadı. Kredi USD değildir.

| Proje | Run kredisi | Rapordaki bileşenler |
| --- | ---: | --- |
| AI Royal Coach (`f9094689-9188-4038-97e7-e0ac1a6b78dc`) | 25,77 | AI 14,71; compute 10,92; açıklanmayan bakiye 0,14 |
| Tap Race UX (`3c8ffdba-bb9e-4896-a917-df6ee7e24681`) | 2,68 | 34,46 instance-hour; yayımlanmamış proje |
| Strategic Growth Hub (`f1f6d236-b79e-4101-bdbf-10ae50094f78`) | 0,30 | Worker |

Proje toplamı 28,75; rapor başlığı 28,76. 0,01 farkın yuvarlama mı eksik kalem
mi olduğu ham kayıt olmadan belirlenemez. Build 403,65 ayrı tüketimdir; Run
iyileştirmeleri Build harcamasını azaltmış sayılmaz.

AI 14,71 = Astra 10,89 + Flash 3,82. Astra içindeki cache-write 9,64'tür
(10,89'un yaklaşık %88,5'i); 10,89'a ayrıca eklenmez. İki model farklı işler
yaptığı için bu toplamlar eşit kalitede önerinin birim fiyat karşılaştırması
değildir. Rapordaki 7–10 kredi tasarruf bir varsayım, gerçekleşmiş sonuç değildir.

## Canlıdan salt okunur doğrulama

19 Kasım 2026 16:38:58 UTC, Lovable Database SQL editor:

```sql
SELECT jsonb_build_object(
  'checked_at_utc', now() at time zone 'UTC',
  'campaign_sending_enabled', (SELECT sending_enabled FROM public.marketing_settings LIMIT 1),
  'jobs', (SELECT jsonb_agg(jsonb_build_object(
    'name', jobname, 'schedule', schedule, 'active', active,
    'command_md5', md5(command)) ORDER BY jobname) FROM cron.job),
  'old_grace_jobs', (SELECT count(*) FROM cron.job WHERE jobname IN
    ('check-grace-period-expiry', 'check-grace-period-expiry-hourly')),
  'ai_generation_table', to_regclass('public.ai_generation_attempts') IS NOT NULL
) AS audit;
```

Sonuç: kampanya **false**, AI generation tablosu **false**, eski grace işi **2**.
İki işin zamanlaması `0 * * * *`, ikisi de etkin. Sonraki salt okunur sorguda
`cron.job_run_details` son 24 saatte iş başına 24 kayıt ve 24 `succeeded` sonucu
verdi. Bu, cron SQL çağrısının sonucudur; HTTP hizmetinin yanıtını kanıtlamaz.
İlk görülen çalışma 18 Kasım 17:00 UTC, son çalışma 19 Kasım 16:00 UTC.

Diğer etkin işler: mesaj temizliği günlük 03:00; doğrulanmış welcome dakikada
bir; Polar eşitleme saatin 7/22/37/52. dakikalarında; ikinci gün koçluk 10 dakikada
bir. Bunlar bu düzeltmenin kapsamı dışındadır ve korunacaktır. Dolayısıyla iki
eski işi kaldırmak tek başına compute uyumasını veya 10,92 kredinin tamamının
tasarrufunu garanti etmez. Sabit 30 gün için 2 × 24 × 30 = 1.440 planlı çağrı
azalması beklenir; faturaya etkisi sonraki eşdeğer dönemde ölçülür.

`check-grace-period-expiry/index.ts`, 17 Ocak 2026 00:00 UTC sonrasında iş
yapmadan dönüyor. “Removed old jobs and paused dormant backend” sohbet başlığı
tamamlanma kanıtı değildir: açılan içerik işlem planıydı, eski işler canlıda duruyor.
Tap Race arka ucunun güncel pause durumu bu kontrolde doğrulanmadı.

## Mevcut AI kaydının kontrolü

Lovable AI ekranından önceden oluşmuş tek Astra koçluk yanıtı okundu; yeni
üretim yapılmadı. Ekran 0,17 kredi ve 7,5 saniye gösteriyordu. Kullanım JSON'u:

- input 3.167; output 71; toplam 3.238;
- cache-write 3.164; cache-read 0;
- yazma ayrıntısı `ttl_12h_tokens=0`, `ttl_30m_tokens=3164`;
- reasoning ayrıntısı açılmadı; bilinmeyen kaldı.

Bu tek kayıt bütün dönem için dağılım kanıtı değildir. Yanıttaki
`prompt_cache_retention=24h` ile TTL ayrıntısı farklıdır; bu gözlemden gerçek
faturalama politikası veya önbelleğin devre dışı bırakılabilirliği çıkarılmaz.
Yeni ölçüm kodu gerçek alan biçimini koruyor; anonim test fixture'ı
`tests/aiProviderUsage.test.ts` içinde. Kaynağın gösterdiği model ile istekte
seçilen model de ayrı tutulmalı; paneldeki bazı analiz kayıtları Gemini 3.8 Flash
gösterirken dönem raporu 2.5 Flash diyor. Model eşleştirmesi kesinleşmeden
güncel tarife ile geçmiş maliyet tahmini yapılmaz.

## Uygulama sırası ve kabul ölçütleri

1. **PR #26 doğruluk ve ölçüm:** aynı analizi tekrar üretmeme, belirsiz işte yeni
   çağrı açmama, gerçek süre/token/run kimliği. Yerel SQL, gerçek SDK ve sahte
   sağlayıcı testleri geçti. Henüz canlıda değil. Kapanış listesi
   `correctness-inventory-review.md` içinde.
2. **Ayrı küçük bakım PR'ı:** yalnız iki eski grace işi kaldırılır; başka cron'a
   dokunulmaz. İkinci uygulama zararsız olmalı, yeniden üretilebilir SQL testi
   ve yayın sonrası salt okunur job sayımı gerekir. Canlı uygulama ayrı aşama.
3. **Koçluk modeli/promptu:** farklı model veya kör token kısıntısı uygulanmaz.
   Mevcut 5 dil, keep/swap, eksik kart, düşük seviye, trial/ücretli/ücretsiz
   örneklerinde aynı girdilerle kalite karşılaştırması hazırlanır. Gerçek
   sağlayıcı deneyi için sınırlı bütçe belirlenmeden yeni ücretli çağrı yok.
   Kart sahipliği, seviyeler ve tek öneri doğruluğu kalite eşikleridir; eşdeğer
   çıktı sağlanırsa kredi/başarılı öneri ve p50/p95 süre ile model seçilir.
4. **Tap Race:** güncel proje/arka uç durumu ve bağımlılıkları doğrulanıp gerçekten
   kullanılmıyorsa duraklatma ayrıca uygulanır. 2,68 kredi gerçekleşmiş tasarruf
   olarak yazılmaz. Strategic Growth Hub'ın 0,30 kredisi için kör kapatma yok.
5. **Sonraki eşdeğer 14 gün:** proje başına Run, başarılı koçluk başına kredi,
   tekrar engellenen çağrı, ölçüm kapsamı, hata/oran ve p50/p95 süre izlenir.
   Trafik ve iş karışımı değişimi ayrıştırılır; Build ayrı raporlanır. Karşılığı
   bilinmeyen maliyetler sıfır yazılmaz; fatura/run-ID mutabakatı açık kalır.
