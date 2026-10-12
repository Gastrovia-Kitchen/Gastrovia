module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Yalnızca POST isteği desteklenir."
    });
  }

  try {
    const { ingredients, goal, budget, mealType, message } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API anahtarı ayarlanmamış."
      });
    }

    const prompt = `
Sen Gastrovia'nın profesyonel gastronomi asistanısın.
Türkçe, anlaşılır ve güvenli yanıt ver.
Kullanıcının elindeki malzemelere göre uygulanabilir tarifler öner.

Malzemeler: ${ingredients || "Belirtilmedi"}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

Tarifin adını, kaç kişilik olduğunu, malzemeleri ve miktarlarını,
hazırlanışını, pişirme süresini ve sunum önerisini belirt.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API hatası:", data);
      return res.status(502).json({
        error: "Tarif oluşturulamadı. API ayarlarını kontrol edin."
      });
    }

    return res.status(200).json({
      answer: data.output_text || "Lütfen tekrar deneyin."
    });

  } catch (error) {
    console.error("Gastrovia API hatası:", error);

    return res.status(500).json({
      error: "Beklenmeyen bir hata oluştu."
    });
  }
};