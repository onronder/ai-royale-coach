# Kart öncesi ilk koçluk

## Kapsam ve davranış

Doğrulanmış e-postası olan, hiçbir deneme/abonelik/sipariş geçmişi bulunmayan hesap, bir oyuncu için tek bir ücretsiz kart değişikliği önerisi alır. Eski, hiç deneme başlatmamış hesaplar da dahildir. Günlük 20 hesaplık pilot sınırı yoktur. Yönetici, engelli hesap ve eski yerel deneme kayıtları bu hakkı kazanmaz.

Akış: oturum açma → etiket rehberi → oyuncuyu ve destesini görüp onaylama → kişisel öneri → oyunda desteyi açma → aynı oyuncu ve aynı sekiz kartla öneri görüldükten sonra oynanan ilk uygun maç → mevcut paket/Polar deneme akışı. İsim, kupa ve kart bilgileri oyun API'sinden gelir. Maç, elle kontrol edildiğinde veya uygulama yeniden görünür olduğunda kontrol edilir; sürekli sorgulama ve sonuç için yeni AI çağrısı yoktur. Tek maçın iyileşme kanıtı olduğu söylenmez.

`/first-coaching` ayrı ve hafif bir sayfadır. Genel oyuncu paneli, otomatik analiz veya deste önerisi açılmaz. Yeni hak, `checkAiAccess` veya abonelik olarak tanımlanmaz. Ücretli/trial kullanıcının mevcut erişim yolu değişmez; standart deneme başladığında aynı `coaching_tasks` kaydı kullanılabilir. Üç oyuncu bağlama sınırı ve ücretli AI hesabı seçimi korunur. Ana sayfada girilmiş etiket taşınır; uygun bir hesabın oyuncu bağlantısı da bu akışa girer.

Kampanya izni, kampanya gönderimi, hoş geldin/hatırlatma e-postaları, fiyatlar, Polar ürünleri, MRR ve sipariş eşitlemesi değişmez. Bu özellik hiçbir e-posta göndermez ve kart bilgisi toplamaz.

## Tek üretim ve maliyet

- SQL hesap kilidi ve hesap başına benzersiz öneri kaydı, iki cihaz/etiket isteğini tek üretime indirir. Kullanıcı servis işlevlerini doğrudan çağıramaz.
- Oyun bilgisi ve deste doğrulanmadan AI hakkı alınmaz. Bu aşamadaki hata yeniden denenebilir.
- AI çağrısının ayrılmış olması, sonucunun belirsiz kalması halinde yeniden üretime izin vermez. Süre geçmesi, sayfanın yenilenmesi veya etiketin değiştirilmesi hakkı yenilemez.
- Sağlayıcı yanıtı alındıktan sonra kayıt başarısız olursa aynı sonuç bir kez daha kaydedilir. Sağlayıcı tekrar çağrılmaz. İkinci kayıt da başarısızsa belirsiz kalır; destek incelemesi gerekir.
- Mevcut koç modeli ve istem kısıtları kullanılır. Ücretsiz çağrıda 4096 çıktı token sınırı, 90 saniye sağlayıcı süresi ve sıfır otomatik sağlayıcı tekrarı vardır. Ön yüz 110 saniye bekler. İstem, gerekli kart/deste bilgilerini taşır; sohbet geçmişi taşımaz.
- Dil değişiminde aynı öneri çevrilir. Görev/çeviri içeriği/dil önbelleği ve dil başına tek ücretsiz çeviri hakkı vardır. Çeviri yeni öneri oluşturmaz. Yeni üretim kapatıldığında yeni çeviri de durur; asıl kayıt ve önceden kaydedilmiş çeviri okunabilir.
- Bir hesap dakikada en fazla 10 değiştirici/kontrol isteği yapabilir. Maç kontrolünün sunucu tarafında 30 saniye bekleme aralığı vardır.
- Sağlayıcı çalışma kimliği, model, girdi/çıktı tokenları, süre ve sonuç saklanır. Doğrulanmış parasal maliyet gelmedikçe `cost_usd` NULL kalır. Sıfır maliyet veya kârlılık iddiası yoktur. Bu sürüm sağlayıcı faturasını otomatik eşitlemez.
- Sınır hesap başınadır; farklı kimliklerle çoklu kayıt açmayı tamamen engellediği iddia edilmez. Yeni tabloların hesap bağlantıları silinmede temizlenir; mevcut koçluk verisinin saklama/silme süreci değiştirilmez.

