# Deneme kullanıcıları analizi (Admin)

## Veritabanında şu an görülenler (son 60 gün, 24 deneme)
- **Supercell ID:** 24 kişinin hepsinde en az 1 oyuncu etiketi bağlı. Yani sorun "etiket bağlamadan gidiyorlar" değil.
- **AI'ı hiç kullanmayanlar:** 7 kişi (ör. robertkue96, archieosu, adhaha7320, xaviereekels). Bunlar etiketi bağlayıp hiçbir şey denemeden ayrılıyor.
- **Erken iptal:** 13–14 Kasım denemelerinin çoğu, 3 gün dolmadan "expired" olmuş (bitiş tarihi 15–16 Kasım, ama durum şimdiden kapalı). Muhtemelen kart girdikten kısa süre sonra Polar'da iptal ediyorlar.
- **Kullananlar da az kullanıyor:** Çoğu 1 AI analizi ve 0–2 sohbet mesajı yapmış. Yalnızca fellbrandt98 ve j.l.kousemaker yoğun kullanmış.
- Hiçbiri ücretli aboneye dönmemiş.

## Admin'e eklenecek "Deneme Analizi" bölümü
1. **Huni (funnel):** Denemeye başladı → etiket bağladı → ilk AI analizi → 2+ gün döndü → ücretliye geçti. Her adımda kişi sayısı ve yüzde.
2. **İptal zamanı:** Denemeye başlayıp kaç saat sonra iptal etti (Polar bildirim kayıtlarından). "İlk 1 saatte iptal" ayrıca sayılır.
3. **Kullanıcı tablosu:** e-posta, durum, deneme başlangıç/bitiş, iptal anı, bağlı etiket sayısı, AI analizi, sohbet, aktif gün, son görülme.
4. **Ayrılma nedeni etiketi (otomatik):** "Hiç kullanmadı", "1 analiz yapıp iptal", "Hemen iptal", "Kullandı ama ödemedi".
5. Tarih filtresi (7 / 30 / 90 gün).

## Teknik detaylar
- Yeni yönetici-only DB fonksiyonu `get_trial_funnel(days)`: `user_subscriptions` + `player_profiles` + `daily_usage_logs` + `chat_messages` + `webhook_events` (iptal zamanı) birleştirilir; `is_admin(auth.uid())` kontrolü.
- Yeni `TrialAnalyticsPanel` bileşeni, Admin'de yeni sekme; 5 dilde çeviriler.
- Önce `webhook_events` içinde iptal olaylarının zamanı doğrulanacak; yoksa iptal zamanı `updated_at` ile yaklaşık gösterilir ve öyle etiketlenir.
