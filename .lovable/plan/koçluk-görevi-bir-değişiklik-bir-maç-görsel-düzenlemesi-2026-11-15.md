# Koçluk görevi ("Bir değişiklik. Bir maç.") görsel düzenlemesi

## Tespitler (ekran görüntüsü + mevcut ekran)
- Bölüm, Genel Bakış'taki diğer kartlardan farklı: çerçevesiz, arka plansız, sadece alt çizgiyle ayrılıyor, sayfaya "yapıştırılmış" görünüyor.
- Görevin adımları (değiştir → oyna → sonucu kontrol et) görünmüyor; kullanıcı nerede olduğunu anlamıyor.
- Aynı cümle iki kez yazıyor ("Elite Barbarians (seviye 10) yerine Royal Giant (seviye 13) kullan.") — hem sol tarafta hem takip cevabında.
- Kart görselleri çok büyük; önerilen deste ve rakip deste ekranın çoğunu kaplıyor, asıl mesaj (değişiklik + sonuç) kayboluyor.
- Önerilen destede yeni eklenen kart işaretli değil.
- "Takip sorunun" başlığı altındaki soru ile cevap aynı görünümde; cevap vurgusuz.
- Sonuç (0–1 Mağlubiyet) küçük bir alt bölümde; rakip deste sonuçtan daha baskın.
- "Desteyi telefonda aç" butonu sayfanın en altında kalıyor, sağ alttaki yüzen buton kartların üzerine biniyor.

## Yapılacaklar
1. **Kart içine alma**: Tüm görev, Dashboard'daki diğer kartlarla aynı kart stiline (arka plan, kenarlık, köşe, iç boşluk) alınacak; başlık satırında sağda durum rozeti (Bekliyor / Tamamlandı – Galibiyet/Mağlubiyet).
2. **Adım göstergesi**: Başlığın altında 3 adım: 1 Değişiklik · 2 Maç oyna · 3 Sonuç. Mevcut adım vurgulu, tamamlananlar onaylı.
3. **Değişiklik bloğu**: Çıkar → Ekle kartları küçük, yan yana; altında tek bir neden metni ve "Pratik ipucu". Tekrarlanan swap cümlesi tek yerde gösterilecek.
4. **Önerilen deste**: Daha küçük kartlar, 8'li tek satır (mobilde 4x2); yeni eklenen kart altın çerçeve/rozetle işaretli. "Desteyi telefonda aç" butonu destenin hemen altında, öne çıkan birincil buton.
5. **Takip sorusu**: Ayrı küçük alt kart; soru soluk "Sen:" satırı, cevap "Koç:" vurgulu blok. Kalan soru hakkı yoksa form yerine yalnızca bu kayıt.
6. **Maç sonucu**: Sonuç geldiğinde sağ sütunun üstünde büyük skor kartı (renkli kenar: yeşil/kırmızı/gri), kupa değişimi ve "Sonraki antrenman" önerisi; rakip deste varsayılan kapalı, "Rakip desteyi göster" ile açılır küçük kartlar.
7. **Bekleme durumu**: Sonuç yoksa "Maçı kontrol et" butonu + son kontrol zamanı tek kompakt satırda.
8. **Tamamlanmış görev**: Sonuç geldikten sonra kart daraltılabilir özet hale gelir (değişiklik + skor), istenirse açılır; Genel Bakış'ın geri kalanını aşağı itmez.
9. **Alt boşluk**: Yüzen buton içerikle çakışmasın diye karta alt boşluk.
10. Masaüstü ve mobil (iPhone/Pixel) ekran görüntüleriyle kontrol.

## Teknik detaylar
- Yalnızca `src/components/coaching/FirstSessionTask.tsx` (gerekirse küçük alt bileşenlere bölünür) ve `DeckTransfer.tsx` sunum katmanı; mevcut `Card`, `Badge`, `Collapsible` bileşenleri ve tasarım token'ları.
- Yeni metinler (adım adları, rozetler, "Rakip desteyi göster", "Sen/Koç") 5 dilde `src/i18n/coaching.ts`'e.
- Sunucu fonksiyonları, görev mantığı, maç doğrulama, abonelik kontrolleri ve veriler değişmez; deploy yok.
