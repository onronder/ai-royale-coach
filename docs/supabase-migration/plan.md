# AI Royale — yönetilen Supabase geçiş planı ve prova

Tarih: 18 Kasım 2026. İncelenen kaynak: `bb618be1ad53c118e0293009320f34465b411e97`.

Bu aşamanın yetkisi: planlama, ayrı ortam hazırlığı ve prova. Canlı uygulamaya, canlı veritabanına, ödemelere, e-posta tercihlerine, webhooks veya zamanlayıcılara değişiklik yapılmaz. Canlı geçiş ayrıca kararlaştırılır. Kampanya gönderimi kapalı kalır. Kullanıcının yeniden giriş yapması kabul edilen etkidir; veri kaybı veya hakların sıfırlanması kabul edilmez.

## 1. Ortamlar ve yapılan hazırlık

| Ortam | Kimlik | Bu aşamadaki kullanım |
| --- | --- | --- |
| Mevcut Lovable Cloud | `vraqbzokccvqhthixoof` | Kaynak; bu hazırlıkta canlı sorgu/işlem yapılmadı |
| Kullanıcının açtığı Supabase | `jmdtjtpymxjkprugqoqu` | Yalnızca prova; Frankfurt `eu-central-1`; panelde adı `AI_Royale` |
| Yerel prova | Geçici, TCP kapalı PostgreSQL | Sahte hesaplarla gerçek uygulama SQL'i ve yedekleme/geri yükleme kontrolü |

Yeni Supabase projesinde 18 Kasım kontrolünde: PostgreSQL 17.12; 0 kullanıcı, 0 public tablo, 0 depolama kovası ve 0 Edge Function. Sağlayıcı bağlantısı kurulmadı, uygulama bu projeye yönlendirilmedi. Yönetim erişimi mevcut; veritabanı parolasını sohbetten istemek gerekmedi. CLI için kaynak uygulama klasöründen ayrı `/tmp/ai-royale-target-rehearsal` çalışma alanı bağlandı. Yönetim CLI'si hedefte geçici giriş rolünü hazırlayabilir; kaynak projeye bağlanılmadı.

İlk prova projesi gerçek müşterilere açılmayacak. Gerçek kişisel veriler yüklenmeden önce erişim ve çıkış izolasyonu tamamlanacak. Prova sonrası aynı projeyi otomatik olarak canlı saymayacağız: sentetik kayıtların bulunmadığı, aynı bölgede temiz bir son hedef tercih edilir. Provanın gösterdiği gerekçeyle bu hedef yeniden kullanılacaksa temizleme ve son veri yükleme ayrı makbuzla doğrulanır.

Önceki maç geçmişi çalışması PR #22'de taslak olarak kalır. Bu geçişin başlangıç şemasına 0038 veya yeni koçluk hafızası eklenmez.

## 2. Kaynak incelemesinde bulunan taşıma kapsamı

`source-inventory.json` dosya parmak izleriyle yeniden üretilebilir kaynak envanteridir; canlı dağıtım listesi değildir.

