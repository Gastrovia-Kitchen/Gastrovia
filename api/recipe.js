<module.exports = async (req, res) => {
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
        error: "OpenAI API anahtarı ayarlanmamış. Vercel ayarlarını kontrol edin."
      });
    }

    const prompt = `
Sen Gastrovia'nın profesyonel gastronomi asistanısın.
Türkçe, anlaşılır ve güvenli yanıt ver.
Kullanıcının elindeki malzemelere göre uygulanabilir, lezzetli tarifler öner.

Malzemeler: ${ingredients || "Belirtilmedi"}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

Yanıtında şu başlıkları kullan:
1. Tarifin adı
2. Kaç kişilik olduğu
3. Hazırlık ve pişirme süresi
4. Malzemeler ve miktarları
5. Adım adım hazırlanışı
6. Pişirme önerileri
7. Sunum önerisi

Ölçüleri açık yaz. Türkçe yanıt ver. Kullanıcının belirttiği malzemeleri mümkün olduğunca değerlendir.
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
        error: "Tarif oluşturulamadı. Lütfen API ayarlarını kontrol edin."
      });
    }

    const answer =
      data.output_text ||
      "Şu anda tarif oluşturulamadı. Lütfen tekrar deneyin.";

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Gastrovia API hatası:", error);

    return res.status(500).json({
      error: "Beklenmeyen bir hata oluştu."
    });
  }
};
```
