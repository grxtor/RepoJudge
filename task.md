# 🚀 RepoJudge - Proje Görev Takip Listesi

## ✅ Tamamlananlar (Başarılanlar)
- [x] **Proje Temeli:** Node.js, Express ve Vanilla JS ile proje iskeleti kuruldu.
- [x] **Yapay Zeka Entegrasyonu:** Google Gemini 2.0 Flash API bağlandı.
- [x] **Kod Analizi:** Repoları tarayıp hataları, güvenlik açıklarını bulan sistem yazıldı.
- [x] **GitHub Login:** OAuth 2.0 ile GitHub girişi eklendi.
- [x] **Özel Repo Desteği:** Kullanıcı giriş yapınca kendi özel (private) repolarını da analiz edebiliyor.
- [x] **Dashboard:** Sol menü, geçmiş, analiz detayları (tab'lı yapı) tasarlandı.
- [x] **Landing Page:** Modern, animasyonlu ve "Glassmorphism" tasarımlı ana sayfa yapıldı.
- [x] **README Oluşturucu:** Projeler için otomatik README.md yazan özellik eklendi.
- [x] **UI/UX:** 3D kart efektleri, scroll animasyonları ve premium karanlık tema (Dark Mode) uygulandı.
- [x] **Puanlama Sistemi:** Popüler repolar için puanlama algoritması iyileştirildi ve SCORING.md eklendi.
- [-] **Çoklu Dil:** Tam Türkçe/İngilizce dil desteği (i18n) eklendi. ( tam olarak yapılamadı hala gemini'nin verdiği çıktılar diğer dile çevrilemiyor)
- [x] **GitHub Hazırlığı:** `repojudge` ismiyle GitHub'a pushlandı, klasör yapısı temizlendi.
- [-] **GitHub Hazırlığı:** Projenin Sayflarının ScreenShot'larını hazırlayıp siteye koy yapabiliysan gif lerde koyabilirsin.
---

## 🚧 Sırada Yapılacaklar (Roadmap)

### 1. 🌐 Canlıya Alma (Deployment)
- [ ] **VDS Sunucu:** Ubuntu 22.04 sunucu satın alınacak (Kullanıcı IP bilgisini bekliyor).
- [ ] **Linux Kurulumu:** Sunucuya Node.js, Git, PM2 ve Nginx kurulacak.
- [ ] **Domain Bağlama:** `grxtor.me` ve `repojudge.grxtor.me` alan adları sunucuya yönlendirilecek.
- [ ] **SSL Sertifikası:** Sitenin güvenli olması için (https) Let's Encrypt kurulacak.
- [ ] **OAuth Güncellemesi:** GitHub ayarlarındaki `localhost:3000` adresleri yeni domain ile değiştirilecek.

### 2. 🖥️ Masaüstü Uygulaması (Cross-Platform)
- [ ] **Electron.js:** Projeye Electron kütüphanesi eklenecek.
- [ ] **Main Process:** Uygulama penceresini yöneten ana dosya yazılacak.
- [ ] **Paketleme:** macOS için `.dmg` veya `.app` dosyası oluşturulacak (Build).
- [ ] **İkon:** Uygulama için havalı bir macOS ikonu (.icns) ayarlanacak.

### 3. ✨ Yeni Özellikler (Onaylananlar)
- [ ] **💬 Chat with Code:** Kullanıcının repo hakkında soru sormasını sağlayan chat arayüzü.
- [ ] **🏅 Badge Sistemi:** README'ye eklenebilir skor rozeti (Markdown).
- [ ] **🆚 Repo VS Repo:** İki repoyu kıyaslama modu.

### 4. 🌐 Canlıya Alma (Deployment)

---

**Not:** Şu an ana odak noktamız sunucu bilgilerini (IP) bekleyip projeyi **`repojudge.grxtor.me`** adresinde canlıya almaktır.
