# Prova hazırlığı — 18 Kasım 2026

Kayıt zamanı: 10:44 UTC / 13:44 Türkiye. Kaynak inceleme tabanı: `bb618be1ad53c118e0293009320f34465b411e97`.

## Yapılanlar

- Ayrı `codex/supabase-migration-rehearsal` dalı ve çalışma kopyası hazırlandı. Uygulamanın `.env`, `supabase/config.toml`, runtime kodu, migration journal veya mevcut migrations dosyaları değiştirilmedi. PR #22 bu çalışmaya dahil değil.
- Kullanıcının açtığı `jmdtjtpymxjkprugqoqu` projesi yönetim erişimiyle doğrulandı: Frankfurt, `ACTIVE_HEALTHY`, PostgreSQL 17.12. 0 auth kullanıcısı, 0 public tablo, 0 Storage kovası, 0 Edge Function; cron/net iş tabloları yok. Bu yalnızca boş hedef hazırlık kontrolüdür.
- Kaynak Cloud projesine yönetim/SQL çağrısı yapılmadı. Dışa aktarım, restore, backend dağıtımı, site yayını, webhook yönlendirmesi, anahtar değişimi ve gerçek gönderim yapılmadı.
- CLI yeni hedef için ayrı yerel çalışma dizinine bağlandı. Yönetim sorgusu sırasında hedef giriş rolü CLI tarafından hazırlandı; uygulama kaynak bağlantısı değişmedi.
- Kaynak dosya/bağımlılık/migration envanteri oluşturuldu. Secret değerleri veya `.env` okunmadı; envanter yalnızca adları, kaynak konumlarını ve dosya SHA-256 değerlerini içerir.

## Testler

| Kontrol | Sonuç | Kanıt sınırı |
| --- | --- | --- |
| Uygulama testleri | 141 geçti, 0 hata | Mevcut main uygulama mantığı; yeni çalışma runtime değiştirmiyor |
| Hazırlık aracı testleri | 7 geçti | Yanlış/canlı hedefi reddetme, sabit salt okunur sorgu, .env okumama, arşivi çalıştırmama |
| Yerel yedekle/geri yükle provası | 13 geçti | İki geçici veritabanı, gerçek uygulama SQL'i ve altı sentetik hesap; gerçek Cloud export'u değil |
| Kampanya gönderimi | Yerel provada kapalı | Kaynak canlı ayarı okunmadı/değiştirilmedi |
| Dış işlem | Yerel provada fetch=0, taklit HTTP kuyruğu=0 | Gerçek e-posta, AI veya ödeme yapılmadı |

Yerel round-trip tüm fixture tablolarındaki satırları karşılaştırdı: kullanıcı UUID ve ilişkileri, trial/paid/past_due erişimi, kullanılmamış/kullanılmış/belirsiz ücretsiz hak, kaydedilmiş öneri, kısmi iade/para birimi, geri çekilmiş izin ve belirsiz gönderimin anahtarı. Restore sonrası sequence ve browser rolü erişim reddi de kontrol edildi. Test arşivi ve iki test veritabanı temizlenir.

Parola hash'i, OAuth identity, Storage baytları, gerçek platform RLS kapsamı, kaynak trigger/jobs, gerçek sağlayıcı imzası ve final delta bu yerel fixture ile doğrulanmış değildir. Başarısızlık olmaması tam taşıma kabulü anlamına gelmez. Runtime dosyası değişmediği için tekrar üretim derlemesi veya UI testi bu hazırlığın kanıtı olarak kullanılmadı.

## Açık kapılar

1. Gerçek kaynak arşivi ve Storage envanteri gelmedi. Kullanıcıdan tam export'un yerel dosya yolu istendi; dosyayı sohbete yüklemek gerekmiyor.
2. Gerçek veri yüklenmeden hedef Auth/SMTP/egress karantinası tamamlanacak. Boş proje kontrolü karantina tamamlandı anlamına gelmez.
3. Arşivin managed auth/storage şemalarıyla uyumu, exact restore listesi ve geçmiş işlerin devre dışı tutulması doğrulanacak.
4. AI sağlayıcı hesabı/model eşlemesi, JWT uyumu, eski bağlantılar ve ödeme/izin mutabakatı ayrı kabul gerektiriyor.
5. Canlı geçiş, yayın, işler ve kampanya aktivasyonu bu teslimin kapsamında değil. Kampanya gönderimi geçiş sonrasında da kapalı tutulacak.

Plan: [ayrıntılı geçiş sırası](plan.md). Testleri yeniden çalıştırma: [prova README](../../tests/integration/migration/README.md).