- 39 Edge Function giriş dosyası.
- `supabase/migrations` altında 59, `drizzle/migrations` altında 38 SQL dosyası. Drizzle sırası ayrıca `_journal.json` ile tutuluyor. İki geçmişi dolu bir veritabanına topluca yeniden çalıştırmak yasak.
- 14 işlev/paylaşılan dosyada Lovable AI anahtarı veya gateway bağımlılığı var. Bir kısmı JSON, sohbet SSE, koçluk yapılandırılmış çıktı ve NDJSON kullanıyor.
- Kaynakta üç kurulum adı açıkça var: `confirmed-account-welcome` (dakikada), `trial-coaching-day-two` (10 dakikada; özet kontrolü de bu işten), `polar-order-reconciliation` (saatte 7/22/37/52. dakikalar). Eski geçişlerde başka zamanlayıcı/HTTP tanımları bulunuyor; gerçek etkin işler ayrıca envantere alınmalı.
- `.env` Git'te izleniyor. Prova derlemesi varsayılan dosyayla başlatılırsa eski sunucuya bağlanabilir. Kaynak `.env` kopyalanmaz; ayrı, Git dışında hedef ayarları ve ağ kontrolü kullanılır.
- `send-email` içinde eski `lovableproject.com` adresi, birçok işlevde canlı site bağlantıları bulunuyor. Bunlar yalnızca metin değiştirmeyle geçişin tamamlandığını göstermiyor: eski e-posta bağlantılarının yaşam süresi ayrıca ele alınmalı.
- Bazı işlevlerin kimlik doğrulama ayarı config içinde yok veya platform varsayımına bağlı olabilir. 39 işlevin tamamı için mevcut doğrulama davranışı ve hedefteki JWT uyumu doğrulanacak.
- Kaynaktaki yayın notlarının bazıları eski “bekliyor/kapalı” durumlarını taşıyor. Bunlar güncel canlı ayarların yerine kullanılmayacak.

## 3. Provanın izolasyonu — veri yüklemeden önce

1. Proje kimliği kontrolü her uzaktan işlemden önce zorunlu. Hazırlanan `check_target.py` yalnızca yeni hedefe sabit salt okunur sorguyu çalıştırır; canlı proje kimliğini reddeder. Bu araç geri yükleme veya genel SQL çalıştırma aracı değildir.
2. Hedefte canlı Resend/Polar/oyun/AI anahtarı, SMTP, OAuth üretim sırrı, kaynak service-role/JWT anahtarı veya Vault verisi yüklenmez. Testte sahte sağlayıcı veya sağlayıcının ayrı test ortamı kullanılır. Key adları envanterlenir; değerler rapora/Git'e girmez.
3. Gerçek kullanıcılar içeri alınmadan hedef Auth kayıt akışı ve dış e-posta yolu kapatılır/yerel yakalayıcıya bağlanır. Varsayılan Supabase e-posta göndericisinin de dışarıya çıkış olabileceği dikkate alınır; yalnızca Resend anahtarının olmaması yeterli kabul edilmez.
4. Cron, pg_net kuyrukları, veritabanı webhook'ları ve auth kullanıcı tetikleyicileri çalışır halde topluca taşınmaz. Kaynak SQL içindeki sabit URL/anahtarlar incelenmeden hiçbir tarihsel migration çalıştırılmaz.
5. İlk arşiv incelemesi dış ağa çıkamayan yerel ortamda yapılır. Yalnızca gözden geçirilmiş şema/data/post-data nesneleri hedefe alınır. `cron.job`, HTTP kuyrukları, Vault sırları, eski oturumlar ve platform iç tabloları körlemesine geri yüklenmez.
6. İzin kanıtları ve gönderim kayıtları aynen korunur. Provanın `marketing_settings.sending_enabled=false` ve yeni ücretsiz AI üretiminin kapalı olması bir ortam farkıdır; bu farklar kaynak karşılaştırmasında açıkça listelenir. Hiçbir kullanıcıya “iznini geri çekti” olayı eklenmez.
7. Tarayıcı provasında yalnızca hedef alan adı/yerel sahte servisler kabul edilir. Eski Cloud, canlı Polar/Resend ve Lovable AI'ye tek beklenmeyen istek testi başarısız kılar. Otomatik panel analizleri dahil.

Bu koşullar kurulmadan gerçek hesap verisini yeni buluta yüklemeyeceğiz. Boş proje kontrolü izolasyonun tamamlandığı anlamına gelmez.

## 4. Taşınacak verinin korunma matrisi

