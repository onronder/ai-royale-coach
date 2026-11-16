# Kampanya e-posta izni — uygulama planı (yalnızca plan)

Bu turda kod, migration, izin kaydı, Resend aktarımı, gönderim veya yayın yok. Önizleme ve canlı site aynı arka ucu paylaşır; arka uç adımları canlıyı etkiler.

## 1. Mevcut dosya ve akış haritası (okunarak doğrulandı)
- Kayıt/giriş: `src/pages/Auth.tsx` — zorunlu koşul kutusu (`termsAccepted`), `signUp` sonrası `profiles.terms_accepted_at/terms_version` yazımı, Google `signInWithOAuth` ve koşulu kabul etmemiş OAuth kullanıcısı için koşul penceresi.
- Ayarlar: `/settings` rotası `App.tsx` içinde `RequireSubscription` ile korunuyor → süresi biten hesap bugün ayarlara ulaşamıyor.
- Koç kartı: `Dashboard.tsx` → `FirstSessionTask.tsx` (+ `TrialSummaryConsent`, ikinci gün izni). Davet kartı bunun altına gelecek.
- Promosyon yolları: `WinbackCampaignPanel.tsx` → `send-email` (`type: winback_promo`, `promoCode`, `discountPercent`), `winback_campaigns` tablosu, `lookup-discount`. Bugün izin kontrolü yok. Diğer `send-email` türleri (welcome, password_reset, subscription, trial_expired, payment_failed, subscription_cancelled), `confirmed-welcome`, `trial-coaching-reminder`, `trial-coaching-summary` işlemsel/kendi amaçlı; değişmez.
- Admin: `TrialAnalyticsPanel.tsx`, `get_trial_funnel`.

## 2. Kapsam
Yalnızca Fittechs Yazılım A.Ş.'nin AI Royale markası, indirim/kampanya amacı, e-posta kanalı. Geriye dönük onay yok; yayında herkes "sorulmadı".

## 3. Önerilen metinler (5 dil: TR, EN, ES, FR, PT)
- Kayıt kutusu (boş başlar): "Fittechs Yazılım Anonim Şirketi'nin AI Royale indirim ve kampanyalarını e-posta ile almak istiyorum." Altında: "İsteğe bağlıdır. Tercihini dilediğin zaman değiştirebilirsin." + aydınlatma bağlantısı.
- Kutu işaretlenirse ad ve soyad alanı açılır (yalnızca bu durumda zorunlu); oyuncu etiketi/takma ad kullanılmaz.
- Koç kartı: "Kampanya e-posta tercihin" — "AI Royale indirimlerinden e-postayla haberdar olmak ister misin?" [Tercihimi ayarla] [Şimdi değil].
- Hata: "Tercihin kaydedilemedi. Hesabın etkilenmedi." + "Tekrar dene". Geri çekme hatası: "İznin hâlâ açık."
- Mobilde kart tam genişlik, masaüstünde koç kartı genişliğinde; pencere/overlay yok.

## 4. Akış
```text
Kayıt (kutu işaretli) -> bekleyen tercih (pending_verification, metin sürümü + ad/soyad)
  -> e-posta doğrulandı + oturum açık -> oyuncu açık onay düğmesi -> granted (süre burada başlar)
Google ilk giriş -> koşul penceresinde aynı isteğe bağlı kutu -> granted (adres Google tarafından doğrulanmış)
Google tekrar giriş -> değişiklik yok
```
Hukuki onay anı: doğrulanmış oturumdaki açık işlem. Başkasının aynı adrese kayıt denemesi, eski bağlantı veya tekrar kayıt mevcut hesabın iznini değiştiremez (bekleyen tercih yalnızca o hesabın doğrulanmış oturumunda kesinleşir; mevcut kullanıcı için yeni bekleyen kayıt yok sayılır). İzin servisi hata verirse kayıt/giriş sürer, oyuncu kendi dilinde bilgilendirilir.

## 5. Durum geçiş tablosu
| Şu an | Olay | Sonra |
|---|---|---|
| sorulmadı | kayıtta boş kutu / "onay vermiyorum" | onay verilmedi |
| sorulmadı | kayıtta işaretli | doğrulama bekliyor |
| doğrulama bekliyor | doğrulanmış oturumda onay | onay verildi |
| doğrulama bekliyor | 7 gün / adres değişimi | onay verilmedi |
| sorulmadı / onay verilmedi / geri çekildi | tercih ekranında onay | onay verildi |
| onay verildi | ayar, e-postadaki çıkış, İYS reddi, Resend çıkış/şikâyet | geri çekildi |
| herhangi | adres değişimi | yeni adres için sorulmadı (eski izin taşınmaz) |
"Şimdi değil" ve kart gösterimi ayrı arayüz olayı; izin durumu değildir. Geri çekilmiş izni yalnızca oyuncunun yeni açık onayı açar.

