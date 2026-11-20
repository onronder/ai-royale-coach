# Hata envanteri: düzeltmeler ve kabul kaydı

**20 Kasım yeniden açılış:** `8808899a` kaynağında ERR17/ERR35 kapsamındaki
tahmin yanıt doğrulama, kayıt hatası ve Oracle gösterim senaryoları eksik bulundu.
Bu belgenin aşağıdaki tarihsel kabulü tam canlı kapanış olarak okunmamalı.
[Yeni bulgular, düzeltmeler ve güncel açık işler](matchup-audit-2026-11-20.md).

19 Kasım 2026. Kaynak: `01_Hata_Envanteri.md` sürüm 1.0, 35 kayıt.
Başlangıç `main`: `7696d68a3da4071c323526d9064b8059040f830b`.
Dal: `codex/correctness-inventory`. PR #25'in ölçüm/tekil üretim çalışması bu
incelemeye dahil edildi; ayrı bir ikinci uygulama yapılmamalı. PR #22'nin kalıcı
maç geçmişi ve eski 0038/0039 numaraları bu dala taşınmadı. Main üzerindeki
0038 profil izinleri ve 0039 mesaj temizliği korundu.

Bu belge **kod + yalıtılmış kabul** kaydıdır. Canlıda 35/35 kapanış onayı değildir.
İlk yerel kabulde canlıya veya bulut prova projesine veri/şema/işlev uygulanmadı.
Sonraki onaylı [bulut prova kabulü](correctness-cloud-rehearsal.md) aynı kodla
tamamlandı; yalnız izole hedefe şema/işlev uygulandı. Hiçbir gerçek e-posta,
ödeme veya AI isteği yapılmadı. Kampanya anahtarı açılmadı.
Lovable'da commit edilmemiş ve Git'e aktarılmamış içerik incelenmiş sayılmaz;
aşağıdaki düzeltmeler Git'teki kaynak ve bu dal üzerinde doğrulandı.

## Ortak veri sözleşmesi

- `recent-battles-v2`: API'nin döndürdüğü **geçerli, tekil son maç penceresi**.
  Yaşam boyu geçmiş değildir. `W/(W+L+D)` kullanılır. Oyuncusu bulunamayan,
  bozuk zamanlı/eksik/çelişkili kayıtlar hariç tutulur; hariç sayısı ayrı tutulur.
- 1v1 ve doğrulanabilen 2v2 takım sonuçları ayrıdır. Duel serileri bir maç sayılmaz.
  Bilinmeyen mod ayrı etikettedir. Geri yüklenmiş gerçek sağlayıcı verisindeki 1v1/2v2/duel/çoklu deste/kule
  örnekleri doğrulandı. Hero/aktif slot sinyali bulunmadı; bilinmeyen kalır.
- Kimlik: hesap + oyuncu etiketi + mod + kapsam; deste kimliği temel kart,
  seviye, sıra/slot, ham biçim sinyali ve kule kartını taşır. Açılmış EVO/Hero,
  aktif EVO/Hero sayılmaz. Kanıt yoksa `unknown`.
- Gün, veri çekme zamanından değil maçın UTC zamanından gelir. Son pencere
  atomik değiştirilir; daha eski başlayan istek yeni pencereyi ezemez. Bu
  tasarım API'den kaçan maçları geriye doğru icat etmez.
- Eski istatistik/ustalık satırları `legacy-unverified` olarak **korunur**.
  Yeni pencereye eklenmez ve beceri kanıtı gibi sunulmaz. Eski rozet ve AI
  metinleri silinmez. Tarihsel metriklerin ham maç olmadan düzeltilmesi yoktur.
- Öneri/tahmin sonuç takibi ayrı tekil olgu tablosunda hesap+oyuncu+analiz+maç
  kimliğiyle yapılır. Yalnız doğru moddaki, oluşturma/görülme sonrasındaki
  temel sekiz kart eşleşmesi sayılır. Bu, tavsiyenin nedensel etkisi değildir.
- Erişim/ödeme/kota kuralları aynı kalır. Tamamlanan aynı AI isteği tekrar
  sağlayıcıya gönderilmez; belirsiz sonuç yeni harcama izni oluşturmaz.

## 35 kaydın karşılığı

“Yalıtılmış” aşağıda kod/test sonucunu belirtir; canlı kapanış demek değildir.

