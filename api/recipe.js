module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Yalnızca POST isteği desteklenir."
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY ortam değişkeni bulunamadı.");

      return res.status(500).json({
        error: "Yapay zekâ bağlantısı yapılandırılmamış."
      });
    }

    const body = req.body || {};
    const {
      ingredients,
      goal,
      budget,
      mealType,
      message
    } = body;

    const prompt = `
Sen Gastrovia'nın profesyonel gastronomi asistanısın.
Türkçe, anlaşılır ve güvenli yanıt ver.
Kullanıcının elindeki malzemelere göre uygulanabilir tarifler öner.

Malzemeler: ${ingredients || "Belirtilmedi"}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

Bir tarif önerirken malzemeleri gram cinsinden miktarlarıyla,
hazırlanışını, pişirme süresini ve gerekli teknikleri belirt.
Tarifi evde uygulanabilir ve anlaşılır tut.
`;

    let response;

    try {
      response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            input: prompt
          })
        }
      );
    } catch (error) {
      console.error("OpenAI bağlantı hatası:", error);

      return res.status(502).json({
        error: "Yapay zekâ servisine bağlanılamadı."
      });
    }

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error(
        "OpenAI geçerli JSON döndürmedi. HTTP durumu:",
        response.status,
        "Yanıt:",
        responseText.slice(0, 500)
      );

      return res.status(502).json({
        error: "Yapay zekâ servisinden geçersiz yanıt geldi."
      });
    }

    if (!response.ok) {
      console.error(
        "OpenAI API hatası:",
        response.status,
        data.error || data
      );

      return res.status(502).json({
        error:
          data.error?.message ||
          "Yapay zekâ isteği başarısız oldu. API ayarlarını kontrol et."
      });
    }

    const answer = data.output_text;

    if (!answer || !answer.trim()) {
      console.error("OpenAI yanıtında metin bulunamadı.");

      return res.status(502).json({
        error: "Yapay zekâ boş yanıt verdi. Lütfen tekrar dene."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Gastrovia API hatası:", error);

    return res.status(500).json({
      error: "Sunucuda beklenmeyen bir hata oluştu."
    });
  }
};
