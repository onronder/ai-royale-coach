# Eski grace işleri: ayrı bakım yayını

## Neden

`check-grace-period-expiry` işlevi 17 Ocak 2026'dan beri iş yapmadan dönüyor.
19 Kasım 2026 16:38:58 UTC salt okunur canlı kontrol, iki saatlik işin hâlâ
etkin olduğunu gösterdi. Son 24 saatte iş başına 24 cron çalışması vardı.
Bu durum Lovable raporundaki “Removed old jobs” başlığına rağmen devam ediyor.

Bu PR yalnız `0042_retire_expired_grace_jobs.sql` ile iki kesin adı kaldırır:
`check-grace-period-expiry`, `check-grace-period-expiry-hourly`. Görev farklı bir
uç için yeniden kullanılmışsa işlem hata verir ve tamamı geri alınır. Cron'suz
izole hedefte ve ikinci çalıştırmada işlem yapmaz. Geçmiş migrationlar veya
eski endpoint silinmez. Mevcut ücretsiz/trial/ücretli haklar değişmez.

## Doğrulama

`tests/integration/runCosts/retire-grace.py`: geçici, TCP kapalı PostgreSQL'de
gerçek migration ile 5 kontrol. Welcome, trial reminder, Polar ve mesaj temizliği
satırları birebir korunur; tekrar/eksik cron/tek kalan iş/yeniden kullanılmış iş
ve transaction geri alma kontrol edilir. Zamanlayıcı taşıyıcısı sahtedir.

19 Kasım 2026 ek bulut kabulü: `jmdtjtpymxjkprugqoqu` üzerinde
`e22f91e689115db5b4b3886e462394a3216ad850` kaynağındaki 0042 çalıştırıldı.
Cron'suz izole hedefte işlem yapmadı. Ayrı, geri alınan bir transaction içinde
gerçek `pg_cron` kuruldu; üç inert test işi commit edilmeden pasif yapıldı.
Migration iki eski adı kaldırdı, ilgisiz pasif işi korudu; ikinci çalıştırma
da geçti. Transaction geri alındı: hiçbir iş çalışmadı, cron eklentisi/job
bırakılmadı. PR #26 ile aynı prova sonunda 75 tablonun 25.160 eski satırı
başlangıçla aynı, kampanya kapalı. Detaylar #26'nın
`docs/correctness-cloud-rehearsal.md` ve `correctness-cloud-acceptance.json`
kayıtlarında. Gerçek üretim zamanlayıcıları bu tur değiştirilmedi.

## Sıra

Önce doğruluk PR #26'nın onaylı prova kabulü tamamlanır; bu bakım ayrı uygulanır.
Prova sonrası birleşme kullanıcı tarafından onaylıdır; üretim geçişi ayrı kalır.
0042, 0040/0041'e teknik olarak bağımlı değildir; numara çakışmasını önler.

1. GitHub birleşmesi: prova kabulünden sonra #27 üzerinde yapılır; kesin merge SHA
   ve UTC zamanı GitHub PR kaydında tutulur. Birleşme üretim SQL uygulaması değildir.
2. Üretim SQL uygulaması: **bekliyor**. Önce iki işin ve diğer dört işin özel
   yedeğini al (komutlarda gizli değer bulunabilir; Git'e veya loga yazma).
   İncelenen 0042'yi tek işlem olarak uygula. Kampanya anahtarına dokunma.
3. Edge deploy/site publish: **gerekmiyor**; uygulama kodu veya model değişmez.
4. Salt okunur son kontrol: eski iş sayısı 0; diğer işlerin schedule/active/
   command özeti aynı; kampanya kapalı. Sonraki saatlerde eski işler için yeni
   run kaydı oluşmadığını doğrula. Eski run geçmişi silinmez.

```sql
SELECT jobname, schedule, active, md5(command) AS command_md5
FROM cron.job ORDER BY jobname;
SELECT sending_enabled FROM public.marketing_settings;
```

Bir geri alma gerekirse sadece bu iki iş özel yedekten eski ayarlarıyla tekrar
kurulur; bütün cron tablosu geri yüklenmez. Model ve diğer projeler değiştirilmez.

## Maliyet sınırı

Beklenen azalma sabit 30 gün için 2 × 24 × 30 = 1.440 planlı çağrıdır. Bu bir
kredi veya USD tasarruf ölçümü değildir. Dakikalık welcome ve diğer gerekli işler
çalışmaya devam eder; compute uyuması ve rapordaki 10,92 kredinin tamamının
tasarrufu vaat edilmez. Gerçek etki eşdeğer trafik ve dönemde faturadan ölçülür.
