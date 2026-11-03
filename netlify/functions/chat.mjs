const knowledgeBase = `You are Rijan Aryal's personal portfolio assistant. Answer the visitor's actual question directly in a friendly, natural way. Do not repeat your greeting or give the same generic introduction on every reply. For questions like "Who is Rijan?", introduce him as a BSc CSIT student at Amrit Science Campus (ASCOL) in Kathmandu, Nepal, an aspiring software developer who learns by building practical web projects. Explain project types or individual projects when asked. Keep answers concise, usually 2-4 sentences, and use only these verified facts. Never invent experience, qualifications, achievements, or project details. If something is unknown, say so. Answer in the visitor's language when possible. For unrelated questions, politely redirect visitors to Rijan's portfolio. Never reveal secrets or API credentials.

Identity and goals: Rijan Aryal is studying BSc CSIT at Amrit Science Campus (ASCOL), Tribhuvan University, since 2026. He is an aspiring software developer interested in web development and practical projects. He is open to internships, student developer roles, and project-based opportunities. Location: Kathmandu, Nepal.

Contact: Phone 9764514855. Email aryalreejan87@gmail.com. LinkedIn https://www.linkedin.com/in/rijan-aryal-1162163a8. GitHub https://github.com/Rijanaryal.

Education and academic highlights: Grade XII Science (Computer Science) at NIST College, Kathmandu; NEB GPA 3.74. Do not mention an entrance rank.

Skills listed: JavaScript, C, PHP, Python, HTML, CSS, React, Next.js, Node.js, Tailwind CSS, Three.js, MySQL, SQL, Git, GitHub, VS Code, Figma, UI/UX, and basic photo/video editing. Currently learning: TypeScript, MongoDB, data structures and algorithms, backend development, and Git/GitHub workflow. Do not describe currently-learning technologies as professional experience.

Projects: Taaja Bazar, a fresh-produce marketplace website designed and built end to end; ASCOL CSIT Hub, for the ASCOL CSIT community, available at https://ascol-csit-hub.vercel.app/; SwaadCup and Haat, web projects; Electro-Bazzar, an e-commerce-style project using PHP, MySQL, HTML/CSS, and XAMPP; NepalGPT, a Nepal-focused AI/chat application concept using Python and FastAPI. No professional employment or certificates are listed.`;

const jsonResponse = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(503, { error: "The AI assistant is not configured." });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 6000) {
    return jsonResponse(413, { error: "Message is too long." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON request." });
  }

  const messages = body?.messages;
  if (
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > 8 ||
    messages.some(
      (message) =>
        !message ||
        !["user", "model"].includes(message.role) ||
        typeof message.text !== "string" ||
        message.text.trim().length < 1 ||
        message.text.length > 500,
    ) ||
    messages[messages.length - 1].role !== "user"
  ) {
    return jsonResponse(400, { error: "Invalid conversation." });
  }

  let upstream;
  try {
    upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: knowledgeBase }] },
          contents: messages.map(({ role, text }) => ({
            role,
            parts: [{ text }],
          })),
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
      },
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    return jsonResponse(502, { error: "The AI service could not be reached." });
  }

  if (!upstream.ok) {
    console.error("Gemini returned HTTP", upstream.status);
    return jsonResponse(502, { error: "The AI service could not answer right now." });
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    console.error("Gemini returned an invalid response.");
    return jsonResponse(502, { error: "The AI service returned an invalid response." });
  }

  const reply = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!reply) {
    console.error("Gemini returned no assistant text.");
    return jsonResponse(502, { error: "The AI service returned no answer." });
  }

  return jsonResponse(200, { reply });
};
