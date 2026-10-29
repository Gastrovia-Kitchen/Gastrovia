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
        error: "GEMINI_API_KEY bulunamadı. Vercel ayarlarını kontrol et."
      });
    }

    const {
      ingredients,
      goal,
      budget,
      mealType,
      message
    } = req.body || {};

    if (!ingredients || !ingredients.trim()) {
      return res.status(400).json({
        error: "Lütfen malzemelerini yaz."
      });
    }

    const prompt = `
Sen Gastroviya'nın profesyonel gastronomi şefisin.
Türkçe yanıt ver. Sıradan, klişe tarifler üretme.
Verilen malzemelerle yaratıcı ama evde uygulanabilir,
lezzet dengesi ve doku uyumu düşünülmüş tarif geliştir.

Malzemeler: ${ingredients}
Amaç: ${goal || "Dengeli beslenme"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Fark etmez"}
Ek istek: ${message || "Yok"}

2 porsiyon için:
- Malzemeleri gram cinsinden yaz.
- Hazırlık ve pişirme sürelerini belirt.
- Adım adım yapılışı anlat.
- Lezzet dengesini ve teknikleri açıkla.
- Tabaklama önerisi ve uygun alternatifler ver.
- Kullanıcının elinde olmayan malzemeleri zorunlu tutma.
- Sağlık ve besin değerleri hakkında kesin olmayan iddialar kurma.
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
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API hatası:", response.status, data);

      return res.status(502).json({
        error: JSON.stringify(data.error || data)
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error("Gemini boş yanıt:", data);

      return res.status(502).json({
        error: "Gemini boş yanıt verdi: " + JSON.stringify(data.candidates || data)
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Gastrovia Gemini hatası:", error);

    return res.status(500).json({
      error: error.message || "Sunucuda beklenmeyen bir hata oluştu."
    });
  }
};
