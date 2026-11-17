# Yönetim • Kayıttan gelire

Hesap oluşturma ve ilk edinim adımları hesap başına ilk kez sayılır. Başlangıç günü filtreleri İstanbul saatiyledir. Ölçümden önce açılmış hesapların ekran adımları bilinmiyor olarak kalır. Polar bağlantısı sunucuda gözlenir. Bu, kart bilgisinin girildiğini göstermez. Ödeme kurtarma akışı ayrıdır.

Her adımın sayısı tekil hesapları gösterir. Önceki adımdan dönüşüm, karşılaştırılabilir hesaplarda iki adımı sırasıyla tamamlayanların ilk adımı tamamlayanlara oranıdır. Doğrudan ödeme bir deneme dönüşümü oluşturmaz. Sonuç listeleri aynı sorgudan gelir ve ayrıntılar açıldığı raporun zamanını kullanır.

Denemede D7, aynı abonelikte denemenin bitişinden yedi gün sonrasına kadar doğrulanmış pozitif ödemeyi ölçer (sağ sınır hariç). Henüz süresi dolmayanlarla tarihi belirsiz ödemeler ayrı gösterilir. Doğrulanmış ödeme ve mutabık kısmi iadeler döviz cinsine göre toplanır. Bilgisi eksik sipariş ayrıca sayılır. MRR için kesin bir dönemsel fiyat kaynağı bağlanana kadar veri yok gösterilir. Yönetim bilgileri canlı kayıtlardan okunur. Daha sonra yapılan mutabakat, iade veya abonelik durumu değişikliği geçmiş kohortların güncel sonucunu değiştirebilir.

Kampanya erişimi doğrudan admin_marketing_reach() sonucudur. 24–48 saat önce doğrulanmış ve deneme başlatmamış hesaplar ayrı bir kitledir. İzin, abone erişimi ve güvenlik durumu ayrı boyutlardır. Gönderilebilir sayı için sunucunun kampanya kararı kullanılır.

## Yerel kabul

Aynı Unix soketiyle dış ağ dinlemeyen geçici PostgreSQL kullanılır. REVENUE_PG soket dizinini, REVENUE_PG_PORT portu belirtir (varsayılan 55432). `node tests/integration/revenue/run.mjs` tam geçiş zincirini kurar, sentetik hesaplarla gerçek raporları okur, 1000 ek kayıtla sorgu sürelerini verir ve kendi test veritabanını kaldırır. Testi gerçek sistem anahtarları gerektirmeden çalıştırın.

## Yayın

İzin düzeltmesindeki 0029 ve yönetim geçişleri 0030–0031 sırasıyla uygulanır. Düzenlenmiş GitHub kaynağından create-checkout işlevi dağıtılır, sonra ön yüz yayımlanır. Ölçüm başlangıcı, geçiş ve işlev/ön yüz yayın saatleri kaydedilir. Bekleyen orijinal Lovable taslağını bunun üstüne kabul etmek farklı numaralı geçişleri yeniden uygular. Kampanya gönderimi ayrı iş kararıdır.
