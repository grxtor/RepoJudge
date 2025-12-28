const { GoogleGenerativeAI } = require("@google/generative-ai");

const CLIENTS = new Map();

const MODELS = {
    flash: "gemini-2.0-flash-exp",
    pro: "gemini-1.5-pro"
};

// Enhanced configuration for better AI responses
const GENERATION_CONFIG = {
    temperature: 0.9,  // More creative responses
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

function getGenAI(apiKey) {
    const key = apiKey;
    if (!key) {
        throw new Error('Missing Gemini API key.');
    }

    if (!CLIENTS.has(key)) {
        CLIENTS.set(key, new GoogleGenerativeAI(key));
    }

    return CLIENTS.get(key);
}

function getModel(type = 'flash', apiKey) {
    const modelName = MODELS[type] || MODELS.flash;
    const genAI = getGenAI(apiKey);
    return genAI.getGenerativeModel({
        model: modelName,
        generationConfig: GENERATION_CONFIG
    });
}

async function generateReadme(repoName, fileStructure, fileContents, language = 'en', modelType = 'flash', apiKey) {
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
        const model = getModel(modelType, apiKey);
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error("README oluşturma başarısız: " + error.message);
    }
}

async function analyzeRepo(repoName, fileStructure, fileContents, language = 'en', modelType = 'flash', apiKey) {
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
    
    4. **Operasyonel Mükemmellik:**
       - Monitoring var mı?
       - Error handling yeterli mi?
       - Graceful degradation?
    
    5. **Kullanıcı Deneyimi (eğer UI varsa):**
       - Loading states
       - Error messages
       - Accessibility
    
    ---
    
    Proje: ${repoName}
    
    Dosya Yapısı:
    ${fileStructure.slice(0, 80).join('\n')}
    
    Ana Dosya İçerikleri:
    ${fileContents}
    
    ---
    
    ÇOK DİLLİ JSON RESPONSE (İngilizce ve Türkçe):
    
    {
      "summary": {
        "en": "One powerful sentence about what this project does and quality",
        "tr": "Projenin ne yaptığı ve kalitesi hakkında güçlü bir cümle"
      },
      
      "core_purpose": {
        "en": "What problem does this solve?",
        "tr": "Bu hangi problemi çözüyor?"
      },
      
      "technical_approach": {
        "en": "How does it solve the problem? (architecture, patterns)",
        "tr": "Sorunu nasıl çözüyor? (mimari, desenler)"
      },
      
      "issues": [
        {
          "issue": {
            "en": "Specific problem found",
            "tr": "Bulunan spesifik sorun"
          },
          "category": "security" | "architecture" | "dead_code" | "testing" | "documentation" | "performance" | "maintainability",
          "description": {
            "en": "Why this matters and real-world impact",
            "tr": "Bunun neden önemli olduğu ve gerçek dünya etkisi"
          },
          "severity": "critical" | "high" | "medium" | "low",
          "priority_score": 1-100,
          "code_example": "Actual problematic code snippet if applicable",
          "fix_suggestion": {
            "en": "How to fix this",
            "tr": "Nasıl düzeltilir"
          }
        }
      ],
      
      "strengths": {
        "en": ["Concrete strength with example", "..."],
        "tr": ["Somut güçlü yön örnek ile", "..."]
      },
      
      "unique_features": {
        "en": ["What makes this different from competitors"],
        "tr": ["Bunu rakiplerinden farklı kılan nedir"]
      },
      
      "competitors": [
        {
          "name": "Similar Tool Name",
          "category": "industry_leader" | "popular_alternative" | "open_source" | "enterprise",
          "comparison": {
            "en": "How this project compares overall",
            "tr": "Bu proje genel olarak nasıl karşılaştırılır"
          },
          "features_they_have": {
            "en": [
              "Feature 1 that competitor has but this project lacks",
              "Feature 2 with explanation of why it matters"
            ],
            "tr": [
              "Rakipte olan ama bu projede olmayan özellik 1",
              "Özellik 2 ve neden önemli olduğu"
            ]
          },
          "features_we_have": {
            "en": [
              "Unique feature in this project that competitor lacks"
            ],
            "tr": [
              "Bu projede olan ama rakipte olmayan benzersiz özellik"
            ]
          },
          "features_similar": {
            "en": [
              "Features at similar level"
            ],
            "tr": [
              "Benzer seviyede olan özellikler"
            ]
          },
          "learning_opportunity": {
            "en": "What can be learned from this competitor",
            "tr": "Bu rakipten ne öğrenilebilir"
          }
        }
      ],
      
      "overall_health_score": 0-100,
      
      "score_breakdown": {
        "security": 0-100,
        "code_quality": 0-100,
        "architecture": 0-100,
        "documentation": 0-100,
        "testing": 0-100,
        "maintainability": 0-100
      },
      
      "recommendations": [
        {
          "title": {
            "en": "Action item",
            "tr": "Aksiyon kalemi"
          },
          "description": {
            "en": "Why and how",
            "tr": "Neden ve nasıl"
          },
          "priority": "high" | "medium" | "low",
          "category": "security" | "testing" | "documentation" | "ci_cd" | "performance" | "architecture" | "feature" | "competitive",
          "effort": "low" | "medium" | "high",
          "impact": {
            "en": "Expected benefit",
            "tr": "Beklenen fayda"
          },
          "inspired_by": "Competitor name (if this recommendation is inspired by a competitor feature)",
          "example": {
            "en": "Concrete example or code snippet",
            "tr": "Somut örnek veya kod parçası"
          }
        }
      ],
      
      "missing_industry_standards": {
        "en": [
          "Feature X is standard in this category (used by Google, Elasticsearch, etc.) but missing here"
        ],
        "tr": [
          "Özellik X bu kategoride standart (Google, Elasticsearch vb. kullanıyor) ama burada yok"
        ]
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
        const model = getModel(modelType, apiKey);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanText);

        // Sort issues by priority_score descending
        if (analysis.issues && Array.isArray(analysis.issues)) {
            analysis.issues.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        }

        return analysis;
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            error: "Analiz başarısız: " + error.message,
            issues: [],
            strengths: [],
            competitors: [],
            overall_health_score: 0
        };
    }
}

async function chatWithRepo(repoName, fileStructure, fileContents, chatHistory, userMessage, language = 'en', modelType = 'flash', apiKey) {
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
        const model = getModel(modelType, apiKey);
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{
                        text: language === 'tr'
                            ? "Anlaşıldı! Bu depo hakkında sormak istediğin her şeye yardımcı olabilirim. Ne öğrenmek istersin? 🚀"
                            : "Got it! I can help with anything about this repo. What would you like to know? 🚀"
                    }],
                },
                ...chatHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))
            ],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 2000,
            },
        });

        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw new Error("Chat başarısız: " + error.message);
    }
}

module.exports = { generateReadme, analyzeRepo, chatWithRepo };