## 6. En küçük veritabanı değişikliği
- `marketing_consent_texts` (sürüm, dil, metin, hash) — değişmez metin arşivi.
- `marketing_consent_events` (yalnız ekleme): user_id, adres, marka, amaç, kanal, olay (pending/granted/declined/withdrawn/expired), kaynak (signup/google_first/coach_card/settings/unsubscribe_link/iys/resend), metin sürümü, dil, ad-soyad (yalnızca onayda), sunucu zamanı, istek anahtarı (tekil → çift tıklama/iki sekme tek kayıt).
- `marketing_consent_current` görünümü: hesap+adres bazında son durum.
- `marketing_consent_prompts`: hesap bazında davet gösterildi/şimdi değil (çoklu etiket ve cihazda tek davet).
- `profiles.trial_marketing_status_at_start` anlık görüntüsü (deneme başlangıcında yazılır, sonradan değişmez).
- Yalnız SECURITY DEFINER RPC'ler: `get_my_marketing_consent`, `set_my_marketing_consent(state, text_version, request_key, expected_current)` — yalnızca kendi hesabı; beklenen mevcut durum uyuşmazsa reddeder (eski sekme geri çekmeyi geri açamaz). Admin yalnızca okuma RPC'si; kullanıcı adına yazamaz.
- IP, parmak izi, oyun davranışı toplanmaz.
- Hesap silme: profil verisi silinir; izin olayları ayrık asgari ispat olarak (user_id kopuk, adres + metin sürümü + zamanlar) saklanır. Saklama: onay kayıtlarında geçerlilik bitiminden (geri çekme/silme), diğer ticari ileti kayıtlarında kayıt tarihinden 3 yıl; günlük zamanlayıcı süresi dolanı imha eder.

## 7. Tercih ekranı ve çıkış
- Yeni `/settings/email` rotası yalnız oturum gerektirir (`RequireSubscription` yok); diğer Ayarlar korunmaya devam eder. Süresi bitmiş engel ekranına ve kenar menüye bağlantı.
- Gelecekteki kampanyalarda imzalı, tek kullanımlık olmayan, oturumsuz çıkış bağlantısı (yeni küçük edge function) + List-Unsubscribe başlığı; tek tıkla geri çekme.

## 8. İYS, onay bildirimi, gönderim kapısı
- Onay verilince 24 saat içinde tek, promosyonsuz, ret bağlantılı "onay bilgisi" e-postası; bir kez gönderilir, başarısızlık admin'de görünür (mevcut dondurulmuş deneme/uzlaşma kalıbı kullanılır).
- İYS: başlangıçta düşük hacim için süresi izlenen manuel kayıt (admin'de "İYS'ye işlenecek — 3 iş günü kalan süre" listesi, sorumlu kişi atanır) ile API entegrasyonu karşılaştırması; karar şirkette. İYS kaydı doğrulanmamış kişi "kampanyaya gönderilebilir" sayılmaz. İYS retleri (manuel/API) `withdrawn` olayı yazar.
- Ortak sunucu kapısı `_shared/marketing-eligibility.ts`: güncel izin=granted, İYS işlendi, Resend çıkış/şikâyet yok. `send-email` içinde `winback_promo` ve gelecekteki her tekil/toplu/tekrarlı promosyon gönderimden hemen önce bunu çağırır; uygun değilse 409. `WinbackCampaignPanel` uygun olmayanı seçtirmez. Resend webhook (unsubscribed/complained) olayları geri çekme yazar.
- İşlemsel iletiler (doğrulama, ödeme, iptal, deneme, koçluk) bu kapıdan bağımsız; testte ayrıca doğrulanır.

## 9. Admin → Trials
Sütunlar: başlangıçtaki izin (yayın öncesi = "bilinmiyor"), bugünkü izin. Hesap bazında tekil sayımlar: "Onay verdi" ve "Bugün kampanya gönderilebilir" ayrı; bekleyen İYS ve başarısız onay bildirimi sayıları.

## 10. Kabul testleri (yalıtılmış Postgres + sahte e-posta/İYS)
Boş kutuyla kayıt; doğrulanmamış adres; aynı adrese mükerrer kayıt; Google ilk ve tekrar giriş; eski denemeye tek davet (iki etiket, iki cihaz); yeni denemeye ikinci davet çıkmaması; reddeden/geri çekene otomatik davet yok; süresi bitmiş hesabın geri çekmesi; adres değişimi; iki sekme ve çift tıklama; ağ hatası/gecikmiş yanıt geri çekmeyi açmıyor; İYS/Resend kesintisi; geri çekme sonrası bekleyen kampanya engelleniyor; işlemsel iletiler etkilenmiyor. Görsel: TR/EN/ES/FR/PT, masaüstü+mobil, klavye ve ekran okuyucuyla onaysız kayıt.

## 11. Yayın sırası (ayrı olaylar, UTC zaman ve revizyonla kaydedilir)
1. GitHub PR ve birleşme.
2. Canlı arka uç: migration, RPC'ler, gönderim kapısı, `send-email` yeniden dağıtımı (izin yokken winback engellenir — bu sırayla güvenli).
3. Lovable site yayını (kayıt kutusu, kart, tercih ekranı, admin).
4. Ayrı faz: Kasım teklifi/kampanya gönderimi — bu planda yok.

## 12. Şirket/hukuk tarafından doğrulanacaklar
- İYS hizmet sağlayıcı ve marka kaydı; manuel mi API mi; sorumlu kişi.
- Aydınlatma metni: şirket unvanı/MERSİS/adres, hukuki sebep, alıcılar, Resend/Polar/diğerlerine yurt dışı aktarım dayanağı (varsayılmayacak).
- Hedef pazarlar (beş dil ≠ beş ülke; AB/GDPR uygulanıyor mu).
- Çocuk oyuncular: yaş sınırı, veli onayı.
- Ad-soyad gerekliliği ve bekleyen tercihin geçerlilik süresi (öneri 7 gün).
- Onay metninin nihai hâli (5 dil).

## Kodla doğrulanabilecekler
Durum geçişleri, tekillik, sahiplik, eski sekme koruması, gönderim kapısı, davet tekrarı, oturumsuz çıkış, işlemsel iletilerin bağımsızlığı, rapor sayımları, 5 dil görselleri.

## Şirketin doğrulaması gerekenler
İYS kaydı ve işletimi, aydınlatma içeriği, aktarım dayanağı, hedef pazar, yaş/veli kuralı, saklama/imha politikası onayı.
