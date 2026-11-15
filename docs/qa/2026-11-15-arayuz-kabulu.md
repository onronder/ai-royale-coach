# AI Royale arayüz kabulü · 15 Kasım 2026

İncelenen sürüm PR #3 içindeki `81c1f68`. Karşılaştırma sürümü `97cc311`. Bu çalışma Genel Bakış, ilk koçluk görevi ve uygulamadaki oyuncu, ziyaretçi ve yönetici ekranlarını kapsar.

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
| Açılış yükü | Analitik, deste oluşturucu ve paylaşım görseli kodları Genel Bakış açılışına ek yük getiriyordu. | Bu işlevler ihtiyaç anında yükleniyor. Aynı oyuncu verisiyle boş tarayıcı önbelleğinden ilk Genel Bakış için istenen JavaScript'in gzip toplamı 902.648 → 826.956 bayt, dosya sayısı 65 → 64. Süre ve saha kullanıcılarının bağlantı hızı ölçülmedi. |

## Tarayıcı ve cihaz kapsamı

Aynı kontrollü test verileriyle Chrome masaüstü ve mobil görünümde toplam 338 kontrol geçti (168 masaüstü, 170 mobil). Her kontrolde hedef içeriğe ya da işleme özgü doğrulamanın yanında sayfa taşması, sekme çakışması ve yakalanmamış JavaScript hataları da denetlendi. Aktif deneme, ücretli, süresi dolmuş hesap, ziyaretçi ve yönetici durumları kullanıldı. Toplamlar aynı işlevin iki görünümdeki tekrarlarını içerir.

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
| Faz 3 anket, izin, göreve dönüş ve giriş | 22 |
| Ayarlar ve oyuncu seçimi başlıkları | 6 |
| Yönetici ekranında bildirilen iptal nedenleri | 2 |
| **Toplam** | **338** |

[Kontrol matrisi](2026-11-15-kontrol-matrisi.csv) her senaryonun rolünü ve hangi görünümde çalıştırıldığını gösterir. Boş hücre, o senaryonun yalnızca diğer görünümde uygulandığını belirtir.

Uygulamadaki 14 adlandırılmış yol ve bulunamayan sayfa kontrol edildi. Fiziksel iPhone'da Safari ile sonuç kartı, deste aktarımı, ziyaretçi gezinmesi ve Yardım ayrıca açıldı. Oyun bağlantısı Clash Royale'in deste kopyalama ekranına ulaştı.

## Kod kontrolleri

- `bun test` ile 12 dosyada 67 test geçti. Beş dil için yardım anahtarlarını ve kupa grafiğinin gerçek maç kayıtlarını denetleyen testler depoda.
- `npx tsc -p tsconfig.app.json --noEmit` ve `npx tsc -p tsconfig.node.json --noEmit` geçti. Koçluk, sohbet ve yeni hatırlatma işlevleri Deno ile tür kontrolünden geçti.
- `npm run lint` sıfır hata verdi. Başlangıçta 7 hata ve 109 uyarı vardı, 109 uyarı devam ediyor.
- `npm run build` tamamlandı. 500 kB üzerinde küçültülmüş dosya uyarısı sürüyor.

## Faz 3 kabulü

- Ayarlarda yenileme önce kapanır. Ardından oyuncu bir neden seçebilir veya atlayabilir. Yenilemeyi geri açma her iki durumda kullanılabilir. Yönetici panelinde dönem filtresiyle oyuncunun bildirdiği nedenler ve atlamalar ayrı sayılır. Davranıştan türetilen etiketler ayrı gösterilir.
- Bekleyen görevde veya Ayarlar’da tek e-postalık izin varsayılan olarak kapalıdır. İzin görev ve Polar aboneliğiyle ilişkilendirilir. E-posta, deneme başlangıcından 24 saat sonra ve 48. saatten önce, izin sürüyorsa ve aynı görev hâlâ açıksa gönderime uygundur. Tamamlanma, izin iptali, ikinci günde görevi açma, bitiş veya ücretliye geçiş gönderimi durdurur. Yenilemeyi dönem sonunda kapatan oyuncu aynı erişimi sürdürür.
- E-posta bağlantısı bağlı oyuncu etiketini giriş boyunca korur. Başka hesaba ait etikette seçim ekranı açılır. Giriş testinde misafir için önbellekte kalan abonelik cevabının deneme oyuncusuna ödeme ekranı gösterdiği görüldü ve düzeltildi. Masaüstünde ve mobil görünümde yeniden girişle ilgili göreve ulaşıldı.
- Fiziksel iPhone Safari’de izole hesapla iptal anketi atlandı, hatırlatma izni açıldı ve geri alındı. Ayarlar başlığındaki taşma ayrıca düzeltildi; son başlık düzeninde etkileşimlerin 320 ve 390 piksel genişliğe sığdığı tarayıcıda ölçüldü.
- PostgreSQL üzerinde yeni göç, roller, saat sınırları, bekleyen görev ve yeniden deneme test edildi. Zamanlayıcının oluşturduğu işaret yerel HTTP üzerinden Deno işlevine iletildi. Sağlayıcı kabul ettikten sonra veritabanı yazımı özellikle başarısız kılındı. Tekrar denemesinde aynı gönderim anahtarıyla yalnız bir benzersiz test e-postası kaydedildi. İşletim ortamındaki pg_cron ve pg_net yerine zamanlayıcı ve HTTP kuyruğu testte yerel olarak temsil edildi.
- SQL kabul testi `tests/integration/trialCoaching.mjs` içindedir. İzole bir çalışma dizinine `npm install --prefix <dizin> @electric-sql/pglite@0.5.16` ile kurulabilir. Depo kökünde `PGLITE_MODULE=<dizin>/node_modules/@electric-sql/pglite/dist/index.js node tests/integration/trialCoaching.mjs` komutu boş, bellekteki bir veritabanında çalışır.

