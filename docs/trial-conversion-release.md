# Deneme dönüşümü ve ödeme kurtarma

## Yönetim ekranındaki sayılar

- Denemeler başlangıç tarihine göre seçilir. Bir satır bir Polar denemesidir. Ayrı hesap sayısı da gösterilir. Yönetici hesapları ve yönetici tarafından açıkça test olarak işaretlenen hesaplar varsayılan rapordan çıkarılır. Bir adresin adına bakarak test hesabı tahmin edilmez.
- Polar sipariş kutuları seçilen dönemde açılan tüm siparişleri gösterir. Bunlar mutabakat içindir ve deneme grubunun gelirinden farklı bir kapsama sahiptir.
- Deneme bitişi ilk görülen abonelik döneminden alınır. Geçmişte bu bilgi yalnızca aynı aboneliğin sıfır tutarlı başlangıç siparişi ve profil tarihleri birbirini doğruladığında tamamlanır. Dayanak bulunamayan aboneliklerin sayısı ayrıca gösterilir. Bu aboneliklerin arasında doğrudan ücretli başlayan hesaplar da olabilir.
- İlk yedi gün oranının paydasına yalnızca deneme sonundan itibaren yedi tam günü dolmuş abonelikler girer. Pay, aynı abonelik için dönem sonunda veya sonraki yedi gün içinde kanıtlanan pozitif ödemedir. Eski siparişlerde zaman kesinleştirilemiyorsa bu sayı ayrıca gösterilir. Siparişin açılması, sıfır tutarlı sipariş ve başarısız tahsilat ödeme kanıtı sayılmaz.
- Koç kartının görünmesi, öneri istenmesi, kayıtlı önerinin görülmesi ve eşleşen maç ayrı olaylardır. Bu sayılar her biri için gözlenen denemeleri gösterir. Aynı hesaptaki farklı oyuncu etiketleri bunları ayrı zamanlarda gerçekleştirebilir. Kartın görünmesi ve öneri düğmesine basılması site yayınıyla ölçülmeye başlar. Önceki dönemde sıfır bu adımların hiç gerçekleşmediğini kanıtlamaz.
- Güncel bağlı etiketler ve kayıtlı özet mevcudiyeti bugün gözlenen durumu gösterir. Uygulamaya dönüş için oyuncunun bir ekran açması veya kayıtlı bir etkileşimi gerekir. Arka planda AI çalışması tek başına geri dönüş sayılmaz.
- Yenilemesini kapatan, ödemesi geciken ve denemesi sona eren oyuncuların sonraki adımları ayrıdır. Geri kazanım seçimi mevcut abonelik, pozitif ödeme geçmişi, denemede kullanım ve iptal kanıtına bakar. Uygulamada aday olmak e-posta izni vermez. Yönetim listesinden e-posta gönderim girişimi olursa sunucu uygunluğu ve mevcut kampanya izinlerini yeniden kontrol eder.
- İleride açılacak deney için aynı hesap tüm cihazlarda sabit gruptadır. 30 ve 60 günlük ölçümlerde aynı süreyi tamamlayan tüm hesaplar paydaya girer. Para birimleri ayrıdır. Gelir vergi ve bilinen iadeler düşülerek, sağlayıcı işlem ücretleri öncesinde hesaplanır. Kısmi iade tutarı veya ödeme zamanı eksikse kesin grup toplamı boş döner. Tam fiyatlı yenileme için önceki pozitif tahsilat ve sıfır indirimli bir sonraki dönem ödemesi gerekir. Kurulum sırasında grup veya teklif oluşturulmaz.

## Yayın ve kabul

| Aşama | Durum |
|---|---|
| GitHub birleşmesi | Bekliyor. Birleşme zamanı (UTC) ve revizyon burada kaydedilecek. |
| Canlı veritabanı ve dört sunucu işlevi | Bekliyor. Uygulanan revizyon ve zaman (UTC) ayrıca kaydedilecek. |
| ai-royale.com site yayını | Proje sahibinin Lovable yayını bekleniyor. Sürüm ve zaman (UTC) ayrıca kaydedilecek. |

1. Yalıtılmış PostgreSQL kurulumunda `CONVERSION_PG=/path/to/socket CONVERSION_PG_PORT=55483 node tests/integration/conversion/run.mjs` çalıştır. Bu test yalnızca ağ dinlemesi kapalı geçici bir PostgreSQL kabul eder. Ayrıca uygulama testlerini ve mevcut kampanya izni testlerini sahte sağlayıcı ile çalıştır.
2. Birleşmeden sonra `0024_trial_conversion.sql` geçişini tek işlemde uygula. Mevcut bir deneme, dönem sonu değişmiş bir abonelik ve ödeme zamanı belirsiz bir kayıt üzerinden raporu salt okunur kontrol et. Geçmiş sınıflandırma farklarını Polar ile karşılaştır. Gerçek test hesaplarını proje sahibi belirler.
3. `polar-webhook`, `backfill-polar-orders`, `create-checkout` ve `send-email` işlevlerini aynı revizyondan dağıt. Ödeme kurtarma, giriş yapan hesabın kayıtlı Polar müşterisine, bu kimlik yoksa hesabın dış müşteri kimliğine bağlıdır. Polar anahtarında `customer_sessions:write` yetkisini doğrula. Yayına kabulde Polar test ortamında aynı müşterinin mevcut aboneliğine ulaşıldığını kontrol et. Bir müşteri oturumu açılması tek başına tahsilat kanıtı sayılmaz.
4. Siteyi yayımladıktan sonra Trials ve Geri Kazanım listelerini, Koç ekranını ve ödeme kurtarma düğmesini aç. Yeni tarihli gözlemleri ve ilk doğal ödeme kaydını salt okunur doğrula. Bu sürüm kampanya ayarlarını güncellemez. Deneyin ve teklifin açılması ayrı bir iş kararıdır.

## Lovable’a verilecek görsel iş

> Mevcut Admin → Denemeler ve Geri Kazanım ekranlarının yerleşimini iyileştir. Yönetici önce kaç deneme başladığını, yedi günlük ölçüm süresi dolan kaç denemenin ödeme yaptığını ve kaç ödemenin tarihinin belirsiz olduğunu görebilsin. Koç kartını gören, öneri isteyen ve eşleşen maç sonucu alan oyuncuları ayrı göster. Denemesi süren, yenilemesi kapalı, ödemesi gecikmiş ve uygulamaya dönüşte geri kazanıma aday hesapları filtrelenebilir yap. Deneme sayısını ve ayrı hesap sayısını etiketle. Uygulamada aday olanlarla bugün e-posta gönderimine uygun olanları kendi başlıkları altında göster. Veri yüklenirken, hata olduğunda ve ölçüm geçmişi bulunmadığında ayrı durumlar kullan.
>
> Mevcut verileri kullan: Denemeler için `admin_trial_conversion`, ilk ödeme için `get_trial_revenue_metrics`, e-postaya uygun kitle için `admin_winback_candidates`, izin durumu için `admin_trial_marketing`. Görsel düzen için yeni bir gelir hesabı oluşturma. Mevcut tasarımı ve EN, TR, ES, FR, PT desteğini koru. Mobil ve masaüstü önizlemeyi yalıtılmış örnek verilerle paylaş. Bu işin kapsamı yönetim ekranlarıdır. Kampanya ayarları, ödeme işlemi, teklif gösterimi, e-posta gönderimi ve site yayını kapsam dışıdır.
