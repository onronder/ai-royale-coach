# Koçluk özeti: üç hata düzeltmesi

Koç kartının mevcut tasarımı ve "abonelik başına tek özet" kuralı korunur. Gerçek hesabın tercihi değişmez, e-posta tetiklenmez, site yayınlanmaz.

## 1. Gönderim içeriğini ilk denemede sabitleme
- İlk gönderim denemesinde alıcı, konu, metin ve dil kayda yazılır ("sabitlenmiş özet"), sonra Resend'e gönderilir.
- Sonraki her denemede yeni içerik üretilmez; aynı sabit içerik ve aynı anahtar (`trial-summary/<abonelik>`) kullanılır. Böylece Resend aynı gönderim kimliğini döner ve bu kimlik kaydedilir. Maç skoru ya da dil arada değişse bile tek mesaj ve tek kayıt oluşur.
- Her denemeden önce izin hâlâ açık mı, deneme hâlâ geçerli mi, özet daha önce gönderildi mi kontrol edilir. Uygun değilse gönderim yapılmaz. İzin kapatılınca sabitlenmiş içerik silinir.

## 2. Özet tercihi hatalarını gösterme
- Tercih okunamazsa: oyuncunun dilinde kısa bir hata ve "Tekrar dene" düğmesi gösterilir.
- Değişiklik kaydedilemezse: hata ve "Tekrar dene" gösterilir, kutucuk son kaydedilmiş duruma döner.
- İzin kapatma başarısız olursa açıkça "İzin hâlâ açık" denir.
- Metinler EN, TR, ES, FR, PT olarak eklenir ve beşi kontrol edilir.

## 3. İzin kaldırmayı doğru oyuncu ve görevle eşleştirme
- Açma ve kapatma isteği ekranda gösterilen oyuncu etiketini ve görevi birlikte gönderir.
- Kapatma yalnızca kayıttaki seçim aynı oyuncu ve görevse uygulanır. A'nın eski sekmesinden gelen kapatma, B'nin güncel seçimini değiştirmez; ekran güncel durumu yeniden okur.

## Testler
- Gönderim: Resend kabul edip kayıt başarısız olur, sonra skor ve dil değişir. İkinci denemede aynı anahtar ve içerik kullanılır, tek sağlayıcı mesajı ve tek kayıt oluşur. İzin kapatılmışsa ya da deneme bitmişse yeniden gönderim olmaz.
- Arayüz: okuma hatası, kaydetme hatası ve kapatma hatası. "İzin hâlâ açık" ve "Tekrar dene" beş dilde görünür.
- İki oyuncu ve iki sekme: A'nın eski kapatma isteği, B'nin seçimini korur. B'nin kendi kapatma isteği ise çalışır.
- Mevcut hatırlatma ve özet testleri yeniden çalıştırılır.

## Teslim
- Değişen dosyaların listesi, üç senaryonun test sonuçları.
- Mobil (iPhone boyutu) ve masaüstü görüntüleri, sahte yanıtlarla hata durumları dahil. Gerçek hesapta tercih değiştirilmez.
- Değişiklikler yalnızca önizlemede kalır. Arka plan güncellemesi: veritabanı değişikliği ve özet gönderim işlevinin yeniden yüklenmesi. Bunlar canlı arka planı da etkiler, çünkü önizleme ile canlı site aynı arka planı kullanır.

## Teknik ayrıntılar
- Migration (yalnızca ekleme): `trial_coaching_followup` tablosuna `summary_payload jsonb` eklenir (to, subject, text, language).
  - Yalnızca service_role için `freeze_trial_summary(ticket, payload)`: değer boşsa yazar ve mevcut değeri döner (`coalesce`).
  - `take_trial_summary` uygunluğu yeniden denetler ve `summary_payload` değerini döner.
  - `update_trial_summary(p_player_tag, p_task uuid, p_on)` yeni imzayla gelir. Kapatma `WHERE summary_task = p_task AND summary_player_tag = tag AND summary_sent_at IS NULL` koşuluyla çalışır ve `summary_payload` alanını temizler. Eski imzanın yetkisi kaldırılır.
- `summary.ts` / `deliverSummary`: payload varsa onu kullanır, yoksa üretip `freeze` sonucunu kullanır. Ardından send ve markSent çalışır. `markSent` koşulu `summary_sent_at IS NULL` olur.
- `TrialSummaryConsent.tsx` görevi `taskId` prop'u olarak alır (`FirstSessionTask.tsx` iletir). Okuma ve kaydetme hata durumları ile `onError` geri dönüşü eklenir. 5 locale JSON dosyasına anahtarlar eklenir.
- Testler `tests/` altına gider: delivery fakes, eşleşme kuralı ve RTL bileşen testi. Görüntüler Playwright ile, RPC yanıtları route ile taklit edilerek alınır.
