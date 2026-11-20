# 20 Kasım tahmin denetimi ve kapanış durumu

Başlangıç: `main` `8808899a41de477377c2f492e6b3de8e1aef5644`.
Dal: `codex/matchup-audit-fixes`. Bu kayıt kod ve yalıtılmış kabul içindir;
bu dalın birleştiği, sunucuya dağıtıldığı veya sitenin yayımlandığı iddiası yoktur.
Canlıya, bulut provaya, müşteri haklarına, kampanya ayarlarına veya eski öneriye
bu çalışmada yazılmadı. Gerçek AI, ödeme veya e-posta çağrısı yapılmadı.

## Doğrulanan ve düzeltilen bulgular

| Bulgu | Önce | Bu dalda |
|---|---|---|
| P1, sıfır yüzde | `0/100 → 33/67`, tersi `67/33` | Sonlu, 0–100 arası sayılar doğrulanır; sıfır korunur. Geçerli fakat toplamı 100 olmayan çiftlerin mevcut normalizasyonu korunur. |
| P1, bozuk model çıktısı | Bozuk JSON için sahte 50/50 ve HTTP 200 | Eksik/bozuk JSON veya geçersiz sonuç HTTP 502; başarılı tahmin ve kullanım olayı yazılmaz. |
| P2, tahmin kayıt hatası | Dönen DB hatası yok sayılır | Dönen kayıt hatası HTTP 503; fırlatılan hata da başarılı yanıt olmaz. Ham sağlayıcı yanıtı kayıtlıysa tekrar aynı yanıtı kullanır. |
| Oracle ekranında sözleşme hatası | Yanlış alan adları yüzünden geçerli yüzdeler de 50/50 görünür | Sunucuyla aynı doğrulayıcı ve `deckAWinRate/deckBWinRate` sözleşmesi kullanılır; hata mevcut çeviriyle görünür. |

Hatalar gerçek handler üzerinde sahte taşıyıcılarla yeniden üretildi. Bunlar
canlı müşteride yaşandığı doğrulanmış olaylar değildir. İlk regresyon koşusunda
21 senaryonun 14'ü başarısızdı; düzeltme ve ek cache testi sonrası 22/22 geçti.

Önbellek okuma hatası da açıkça 503 olur ve yeni AI çağrısına ilerlemez. Yeni
cache anahtarı yalnız bu özellikte `matchup-result-v2` içerir. Eski bozuk
yüzdeler yeni doğru sonuç gibi tekrar sunulmaz. Eski satırlar silinmez veya
topluca yeniden hesaplanmaz; tarihsel sonuçların doğrulandığı iddia edilmez.
AI modeli, prompt, sağlayıcı istek gövdesi ve atomik üretim anahtarı değişmedi.
Test, eski cache satırı dışlanırken mevcut ham yanıtın yeni üretim olmadan tekrar
kullanılabildiğini de doğrular. Ham yanıtı bulunmayan eski kayıtları bu çalışma
geri kazanmış saymaz.

## Bu sürümde tekrar çalıştırılan kontroller

| Kontrol | Sonuç / sınır |
|---|---|
| Uygulama testleri | 200 geçti, 0 başarısız |
| Yeni gerçek tahmin handler testleri | 22 geçti; 135 doğrulama; dış ağ denemesi 0 |
| Mevcut üç gerçek handler testleri | 8 geçti |
| AI ölçüm / tekil üretim | Gerçek SQL ve wrapper ile 25 kontrol geçti; dış ağ 0 |
| Gerçek koçluk SDK akışı | 1 test geçti; Deno ağ izni yok |
| Veri doğruluğu | Gerçek SQL, 20 kontrol geçti |
| Profil ve hak güvenliği | 10 kabul kontrolü ve eski açığın yeniden üretimi geçti; denemeler geri alındı |
| Ücretsiz ilk fayda | 64 kontrol geçti; trial/paid sınırları, tekil üretim ve kampanya kapalı koşulu dahil |
| Pazarlama / geri kazanım | 41 / 25 test geçti; gerçek SQL, sahte sağlayıcı |
| Gelir / dönüşüm | 93 gelir kontrolü ve dönüşüm SQL kabulü geçti |
| Tür kontrolü / derleme | Uygulama ve değişen Edge girişi geçti; üretim derlemesi geçti, mevcut büyük dosya uyarısı sürüyor |
| Gerçek Chrome, yerel Oracle | TR 0/100, EN 100/0; TR kayıt hatası ve EN bozuk yanıt hata olarak görüldü. Gerçek bileşen, sentetik servis; fiziksel telefon ve canlı kabul değildir. |

