import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

app.post("/api/advice", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is not set on the server" });
      return;
    }
    const { scenario, hand, userAction, rangeMatrix, openerRfiMatrix, summary } = req.body || {};
    const prompt = `以下の情報をもとに、なぜそのプリフロップ判断になるのかを日本語で簡潔に説明してください。120〜220文字程度。必要に応じて以下を含めてください: (1) BTNなどポジションの参加率の目安（上位◯%相当）と今回ハンドが閾値に達しているか、(2) VsOpen時は相手のオープンレンジ（Rのみの13x13）に対する推奨（3bet/Call/Fold）の理由。定量的な言及（例: 参加率◯%、RFI◯%）は summary を優先して参照してください。

シナリオ: ${JSON.stringify(scenario)}
ユーザーのハンド: ${hand}
ユーザーのアクション: ${userAction}
レンジ行列（行=A..2, 列=A..2、各セルはR/C/Fの略記）：\n${rangeMatrix.map((r:any) => r.join(" ")).join("\n")}\n
${openerRfiMatrix ? `相手のRFIレンジ（Rのみの13x13）：\n${openerRfiMatrix.map((r:any)=>r.join(" ")).join("\n")}` : ``}

サマリー: ${summary ? JSON.stringify(summary) : "(なし)"}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
      res.status(500).json({ error: text });
      return;
    }
    const data = await r.json();
    const advice = data?.choices?.[0]?.message?.content ?? "";
    res.json({ advice });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Advice server listening on http://localhost:${port}`);
});


