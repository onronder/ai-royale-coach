# AI Royale arayüz kabulü · 15 Kasım 2026

İncelenen sürüm PR #3 içindeki `fcc1374`. Karşılaştırma sürümü `97cc311`. Bu çalışma Genel Bakış, ilk koçluk görevi ve uygulamadaki oyuncu, ziyaretçi ve yönetici ekranlarını kapsar.

## Gözlenen sorunlar ve kabul ölçütleri

| Alan | Gözlem | Düzeltme ve kontrol |
| --- | --- | --- |
| Genel Bakış | Tamamlanmış maçta bile görev başlığı yeni maç istiyordu. Sonuç, açık rakip destesi ve koç yazısı arasında kalıyordu. | Tamamlanan görev skor, kupa farkı ve sonraki antrenmanla başlıyor. Kart değişimi ve kendi destesi görünür. Rakip destesi ve kayıtlı cevap klavyeyle de açılıyor. İlk öneri ve eşleşme bekleme durumlarının kendi eylemleri var. |
| Kupa ve istatistik | Canlı oyuncunun tek maçında sabit “25” yazıyordu. Tek maçlık kupa grafiği sıfır değişim gösterebiliyordu. AI özeti bazı kalın vurguları yıldızlarla gösteriyordu. | Getirilen maç sayısı kullanılıyor. Kupa grafiği yalnız geçerli kupa yolu kayıtlarından maç başı ve sonu değerlerini alıyor. Artış, kayıp ve tek maç test edildi. Özetin vurguları metin olarak güvenli biçimde işleniyor. |
| Koçluk görevi | Eksik kartı onayladıktan sonraki sunucu hatası desteyi yeniden seçtirebiliyordu. | Yedi kartla başlayan profilde sekizinci kart onaylandı. Bilerek oluşturulan geçici hatadan sonra aynı seçimle yeni öneri ve takip yanıtı alındı. Eşleşen maçtan sonra skor 2–1, kupa farkı +30, üst göstergede 6.629 → 6.659 görüldü. Süre bitince kayıtlı yanıt ve sonuç erişilebilir kaldı. |
| Gezinme ve erişilebilirlik | Bazı sekmeler telefonda çakışıyor, Kâhin ve Dream Arena'daki menüler istenen panele götürmüyordu. Kapalı koç paneli klavyeyle odak alabiliyordu. | Sekme düzeni ve bölümler arası geçişler düzeltildi. Kapalı sohbet odağı almıyor. Dar genişlikte bildirim kutusu, yardım konu seçicisi, kayıt düğmesi ve ziyaretçi menüsü kontrol edildi. |
| Yardım ve deneme | Bazı yardım konuları çeviri anahtarı gösteriyor, SSS eski günlük deneme kotasını tarif ediyordu. Süresi bitmiş hesapta yeniden deneme çağrısı görülebiliyordu. | Yardım soruları, cevapları ve arama eşleşmeleri beş dilde denetlendi. Bilinen eski abonelik/deneme, plan satın alma akışına gidiyor. İki hesaplı paketin ödeme ekranına doğru parametrelerle aktarımı test edildi. |
| Yenileme ve tarih | Yenileme kapatıldığında “yenileme tarihi” satırı erişim bitiş bildirimiyle birlikte görünüyordu. Onay tarihleri Türkçe arayüzde İngilizce biçimleniyordu. | Kapalı yenilemede erişim bitiş tarihi seçili dile göre gösteriliyor. Yenilemeyi kapatma, koça erişim ve geri açıldığında deneme statüsünün korunması iki görünümde de örnek ödeme yanıtlarıyla doğrulandı. |
| Deste ve turnuva | Deste oluşturucudaki kartlar klavyeden seçilemiyordu. Turnuva sayacı toplulaştırılmış yanıtı yanlış sayıyor, katılımcı kimliği yerel tarayıcı durumuna bağlı kalıyordu. | Klavyeyle sekiz kart, isim doğrulaması ve kaydetme kontrol edildi. Örnek turnuvada 3/8 → 4/8 değişimi, seçilen oyuncunun kimliği ve turnuva mevcutken ikinci bir turnuva oluşturma kontrol edildi. |
| Başarı vitrini | İlk paylaşımda görsel henüz oluşturulmadığı için işlem sessizce bitebiliyordu. | Görsel hazırlama ve dışa aktarma sırası düzeltildi. Yerleşik paylaşım devre dışıyken ilk tıklama her iki genişlikte açılabilir PNG üretti. |
| Açılış yükü | Analitik, deste oluşturucu ve paylaşım görseli kodları Genel Bakış açılışına ek yük getiriyordu. | Bu işlevler ihtiyaç anında yükleniyor. Aynı oyuncu verisiyle boş tarayıcı önbelleğinden ilk Genel Bakış için istenen JavaScript'in gzip toplamı 902.648 → 822.246 bayt, dosya sayısı 65 → 63. Süre ve saha kullanıcılarının bağlantı hızı ölçülmedi. |

