# PR #26 ve #27 — Supabase bulut provası

19 Kasım 2026. Yalnızca `jmdtjtpymxjkprugqoqu`. Bu kayıt üretim geçiş onayı
değildir. Canlı veritabanı, canlı Edge işlevleri, yayın, Google istemcisi,
Polar ve Resend ayarları değiştirilmedi. Kampanya gönderimi kapalı kaldı.

## İncelenen sürümler

- #26 uygulama/test kaynağı: `3c4c54313ed9c7bf53a9fcfc8b8a05def9139f81`.
- #27 migration/test kaynağı: `e22f91e689115db5b4b3886e462394a3216ad850`.
- Başlangıç main: `7696d68a3da4071c323526d9064b8059040f830b`.
- Bu kabul sonrasındaki ek commit'ler yalnızca kabul belgeleridir; test edilen
  uygulama, SQL, işlev ve test içeriği değiştirilmedi.

Makine kaydı ve SQL/kaynak/kanıt özetleri:
[`correctness-cloud-acceptance.json`](correctness-cloud-acceptance.json).
Önceki yerel kabul sayıları `correctness-acceptance.json` ve
`correctness-platform-acceptance.json` içinde kendi tarihleriyle korunur.

## Bulutta geçen kontroller

| Kontrol | Sonuç |
| --- | --- |
| 0040 | Önceden uygulanmış final SQL içeriği doğrulandı; üretim iş kayıtları boş |
| 0041 | Hedefe uygulandı; eski değerler korunuyor, yeni gözlem tabloları boş |
| Mevcut veriler | 75 tablo, 25.160 satırın eski alanlarının kanonik içerik özeti başlangıçla aynı |
| Hesap / kimlik | 900 kullanıcı ve 901 kimlik aynı; mevcut hesapla giriş yapılmadı |
| Ödemeler / haklar | Abonelik, sipariş, profil, ücretsiz görev ve izin tablolarının eski içerikleri aynı |
| Gerçek SQL doğruluk | 12 kontrol; tekil maç, eski pencere, hesap/etiket ayrımı, öneri sonucu, bilinmeyen ölçüm, profil yetkisi ve kampanya kapısı |
| Gerçek AI iş kaydı SQL'i | claim/pending/replay/uncertain ve istemci yetkileri geçti; sentetik maliyet örneği transaction ile geri alındı |
| Edge dağıtımı | Aynı kaynak kopyasından 39 işlev ACTIVE; JWT ayarları kaynakla eşit; kaynak kopyasının 85 dosyası hash ile doğrulandı |
| Gerçek Auth / erişim | Ücretsiz, trial, ücretli, süresi dolmuş, past_due, yönetici, yenilemesi kapalı trial: 7/7 |
| RLS / güvenlik | Trial alanı yazılamıyor; kendi dil tercihi yazılabiliyor; diğer hesap okunamıyor; normal kullanıcı admin işlevlerini kullanamıyor |
| E-posta yetkisi | Yedi hesap türünün hiçbiri genel işlemsel göndericiyi çağıramıyor; gerçek gönderim yapılmadı |
| Tarayıcı | Yerel uygulama → gerçek prova Auth/REST: 7 parola girişi ve tercihler sayfası; TR, 390/1280 genişlik, hata veya beklenmeyen hedef yok |
| Ücretsiz üretim | Gerçek Edge durum okuması üretimin kapalı olduğunu doğruladı; var olan hak reset'lenmedi |
| 0042 | Cron'suz hedefte güvenli no-op; ayrıca gerçek pg_cron ile 2 eski işi kaldırdı, ilgisiz işi korudu ve tekrar çalıştı |

Eski satır karşılaştırmasında yalnız 0041'in dört mevcut tabloya eklediği yeni
alanlar dışarıda bırakıldı. Eski iş değerleri değiştirilerek test geçirilmedi.
Cron testi tek transaction içindeydi: üç inert `SELECT 1` işi commit edilmeden
pasif yapıldı, gerçek migration iki eski adı kaldırdı, ardından tüm test ve
geçici pg_cron kurulumu geri alındı. Hiçbir zamanlayıcı işi çalışmadı.

Önceki yerel kabulde 189 uygulama testi; 59 ücretsiz akış, 41 pazarlama, 25 geri
kazanım, 93 gelir kontrolü; 39 Edge tür kontrolü; gerçek yerel platformda 12 akış
kontrolü ve beş dilde tarayıcı senaryoları geçti. Bu turda bunların kaynak kodu
değişmedi. Bulut testi gerçek AI üretimi veya ödeme başlatmadı; başarılı tam
ücretsiz öneri → maç eşleşmesi kanıtı, gerçek yerel runtime + sahte sağlayıcı
çalışmasından gelir.

