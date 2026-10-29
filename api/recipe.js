export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Geçersiz istek."
    });
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
Sen Gastroviya'nın profesyonel gastronomi şefisin.
Türkçe, özgün, lezzet dengesi iyi ve evde uygulanabilir bir tarif hazırla.

Mevcut malzemeler: ${String(ingredients).slice(0, 1000)}
Amaç: ${String(goal).slice(0, 150)}
Öğün: ${String(mealType).slice(0, 100)}
Bütçe: ${String(budget).slice(0, 100) || "Orta"}
İstek: ${String(message).slice(0, 500) || "Malzemelerime uygun tarif öner."}

Şu başlıkları kullan:
Tarif adı
Kısa açıklama
Porsiyon ve süreler
Malzemeler (gram/ml/adet)
Adım adım yapılış
Püf noktası ve lezzet dengesi
Yaklaşık besin değerleri

Gereksiz uzun giriş yapma. Net, profesyonel ve uygulanabilir ol.
Belirtilmeyen malzemelerin kullanıcıda bulunduğunu varsayma.
`;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

  try {
    let response;
    let data;

    // Yalnızca geçici yoğunluk hatasında bir kez daha dene.
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        response = await fetch(url, {
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
              maxOutputTokens: 2048
            }
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      data = await response.json();

      if (
        response.ok ||
        ![429, 500, 503].includes(response.status) ||
        attempt === 1
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    if (!response.ok) {
      console.error(
        "Gemini API:",
        response.status,
        data?.error?.message
      );

      if ([429, 500, 503].includes(response.status)) {
        return res.status(503).json({
          error:
            "Şefimiz şu anda yoğun. Lütfen biraz sonra tekrar deneyin."
        });
      }

      return res.status(502).json({
        error:
          "Tarif servisine ulaşılamadı: " +
          (data?.error?.message || "Bilinmeyen hata.")
      });
    }

    const answer = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "Şefimiz bu kez yanıt oluşturamadı. Tekrar deneyin."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Tarif isteği:", error?.message || error);

    return res.status(504).json({
      error:
        error?.name === "AbortError"
          ? "Tarif isteği zaman aşımına uğradı. Lütfen tekrar deneyin."
          : "Bağlantı sorunu oluştu. Lütfen tekrar deneyin."
    });
  }
}