## Ölçüm sözlüğü

Yönetim → Genel Bakış içindeki yeni bölüm hesap sayar, tıklama saymaz. Toplamlar ve 25 satırlık ayrıntı sayfaları aynı SQL kaynağını kullanır. Başlangıç/bitiş günleri İstanbul saatindedir.

| Ölçüm | Kaynak ve anlam |
| --- | --- |
| Yeni kayıt grubu | Özelliğin ilk açılmasından sonra oluşan doğrulanmış hesaplar; başlangıç ilk doğrulama zamanı |
| Geri dönen grup | Önceden kayıtlı, deneme geçmişi olmayan ve yeni akışa giren hesaplar; başlangıç ilk ölçülen temas |
| Ekran / etiket yardımı / teklif | Ön yüz gözlemi; teklif gerçekten görünür olunca kaydedilir |
| Oyuncu bulundu | Sunucunun başarılı oyun verisi sorgusu |
| Öneri istendi / kaydedildi | Atomik hak alma / veritabanına kaydedilen sonuç |
| Öneri görüldü | Öneri görünür olduğunda kaydedilen zaman; maç bunun sonrasında olmalıdır |
| Maç eşleşti | Sunucunun oyuncu, zaman ve sekiz kart eşleştirmesi |
| Deneme düğmesi / paket / Polar'a devam | Mevcut edinim olayları; kart girildiğini kanıtlamaz |
| Ödeme bağlantısı / deneme / pozitif ödeme | Mevcut sunucu ve Polar kayıtları |
| 14 günlük ödeme oranı | Tam 14 günü gözlenmiş ve ödeme tarihi belirsiz olmayan hesaplardan başlangıç sonrası ilk 14 günde pozitif ödeme yapanlar |
| 30 günlük tahsilat | Yalnızca 30 günü dolmuş hesapların ilk 30 gününde, para birimine göre iade sonrası ve kesintiler öncesi doğrulanmış tutarlar |
| İlk yenileme | İlk pozitif ödeme sonrası 45 günlük gözlemi tamamlanan hesaplarda aynı aboneliğin ilk pozitif dönem yenilemesi |
| Vazgeçme nedeni | “Şimdi değil” sonrası bir kez sunulan isteğe bağlı soruya verilen yanıt; yanıtsız kullanıcıya neden atanmaz |

Ödeme zamanı/para birimi/iade tutarı eksikleri ayrıca sayılır. Genç hesaplar kayıp değildir. Gelir güncel mutabakatı yansıtır: sonradan iade veya tarih düzeltmesi eski grubun sonucunu değiştirebilir. `p_at` olay kesim zamanıdır, geçmiş verinin değişmez fotoğrafı değildir. AI maliyeti/kesintiler tamamlanmadığı için katkı kârı hesaplanmaz. Önce/sonra karşılaştırması tek başına nedensel etkiyi kanıtlamaz. Eski kullanıcıya geriye dönük ücretsiz olay yazılmaz. Daha önce ödeme ekranını açmış geri dönen hesabın yeni eylemi, eski edinim tarihini değiştirmeden yeni akışta ayrıca sayılır. Bu, mevcut edinim tablosunun ekleme öncesi gözlemcisiyle yapılır; ödeme bağlantısı olayı yine yalnızca sunucudan gelir.

## Doğrulama

`tests/integration/firstValue/README.md` yeniden çalıştırma adımlarını içerir. Gerçek SQL ve yeni koçluk işleyicisi, geçici veritabanı ve sahte oyun/AI servisleriyle sınanır. E-posta veya ödeme sağlayıcısı çağrılmaz.

