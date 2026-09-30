// Vercel Serverless Function: POST /api/review
// Body: { code: string, language?: string, focus?: string[] }
const MAX_CHARS = 15000;

const SYSTEM = `You are a senior software engineer doing a rigorous, friendly code review.
Return ONLY valid JSON (no markdown fences, no extra text) with this exact shape:
{
  "language": "detected language",
  "summary": "2-3 sentence overview of what the code does and its overall quality",
  "score": <integer 0-100 code quality score>,
  "bugs": [{"severity":"critical|high|medium|low","line":"line number or range or null","title":"short title","explanation":"why it is a problem","fix":"corrected code snippet"}],
  "improvements": [{"category":"performance|readability|security|style|design|testing","title":"short title","suggestion":"what to change and why"}],
  "docs": "Markdown documentation: purpose, parameters/returns, usage example, and notes. Use docstrings/JSDoc style where fitting.",
  "refactored_code": "an improved version of the full code with bugs fixed"
}
Be specific and honest. If there are no bugs, return an empty bugs array. Never invent issues.`;

async function callGemini(key, userMsg) {
  const model = process.env.MODEL || "gemini-3.8-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8000 },
      }),
    }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Gemini request failed");
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || "").join("");
}

async function callClaude(key, userMsg) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Claude request failed");
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const gKey = process.env.GEMINI_API_KEY;
  const aKey = process.env.ANTHROPIC_API_KEY;
  if (!gKey && !aKey) {
    return res.status(500).json({ error: "Server missing GEMINI_API_KEY (or ANTHROPIC_API_KEY)" });
  }

  const { code, language, focus } = req.body || {};
  if (typeof code !== "string" || code.trim().length < 5) {
    return res.status(400).json({ error: "Please provide some code to review." });
  }
  if (code.length > MAX_CHARS) {
    return res.status(413).json({ error: `Code too long. Max ${MAX_CHARS} characters.` });
  }

  const userMsg =
    `Language hint: ${language || "auto-detect"}\n` +
    `Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "bugs, improvements, docs"}\n\n` +
    `CODE:\n${code}`;

  try {
    const text = gKey ? await callGemini(gKey, userMsg) : await callClaude(aKey, userMsg);
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return res.status(502).json({ error: "Could not parse model output. Try again." });
      result = JSON.parse(m[0]);
    }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