| Kayıt | Yapılan düzeltme | Kabul / kalan sınır |
|---|---|---|
| ERR01 | Overview, profil özeti, deck/card/DNA ortak W/L/D/n sözleşmesini kullanır. Kapsam ve örnek sayısı görünür. | Aynı fixture 1W/1L/1D, %33,33; SQL ve tarayıcı. Tarihsel kayıtlı özet ayrıca tarihli gösterilir. |
| ERR02 | Sürümlü zorunlu arketip kartları; ilk DB satırına varsayılan dönüş kaldırıldı. | Envanterdeki ağır deste X-Bow olamaz; özel/karışık sonucuna gider. |
| ERR03 | Tek maçtan Diamond/seviye iddiası kaldırıldı; “destede görüldüğü maç” ve n gösterilir. | n=1 testi ve 5 dil tarayıcı görüntüsü. Eski puanlar silinmez. |
| ERR04 | Kart gözlemleri hesap+etiket+kart+mod+kapsam bazında. | Gerçek SQL'de iki oyuncu ayrı; tekrar ve değişmeyen AI ipucu korunumu. |
| ERR05 | Replay olmayan zaman çizelgesi ve olay anları kaldırıldı. Sonuç, olası eşleşme yorumu ve çalışma önerisi ayrıldı. | Bozuk AI JSON'u kabul edilmez; bariz zaman/oynanmış aksiyon ifadeleri süzülür. Dil filtresi tüm olası model cümlelerine mutlak doğruluk garantisi değildir; gerçek çıktı kabulü ERR35'tedir. |
| ERR06 | Koleksiyon/seviye farkı AI sıralamasından önce kontrol edilir; bulunmayan kart elenir. Baz seviyeler / yatırım / bilinmeyen ayrılır. | 11–16 farkı görünür; eksik kart/level hazır olmaz. Aktif biçim/mod uygunluğu doğrulanmamışken “tam oynanabilir” vaadi yoktur. |
| ERR07 | Kanonik `tab=deck&subtab=builder`, eski URL desteği; sekiz kart aktarımı. | Mobil/masaüstü aktarma, yenileme ve bozuk URL testleri. |
| ERR08 | Mevcut deste dolu başlar; sıfırdan oluşturma açık eylemdir. Taslak hesap+etiket bazında saklanır. | Dolu/boş taslak, yenileme ve hesap izolasyonu tarayıcıda. |
| ERR09 | Yürürlük tarihli kart kopyası tablosu; eksik maliyet NULL. | Level16 kopya testleri; altın veya tüm kaynaklar yeterli iddiası yapılmaz. Kaynak `src/lib/upgradeCost.ts` içinde. |
| ERR10 | Profil/koleksiyon/deste/seviye/biçim/kule/maç/kural sürümü anahtarı; önerilerde katalog da anahtara dahil. Hesap cache'i oturum değişiminde ayrılır. | Yeni snapshot yeni sorgu; aynı sağlayıcı isteği replay. Eski public profil özetleri bağlı oyuncu için okunabilir, başka hesabın yeni cache'i okunmaz. |
| ERR11 | Kart gözlem sözleşmesi ve taktik deste kimliği; eksik maxLevel bilinmeyen. | Slot/kule/biçim farkı farklı kimlik; EVO sahipliği aktif slot sayılmaz. Gerçek geçmiş payloadlarında kule/2v2/duel ayrımı doğrulandı; aktif Hero sinyali yok. |
| ERR12 | Maç zamanına göre tekilleştirme; atomik pencere değişimi. | Aynı 10 maç iki kez = 10; sırasız/paralel yenileme, çelişkili sonuç/karşı deste ve rollback testleri. |
| ERR13 | Deste istatistik anahtarına oyuncu, mod ve kapsam eklendi. | Gerçek SQL'de iki hesap/iki etiket ayrımı; eski karışık kayıtlar korunup işaretlendi. |
| ERR14 | Etikete göre taraf/katılımcı; beraberlik ve geçersiz kayıt ayrımı. | team[1], karşı taraf, null katılımcı/kart, eksik rakip/taç ve bozuk tarih testleri. Gerçek üç handler aynı paydayı üretir. |
| ERR15 | `elixirCost` ve sekiz sabit kart şartı; Mirror/eksik alan NULL. | [3,4,4,5,3,2,6,5] = 4; eksik maliyet sıfır olmaz. |
| ERR16 | Sunucu görülme zamanı; yalnız görünür öneri kartı görülmüş sayılır. Sonraki uygun maç ayrı kaydedilir. | Önceki/eşit zamanlı veya başka moddaki maç benimseme yapmaz; SQL yarış testleri. Önce/sonra nedensel başarı yüzdesi kaldırıldı. |
| ERR17 | Tahmin yaratılma zamanı, A/B yönü, benzersiz maç ve hesap kilidi. | Önceki maç hariç; tekrar/paralel/geç olay/ters taraf/draw bir kez. Yüzdeler kalibre edilmemiş model tahmini diye etiketlenir; NULL hata sahte %100 doğruluğa dönüşmez. Eski sonuç sayıları yeni doğruluk hesabından dışlanır. |
| ERR18 | Geçmiş seri yoksa değişim NULL, trend unknown. | UI stabil/%0 üretmez; katalog popülerliği gerçek global kullanım serisi olarak sunulmaz. |
| ERR19 | Pro benzerliği ve yapay AGG/DEF/VER yorumu yerine açıklanabilir gözlem oranları. | Boş veri bilinmeyen; paylaşım görseli aynı sınırlı anlamı taşır. |
| ERR20 | Dream Arena giriş, sonuç, paylaşım ve yardımda eğlence senaryosu. | Seviye16 ölçeği/unknown; gerçek maç olasılığı veya AI oyun tarzı simülasyonu iddiası yok. Gerçek cihaz kabulü açık. |
| ERR21 | Oracle gelecek rakip tahmini yerine gözlenen deste sıklığı/tarih/n. | %50 gözleme sahte güven bonusu eklenmez; boş geçmiş bilinmeyen. |
| ERR22 | Geri dönüş/hasarsız savunma yerine kanıtlanabilen sonuç rozetleri. | Eksik kupa underdog üretmez; 2–1 sıra, 1–0 sıfır hasar sayılmaz. |
| ERR23 | Mastery/WR/eksik iksirden placement/timing/skill üretimi kaldırıldı. | Tek maç veya eksik iksirden beceri grafiği çıkmaz; eski kayıtlar saklı. |
| ERR24 | Kilitli transaction içinde milestone ve nihai sayı/puan. | Aynı turda yeni milestone dahil; paralel tekrar tutarlı; geçici sıfır yok. |
| ERR25 | Tamamlanan görev geçmişte katlanır; tek maç nedensel hüküm değildir. “Deste aynı kalsın” geçerli öneridir. | Keep/swap doğrulaması, başlık/pratik metni, tek sonuç ve mobil görünüm. Sürekli görev motoru bu düzeltmede yok. |
| ERR26 | Sohbete sunucudan sahipliği kontrol edilmiş görev, seviye, deste ve sonuç paketi. | Başka hesabın görevi alınmaz; mesaj rolü/boyutu doğrulanır. API'de olmayan davranış hafızası vaat edilmez. |
| ERR27 | Var olan gezinme/işlevler korunur; yanlış vaatler 5 dilde düzeltilir. | Aşağıdaki as-is harita. Yeni üç bölümlü ürün tasarımı geçişten sonraya ayrıldı. |
| ERR28 | ISO/yıl içeren gün anahtarı; WR% ve kupa ayrı eksenler. | İki yılın aynı günü ayrı; %60/+300 birimleri ayrı; tarayıcı görüntüsü. |
| ERR29 | Ölçülmeyen süre/cache bilinmeyen; yalnız ölçülenlerle ortalama ve kapsama oranı. Yeni cache varsayılanı NULL. | [100,NULL,300] = 200, 2/3; eski flag'ler ölçüm kanıtı sayılmaz. 5 dil admin ölçülen/bilinmeyen/hata. |
| ERR30 | #25 atomik sağlayıcı iş kaydı, replay, uncertain ve gerçek kullanım alanları. | 24 SQL/gerçek wrapper testi + SDK stream testi; iki worker tek kabul. Model değiştirilmez; parasal bedel fatura kanıtı olmadan NULL. |
| ERR31 | Main'deki 0038 sütun izinleri korunur. | Gerçek SQL'de kullanıcı trial/usage/winback alanlarını değiştiremez; dil tercihi değişir. Bu tur canlı tekrar denenmedi. |
| ERR32 | Main'deki korumalı cleanup endpoint/cron korunur; SQL batch üst sınırı 5.000'e sabitlenir. | Normal kullanıcı ret; keep-forever/yeni mesaj korunur; 5.100 eski mesaj iki batch. Canlı cron çalıştırılmadı. |
| ERR33 | Ranking 429/timeout/5xx gerçek hata olur; başarılı boş yanıtla karışmaz. | Gerçek istemci servisi + sahte HTTP tarayıcı testleri. |
| ERR34 | Oyun API ve Supabase client tek URL; URL/project/JWT-ref uyumsuzluğunda build/runtime ret. | Birim testleri ve dış ağı kapalı browser. Opaque publishable key'in uzak projeyle aidiyeti yalnız yerel kontrolden kanıtlanamaz; hedefte doğrulanacak. |
| ERR35 | 39 gerçek Edge girişi yerel runtime ve izole Supabase hedefinde; gerçek Auth/RLS ve yedi erişim türü. Tam ücretsiz akış yerel sahte sağlayıcıyla geçti. | **Yerel ve bulut prova kabulü geçti.** Uzak bundle geri okuma, bu sürümün tam Google/cihaz/sağlayıcı faturası kabulü açık; ayrıntı bulut raporunda. |

