module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Yalnızca POST isteği desteklenir."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API anahtarı bulunamadı. Vercel ayarlarını kontrol et."
      });
    }

    const {
      ingredients,
      goal,
      budget,
      mealType,
      message
    } = req.body || {};

    const prompt = `
Sen Gastroviya'nın profesyonel gastronomi asistanısın.
Türkçe yanıt ver. Kullanıcıya gerçekten uygulanabilir,
lezzet dengesi düşünülmüş özgün tarifler öner.

Kullanıcının malzemeleri: ${ingredients || "Belirtilmedi"}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

Tarifte porsiyon sayısını, gram cinsinden malzemeleri,
hazırlık ve pişirme süresini, adım adım yapılışı ve
önemli pişirme tekniklerini belirt.
Eksik malzemeler varsa uygun alternatifler öner.
Yanıtı anlaşılır biçimde ve Türkçe hazırla.
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
      console.error("Gemini API hatası:", response.status, data);

      return res.status(502).json({
        error:
          data.error?.message ||
          "Gemini tarif oluşturamadı. API kotasını ve ayarlarını kontrol et."
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "Gemini boş yanıt verdi. Lütfen tekrar dene."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Gastrovia Gemini hatası:", error);

    return res.status(500).json({
      error: "Sunucuda beklenmeyen bir hata oluştu."
    });
  }
};
