export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Bu işlem yalnızca POST isteğiyle yapılabilir."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY ortam değişkeni bulunamadı.");

    return res.status(500).json({
      error:
        "Gemini API anahtarı bulunamadı. Vercel Environment Variables bölümünde GEMINI_API_KEY tanımlı mı kontrol edin."
    });
  }

  try {
    const {
      ingredients = "",
      goal = "Dengeli beslenme",
      mealType = "Ana öğün",
      budget = "",
      message = ""
    } = req.body || {};

    const prompt = `
Sen Gastroviya'nın profesyonel gastronomi ve reçete geliştirme şefisin.

Amacın sıradan, birbirini tekrar eden tarifler değil; evde uygulanabilir,
lezzet dengesi düşünülmüş, yaratıcı ve gerçekten yapılmaya değer tarifler
oluşturmaktır.

Kullanıcının malzemeleri: ${ingredients || "Belirtilmedi"}
Beslenme hedefi: ${goal}
Öğün türü: ${mealType}
Bütçe: ${budget || "Belirtilmedi"}
Kullanıcının isteği: ${message || "Malzemelere uygun bir tarif öner."}

Kurallar:
- Türkçe yanıt ver.
- Önce isteğe gerçekten uygun tek bir güçlü tarif öner.
- Gereksiz yere pahalı, zor bulunan malzemeler kullanma.
- Malzemeleri gram ve mililitre cinsinden belirt; adet gerekiyorsa adet de yaz.
- Kaç kişilik olduğunu, hazırlık ve pişirme sürelerini belirt.
- Uygulama adımlarını açık ve sıralı yaz.
- Pişirme sıcaklığı gerekiyorsa belirt.
- Lezzet dengesi ve kullanılan tekniğin nedenini kısaca açıkla.
- Uygunsa yaklaşık besin değerlerini belirt; bunların tahmini olduğunu söyle.
- Kullanıcının belirtmediği malzemeleri elinde varmış gibi varsayma.
- Klişe ve birbirine benzeyen tariflerden kaçın.
- Beslenme hedefi verilmişse tarifi buna uygun tasarla; sağlıkla ilgili kesin vaatlerde bulunma.
- Kullanıcı belirli bir şey istediyse genel bir tarif yerine doğrudan o isteğe cevap ver.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
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
            temperature: 0.8,
            maxOutputTokens: 4096
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const googleMessage =
        data?.error?.message || "Google Gemini isteği başarısız oldu.";

      console.error("Gemini API hatası:", response.status, googleMessage);

      return res.status(502).json({
        error: `Google Gemini hatası (HTTP ${response.status}): ${googleMessage}`
      });
    }

    const answer = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error(
        "Gemini boş yanıt verdi:",
        JSON.stringify(data?.promptFeedback || {})
      );

      return res.status(502).json({
        error:
          "Gemini boş yanıt verdi. İstek güvenlik filtresine takılmış veya model yanıt oluşturamamış olabilir."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Tarif oluşturma hatası:", error?.message || error);

    return res.status(500).json({
      error:
        "Tarif oluşturulurken sunucu hatası oluştu. Lütfen biraz sonra tekrar deneyin."
    });
  }
}
