import http from "node:http";

const PORT = Number(process.env.PORT || 10000);
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://slgamervn.github.io";
const MAX_BODY = 8000;
const MAX_QUESTION = 1200;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requests = new Map();

function send(res, status, data, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer"
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
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

  if (origin && origin !== ALLOWED_ORIGIN) {
    return send(res, 403, { error: "Origin is not allowed." });
  }

  if (req.method === "OPTIONS") {
    if (origin !== ALLOWED_ORIGIN) return send(res, 403, { error: "Origin is not allowed." });
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { ok: true, service: "studio-ai-backend" }, origin);
  }

  if (req.method !== "POST" || url.pathname !== "/api/ai") {
    return send(res, 404, { error: "Endpoint not found." }, origin);
  }
  if (origin !== ALLOWED_ORIGIN) {
    return send(res, 403, { error: "A request from the Studio website is required." });
  }
  if (!API_KEY) {
    return send(res, 503, { error: "Backend is not configured: add OPENAI_API_KEY in the hosting environment." }, origin);
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

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: MODEL,
        instructions: "You are Studio AI, a technical assistant for Bedrock Coder Studio and Minecraft Bedrock add-ons. Reply in the user's language, usually Vietnamese. Be concise, practical, and accurate. Never invent API names, versions, compatibility, or test results. Explain uncertainty and point to official Microsoft Learn docs when needed. Distinguish valid JSON syntax from valid Minecraft schemas. Never ask for API keys or secrets.",
        input: question,
        max_output_tokens: 700,
        store: false
      })
    });
  } catch {
    return send(res, 502, { error: "Could not connect to the AI service. Try again later." }, origin);
  }

  let data;
  try { data = await upstream.json(); }
  catch { return send(res, 502, { error: "The AI service returned an unreadable response." }, origin); }

  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : 502;
    return send(res, status, { error: upstream.status === 429 ? "AI usage limit reached. Try again later." : "The AI service could not answer right now." }, origin);
  }

  const answer = (data.output || [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("")
    .trim();

  if (!answer) return send(res, 502, { error: "The AI service did not produce an answer." }, origin);
  return send(res, 200, { answer }, origin);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Studio AI backend listening on port " + PORT);
});