## As-is ekran karşılıkları (ERR27)

- Kayıt, giriş, oyuncu seçimi ve etiket rehberi aynı rotalarda.
- Kart öncesi ücretsiz fayda aynı ayrı ekran ve hak kontrolünde.
- Koç/Overview: görev, sonuç/geçmiş ve profil özeti; ücretli/trial gate aynı.
- Deste: güncel deste, öneriler ve analiz. Builder canonical alt sekmesi;
  koleksiyon, kayıtlı desteler, karşılaştırma ve gelişmiş analiz korunur.
- Maçlar: gerçek sonuç ve olası eşleşme yorumu; sahte replay timeline çıkarılır.
- Analytics: son pencere, mod, örnek sayısı, tarih ve ayrı birimler.
- Başarılar: rozet geçmişi ve puan; kanıtsız beceri grafiği çıkarılır.
- DNA/Oracle/Dream Arena ve topluluk/klan/turnuva rotaları yerinde kalır;
  verinin kanıtlayamadığı analitik vaatler düzeltilir. Global ranking hata/boş ayrıdır.
- Ayarlar, abonelik, ödeme kurtarma, e-posta tercihleri ve yönetim korunur.
- Koçum/Destelerim/Gelişimim navigasyonu ve sürekli koçluk motoru ayrı ürün işi.

