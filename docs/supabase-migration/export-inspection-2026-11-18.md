# Gerçek Lovable yedeğinin ilk incelemesi — 18 Kasım 2026

Bu kayıt arşivin bilgisayarda açılması, izole yerel PostgreSQL'e seçilmiş gerçek tabloların geri yüklenmesi ve hedefin salt okunur şema karşılaştırmasıdır. Canlı Cloud ayarı, kullanıcı kaydı, gönderim, abonelik veya zamanlayıcı değiştirilmedi. Hedef Supabase'e veri, secret veya işlev yüklenmedi.

## Kaynak ve dosya bütünlüğü

Kullanıcı Chrome'da AI Royal Coach projesinin `database_export_18_11_26` kovasından indirmişti. Yerelde `bucket-database_export_18_11_26-files.zip` bulundu; içindeki tek dosya `ai-royale-app_261118.backup`.

- Arşiv: 4.431.258 bayt; SHA-256 `c68be66769cdc780de64141ba02b3f3a19e6da250fa6574a978de6488f20d177`.
- PostgreSQL custom format 1.16, zstd; kaynak PostgreSQL 17.6, export aracı 18.7. Dizinde 1.641 nesne kaydı var.
- Şema ve bütün veri bölümleri bağlantı kurulmadan SQL dosyalarına açıldı. Veri bölümü 49.190.844 bayt; 123 COPY bölümü, 72 public tablo. Bu çıktı bir veritabanı boyutu ölçümü değildir.
- Makinedeki mevcut `pg_restore` zstd desteklemiyordu. Resmî PostgreSQL 18.4 kaynak arşivi ve yayımlanmış SHA-256 doğrulanarak ayrı geçici dizinde zstd destekli istemci derlendi. Bu istemci ile tüm veri bölümü hatasız açıldı. İlk araç hatası kaynak yedeğin bozuk olduğunu göstermiyordu.
- `pg_restore --file` yalnızca özel yerel dosyalara yazdı; veritabanı bağlantısı veya SQL çalıştırılması yok. Dosyalar Git dışında, erişimi 0700 olan dizinde, 0600 dosya izinleriyle tutuluyor. ZIP, SQL, parola özetleri, kullanıcı adresleri ve secret değerleri PR'a eklenmedi.

Arşiv oluşturma başlığındaki saat gösterimi tek başına son taşıma kesim zamanı sayılmayacak. Son geçişte Lovable export işleminin UTC zamanı ve yazmaların durduğu sınır ayrıca kaydedilecek. Bu yedek yalnızca prova başlangıcıdır; sonradan gelen canlı değişikliklerin yerine kullanılamaz.

## Sayımlar ve ilişkiler

| Kayıt | Arşivdeki sayı | İnceleme |
| --- | ---: | --- |
| Auth kullanıcıları / profiller | 900 / 900 | Kullanıcı ID'leri tekil; iki yönde eksik ilişki yok |
| Giriş kimlikleri | 901 | 900 kullanıcının tümü bağlı; bir kullanıcıda iki kimlik var, yetim kimlik yok |
| Doğrulanmış e-posta | 873 | Kaynak doğrulama zamanı korunacak; taşıma doğrulama üretmeyecek |
| Parola özeti bulunan kullanıcı | 87 | Özetler mevcut; gerçek parola ile giriş henüz denenmedi |
| Kimlik sağlayıcısı kayıtları | 815 Google, 86 e-posta | Kimlik sayılarıdır; ayrı müşteri sayısı diye toplanmaz |
| Oyuncu profilleri | 111 | Oyuncu etiketi ve hesap bağlantısı taşınacak |
| Abonelikler | 60 | 8 active, 14 trialing, 4 past_due, 33 expired, 1 cancelled |
| Trial dönemleri | 58 | Aboneliklerden ayrı rapor geçmişi |
| Polar siparişleri | 100 | 88 paid, 6 pending, 6 void; para birimi eksik kayıt yok |
| Ücretsiz akış hesapları / çağrıları | 14 / 11 | 11 çağrı succeeded; kayıtlı haklar sıfırlanmayacak |
| Koçluk görevleri / çevirileri | 23 / 7 | Öneri ve sonuç içeriği yeniden üretilemeyecek |
| Hoş geldin / trial takip kayıtları | 21 / 5 | Önceki gönderimler tekrar tetiklenmeyecek |
| Pazarlama izin olayları / kampanya gönderim kayıtları | 0 / 0 | Sayım anındaki kaynak durum; kullanıcı adına izin oluşturulmayacak |