SQL testleri yalnız yeni ve geçici, TCP dinlemeyen PostgreSQL üzerinde çalıştı.
Test komutları [README](../tests/integration/correctness/README.md) içindedir.
Ham loglar ve ekranlar yerel `kabul-kanitlari/2026-11-20-matchup-audit/` klasöründe.

## Yayın sırası

1. Bu dalı inceleyip kesin commit'i kaydederek birleştir.
2. Aynı kaynak sürümünden **yalnız `predict-deck-matchup`** ve dahil ettiği ortak
   dosyaları dağıt. Yeni veritabanı geçişi veya hak değişikliği yoktur.
3. Oracle düzeltmesi için siteyi yayımla. Site yayını Edge dağıtımını kanıtlamaz.
4. Dağıtım kaydı, site sürümü ve normal kullanıcı hata/success görünümünü
   doğrula. Yeni gerçek AI harcaması veya müşteri kaydı değişikliği ile kabulü
   zorlamadan, mevcut/dogal trafik üzerinden izle. Kampanya gönderimi kapalı kalsın.

## Tam kapanış için açık kalanlar

- **ERR17 / Oracle / ERR35:** bu düzeltmenin canlı dağıtımı ve kabulü henüz yok.
- **Eski yarım ücretsiz öneri:** sağlayıcı başarısızlığı teşhis edilmiş; başarılı
  çıktı yok. Müşterideki bekleyen durum/teslim edilmeyen öneri bu PR'da değişmedi.
  Yeniden üretim veya kullanılmış hak sıfırlaması yapılmadı.
- **ERR35:** fiziksel cihaz kabulü ve dağıtılmış uzak paketlerin bağımsız geri
  okuma karşılaştırması açık. Bu, mevcut Google girişinin bozuk olduğu iddiası
  veya Supabase geçişine başlama talebi değildir.
- **Bağımlılık güvenliği:** bu dalda `npm audit` 17 yüksek + 10 orta bulgu;
  `--omit=dev` ile 12 yüksek + 2 orta. Bu ikinci sayı üretim bağımlılık grafiğini
  gösterir, dağıtılmış tarayıcı/Edge paketinde erişilebilir açık sayısını değil.
  Kullanım yolu, sürüm düzeltmesi ve regresyon etkisi incelenmeden güvenlik
  kapanışı verilemez. Bu PR paket veya lock dosyası değiştirmez.
- **Tam USD maliyeti:** sağlayıcı faturasıyla istek bazında kesin eşleştirme
  bulunmayan satır bilinmeyen kalır; sıfır maliyet değildir.

20 Kasım 06.00 Türkiye saati temizliği önceki ham kanıtta `runid=22636`,
`succeeded` olarak doğrulanmıştı. Yaklaşık 95 ms ve “1 row”, silinen mesaj
sayısı anlamına gelmez. Önceki 73 tablo/26.300 kayıt korunum karşılaştırması
ve 16 yanıtlık maliyet pilotu bu tur yeniden çalıştırılmadı. Pilot 1,15 → 0,77
kredi (%33 azalma), ortalama 5,13 → 6,53 saniye; tüm trafik için tasarruf veya
hız garantisi değildir. Eski kapanış belgesi bu açıklarla birlikte okunmalıdır.
