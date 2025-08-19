export interface Env {
  OPENAI_API_KEY: string;
}

const ALLOWED_ORIGINS = [
  "https://hamachiwrong.github.io",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

async function handleAdvice(req: Request, env: Env) {
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const { scenario, hand, userAction, rangeMatrix, openerRfiMatrix, summary } = body;

  const prompt = `以下の情報をもとに、なぜそのプリフロップ判断になるのかを日本語で簡潔に説明してください。120〜220文字程度。
必要に応じて含める: (1) ポジションの参加率目安と今回ハンドが閾値に達しているか、
(2) VsOpen時は相手のRFI（Rのみ13x13）に対する推奨の理由。定量値は summary を優先。

シナリオ: ${JSON.stringify(scenario)}
ユーザーのハンド: ${hand}
ユーザーのアクション: ${userAction}
レンジ行列:
${(rangeMatrix||[]).map((r: string[]) => r.join(" ")).join("\n")}

相手RFI:
${openerRfiMatrix ? (openerRfiMatrix as string[][]).map((r) => r.join(" ")).join("\n") : "(なし)"}

サマリー: ${summary ? JSON.stringify(summary) : "(なし)"}
`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "あなたはポーカーのプリフロップコーチです。常に日本語で、簡潔かつ的確に説明します。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return new Response(JSON.stringify({ error: text }), { status: 500 });
  }
  const data = await r.json();
  const advice = data?.choices?.[0]?.message?.content ?? "";
  return new Response(JSON.stringify({ advice }), { headers: { "Content-Type": "application/json" } });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const baseHeaders = corsHeaders(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: baseHeaders });
    }
    if (url.pathname === "/api/advice" && req.method === "POST") {
      const res = await handleAdvice(req, env);
      return new Response(res.body, { status: res.status, headers: { ...baseHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { ...baseHeaders, "Content-Type": "application/json" } });
  },
};


