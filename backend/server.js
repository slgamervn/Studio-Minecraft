import http from "node:http";

const PORT = Number(process.env.PORT || 10000);
const ALLOWED_ORIGINS = new Set(["https://slgamervn.github.io", ...(process.env.ALLOWED_ORIGIN || "").split(",").map(value => value.trim()).filter(Boolean)]);
const MAX_BODY = 8000;
const MAX_QUESTION = 1200;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requests = new Map();

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    key: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL || "gpt-4.1-mini",
    url: "https://api.openai.com/v1/chat/completions"
  },
  gemini: {
    label: "Google Gemini",
    key: () => process.env.GEMINI_API_KEY,
    model: () => process.env.GEMINI_MODEL || "gemini-3.6-flash",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  },
  groq: {
    label: "Groq",
    key: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    url: "https://api.groq.com/openai/v1/chat/completions"
  },
  openrouter: {
    label: "OpenRouter",
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4.1-flash",
    url: "https://openrouter.ai/api/v1/chat/completions"
  },
  together: {
    label: "Together AI",
    key: () => process.env.TOGETHER_API_KEY,
    model: () => process.env.TOGETHER_MODEL || "Qwen/Qwen3.8-27B",
    url: "https://api.together.xyz/v1/chat/completions"
  },
  mistral: {
    label: "Mistral AI",
    key: () => process.env.MISTRAL_API_KEY,
    model: () => process.env.MISTRAL_MODEL || "mistral-small-2603",
    url: "https://api.mistral.ai/v1/chat/completions"
  }
};

function send(res, status, data, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer"
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

function clientKey(req) {
  return req.socket.remoteAddress || "unknown";
}

function rateLimited(key) {
  const now = Date.now();
  const state = requests.get(key);
  if (!state || now - state.start >= WINDOW_MS) {
    requests.set(key, { start: now, count: 1 });
    return false;
  }
  state.count += 1;
  return state.count > MAX_REQUESTS_PER_WINDOW;
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Request body too large."), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const url = new URL(req.url || "/", "http://localhost");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return send(res, 403, { error: "Origin is not allowed." });
  }

  if (req.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: "Origin is not allowed." });
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      service: "studio-ai-backend",
      providers: Object.keys(PROVIDERS),
      configuredProviders: Object.entries(PROVIDERS).filter(([, config]) => Boolean(config.key())).map(([id]) => id)
    }, origin);
  }

  if (req.method !== "POST" || url.pathname !== "/api/ai") {
    return send(res, 404, { error: "Endpoint not found." }, origin);
  }
  if (!ALLOWED_ORIGINS.has(origin)) {
    return send(res, 403, { error: "A request from the Studio website is required." });
  }
  if (rateLimited(clientKey(req))) {
    return send(res, 429, { error: "Too many requests. Wait a minute and try again." }, origin);
  }

  let body;
  try { body = await readJson(req); }
  catch (error) { return send(res, error.status || 400, { error: error.message }, origin); }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return send(res, 400, { error: "Please enter a question." }, origin);
  if (question.length > MAX_QUESTION) return send(res, 413, { error: "Question must be 1200 characters or fewer." }, origin);

  const available = Object.entries(PROVIDERS)
    .filter(([, config]) => Boolean(config.key()))
    .map(([id, config]) => ({ id, ...config }));
  if (!available.length) {
    return send(res, 503, {
      error: "No AI provider is configured. Add at least one provider API key in Render Environment."
    }, origin);
  }

  const failures = [];
  for (const provider of available) {
    let upstream;
    let data;
    try {
      upstream = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + provider.key(),
          "Content-Type": "application/json",
          ...(provider.id === "openrouter" ? { "HTTP-Referer": "https://slgamervn.github.io/Studio-Minecraft/", "X-Title": "Bedrock Coder Studio" } : {})
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          model: provider.model(),
          messages: [
            { role: "system", content: "You are Studio AI, a technical assistant for Minecraft Bedrock add-ons and Bedrock Coder Studio. Answer the exact question directly in the user's language, usually Vietnamese. Never respond to a non-greeting question with a greeting, generic introduction, or unrelated canned help text. Do not repeat the user's question as the answer. For questions asking how many, which version, current/latest releases, dates, or numeric facts, give the precise answer only when you have reliable knowledge; otherwise clearly say you cannot verify current data and explain what source is needed. Never pretend to have checked the live web, Minecraft installation, files, or backend when you have not. If the user asks about their installed Minecraft version, explain that you cannot inspect their device and show where they can find it. Give useful steps/examples for technical questions. Never invent API names, versions, compatibility, or test results. Distinguish valid JSON syntax from valid Minecraft schemas. Never ask for API keys or secrets." },
            { role: "user", content: question }
          ],
          max_tokens: 700,
          stream: false
        })
      });
    } catch (error) {
      failures.push(provider.label + ": network error or timeout");
      continue;
    }

    try { data = await upstream.json(); }
    catch {
      failures.push(provider.label + ": unreadable response");
      continue;
    }

    if (!upstream.ok) {
      const reason = upstream.status === 401 || upstream.status === 403
        ? "API key or account access rejected"
        : upstream.status === 429
          ? "rate limit or usage limit reached"
          : "provider/model error (HTTP " + upstream.status + ")";
      failures.push(provider.label + ": " + reason);
      continue;
    }

    const answer = data.choices?.[0]?.message?.content;
    const textAnswer = typeof answer === "string"
      ? answer.trim()
      : Array.isArray(answer)
        ? answer.map(part => part.text || "").join("").trim()
        : "";
    if (!textAnswer) {
      failures.push(provider.label + ": empty answer");
      continue;
    }

    return send(res, 200, {
      answer: textAnswer,
      provider: provider.id,
      providerLabel: provider.label,
      model: provider.model(),
      fallbackUsed: failures.length > 0
    }, origin);
  }

  return send(res, 502, {
    error: "All configured AI providers failed. Check their API keys, model names, account limits, and Render logs.",
    details: failures
  }, origin);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Studio AI multi-provider backend listening on port " + PORT);
});