`public` tablolarındaki `user_id` sütunları için yapılan kontrolde Auth'ta karşılığı olmayan dolu değer bulunmadı. Bu, bütün FK/iş kuralı kontrollerinin tamamlandığı anlamına gelmez. Tarih, görev, ödeme, oyuncu ve kampanya ilişkileri gerçek geri yükleme sonrasında ayrıca doğrulanacak.

**Gelir yorumu:** `paid` sipariş sayısı ödeme yapan müşteri sayısı değildir; sıfır tutarlı trial siparişleri de bulunabilir. Benzer şekilde `active` abonelik sayısı tahsilat kanıtı değildir. Bu inceleme yeni bir gelir/MRR raporu üretmez.

Kaynak snapshot'ında kampanya gönderimi **false**, ücretsiz üretim **true**. Bunlar canlıya yeni sorgu yapılarak alınmış anlık durumlar değil, bu arşivin değerleridir. Provada kampanya kapalı kalacak; gerçek AI üretimi dışarıya çağrı yapmayacak.

## Yeni Supabase ile Auth/Storage karşılaştırması

Hedef `jmdtjtpymxjkprugqoqu` ayrıca salt okunur kontrol edildi: hâlâ 0 kullanıcı ve 0 public tablo. Kaynak ve hedef Auth geçişlerinin **84 sürüm kimliğinin tamamı aynı**.

`auth.users`, `auth.identities`, `storage.buckets`, `storage.objects` COPY sütunlarının tümü hedefte mevcut. Hedefte ayrıca görülen `confirmed_at`, `email` ve `path_tokens` alanları hesaplanan sütunlar; COPY'nin bunları dışarıda bırakması beklenen davranış. Bu ön kontrol Auth import, RLS, parola veya Google girişinin çalıştığını kanıtlamaz.

Arşivde 749 oturum, 1.068 refresh token, 83 giriş akışı ve 27 tek kullanımlık token var. Bunlar yeni projeye etkin oturum olarak taşınmayacak; kullanıcı yeniden giriş yapacak. MFA tabloları, yetkiler ve platform ayarları ayrıca incelenecek; boş olan tablo da sessizce kapsamdan çıkarılmayacak.

Storage'da yalnızca export kovası ve 0 nesne kaydı var. Yedeğin kendisi daha sonra kovaya yazıldığı için bu arşivde kendi dosya kaydının bulunmaması beklenir. Güncel dosya envanteri son geçişte tekrar alınacak; bu snapshot dışındaki dosyalar için sıfır varsayılmayacak.

## Gerçek verilerle yerel geri yükleme

İkinci adımda yalnızca bu prova için 0700 izinli geçici PostgreSQL dizini oluşturuldu. Sunucu sadece özel Unix socket üzerinden erişilebilir; TCP dinlemesi kapalı. Arşivdeki nesneler açık bir listeyle seçildi:

- 72 public tablo ve `auth.users` / `auth.identities`: toplam **74 tablo**.
- Bunların gerçek sütun türleri, gerekli enum tipleri ve sequence tanımları; yalnızca yerel tablolar için gereken şema nesneleri.
- 104 anahtar/kısıt ve 47 yabancı anahtar; seçilmiş sequence değeri.
- Uygulama/kimlik doğrulama işlevleri, kullanıcı tetikleyicileri, cron, HTTP uzantıları, Vault, oturumlar, refresh token'lar, platform migration geçmişleri ve dış servis bağlantıları seçilmedi.

Tablo default/hesaplanan alan ifadeleri önceden incelendi: kullanılan rutinler yerleşik zaman/UUID/metin/aralık işlemleri. Arşivin tüm şeması çalıştırılmadı. Şema ve veri/kısıt adımları ayrı hata-durdurmalı transaction'larla uygulandı.

| Yerel kabul kontrolü | Sonuç |
| --- | --- |
| Karşılaştırılan tablo | 74 / 74 |
| Karşılaştırılan kayıt | 25.160 |
| İçeriği birebir aynı tablo | 74 / 74 |
| İçerik veya satır sayısı farkı | 0 |
| Yabancı anahtar | 47; doğrulanmamış olan 0 |
| Public/Auth uygulama işlevi | 0 |
| Kullanıcı tetikleyicisi | 0 |
| pg_net / cron / HTTP / dblink uzantısı | 0 |
| TCP dinleme | Kapalı |
| Kampanya gönderimi ayarı | false |

