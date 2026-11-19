# Admin: SaaS kârlılığı — sonraki geliştirme

19 Kasım 2026 kullanıcı talebi. Bu PR sekmeyi yapmaz; veri temelini hazırlar.
Supabase geçişinden sonra, mevcut admin ekranında tek bir “Kârlılık” sekmesi.
Yeni AI özeti veya rapor üretim çağrısı yok; hesaplamalar veritabanında yapılır.

## İlk bakışta karar

Üstte aynı dönem ve para birimi için şu bilgiler gösterilir:

1. Ödeme yapan ayrı hesap sayısı ve gerçekleşen net satış.
2. İadeler ve ödeme sağlayıcısı komisyonları; net satıştan zaten düşülen tutar ikinci kez düşülmez.
3. Gerçek AI gideri; faturası eşleşmemiş çağrı sayısı ve giderin kapsama oranı.
4. Veritabanı/Edge, barındırma, e-posta ve diğer altyapı giderleri.
5. Değişken giderler sonrası katkı ve katkı oranı; sabit giderler sonrası işletme sonucu ayrıca adlandırılır.
6. MRR ayrı bir kutudadır. Tahsilat, kâr veya o ayın toplam satışı yerine kullanılmaz.

Eksik maliyet sıfır sayılmaz. Tüm giderler tamamlanmadıysa sonuç “kısmi” görünür;
kesin net kâr iddiası yapılmaz. Birbirine çevrilmemiş para birimleri toplanmaz.
Gateway kredileri USD'ye tahminî olarak çevrilmez; fiyat/fatura dayanağı gerekir.

## Karar için alt kırılım

- Ücretsiz / trial / ücretli / yönetici / süresi bitmiş hesapların kullanımında başarılı sonuç başına AI maliyeti;
  belirsiz/başarısız çağrı maliyeti de giderde kalır.
- Özellik ve model bazında çağrı, token, cache-read/write, reasoning, süre ve doğrulanmış maliyet.
  Cache ve reasoning tokenları toplam tokena ikinci kez eklenmez.
- Yeniden kullanılan sonuç sayısı ayrı gösterilir. Bundan otomatik “şu kadar para kazandık” çıkarılmaz.
- Kayıt → ücretsiz öneri → eşleşen maç → trial → ilk ödeme dönüşümü, olgunlaşmış kohortlarla.
- Hesap başına gelir ve değişken maliyet; oyuncu etiketi sayısı müşteri sayısını büyütmez.
- İşletmecinin gerçekten ödeme yapan hesabı, önceki karar uyarınca ödeme yapanlar içinde kalır.

## Veri ve kabul

Polar order ID / ödeme ve iade tarihi üzerinden mevcut doğrulanmış siparişler;
MRR için ayrı Polar ölçümü; AI için `ai_generation_attempts` ve run ID eşleşmiş
sağlayıcı faturası/kullanım dışa aktarımı. Altyapı faturaları dönem ve kaynağıyla
ayrı kaydedilir. İlk sürümde keyfî müşteri başına sabit gider dağıtımı yapılmaz.

Her kutuda dönem, saat dilimi, para birimi, son senkronizasyon ve kapsama durumu.
Kart toplamı detay listesiyle eşit olmalı. Tekrar eşitleme, geciken ödeme tarihi,
kısmi/tam iade, çoklu para birimi ve bilinmeyen maliyet test edilmeli.
Yalnızca yönetici erişir; ham prompt ve oyuncu e-postaları özet rapora alınmaz.
Gönderim ya da ücretli işlem düğmesi eklenmez; kampanya gönderimi kapalı kalır.

İlk teslim: günlük özet + dönem karşılaştırması + yalnızca sorunlu/verisi eksik
satırlara inme. Tahminî LTV, CAC veya kârlılık hedefi ancak yeterli maliyet ve
kohort verisi oluşunca ayrıca ele alınır.