## Tekrar üretilebilir kabul

Komutlar: [doğruluk testleri](../tests/integration/correctness/README.md),
[AI ölçüm testleri](../tests/integration/aiMeasurement/README.md).
Kabul sayıları `correctness-acceptance.json` dosyasında; ham loglar yerel kanıtta.
Ekranlar yalnız sentetik oyuncu ve sahte servis yanıtları kullanır. Gerçek
PostgreSQL işlevleri test edilir; geçici platform hizmetleri (auth/cron taşıyıcısı)
yerel olarak taklit edilir. Üretimde cron'un çalışması bununla kanıtlanmaz.

## Yayın ve geçiş kapısı

Bu PR otomatik migration/deploy/activation başlatmaz. Ayrı onaylı sürümde:

1. İncelenen PR'ın kesin commit'i ve main birleşme zamanı kaydedilir. 0038/0039
   mevcut olmalı; **0040, sonra 0041**, kontrollü transaction ile uygulanır.
   İki geçişin özeti/SQL hash'i kaydedilir. `drizzle generate` çalıştırılmaz:
   projenin `drizzle/schema.ts` dosyası tam şemayı içermiyor. Canlı içe aktarma
   öncesi tam şema introspection/journal eşliği ayrıca kontrol edilir.
2. Aynı commit'ten 21 işlev: analyze-player, analyze-match, analyze-deck,
   analyze-deck-advanced, analyze-deck-builder, analyze-meta-trends,
   calculate-card-mastery, calculate-player-stats, coach-chat,
   first-session-coaching, first-value-coaching, generate-card-tips,
   predict-deck-matchup, predict-deck-performance, recommend-deck,
   suggest-card-replacements, sync-achievements, track-deck-stats,
   sync-leaderboard, search-clans, send-email. `first-session-coaching` için açık
   `verify_jwt=true` yapılandırması da uygulanır.