| Alan | Korunacak kayıt ve ilişki | Kabul ölçütü |
| --- | --- | --- |
| Hesaplar | `auth.users`, sağlayıcı kimlikleri, UUID, doğrulama, gerekli parola bilgileri, profil ve yönetici rolleri | UUID aynı; e-posta/Google girişi doğru hesaba bağlanır; yeni hesap oluşmaz |
| Güvenlik | RLS, tablo/işlev yetkileri, service-only işlevler, engel kayıtları | Anonim/yabancı hesap okuyamaz; yönetici yetkisi artmaz; engelli hesap açılmaz |
| Oyuncular | `player_profiles`, AI hesap seçimi, etiket claim/bağlantıları | Üç etiket sınırı ve satın alınan AI kapasitesi aynı |
| Ücretsiz hak | `first_value_accounts/calls/events/errors/rate_limits/settings`, görev bağlantısı | Kullanılmamış hak korunur; kullanılmış/belirsiz hak yeniden üretilemez; ilk açılma tarihi korunur |
| Trial ve ücretli | `user_subscriptions`, deneme geçmişi, eski trial profil alanları, kullanım/rezerve çağrı kayıtları | Aynı UTC anında erişim kararı ve limitler aynı; yenilemesi kapalı kişi dönem sonuna kadar erişir |
| Koçluk | `coaching_tasks`, çeviriler, görüldü zamanı, önerilen sekiz kart, sonuç ve önceki maç | Kayıtlı öneri tekrar üretilmez; eski maç yeni görevi tamamlayamaz; farklı oyuncu sonucu karışmaz |
| Ödemeler | Polar müşteri/abonelik/sipariş kimlikleri, webhook olayları, para birimi, iade, ödeme zamanı ve belirsizlik işaretleri | Yeni abonelik/ödeme oluşturulmaz; aynı kapsamda müşteri/gelir/iadeler eşleşir; eksik tarih kayıp sayılmaz |
| İzin ve mahremiyet | Consent event/proof/metin sürümleri, adres bazlı tercihler, pazar/yaş/IYS bilgileri, suppression, privacy requests | Mevcut seçim ve kanıt aynı; taşıma bir onay olayı oluşturmaz; eski çekilme yeni adrese yanlış uygulanmaz |
| E-posta tekilliği | `confirmed_welcome`, `welcome_cutover`, trial followup/summary kayıtları, `marketing_deliveries`, attempt anahtarları | Cutoff değişmez; kabul edilmiş/belirsiz kayıt yeni gönderime dönüşmez; ilk kabul ve 720 saat hesabı korunur |
| Ürün verisi | Analizler, sohbetler, koleksiyon/desteler, başarılar, turnuvalar ve kaynakta bulunan diğer public tablolar | Seçilmiş örnekler yanında tüm tablo/PK/FK karşılaştırması; sessiz dışlama yok |
| Dosyalar | Bucket tanımları, politikalar, nesne sahipliği/yolları ve gerçek dosya baytları | Sayı/boyut/hash eşleşir; uygulamadaki dosya bağlantıları açılır |
| Ölçüm | Acquisition/trial/revenue olayları, test hesabı işaretleri ve cohort başlangıçları | Geriye dönük yeni kayıt/deneme/başarı olayı oluşmaz; rapor filtreleri aynı sayıları verir |

Oturumlar yeniden kullanılmayacak. Henüz kullanılmamış doğrulama, şifre sıfırlama ve OAuth callback bağlantıları eski sunucuya dönebilir; bunlar açıkça test edilip kullanıcıya yeni bağlantı alma yolu sunulur. Eski sunucu kapatılarak bu bağlantılar sessizce boşa düşürülmez.

## 5. Gerçek kaynak yedeği ve geri yükleme sırası

**Gerekli girdi:** Lovable'ın tam veritabanı dışa aktarımı, bunun kaynak proje kimliği/sürümü/zamanı ve ayrı Storage dosyaları. Kullanıcıdan arşivin yerel dosya yolu istendi; bu hazırlıkta kaynak yedeği indirilmedi. Arşiv parola özetleri ve kişisel veriler içerebilir; özel klasörde, sınırlı erişimle tutulur, sohbete/Git'e yüklenmez. Prova tamamlanınca kopyaların silinme zamanı kaydedilir.

