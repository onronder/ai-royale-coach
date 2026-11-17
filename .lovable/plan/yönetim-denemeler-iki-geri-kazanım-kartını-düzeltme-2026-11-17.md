# Yönetim → Denemeler: iki geri kazanım kartını düzeltme

Çalışma tek bir taslakta yapılır; canlı veritabanı, sunucu işlevleri, teklif, indirim, deney ataması, Polar ve e-posta gönderimi kapsam dışıdır. Site yayını sahibindedir.

## Bugünkü sorunlar (koddan doğrulandı)
- "Uygulamada geri kazanım adayları" kartı `expired_winback` satırlarını tekilleştirmeden sayıyor; aynı hesabın birden fazla satırı sayacı şişirebilir. Açıklama, var olmayan bir teklifi ima ediyor.
- "Bugün e-postaya uygun" kartı genel kampanya izni raporundaki (`admin_trial_marketing`) `sendable` satırlarını sayıyor; geri kazanım adayı olmayan veya son 30 günde e-posta almış hesapları da içerebiliyor.
- 30 gün kuralı Geri Kazanım sekmesinde iki ayrı yerde, satır içi tarih hesabıyla yazılmış.
- `marketing.state.none` gibi tanınmayan durumlar ham anahtar olarak görünebiliyor.

## Yapılacaklar
1. **Uygulama içi aday kartı**: seçili 7/30/90 günlük deneme sonucundan `segment === 'expired_winback'` satırları, `user_id` başına bir kez. Yeni açıklama beş dilde: "Bu hesaplar, oyuncu uygulamaya dönerse bir teklif için değerlendirilebilir. E-posta izni ayrıca kontrol edilir." Deney atayan işlev çağrılmaz.
2. **E-postaya uygun kartı**: adaylar ∩ `admin_winback_candidates()` (deneme `user_id` = alıcı `id`; e-posta adresi anahtar değil) ∩ ortak 30 gün kuralı. İzin/engel/pazar/yaş/İYS kuralları tarayıcıda kopyalanmaz; sunucunun döndürdüğü alıcı kümesine güvenilir. Hesap başına sorgu yok, gönderim düğmesi yok, promosyon kodu sayıyı etkilemez. Başlık/açıklama brifteki Türkçe metin + EN/ES/FR/PT.
3. **Ortak 30 gün kuralı**: tek bir yardımcı (`canReceiveWinback(lastSentAt, now)`): gönderim yoksa geçer; eşikten kesin daha eskiyse geçer; tam eşikte veya daha yeniyse geçmez. Geri Kazanım sekmesindeki iki kullanım bu yardımcıya geçirilir, gönderim davranışı aynı kalır.
4. **Durumlar**: e-posta kartında yükleniyor, yerelleştirilmiş hata + çalışan "Tekrar dene", yalnızca başarılı boş yanıtta "0 hesap". E-posta hatası aday kartını gizlemez. Dönem sorguları dönem anahtarına bağlı olduğundan geç gelen eski yanıt yeni listeyi değiştirmez. Alt tablo filtresi yalnızca tabloyu etkiler.
5. **İzin durumu gösterimi**: bilinen durumlar korunur; boş/tanınmayan değer mevcut "Bilinmiyor" çevirisine düşer. Hiçbir kayıt yazılmaz.

## Kabul testleri
- Saf fonksiyon testleri (A–E veri seti, A için ikinci etiket ve yinelenen satır): beklenen 3 aday / 1 e-posta; gönderim kapalı (sunucu alıcı listesi boş) → 3 / 0; geri çekilmiş izin, engelli adres, gecikmiş ödeme listeye girmez; sabit saatle tam 30 gün ve eşikten hemen önce ayrımı; dönem değişiminde E yalnızca kapsadığı dönemde.
- Tarayıcı kontrolü (sahte yanıtlarla): yükleniyor, boş, hata, tekrar deneme, bilinmeyen durum; EN/TR/ES/FR/PT mobil ve masaüstü; ham anahtar/taşma kontrolü. Bir TR mobil ve bir masaüstü görsel.
- Mevcut tüm uygulama testleri, tür kontrolü ve derleme son değişiklikten sonra.
- Canlıda gözlenen 32/8/0 sayıları koda veya teste yazılmaz.

## Teslim ve sınırlar
- Değişiklikler taslakta önizlemeye hazır bırakılır. Taslak, GitHub'a otomatik PR açmaz; PR/commit bağlantısı GitHub senkronu üzerinden sizin tarafınızda oluşur — bunu raporda açıkça belirteceğim.
- Gerçek ödeme kurtarma oturumu, ilk doğal tahsilat ve sunucu tarafı izin/İYS kurallarının gerçek veriyle davranışı doğrulanmayacak.

## Teknik ayrıntılar
- Dosyalar: `src/components/admin/TrialAnalyticsPanel.tsx`, `src/components/admin/WinbackCampaignPanel.tsx`, yeni `src/lib/winbackAudience.ts` (tekilleştirme, kesişim, 30 gün kuralı), `tests/winbackAudience.test.ts`, beş dil dosyası.
- `admin_winback_candidates` sorgusu Geri Kazanım sekmesiyle aynı sorgu anahtarını paylaşır.
