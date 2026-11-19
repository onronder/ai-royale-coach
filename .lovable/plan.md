# Hata envanteri (ERR01–ERR35) doğrulama sonucu ve sonraki adım

Kaynak: `bb618be` (projedeki güncel sürümle aynı). İki tur yapıldı: 1) her madde için ayrıntılı kod okuması, 2) kilit satırların doğrudan yeniden kontrolü. İkinci tur ilk turun bütün bulgularını teyit etti. Canlı veriye, veritabanına ve canlı sürüme bakılmadı.

## Sonuç özeti
- **Doğru (25):** ERR03, 04, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 32, 33, 34
- **Kısmen doğru (9):** ERR01, 02, 05, 06, 25, 27, 29, 30, 31
- **Koddan doğrulanamaz (1):** ERR35 (canlı/Git eşitliği). 39 fonksiyon sayısı doğru.
- **Yanlış:** yok.

## Düzeltilmesi gereken abartılar
| ID | Düzeltme |
|---|---|
| ERR01 | Overview "son 30" yazmıyor, gerçek maç sayısını yazıyor. AI özeti ilk 20 maç, Deck Stats 30 **gün**. Farklı kapsam doğru; sayılar canlı veri ister. |
| ERR02 | İlk arketip varsayılanı ve zorunlu kart kontrolü yokluğu doğru. Bu destenin X-Bow çıkması arketip tablosu sırasına bağlı; koddan kanıtlanamaz. |
| ERR05 | Komut zaten "gözlenmemiş yerleşim/zaman iddia etme" diyor; ama aynı komut erken/orta/geç aşama istiyor. Çelişki doğru, "hiç koruma yok" yanlış. |
| ERR06 | Seviye okunmuyor (doğru). Sahip olunmayan desteler zaten eleniyor (satır 478). Puan, kazanma ihtimali değil ağırlıklı uygunluk puanı. |
| ERR09 | Bilinmeyen maliyet 0 oluyor (doğru); ilerleme çubuğu %0 gösteriyor, "hazır" göstermiyor. |
| ERR14 | Arayüzdeki kazanma oranı beraberliği ayrı sayıyor; "galibiyet olmayan = kayıp" yalnız sunucu hesaplarında geçerli. |
| ERR16 | Benimseme sonrası başarı takibinde zaman filtresi var; eksik olan benimseme anı kontrolü. |
| ERR17 | A/B yönü zaten doğru ele alınıyor; geri kalanı doğru. |
| ERR18 | Alan adı `change_7d`; yanıtta "geçmiş veri yok" notu var ama ekranda %0 / sabit görünüyor. |
| ERR21 | Boş geçmiş ve örneklem gösterimi zaten var; güven yüzdesi ham oran (10–95 arası kırpılmış). |
| ERR24 | Puan yeniden hesaplanıyor; yalnız açılan rozet **sayısı** eski kalıyor. |
| ERR25 | Tamamlanmış görev "tamamlandı" etiketiyle gösteriliyor; zorunlu kart değişimi doğru. |
| ERR27 | Turnuva akışı gerçek veriyle çalışıyor; boşluk canlı veriye bağlı. |
| ERR29 | Formül hatası doğru; 4.588 kayıt sayısı doğrulanmadı. |
| ERR30 | Çeviri yarışı ve Builder'da çift çağrı doğru; ilk görev başlatmada kilit zaten var. |
| ERR31 | Kullanıcı kendi profilindeki deneme alanlarını yazabiliyor görünüyor (önemli risk); ücretli abonelik ayrı tablodan kontrol ediliyor. #24 durumu bilinmiyor. |
| ERR32 | Kimlik kontrolü yok (doğru, ciddi). Silme kullanıcının saklama tercihine uyuyor; keyfi silme değil. |

## Önerilen sonraki adım (onayınla)
1. Düzeltilmiş envanteri Dosyalar'a `01_Hata_Envanteri_dogrulanmis.md` olarak kaydet (her madde: karar, dosya:satır, düzeltme).
2. İsteğe bağlı salt okunur veritabanı kontrolleri: ERR29 süresiz kayıt sayısı, ERR04/13 iki oyunculu hesaplarda karışmış satırlar, ERR31 profil yazma izinleri, ERR32 zamanlayıcı kaydı.
3. Kod veya canlı sistemde değişiklik yok; düzeltmeler ayrı plan olarak, ERR31 ve ERR32 (güvenlik) önce.
