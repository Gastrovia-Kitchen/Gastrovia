module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Yalnızca POST isteği desteklenir."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // Anahtarın kendisini asla loglama.
    console.log("GEMINI_API_KEY kontrolü:", {
      mevcut: Boolean(apiKey),
      uzunluk: apiKey ? apiKey.length : 0
    });

    if (!apiKey) {
      return res.status(500).json({
        error:
          "Vercel sunucusu GEMINI_API_KEY değişkenini alamıyor. Ortam değişkeni ve dağıtım ayarları kontrol edilmeli."
      });
    }

    const {
      ingredients,
      goal,
      budget,
      mealType,
      message
    } = req.body || {};

    if (!ingredients || !String(ingredients).trim()) {
      return res.status(400).json({
        error: "Lütfen malzemelerini yaz."
      });
    }

    const prompt = `
Sen Gastrovia'nın profesyonel gastronomi asistanısın.
Türkçe yanıt ver. Özgün, lezzet dengesi düşünülmüş,
evde uygulanabilir tarifler oluştur.

Kullanıcının malzemeleri: ${ingredients}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

İki porsiyon için gram cinsinden malzemeleri,
hazırlık ve pişirme sürelerini, adım adım yapılışı,
pişirme tekniklerini, tabaklamayı ve uygun alternatifleri belirt.
Kullanıcının elinde olmayan malzemeleri zorunlu tutma.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const googleMessage =
        data?.error?.message || "Google açıklama göndermedi.";

      // Anahtarın kendisini veya isteğin gizli başlıklarını loglama.
      console.error("Gemini API hata tanılaması:", {
        httpStatus: response.status,
        googleMessage
      });

      return res.status(502).json({
        error: `Google Gemini hatası (HTTP ${response.status}): ${googleMessage}`
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error("Gemini yanıtında tarif metni bulunamadı.", {
        finishReason: data.candidates?.[0]?.finishReason,
        promptFeedback: data.promptFeedback
      });

      return res.status(502).json({
        error:
          "Google isteği kabul etti ancak tarif metni dönmedi. İstek güvenlik nedeniyle engellenmiş olabilir veya yanıt boş olabilir."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Gastrovia sunucu hatası:", {
      name: error?.name,
      message: error?.message
    });

    return res.status(500).json({
      error:
        "Sunucu isteği tamamlayamadı. Vercel Runtime Logs bölümünü kontrol etmek gerekiyor."
    });
  }
};
