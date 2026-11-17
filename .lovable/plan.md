# Tek taslak PR: bakım düzeltmeleri + ücretli/deneme izin daveti + hukuki metinler

Tüm iş, güncel `main` üzerinden açılacak **yalıtılmış bir taslakta** (kendi test veritabanı) yapılır. Canlı veritabanı, oyuncu tercihleri, kampanya ayarları değişmez; `sending_enabled=false` kalır; gerçek e-posta gönderilmez; site yayımlanmaz. TR/EN/ES/FR/PT ve mevcut tasarım korunur.

## 1. Bakım düzeltmeleri
- **İzin testleri şeması:** `marketing.test.ts` temiz veritabanına `0027` ve bu PR'ın yeni geçişleri dahil tüm şemayı kursun; 34/34 + yeni senaryolar, sahte sağlayıcı, sıfır dış ağ çağrısı.
- **Eski gönderim zamanları:** `0026`/`0027` dokunulmadan yeni geçiş. Doğrulanmamış kabul veya yalnızca `profiles.winback_email_sent_at` kaynağı → yönetimde "zaman doğrulanmadı", bekleme hesabında kullanılmaya devam. Sağlayıcı doğrulamalı ilk kabul korunur; geçmişsiz hesapta alanlar boş. "Gönderildi, saati doğrulanmadı" ile "gönderim belirsiz" ayrı; belirsizde yeni kampanya gönderemez. Eski kayıtlar testte geçişten önce oluşturulur; yönetim ekranı ve gönderici aynı kararı verir.
- **720 saat metni:** Verilen TR metni ve EN/ES/FR/PT doğal karşılıkları; UTC tarih açıklaması düzeltilir. −1 sn / tam sınır / +1 sn testleri.

## 2. Ücretli ve denemedeki oyunculara uygulama içi davet
- Mevcut `MarketingInvite` kartı (Koç → Genel Bakış). Sunucu davet koşulu `trialing` yerine ortak abonelik erişim kuralını kullanır: aktif ücretli, süresi süren deneme, yenilemesi kapalı ama dönem sonuna kadar erişimli. Süresi dolan oyuncu tercihlerini görüp izni geri çekebilir.
- Hesap başına tek davet, atomik talep (iki cihaz/sekme/etiket ikinci davet üretmez); Tercihler sayfası daveti tüketmez; reddeden/geri çeken/"Şimdi değil" diyen tekrar görmez.
- Açık seçim: görmek, kapatmak, kayıt, ödeme, doğrulama izin üretmez; kayıt kutusu boş; gösterilmeyen kutu kayıt üretmez; bekleyen kayıt onay adımı korunur. Olumlu seçimde hesap, adres, zaman, kaynak ekran, dil, metin sürümü saklanır; eski kanıtlar korunur.
- 18+ kapsamı: bilinmeyen yaş/ülke uygun sayılmaz; IP/dil/alan adından tahmin yok; tam doğum tarihi istenmez; İYS süreci hazır değilken o kapsamda yeni izin alınmaz; eksik kararlar `global` ile geçilmez. Koçluk yanıtsız devam eder.
- Verilen kart metni ve alt açıklama, aydınlatma metni bağlantısı; hizmet koşulları ayrı seçim.

## 3. /privacy ve /terms (beş dil)
- Veri sorumlusu Fittechs Yazılım A.Ş.; hesap/abonelik bildirimleri, istenen koçluk e-postaları ve isteğe bağlı kampanyalar ayrı; izin alma, kanıt, geri çekme; geri kazanım adaylığında abonelik/kullanım verisi; kategoriler, amaçlar, dayanaklar, sağlayıcı rolleri, saklama ölçütleri, hak başvurusu. `support@fittechs.com` tıklanabilir ve oturumsuz erişilebilir.
- Koşullara verilen hüküm eklenir; tarih ve sürüm güncellenir. Doğrulanmamış süre/aktarım/uyum iddiası yok; Fittechs teyidi gerekenler PR açıklamasında tek listede.

## 4. Kabul ve teslim
- İzin toplama açık, gönderim kapalı senaryosu: uygun ücretli ve deneme hesabı daveti görür; biri izin verir, diğeri "Şimdi değil"; ilki geri çeker; UI ile kayıt her adımda eşleşir; gönderilebilir alıcı 0, sağlayıcı kabulü 0. Kapalı pazar ve belirsiz yaşta koçluk çalışır.
- 125 uygulama, 18 geri kazanım, 34 izin testi + yenileri; temiz kurulum, tür denetimi, üretim derlemesi; beş dilde eksik anahtar/eski metin/yanlış dil kontrolü; bir mobil, bir masaüstü ekran görüntüsü.
- Teslim: son commit, test sonuçları, yayın sırası (GitHub merge → canlı geçiş + ilgili fonksiyonlar → site yayını), yayın sonrası salt okunur sayım sorgusu (aktif ücretli/deneme, seçim yapmış, davet edilebilir, eksik bilgiyle bekleyen; adres göstermeden).
- Taslak PR'ı kendisi açamaz; PR'ı GitHub bağlantınızdan siz açarsınız, bağlantıyı sonra paylaşırım.