Karşılaştırma yalnızca toplam sayı değildi: kaynak COPY sütunları, geri yüklenen tablodan aynı sırayla ve UTC oturumunda yeniden COPY çıktısına alındı. Sıralamadan bağımsız satır çoklukları ve tüm sütun içerikleri SHA-256 ile karşılaştırıldı; tekrarlı satırlar da korunarak sayıldı. Hesaplanan sütunlar kaynak COPY'de bulunmadığı için bu içerik karşılaştırmasına dahil değil. Veri çıktıları ve tablo parmak izleri özel yerel klasörde; kişi/sır değerleri rapora yazılmadı.

**Sınır:** Bu gerçek uygulama verisinin ve kimlik satırlarının kontrollü geri yüklemesidir; Supabase Auth sunucusu, RLS/policy/grant davranışı, tüm ikincil indeksler, sunucu işlevleri ve sağlayıcı entegrasyonları bu yerel testte kurulmadı. Gerçek parola/Google girişi veya ücretsiz/trial/ücretli API kararlarının geçtiği sonucuna varılamaz. Önceki sentetik davranış testleri ile bu veri bütünlüğü testi ayrı kanıtlardır. Yerel geçici veritabanı doğrulama ardından durdurulup silindi.

## Geçiş geçmişi ve ayrı tutulacak işler

- Drizzle'ın **38/38** kayıt özeti Git'teki SQL dosyalarının SHA-256 değerleriyle eşleşti.
- Supabase geçmişinde 60 kayıt, Git'te 59 SQL dosyası var. Sürüm isimleri doğrudan karşılaştırıldığında 45 arşiv ve 44 Git kimliği eşleşmiyor; çoğu dosya/uygulama zaman damgası birkaç saniye farklı. Bu fark 45 eksik geliştirme kanıtı değildir. SQL içerikleri ve fazla kayıt için ayrı eşleştirme hazırlanacak; `db push` ile geçmiş topluca tekrar oynatılmayacak.
- Arşivde iki Vault kaydı var. Değerleri rapora veya hedefe alınmadı. Hedef için gereken sırlar ayrı kurulacak.
- Altı zamanlayıcı arşivde etkin görünüyor; 19.753 çalışma geçmişi kaydı var. Bunlar geri yükleme sırasında çalıştırılmayacak:

| İş | Arşivdeki sıklık |
| --- | --- |
| cleanup-old-chat-messages | Günlük 03:00 |
| check-grace-period-expiry | Saat başı |
| check-grace-period-expiry-hourly | Saat başı |
| trial-coaching-day-two | 10 dakikada |
| confirmed-account-welcome | Dakikada |
| polar-order-reconciliation | Saatin 7/22/37/52. dakikaları |

Saat ifadeleri cron tanımlarıdır; canlı cron saat dilimi ayrıca doğrulanacak. İki ayrı grace-period işi olması, tek başına iki başarılı işlem veya çift e-posta kanıtı değildir. Komut hedefleri ve görev etkileri ayrı incelenecek. Bazı işler doğrudan kaynak proje adresini ve gömülü yetkilendirme bilgisini taşıyor; otomatik kopya hedef provadan canlıya istek gönderebilir. Bu yüzden yalnızca incelenmiş ve yeniden kurulmuş işler son aşamada açılacak.

## Sıradaki kabul kapıları

1. Arşivin incelenmiş geri yükleme listesi: uygulama verisi/şema, korunacak Auth kimlikleri, platform nesneleri ve dışarıda kalacak işler/oturumlar ayrılır.
2. Gerçek veri hedefe alınmadan hedef Auth/SMTP, dış API ve zamanlayıcı izolasyonu tamamlanır. Boş proje kontrolü bunun yerine geçmez.
3. Seçilmiş 74 tablonun yerel geri yüklemesi geçti. Sonrasında hedefte kontrollü tam prova yapılır; platform şeması, RLS/yetkiler, erişim kararları, uygulama işlevleri ve Auth girişi ayrı kanıtlanır.
4. Gerçek parolalar, OAuth sırları veya müşteri e-posta denemeleri istenmez. İşletmeciye ait test hesabı ve sahte sağlayıcılar kullanılır.

Bu inceleme hazırdır; gerçek Supabase veri taşıma kabulü hâlâ açıktır. Main, uygulama yayını ve mevcut kullanıcı akışları değiştirilmedi.