## Tarayıcı ve cihaz kapsamı

Aynı kontrollü test verileriyle Chrome masaüstü ve mobil görünümde 154'er kontrol geçti. Her kontrolde hedef içeriğe ya da işleme özgü doğrulamanın yanında sayfa taşması, sekme çakışması ve yakalanmamış JavaScript hataları da denetlendi. Aktif deneme, ücretli, süresi dolmuş hesap, ziyaretçi ve yönetici durumları kullanıldı. Toplamlar aynı işlevin iki görünümdeki tekrarlarını içerir.

| Alan | İki görünümde kontrol |
| --- | ---: |
| Herkese açık sayfalar, giriş ve demo | 74 |
| Oyuncu, deste, koleksiyon, maçlar, analitik ve sosyal sekmeler | 78 |
| Hedefli etkileşimler, klavye, form ve dar ekran kontrolleri | 40 |
| İlk koçluk görevi yaşam döngüsü | 16 |
| Yönetici sekmeleri, gelir dönemi ve kullanıcı araması | 22 |
| Dil, ayarlar ve yenilikler | 14 |
| Giriş korumaları, ücretli ve süresi bitmiş hesaplar, ilgili metinler | 28 |
| Kâhin ve Dream Arena'dan gezinme ve simülasyon | 18 |
| Turnuva kaydı ve görsel dışa aktarma | 8 |
| Açık/koyu tema ve deneme yenilemesini kapatma/açma | 10 |
| **Toplam** | **308** |

Uygulamadaki 14 adlandırılmış yol ve bulunamayan sayfa kontrol edildi. Fiziksel iPhone'da Safari ile sonuç kartı, deste aktarımı, ziyaretçi gezinmesi ve Yardım ayrıca açıldı. Oyun bağlantısı Clash Royale'in deste kopyalama ekranına ulaştı.

## Kod kontrolleri

- `bun test` ile 11 dosyada 62 test geçti. Beş dil için yardım anahtarlarını ve kupa grafiğinin gerçek maç kayıtlarını denetleyen testler depoda.
- `npx tsc -p tsconfig.app.json --noEmit` ve `npx tsc -p tsconfig.node.json --noEmit` geçti. Değişen iki sunucu işlevi Deno ile tür kontrolünden geçti.
- `npm run lint` sıfır hata verdi. Başlangıçta 7 hata ve 109 uyarı vardı, 109 uyarı devam ediyor.
- `npm run build` tamamlandı. 500 kB üzerinde küçültülmüş dosya uyarısı sürüyor.

## Canlı doğrulamanın sınırı

Canlı sitede var olan oyuncunun 3–1 sonucu, +30 farkı ve 696 kupası görüldü. PR'daki yeni tasarım, yerel sunucu işlevleri ve kontrollü dış servis yanıtlarıyla sınandı. Yeni sürümde aynı canlı hesapla baştan sona giriş ve yeni maç tekrarlanmadı. Üretimde karttan para çekme, iade, gerçek alıcılara e-posta, hesap silme ve harici paylaşım gönderimi yapılmadı. Yönetici gelir kartındaki tutarlar ekrana giren verinin gösterimini doğrular. Polar muhasebesi veya hatırlatma ayarı bu çalışmada yeniden doğrulanmadı.