3. Önce izole hedefte eski tabloların değişmemesi, yeni kapsamın ayrılması,
   account/consent/subscription/free haklarının içerik karşılaştırması yapılır.
   Açıklanamayan farkta yayın durur. 0041 eski satırların kapsam/meta alanlarını
   ekler; eski iş değerleri veya earned badge kayıtları topluca silinmez.
4. Site yayını ayrı UTC zamanıyla kaydedilir. İlk geçişte yeni analitik pencere
   henüz hesaplanmadıysa boş/bilinmeyen gösterilebilir; eski karışık toplam yeni
   doğru veri gibi gösterilmez. Planlı oyuncu yenilemesiyle kaynak oluşturulur;
   toplu gerçek AI analizi veya kullanıcı hakkı reset'i yapılmaz.
5. **ERR35 kapanışı:** Google/e-posta giriş; free→öneri→eşleşme; trial/paid/expired/
   admin/çoklu oyuncu; tüm 39 işlevin yetki ve hata yolları; doğru ortam ağı;
   cron envanteri/dağıtılan hash'ler; gerçek 1v1/2v2/duel/Hero/kule payloadları;
   beş dil ve fiziksel mobil kritik yollar. Sağlayıcı fatura/run-ID eşleştirmesi
   ayrı kanıt gerektirir. Gerçek çağrı/maliyet gerekiyorsa önceden sınırı belirlenir.
6. Kampanya gönderimi her aşamada kapalı kalır. Yalıtılmış testlerde açık kapı
   senaryosu yalnız geçici fixture verisidir. Üretim kampanya ayarı değiştirilmez.

Geri alma: yeni kanıt/ölçüm tabloları düşürülmez, belirsiz AI iş kaydı silinmez,
profil yetkileri gevşetilmez. 0041 sonrası eski conflict anahtarıyla yazan işlevler
kör geri yüklenmez; uyumlu sürüm veya geçici yeni-analiz durdurma uygulanır.
Mevcut kayıtlı sonuçların okunması ve satın alınmış erişim korunur.


## ERR35 ek kabulü — 19 Kasım 2026

Yeni çalışma bu PR üzerinde; ayrı PR veya canlı dağıtım yapılmadı. Ayrıntılı
makine kaydı `correctness-platform-acceptance.json`, yeniden çalıştırma yolu
`tests/integration/platformAcceptance/README.md` içindedir.

- Gerçek, geri yüklenmiş sağlayıcı önbelleği salt okunur incelendi: 112 kayıt,
  2.485 maç payloadı. 2.358 gözlem kapsama alındı, 127 seri/uygunsuz kayıt hariç
  tutuldu. Bunlar global tekil maç veya ömür boyu geçmiş sayıları değildir.
- Maç detayında karşı taraftaki/ikinci oyuncu doğru seçilir; beraberlik ayrı
  gösterilir. 2v2 iki takımın dört destesini gösterir, 1v1 AI yorumu çağırmaz.
  Duel/çoklu deste/boat/round dizileri tek maç diye yorumlanmaz. Maç analizi
  önbelleği hesap ve tam maç kanıtı bazında ayrılır.
- Gözlenen sonuç metnini model yazamaz; skor ve dil üzerinden oluşturulur.
  Bozuk/null AI nesneleri ve ilgisiz kart etkileşimleri ayıklanır; karşı deste
  yalnız koleksiyonda bulunan sekiz tekil karttan oluşabilir. Bu kontrol aktif
  biçim veya mod uygunluğunu kanıtlamaz; metinler olası pratik önerisidir.
- `sync-leaderboard` ve `calculate-player-stats` gerçek kullanıcı kimliğini
  ayrıca kontrol eder. Projenin herkese açık anonim anahtarı kullanıcı değildir.
  `sync-achievements` yetkisiz isteklerde doğru 401/400 sonucunu döndürür.
- **Ek güvenlik düzeltmesi:** genel `send-email` işlevindeki kampanya dışı
  gönderimler yalnız sunucu anahtarıyla çalışır. Normal/yönetici oturumu veya
  anonim anahtar bu yolu kullanamaz. Meşru sunucu bildirimi sahte sağlayıcıyla
  geçti. Eski `welcome` isteği yalnız onay döndürür; gerçek hoş geldin tekil
  doğrulama kuyruğunda kalır. Kampanya kapısı değişmedi ve kapalı tutuldu.
