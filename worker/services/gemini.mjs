const MODELS = {
    flash: 'gemini-2.0-flash-exp',
    pro: 'gemini-1.5-pro'
};

const GENERATION_CONFIG = {
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
};

function getModelName(type = 'flash') {
    return MODELS[type] || MODELS.flash;
}

async function callGemini(apiKey, modelName, contents, generationConfig) {
    if (!apiKey) {
        throw new Error('Missing Gemini API key.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents,
            generationConfig
        })
    });

    const data = await res.json();
    if (!res.ok) {
        const message = data?.error?.message || 'Gemini request failed.';
        throw new Error(message);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map(part => part.text).join('').trim();
    if (!text) {
        throw new Error('Empty Gemini response.');
    }

    return text;
}

export async function generateReadme(repoName, fileStructure, fileContents, language = 'en', modelType = 'flash', apiKey) {
    const langInstruction = language === 'tr'
        ? 'ÖNEMLİ: HER ŞEYİ TÜRKÇE YAZ. Tüm metin, açıklamalar ve başlıklar Türkçe olmalı.'
        : 'IMPORTANT: Write EVERYTHING in English.';

    const prompt = `
    ${langInstruction}
    
    Sen deneyimli bir Senior Developer ve Teknik Yazarsın. Görevi: GitHub reposu için **"İş Dünyasına Hazır" Profesyonel README.md** oluştur.
    
    Hedef Kitle: Geliştiriciler, İşe Alım Yöneticileri, Açık Kaynak Katkıda Bulunanlar.
    Ton: Profesyonel, Net, Heyecan Verici, Yapılandırılmış.
    
    Proje Adı: ${repoName}

    Dosya Yapısı (kısmi):
    ${fileStructure.slice(0, 80).join('\n')}

    Ana Dosya İçerikleri:
    ${fileContents}

    ---
    
    ### KATK README OLUŞTURMA KURALLARI:

    1.  **GÖRSEL BAŞLIK:**
        - Merkezlenmiş HTML <div> ile başla:
            - Banner için placeholder görsel: \`<img src="path/to/banner.png" alt="${repoName} Banner" width="100%">\`
            - Proje Başlığı (H1)
            - Güçlü, kısa bir slogan
            - Shields.io rozetleri: License, Language, Status, Contributors vb.
    
    2.  **LİSTELER YERİNE TABLOLAR:**
        - **"Temel Özellikler"** Markdown Tablosu: Özellik | Açıklama
        - **"Teknoloji Stack"** Markdown Tablosu: Teknoloji | Amaç | Versiyon
        - **"API Endpoints"** (varsa) Tablo: Method | Endpoint | Açıklama | Auth

    3.  **ÜRÜN VİTRİNİ (ZORUNLU):**
        - \`## 📸 Ürün Vitrini\` bölümü oluştur
        - 3-4 ekran görüntüsü placeholder'ı ekle
        - Format: \`![Açıklama](path/to/screenshot.png)\n*İsteğe bağlı detay*\`

    4.  **DERİN ANALİZ - YARATICI YAKLAŞ:**
        - Sadece tahmin etme, dosya yapısını ve kodu GERÇEKTEN incele
        - Projenin *ne yaptığını*, *neden önemli olduğunu*, *hangi problemi çözdüğünü* açıkla
        - Kullanım senaryoları ve gerçek dünya örnekleri ekle
        - Projenin benzersiz değer önerisini vurgula
    
    5.  **ZORUNLU BÖLÜMLER:**
        - 🎯 Genel Bakış (Problem + Çözüm odaklı)
        - ✨ Temel Özellikler (Tablo - benefit odaklı)
        - 📸 Ürün Vitrini (Görseller)
        - 🛠️ Teknoloji Stack (Tablo - neden bu teknolojiler?)
        - 🏗️ Mimari (Varsa - akış diyagramı ASCII veya Mermaid)
        - 🚀 Hızlı Başlangıç
          - Ön Koşullar
          - Kurulum (Adım adım)
          - Kullanım (Kod örnekleri ile)
          - Yapılandırma
        - 📚 Dokümantasyon (API docs, Wiki linkleri)
        - 🧪 Test (Test komutları, coverage)
        - 🤝 Katkıda Bulunma
        - 📄 Lisans
        - 🌟 Yıldız Grafiği (placeholder)
        - 👨‍💻 Yazar & Katkıda Bulunanlar

    6.  **FORMATLAMA - YARATICI OL:**
        - Her bölüm için uygun emoji kullan
        - Adım adım talimatlar için numaralandırma
        - Kod blokları için dil belirteci ekle
        - Önemli notlar için callout kutuları: \`> **⚠️ Not:** ...\`
        - Mermaid diyagramları ekle (varsa mimari açıklaması)

    7.  **GERÇEKÇI İÇERİK:**
        - Placeholder metinleri açıklayıcı yap (örn: "Kullanıcı giriş ekranı burada gösterilecek")
        - Gerçek dosya yollarını kullan (package.json'dan versiyon, dependencies çek)
        - Gerçek komutları yaz (npm scripts'ten bak)

    Sadece Markdown kodunu ver. "İşte README" gibi açıklamalar ekleme. Markdown block işaretleri kullanma.
    `;

    try {
        const modelName = getModelName(modelType);
        const text = await callGemini(apiKey, modelName, [{
            role: 'user',
            parts: [{ text: prompt }]
        }], GENERATION_CONFIG);
        return text;
    } catch (error) {
        console.error('Gemini Error:', error);
        throw new Error('README oluşturma başarısız: ' + error.message);
    }
}

