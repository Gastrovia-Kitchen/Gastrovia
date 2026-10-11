export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Yalnızca POST isteği desteklenir." });
}

try {
const { ingredients, goal, budget, mealType, message } = req.body || {};

```
const prompt = `
```

Sen Gastrovia'nın profesyonel gastronomi asistanısın.
Türkçe, anlaşılır ve güvenli yanıt ver.
Kullanıcının elindeki malzemelere göre uygulanabilir tarifler öner.
Malzemeler: ${ingredients || "Belirtilmedi"}
Amaç: ${goal || "Belirtilmedi"}
Bütçe: ${budget || "Belirtilmedi"}
Öğün: ${mealType || "Belirtilmedi"}
Ek istek: ${message || "Belirtilmedi"}

Bir tarif önerirken malzemeleri, miktarları, hazırlanışı ve pişirme süresini belirt.
`;

```
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
    error: "Yapay zekâ yanıt veremedi. API ayarlarını kontrol et."
  });
}

const answer =
  data.output_text ||
  "Şu anda yanıt oluşturulamadı. Lütfen tekrar dene.";

return res.status(200).json({ answer });
```

} catch (error) {
console.error("Gastrovia API hatası:", error);
return res.status(500).json({
error: "Beklenmeyen bir hata oluştu."
});
}
}