## Gerçek hesap ve yayın

Gerçek deneme hesabındaki aynı maç, canlı sitede ve PR önizlemesinde 3–1, +30 ve 696 kupa gösterdi. Yeni Genel Bakış’ta Archers seviye 7 → Arrows seviye 5 önerisi ve sekiz kart korundu. Yeni grafik “Son 1 savaş” ve +30 gösterdi. Polar müşteri bildirimlerindeki **Trial conversion reminder** açık görüldü.

Bu çalışma gerçek oyuncuya yeni maç oynatmadı, tahsilat veya iade yapmadı, müşteriye e-posta göndermedi. Gelir kartı kontrolleri ekranın örnek veriyi sunumunu doğrular. Canlıya alma ayrı adımdır. Yayında `0009_trial_coaching_followup` göçü, `trial-coaching-reminder` sunucu işlevi ve web sürümü birlikte gereklidir. Zamanlayıcıyı kurarken `node --env-file=.env scripts/trial-reminder-schedule.mjs` komutunun ürettiği SQL'i proje sahibi olarak göçten hemen sonra çalıştır. İkisini SQL editöründen uygularken aynı işlemde (`BEGIN` ve `COMMIT` arasında) çalıştır. Komut web uygulamasının herkese açık proje adresini ve aynı projeye ait anonim anahtarı kullanır. Tekrar çalıştırıldığında aynı adlı zamanlayıcıyı günceller. Gönderici, sunucuda tanımlı Resend yapılandırmasını kullanır. Gerçek gelen kutusuna teslim ve zamanlayıcının ilk canlı çalışması yayından sonra doğrulanabilir.

## Beş dilde birleşik sürüm kabulü

Lovable’ın görev kartı ve kaydırma değişikliği (`c3f793d`) ile Faz 3 birlikte sınandı. Aşağıdaki tarayıcı kontrolleri yerel örnek veriyle çalıştı.

| Dil | 390 piksel | 1440 piksel |
| --- | ---: | ---: |
| en | 35 | 35 |
| tr | 35 | 35 |
| es | 35 | 35 |
| fr | 35 | 35 |
| pt | 35 | 35 |

Her dil ve genişlikte genel sayfalar, ayarlar, oyuncu seçimi, Kâhin, Dream Arena, oyuncu panelindeki sekmeler, yönetim sekmeleri ve bekleyen görevde e-posta izni kontrol edildi. Tamamlanan görevde ayrıntılar, rakip destesi ve cihazın deste aktarım eylemi açıldı. Bekleyen görevde sayfanın sonuna kaydırılabildi. Kontroller sayfa taşmasını, ham dil anahtarlarını ve tarayıcı çalışma hatalarını da denetledi.

78 otomatik test geçti. Dil testleri İngilizce kaynak anahtarları ve yer tutucuları ile uygulamadaki sabit çeviri çağrılarını denetliyor. Beş bölgesel dil seçeneğinde koçluk e-postasının başlığı ve görev bağlantısı test edildi. Veritabanı entegrasyon testi ikinci gün sınırlarını, izin, vazgeçme, dönüş ve tekrar deneme davranışlarını sınadı. Gerçek gelen kutusuna teslim ayrı bir yayın sonrası kontroldür.