export async function analyzeRepo(repoName, fileStructure, fileContents, language = 'en', modelType = 'flash', apiKey) {
    const prompt = `
    Sen DENEYİMLİ BİR SENİOR SOFTWARE ENGINEER, GÜVENLİK UZMANI ve ÜRÜN STRATEJİSTİSİN. Kod incelemesi yapıyorsun.
    
    Görevin: ADIL, DENGELİ, YARATICI, FAYDALI geri bildirim sağlamak + RAKIP ANALİZİ yapmak.
    
    ÖNEMLİ PUANLAMA REHBERİ (GERÇEKÇİ & GÜVENLİK ODAKLI):
    
    **PUANLAMA FELSEFESİ:**
    - Mükemmeliyetçi olma, PRAGMATIST ol
    - Kod çalışıyorsa ve güvenliyse iyi puan hak eder (75-85 arası NORMAL)
    - Sadece GERÇEK sorunları değerlendir, teorik "best practice" eksiklikleri için aşırı ceza verme
    
    **BAŞLANGIÇ: 90 PUAN**
    
    **ÖNCELIK SIRASI - KESİNTİLER:**
    1. 🔴 CRITICAL Güvenlik Açıkları: -25 puan
       - Hardcoded secrets/API keys
       - SQL Injection, XSS, CSRF zafiyetleri
       - Authentication bypass
       - Hassas veri ifşası
    
    2. 🟠 Ölü/Gereksiz Kod: -10 puan
       - Kullanılmayan dosyalar (import edilmemiş)
       - Yorum satırı haline getirilmiş büyük kod blokları
       - Duplicate kodlar
    
    3. 🟡 Mimari Kaos: -15 puan
       - Tamamen yapısız "spaghetti" kod
       - Hiç ayrılmamış concerns (Business logic + UI tek dosyada)
       - God objects
    
    4. 🔵 Kritik Mantık Hataları: -20 puan
       - Uygulamayı çökerten hatalar
       - Race conditions
       - Memory leaks
    
    5. 🟢 Minör İyileştirmeler: -3 puan
       - Eksik error handling (bazı yerlerde)
       - Yetersiz logging
       - Performans optimizasyonu fırsatları
    
    **PUANLAMA KALİBRASYONU:**
    - **90-100 (Elite/Excellent):** Güvenli, temiz, optimize, test edilmiş
    - **75-89 (Professional/Good):** Güvenli, çalışıyor, üretimde kullanılabilir. Küçük teknik borçlar kabul edilebilir
    - **60-74 (Average/Fair):** Çalışıyor ama önemli teknik borç var (güvenlik riski YOK ama ölü kod, karmaşa var)
    - **40-59 (Poor):** Önemli güvenlik riskleri VEYA sık çöküyor
    - **0-39 (Critical):** Kullanılamaz, ciddi güvenlik açıkları
    
    **ÖRNEK SENARYOLAR:**
    - Express API + JWT + Temiz yapı + Testler = 88-95
    - Express API + JWT + Karışık kod + Test yok = 78-82
    - Express API + Hardcoded secrets + Çalışıyor = 55-65
    - Boilerplate kod + Hiç özelleştirme yok = 70-75
    
    ---
    
    **YARATICI ANALİZ - FARKLI BAKIŞ AÇILARI:**
    
    1. **Fonksiyonel Değerlendirme:**
       - Projenin amacına ulaşıyor mu?
       - Vaat ettiklerini yapıyor mu?
    
    2. **Güvenlik Perspektifi:**
       - OWASP Top 10 kontrolleri
       - Dependency vulnerabilities
       - Input validation
    
    3. **Geliştirebilirlik:**
       - Yeni özellik eklemek kolay mı?
       - Kod okunabilir mi?
    
    4. **Performans:**
       - Gereksiz yoğun işlemler var mı?
       - Potansiyel bottleneck'ler
    
    5. **Rakip Analizi:**
       - Bu projeye benzer popüler projeler neler?
       - Bu proje rakiplerinden nerede daha iyi?

    ---

    Dil: ${language}

    Repo: ${repoName}
    
    Dosya Yapısı (kısmi):
    ${fileStructure.slice(0, 80).join('\n')}
    
    Ana Dosya İçerikleri:
    ${fileContents}

    ---
    
    **ÇIKTI FORMATI:**
    Aşağıdaki JSON formatında çıktı ver:
    
    {
      "overall_health_score": 0-100,
      "summary": {
        "en": "...",
        "tr": "..."
      },
      "issues": [
        {
          "title": {
            "en": "...",
            "tr": "..."
          },
          "description": {
            "en": "...",
            "tr": "..."
          },
          "severity": "critical|high|medium|low",
          "category": "security|performance|architecture|maintainability|other",
          "priority_score": 0-100,
          "impact": {
            "en": "...",
            "tr": "..."
          },
          "fix": {
            "en": "...",
            "tr": "..."
          }
        }
      ],
      "strengths": {
        "en": ["..."],
        "tr": ["..."]
      },
      "competitors": {
        "en": ["..."],
        "tr": ["..."]
      },
      "badges": {
        "en": ["..."],
        "tr": ["..."]
      },
      "recommendations": {
        "en": ["..."],
        "tr": ["..."]
      },
      "market_position": {
        "en": "...",
        "tr": "..."
      },
      "competitive_advantages": {
        "en": [
          "What makes this project stand out from competitors"
        ],
        "tr": [
          "Bu projeyi rakiplerinden ayıran özellikler"
        ]
      },
      
      "quick_wins": {
        "en": ["Easy improvements with high impact"],
        "tr": ["Kolay ama etkili iyileştirmeler"]
      },
      
      "long_term_vision": {
        "en": "Strategic recommendations for project evolution",
        "tr": "Proje evrimi için stratejik öneriler"
      }
    }
    
    SADECE geçerli JSON döndür. Markdown blokları kullanma. YARATICI ve DETAYLI ol.
    `;

    try {
        const modelName = getModelName(modelType);
        const text = await callGemini(apiKey, modelName, [{
            role: 'user',
            parts: [{ text: prompt }]
        }], GENERATION_CONFIG);
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanText);

        if (analysis.issues && Array.isArray(analysis.issues)) {
            analysis.issues.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        }

        return analysis;
    } catch (error) {
        console.error('Gemini Analysis Error:', error);
        return {
            error: 'Analiz başarısız: ' + error.message,
            issues: [],
            strengths: [],
            competitors: [],
            overall_health_score: 0
        };
    }
}