1. Arşivin SHA-256 değeri ve boyutu kaydedilir. PostgreSQL sürümü, arşiv biçimi ve sıkıştırması doğrulanır. `inspect_archive.py` yalnızca içindekiler listesini okur; veri açma başarısı veya güvenli geri yükleme onayı vermez.
2. Kaynak arşiviyle Supabase ve Drizzle uygulanmış migration kayıtları karşılaştırılır. Kaynakta olup Git'te olmayan nesneler ayrı fark listesine girer. `0037` gibi boş tetikleyici makbuzlar tekrar çalıştırılacak iş gibi yorumlanmaz.
3. Yönetilen `auth`, `storage`, `realtime`, platform rolleri/uzantıları için hedef sürümüyle uyum kontrol edilir. Hedefin sistem şemaları topluca silinmez; `--clean` veya tüm rolleri körlemesine taşıma kullanılmaz.
4. Yerelde incelenmiş, sürüme bağlı geri yükleme nesne listesi hazırlanır: uygulama pre-data → seçilmiş kullanıcı/uygulama data → sequence değerleri → constraint/index/policy/grant ve güvenli trigger'lar. Kullanıcı ekleme tetikleyicileri veri kopyasında çalışarak ikinci profil, welcome veya consent olayı üretmemeli. Gerçek hedefte tetikleyici kontrolü yetkisi ayrıca denenir; yetki yoksa sessizce devam edilmez.
5. Hedefte uygulama anahtarları/işleri kapalıyken şema ve veri yüklenir. İçe aktarma hata verirse kısmi veritabanı “tamamlandı” sayılmaz; hata ve geri alma sonucu kaydedilir.
6. Karşılaştırma aynı kaynak snapshot'ına karşı yapılır. Prova sürerken canlıya yeni kullanıcı gelmesi beklenir; o sıradaki güncel canlı toplamla kör karşılaştırma yapılmaz.
7. Gerçek SMTP/Polar/AI bağlamadan API, erişim ve senaryo testleri tamamlanır. Gerçek kullanıcı parolası istenmez; izin verilen işletmeci test hesabı veya sentetik hesapla oturum doğrulanır.

## 6. Mutabakat: satır sayısı yeterli değil

- Her taşınan tablo için satır sayısı, PK kümesi ve belirlenen sütunların kanonik içerik özeti karşılaştırılır. Büyük tablolar parçalara bölünür. Saat dilimi UTC, JSON/NULL/sayı biçimleri sabitlenir; çalışma sorguları süre sınırına tabidir.
- `auth.users` ve sağlayıcı kimlikleri için iki tarafta ortak gerekli sütunlar belirlenir; platform sürümünün eklediği alanlar gerekçeli fark listesinde tutulur. Hash/kimlik değerleri halka açık rapora konmaz.
- Yetim user/task/subscription/order/consent ilişkisi ve duplicate anahtar bulunmamalı. Restore sonrası yeni kayıt sequence çakışması üretmemeli.
- Ücretsiz/trial/ücretli kararlar aynı sabit `as_of` zamanında, aynı kaynak kodla karşılaştırılır. Prova sırasında doğal olarak süresi dolan trial hesapları taşıma kaybı diye etiketlenmez.
- Polar toplamları: aynı ürünler, para birimi, tarih aralığı ve test hesabı dahil etme kuralı. Kullanıcının kendi ödeme yapan hesabı dışlanmaz. Pozitif/iade sonrası gelir, belirsiz tarihler ve MRR ayrı ölçütlerdir; MRR hesaplama anı ayrıca yazılır. Canlı sağlayıcıya mutasyon veya tahsilat yapılmaz.
- Gönderim için provider mesaj ID'si, idempotency anahtarı, sabitlenmiş içerik, belirsizlik ve ilk kabul zamanı korunur. Kayıt taşınması gönderim tekrarı değildir.
- Beklenen farklar yalnızca açık listede: yeni proje/anahtarlar, eski oturumların alınmaması, prova dış işlem kapıları ve sentetik test kayıtları. Listeye alınmamış bir fark geçişi durdurur.