Yerel kabul: 59 kontrol; mevcut uygulama 141 test; kampanya izni 41 test; gönderim güvenliği 25 test; gelir 93 kontrol; mevcut dönüşüm kabulü geçti. Tür denetimi, iki işlevin Deno kontrolü, değişen ön yüz dosyalarının lint kontrolü ve üretim derlemesi geçti. Derlemenin mevcut büyük paket uyarısı devam eder. Yeni sayfa ayrı yüklenir; kendi paketi yaklaşık 11 KB / gzip 3.8 KB'dir. 1000 sentetik hesaplı yeni rapor yerelde yaklaşık 232 ms sürdü; bu canlı performans garantisi değildir.

EN/TR/ES/FR/PT için 10 mobil/masaüstü kullanıcı akışı ve 10 yönetici görünümü sahte ağ yanıtlarıyla kontrol edildi. Gerçek AI yanıt kalitesi, sağlayıcı gecikmesi ve doğal ödeme dönüşümü canlı kabulde açık kalır. Ekran kayıtları örnek hesaplar içerir.

## Yayın sırası ve kayıt

Bu PR'ı birleştirmek veya Lovable'da yayımlamak tek başına ücretsiz üretimi açmaz. Yeni ayar varsayılan kapalıdır. Ortamın gerçek şeması önce doğrulanır; uygulanmış geçişler tekrar çalıştırılmaz.

1. PR'ın test edilen sürümünü main'e birleştir; merge SHA ve UTC zamanını yaz.
2. Aynı sürümden `0035_first_value_coaching.sql`, sonra `0036_first_value_reporting.sql` geçişlerini uygula. SQL geçişleri mevcut hesap/abonelik/izin kayıtlarını yeniden yazmaz. `first_value_settings.enabled=false` ve `marketing_settings.sending_enabled=false` olduğunu kontrol et.
3. Aynı sürümden **first-value-coaching** ve **first-session-coaching** işlevlerini dağıt. İkincisindeki kontrol, ücretsiz görevin eski çeviri yoluyla ikinci harcama yapmasını önler. Yeni gizli anahtar gerekmez; mevcut Supabase ve Lovable AI anahtarı kullanılır. Veri geçişinden önce işlevi dağıtma.
4. Lovable ana projesi yeni sürümü aldıktan sonra siteyi yayımla. Öneri açılmadan oturum, eski ücretli/trial yolu, yeni rapor ve kapalı durum kontrol edilir.
5. Bu kontroller tamamlanınca yalnızca `first_value_settings.enabled=true` yap. İlk açılma zamanı bir kez saklanır. Tüm uygun hesaplar kapsamda olur. Kampanya gönderimini açma.
6. İlk doğal uygun hesapta etiket → öneri → maç → mevcut checkout geçişini izle; kaydedilen task/call/Polar kimliklerini salt okunur eşleştir. Deneme ve ilk ödeme olgunlaşmadan dönüşüm başarısı ilan etme.

| Aşama | Durum / sürüm / UTC |
| --- | --- |
| GitHub birleşmesi | Bekliyor |
| Canlı 0035–0036 | Bekliyor |
| İki koçluk işlevinin dağıtımı | Bekliyor |
| Lovable site yayını | Bekliyor |
| Ücretsiz üretimin açılması | Bekliyor; varsayılan kapalı |
| Kampanya gönderimi | Kapalı kalacak; bu çalışma değiştirmez |

Salt okunur geçiş kontrolü:

```sql
SELECT enabled, launched_at FROM public.first_value_settings;
SELECT sending_enabled FROM public.marketing_settings;
SELECT kind, status, count(*), count(*) FILTER(WHERE cost_usd IS NULL) AS unpriced
FROM public.first_value_calls GROUP BY kind,status;
SELECT user_id,count(*) FROM public.first_value_calls WHERE kind='suggestion'
GROUP BY user_id HAVING count(*)>1;
```

Sorunda yeni üretimi durdurmak için yalnızca `first_value_settings.enabled=false` yapılır. Haklar ve belirsiz çağrılar silinmez; tekrar üretime çevrilmez. Kaydedilmiş öneri/maç erişimi ve normal abonelik akışı devam eder.