- Klan API 429/503/zaman aşımı boş başarılı listeye dönüşmez. Kayıt formu
  öncesinde kullanılan halka açık klan/indirim uçları yanlışlıkla kilitlenmedi.
- Gerçek yerel Auth/PostgREST/RLS ve Edge Runtime ile yedi sentetik hesap türü,
  yönetici yetkisi, per-player ücretli gate ve ücretsiz uçtan uca akış geçti.
  Ücretsiz tekrar aynı görevi okudu; AI iş tablosunda yalnız bir tamamlanmış
  üretim var. Hiçbir gerçek oyun, ödeme, e-posta veya AI çağrısı yapılmadı.
- 39 giriş OPTIONS/kimliksiz/anonim-token yollarından çağrıldı. Sunucu/ticket
  callback'lerinin OPTIONS reddetmesi tarayıcı CORS başarısı diye sunulmadı.
  Bu matris her işlevin bütün iş dallarını çalıştırdığı anlamına gelmez.
- Beş dil × iki ekran genişliğinde 110 tarayıcı senaryosu geçti. Gerçek fiziksel
  telefonda kullanım ve ekran okuyucu cihaz testi yerine geçmez.
- Bulut prova salt okunur kontrolünde kampanya kapalı, `pg_cron`/cron şeması yok;
  dağıtılmış Edge işlevi yok. Bu izolasyon kanıtıdır, platformun bulutta
  tamamlandığına dair kanıt değildir. Üretim cron/deploy eşliği değişmedi.

### Son kapanış kontrolü

- Maçtan sohbete geçişte ek bir hata tekrar üretildi: gerçek 1–1 beraberlik,
  ekrandan taşınan eski özet alanları yüzünden 0–3 mağlubiyet diye gönderiliyordu.
  Sohbet kartı ve AI isteği artık aynı doğrulanmış maç gözlemini kullanır.
  Yanlış oyuncu, bozuk/seri maç, kapalı panel veya AI erişimi olmayan etiket
  otomatik gönderim başlatamaz. Yeni maç isteğine önceki sohbet eklenmez.
- Bu geçiş için 70 yeni tarayıcı senaryosu; mevcut 110 senaryo; 189 uygulama
  testi, tür kontrolü ve derleme geçti. Yeni kullanım testi, önceden oluşmuş
  gerçek gateway yanıtındaki cache-write biçimini JSON ve SSE olarak sınar;
  kredi tutarını parasal bedel veya cache-write tokenlarını ek input saymaz.
- Google girişi tamamen sınanmamış değildir: ayrı geçiş deposundaki
  `docs/supabase-migration/auth-payments-performance-2026-11-18.md`, önceki
  `bb618be` tabanında gerçek operatör OAuth giriş/yenileme/çıkış ve aynı UUID/hak
  kontrolünü kaydeder. Bu, buradaki yeni uygulama sürümünün tam OAuth kabulü
  değildir. Prova Google sağlayıcısı testten sonra yeniden kapatılmıştır.
- 19 Kasım 16:38:58 UTC canlı salt okunur kontrolde kampanya gönderimi kapalı,
  `ai_generation_attempts` tablosu yoktu. Ölçüm/tekil üretim kodu canlıya alınmış
  sayılmaz. İki eski grace işi hâlâ etkin ve önceki 24 saatte toplam 48 kez
  zamanlayıcıda çalışmıştı. Ayrıntı: `run-cost-audit-2026-11-19.md`.

**Güncel durum:** aynı sürüm bulut prova hedefine dağıtıldı; gerçek parola girişi,
haklar, eski kayıtların korunumu ve gerçek pg_cron davranışı doğrulandı.
[Ayrıntılı kabul ve sınırlar](correctness-cloud-rehearsal.md).

**Kalan dış kabul:** üretim dağıtım/cron eşliği; uzak bundle geri okuma;
bu sürümle tam Google giriş akışı ve fiziksel mobil kritik akış;
sağlayıcı run-ID/fatura eşleştirmesi. Bir mevcut gateway
yanıtının kullanım alanlarının okunması fatura mutabakatı değildir. Aktif
Hero/slot verisi kaynakta yoksa sonuç bilinmeyen kalır; bu veri icat edilerek
kapatılmaz. Bunlar tamamlanmadan ERR35'e 35/35 canlı onay verilmez. Kod
düzeltmeleri yayınlanmadan üretimde kapanmış sayılmaz.