## 7. Sunucu, AI ve tarayıcı uyumluluğu

39 işlev tek kaynak sürümünden hedefe hazırlanır; bu aşamada topluca deploy edilmez. Her biri için giriş doğrulaması, rol/entitlement kontrolü, çağırdığı servis, secret adı, zamanlayıcı ve test yolu kaydedilir. Kaynak dosya hash'i dağıtım makbuzuyla eşleştirilir. Yeni Supabase'in JWT/anahtar biçimi, eski `verify_jwt=true` davranışıyla denenir; 401'i çözmek için kimlik kontrolü kaldırılmaz.

AI için ayrı çalışma gerekir. Mevcut kaynakta koçluk `openai/gpt-6-astra`, başka analizler `google/gemini-2.5-flash` gateway adlarını kullanıyor. Bu adların doğrudan sağlayıcıda aynı şekilde mevcut olduğu varsayılmaz. Hedef hesap erişimi, model eşlemesi ve ücret doğrulanır. Ücretsiz tek üretim, 4096 çıktı bütçesi, süre sınırı, otomatik tekrar olmaması, token/run-id kaydı ve null maliyet anlamı korunur. Ücretli/trial özelliklerinde sessiz model düşürme yapılmaz. Yapılandırılmış çıktı, sohbet akışı, koçluk NDJSON terminal durumu, beş dil, kart ID doğruluğu ve CORS test edilir. Bu hazırlıkta gerçek AI çağrısı yoktur.

Clash Royale proxy/IP izinleri hedef ağdan ayrıca doğrulanır. Bu değişiklik bir oyuncuya yeni AI hakkı veya daha sık arka plan sorgusu vermemeli.

Prova site derlemesi ayrı ortamda çalışır. Kaynak `.env` veya main `supabase/config.toml` değişmez. Giriş/çıkış, sayfa yenileme, iç URL, eski sekme, yanlış projeden gelen token ve hesaplar arası geçiş test edilir. Ayrı origin eski tarayıcı oturumlarıyla çakışmaz. Kaynak site, Lovable Publish veya GitHub main bu prova için yönlendirilmez.

## 8. Kabul matrisi

| Senaryo | Beklenen sonuç | Bu hazırlıktaki durum |
| --- | --- | --- |
| Kaynak/yabancı proje bağlantısıyla kontrol aracı | Ağ çağrısından önce reddet | Yerel test geçti |
| Hiç kullanılmamış doğrulanmış ücretsiz hesap | Hakkı korunur | Sentetik SQL round-trip geçti |
| Ücretsiz öneri kaydedilmiş hesap | Aynı görev; ikinci üretim yok | Sentetik SQL round-trip geçti |
| Ücretsiz sonucu belirsiz hesap | Belirsiz kalır; hak sıfırlanmaz | Sentetik SQL round-trip geçti |
| Trial; yenileme açık/kapalı | Aynı dönem ve haklar | Kapalı yenileme örneği geçti; tüm gerçek varyantlar bekliyor |
| Ücretli; yenileme kapalı | Dönem sonuna kadar erişim | Sentetik SQL round-trip geçti |
| Past due / expired / blocked / admin | Kaynaktaki karar korunur | Past due geçti; tam matris gerçek provada |
| İade, para birimi ve ödeme kimliği | Aynı net tutar ve ilişki | Sentetik kısmi iade geçti |
| İzin geri çekilmiş veya belirsiz gönderim | Aynı kanıt/anahtar; yeni gönderim yok | Sentetik SQL round-trip geçti |
| Browser rolü | Korunan üretim kaydına erişemez | Restore sonrası test geçti |
| Gerçek parola ve Google girişi | Aynı UUID; yeniden giriş | Gerçek export ve Auth provası bekliyor |
| Başka hesabın verisi / yetkisiz admin | Reddet | Tam hedef RLS/işlev matrisi bekliyor |
| Eski unsubscribe / doğrulama / şifre sıfırlama | Uygun hedef ve doğru adres kapsamı | Hedef entegrasyonu bekliyor |
| Eski Polar olayının tekrar/sırasız gelişi | Çift ödeme/erişim kaybı/gönderim yok | Sahte imzalı sağlayıcı testi hazırlanacak |
| Restore sonrası tüm dosyalar | Yol, sahiplik ve içerik eşleşir | Gerçek Storage envanteri bekliyor |
| AI ve oyun | Aynı haklar, bütçe ve çıktı sözleşmesi | Sağlayıcı erişimi/eşlemesi bekliyor |
| Tam uygulama: EN/TR/ES/FR/PT, mobil/masaüstü | Ücretsiz, trial, ücretli ve admin yolları | Hedef uygulama provası bekliyor |
| Performans | Aynı veri/istek örneklerinde kaynakla karşılaştırma; yeni timeout/ek çağrı yok | Canlı baz ve hedef ölçümü bekliyor |