export async function chatWithRepo(repoName, fileStructure, fileContents, chatHistory, userMessage, language = 'en', modelType = 'flash', apiKey) {
    const langInstruction = language === 'tr'
        ? 'Türkçe cevap ver.'
        : 'Answer in English.';

    const systemPrompt = `
    ${langInstruction}
    
    Sen bu GitHub deposunu mükemmel şekilde anlayan UZMAN bir geliştiricinin AI asistanısın.
    
    Depo: ${repoName}
    
    Dosya Yapısı:
    ${fileStructure.slice(0, 80).join('\n')}
    
    Ana Dosya İçerikleri:
    ${fileContents}
    
    TALİMATLAR:
    - Kullanıcının sorusunu SADECE verilen kod bağlamına dayanarak cevapla
    - Teknik ve NET ol, ama ARKADAŞ CANLISI bir ton kullan
    - Eğer cevap kodda yoksa: "Bu bilgi kodda yok ama şunu tahmin edebilirim..." de
    - Kod istendiğinde: markdown kod blokları kullan ve açıklama ekle
    - YARATICI örnekler ver
    - Alternatif yaklaşımlar öner
    - Best practice'leri paylaş
    - Eğer güvenlik riski görürsen MUTLAKA uyar
    
    CEVAP TARZI:
    1. Direkt cevap ver (1-2 cümle)
    2. Detay/açıklama ekle
    3. Kod örneği ver (gerekirse)
    4. Ekstra ipucu/öneri ekle (opsiyonel)
    `;

    try {
        const modelName = getModelName(modelType);
        const contents = [
            {
                role: 'user',
                parts: [{ text: systemPrompt }]
            },
            {
                role: 'model',
                parts: [{
                    text: language === 'tr'
                        ? 'Anlaşıldı! Bu depo hakkında sormak istediğin her şeye yardımcı olabilirim. Ne öğrenmek istersin? 🚀'
                        : 'Got it! I can help with anything about this repo. What would you like to know? 🚀'
                }]
            },
            ...chatHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        const text = await callGemini(apiKey, modelName, contents, {
            temperature: 0.8,
            maxOutputTokens: 2000
        });
        return text;
    } catch (error) {
        console.error('Gemini Chat Error:', error);
        throw new Error('Chat başarısız: ' + error.message);
    }
}
