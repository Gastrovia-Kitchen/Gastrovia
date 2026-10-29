export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Geçersiz istek." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API anahtarı bulunamadı."
    });
  }

  const {
    ingredients = "",
    goal = "Dengeli beslenme",
    mealType = "Fark etmez",
    budget = "",
    message = ""
  } = req.body || {};

  const prompt = `
Gastroviya'nın profesyonel gastronomi şefisin.
Türkçe, özgün, dengeli ve evde uygulanabilir bir tarif hazırla.
Malzemeler: ${String(ingredients).slice(0, 800)}
Amaç: ${String(goal).slice(0, 100)}
Öğün: ${String(mealType).slice(0, 80)}
Bütçe: ${String(budget).slice(0, 80) || "Orta"}
Ek istek: ${String(message).slice(0, 300) || "Uygun tarif öner."}

Kısa giriş kullan. Tarif adı, açıklama, porsiyon, hazırlık ve pişirme
süresi, gramajlı malzemeler, adım adım yapılış, püf noktası ve
yaklaşık besin değerlerini yaz. Malzemeleri kullanıcıda varmış gibi
varsayma. Net ve profesyonel ol.
`;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini hata:", response.status, data?.error?.message);

      return res.status(502).json({
        error:
          response.status === 429 || response.status === 503
            ? "Şefimiz şu anda yoğun. Lütfen biraz sonra tekrar deneyin."
            : `Gemini hatası (HTTP ${response.status}): ${
                data?.error?.message || "Bilinmeyen hata."
              }`
      });
    }

    const answer = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "Tarif yanıtı boş geldi. Lütfen tekrar deneyin."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Gemini bağlantı hatası:", error?.message || error);

    return res.status(502).json({
      error: "Tarif servisine bağlanılamadı. Biraz sonra tekrar deneyin."
    });
  }
}