Yerel SQL provası 13 kontrol; hazırlık araçları 7 test geçti. Auth şeması yerel testte asgari platform taklididir. Bu sayılar gerçek kullanıcı taşıma veya Supabase Auth başarısı diye sunulamaz. Canlı test için zorunlu kayıt/ödeme/e-posta işlemi bu aşamada yapılmaz.

## 9. Son geçiş planı — bu aşamada uygulanmayacak

Tercih edilen yaklaşım, prova süresinde ölçülen kısa bir son yazma penceresi ve tek yazan sunucu. Süre ölçülmeden “kesintisiz” veya dakika garantisi verilmez. Sıfır yazma kesintisi istenirse bütün ilgili tabloların insert/update/delete olaylarını ve webhook'ları kapsayan artımlı taşıma ayrıca tasarlanır; yalnızca `updated_at` sorgusu yeterli değildir.

1. Prova ve maliyet/performans kabulü kapanır; son kaynak commit'i sabitlenir. Yedek geri yükleme süresi, hedef kapasite, yedekleme planı ve geri dönüş sınırları yazılır. O tarihteki source/target parmak izleri tekrar alınır.
2. Sağlayıcı webhook'ları için olay kaybını önleyen kuyruk/retry yöntemi doğrulanır. Polar tahsilatları kesilmez; yanlışlıkla başarılı yanıt verilip olay atılmaz. Oturum/açık sekmeler ve eski e-posta linkleri için geçiş köprüsü hazırdır.
3. Kaynakta kullanıcı yazmaları, yeni AI çağrıları ve değiştirici otomatik işler kontrollü durdurulur; devam eden çağrılar bitirilir veya belirsiz olarak korunur. E-posta işlerinin iki tarafta eşzamanlı çalışmasına izin verilmez. Bu adımlar ayrı canlı yetki gerektirir.
4. Son snapshot/fark alınır, hedefe yüklenir, bütün mutabakat yapılır. Hedefte hiçbir eski kullanıcı için hoş geldin/izin/deneme başlangıcı yeniden tetiklenmez.
5. Frontend hedefe alınır; kullanıcı yeniden giriş yapar. Kaynak eski sekmelerden yazmayı sürdürmez. Polar/Resend webhook'ları yalnızca doğru yeni hedefe işlenir; eski webhook endpoint'inin kuyruk/yeniden deneme durumu uzlaştırılır.
6. İşlevler ve normal işlemsel işler kontrollü açılır. Mevcut ücretsiz özellik ayarı kaynak değeriyle geri gelir; kullanılmış haklar değişmez. Kampanya gönderimi kapalı kalır. Zamanlayıcı başına yalnızca bir etkin kopya doğrulanır.
7. İlk doğal giriş, ücretsiz öneri/sonuç, trial/ödeme olayı ve ilk düzenli sipariş eşitlemesi kayıtlardan doğrulanır. 24 saat ve ilk doğal yenileme gibi henüz gerçekleşmemiş kontroller açık tutulur; yapay tahsilatla kapatılmaz.