## Test kurulumu ve kanıt sınırları

- Genel kayıt ve gerçek Google sağlayıcısı kapalı tutuldu. Auth giriş hook'u
  yalnızca yedi sentetik hesabı kabul etti; izin listesinde olmayan giriş 403
  verdi. Geçici REST ön kontrolü anonim ve liste dışı kullanıcıları engelledi.
- Gerçek sağlayıcı anahtarı eklenmedi. `send-email` modülünün kurulumu ve ücretsiz
  durum okuması için iki **geçersiz test değeri** kısa süreli kullanıldı; hiçbir
  gönderim/üretim eylemi çağrılmadı. Sonrasında ikisi de kaldırıldı.
- İlk 39 işlev matrisi yalnız varlık/OPTIONS/kimliksiz giriş yollarını kontrol
  eder. Sağlayıcı ayarı olmayan altı işlev (`clash-royale-api`, `search-clans`,
  `lookup-discount`, `polar-webhook`, `resend-webhook`, `send-email`) yapılandırma
  hatası verdi. Bu sonuçlar gizlenmedi ve iş akışı başarısı sayılmadı.
  `send-email` yetki yolu geçersiz test anahtarıyla ayrıca 7/7 doğrulandı.
  Tam başarılı dış servis yolları yerel sahte sağlayıcı kabulünün kapsamındadır.
- CLI üzerinden dağıtılan kaynağı geri indirme işlemi, endpoint'in
  `application/octet-stream` dönmesine karşı CLI'nin multipart beklemesi nedeniyle
  başarısız oldu. **Uzak bundle hash eşitliği iddia edilmiyor.** Gönderilen dosya
  hash'leri, başarılı dağıtım kaydı, 39 uzak ACTIVE sürümü/JWT ayarı ve gerçek
  runtime sonuçları mevcut. Dağıtım zamanı: **17:33:58.992 UTC**.
- İlk tarayıcı testindeki `**/settings/email` kalıbı giriş URL'sinin sorgu
  parametresini de eşleştirmişti. Test gerçek `/select-player` yönlendirmesini
  bekleyip tercihler sayfasını açacak şekilde düzeltildi; uygulama veya beklenen
  erişim hakları değiştirilmedi. Son yedi senaryo geçti; ekranlar incelendi.

## Temizlik ve son izolasyon

- Yalnız yedi sentetik kullanıcı ve onlara ait admin/abonelik satırları silindi.
  Son karşılaştırmada mevcut 75 tablo / 25.160 satır tekrar eşit çıktı.
- Oturum, refresh token ve giriş izin listesi: **0**.
- Geçici REST ayarları geri alındı; public şema anonim istekten **406/PGRST106**
  döndürüyor. Genel kayıt kapalı, Google kapalı.
- Kampanya gönderimi **false**; prova ücretsiz yeni üretim anahtarı **false**.
- AI iş kaydı ve iki yeni gözlem tablosu boş. Cron/net/http eklentileri yok.
- Kalan özel sağlayıcı anahtarı **0**; sadece Supabase'in dağıtım sırasında
  oluşturduğu standart `SUPABASE_*` değerleri var. Yerel uygulama sunucusu durdu.
- Hedefte 0040/0041 ve 39 işlev sonraki prova için kalır. Gerçek sağlayıcılar,
  zamanlayıcılar ve dış yönlendirmeler açılmadı.

## Birleştirme ve üretim ayrımı

Bu sonuç, kullanıcının istediği **yalıtılmış prova sonrası GitHub birleştirmesi**
için kabul kaydıdır. Üretim SQL uygulaması, Edge dağıtımı ve site yayını bu işin
parçası değildir; her biri ayrıca onaylı geçiş gerektirir.

Tam Google girişi bu yeni uygulama sürümüyle, fiziksel mobil kritik yollar ve
gerçek sağlayıcı run-ID/fatura mutabakatı hâlâ dış kabul kapsamındadır. Önceki
Google prova kanıtı eski sürüme aittir. Kaynakta aktif Hero/slot bilgisi yoksa
bilinmeyen kalır. Bu sınırlar “35/35 canlıda kapandı” şeklinde sunulmaz.