**Geri dönüş:** Hedefe müşteri yazması başlamadan eski sunucuya dönüş kolaydır. Hedefte yeni kayıt/ödeme olayı/izin çekilmesi işlendikten sonra yalnızca adresi geriye çevirmek veri kaybı yaratır. Önce hedef yazmaları durdurulur, fark ve sağlayıcı olayları korunur, geriye taşıma veya ileri düzeltme seçilir. RPO/RTO ölçümü ve bu karar verilmeden eski veri silinmez. Eski unsubscribe/doğrulama linkleri ve webhook retry süreleri çözülmeden kaynak proje kaldırılmaz.

## 10. İş paketleri ve tamamlanma ölçütleri

| Paket | Çıktı | Geçiş koşulu |
| --- | --- | --- |
| A — hazırlık | Bu plan, kaynak envanteri, boş hedef kontrolü, yerel araç/testler | Tamamlandı; gerçek taşıma yapılmadı |
| B — kaynak export ve karantina | Özel arşiv, dosya envanteri, gerçek şema/job/ayar listesi, incelenmiş restore listesi | Canlı kaynakta uygulama değişikliği yok; hedef çıkışları kapalı |
| C — gerçek verili prova | Kontrollü restore, tablo/kimlik/hak mutabakatı, Auth/Storage kanıtları | Açıklanmamış fark yok |
| D — servis uyarlaması | AI modeli/anahtarları, JWT, oyun, ödeme/webhook, eski linkler; sahte servis testleri | Kimlik/tekillik/bütçe testleri geçer |
| E — uygulama kabulü | Beş dil ve üç hak yolu, admin gelir, performans ve kurtarma ölçümü | Kaynakla kabul edilen eşdeğerlik |
| F — canlı geçiş | Ayrı onay, final delta, yayın ve iş açma makbuzları | Kampanya kapalı, tek çalışan sistem, rollback planı hazır |

Bir sonraki somut ihtiyaç gerçek Lovable arşividir. Mevcut sözleşme/bölge bilgileriyle veri kopyasının saklanacağı yer ve erişim sahipleri kaydedilir. Bu işlemden önce kaynak proje silinmez, bağlantısı kesilmez veya anahtarları değiştirilmez. Kaynakta yapılacak gelecekteki salt okunur sayımların zamanı ve kullanılan snapshot rapora yazılır.

## 11. Resmî kaynaklar ve yorum sınırı

- [Lovable taşıma rehberi](https://docs.lovable.dev/tips-tricks/external-deployment-hosting): yönetilen Supabase yolu, özel biçimli export, auth/secret/job/AI bağımlılıkları. Kullanıcı parolaları taşınabilir; oturumlar yeniden açılır. Gerçek arşivin içeriği henüz görülmedi.
- [Supabase yedek/geri yükleme](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore): yönetilen şemalar, özel trigger/policy ve migration geçmişi kontrol edilir. Buradaki düz SQL örnekleri Lovable'ın custom arşivine aynen uygulanmaz.
- [Supabase bölgeleri](https://supabase.com/docs/guides/platform/regions): prova hedefi belirli Frankfurt bölgesinde. Bölge seçimi tek başına hukuki uygunluk beyanı değildir.
- [Edge kimlik doğrulaması](https://supabase.com/docs/guides/functions/auth): hedef anahtar/JWT doğrulaması kabul testinin parçasıdır.
- [Supabase yedekleri](https://supabase.com/docs/guides/platform/backups): seçilecek planın saklama/geri dönüş imkânı doğrulanır; veritabanı yedeği gerçek Storage dosyalarının kopyasının yerine geçmez.

Bu doküman bir geçiş başarı raporu değildir. Canlı kapasite, mevcut gerçek iş listesi, auth export uyumu, doğrudan AI model erişimi ve kesinti süresi açık maddelerdir.
