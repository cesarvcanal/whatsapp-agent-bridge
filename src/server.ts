import express from "express";
import { responderNoChat } from "./agent.js";
import { enviarTexto } from "./whatsapp.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const ALLOWED = new Set(
  (process.env.ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean),
);

// Webhooks reentregam: ignora messageId repetido (janela das últimas 2k msgs)
const vistos = new Set<string>();
function jaVisto(id: string): boolean {
  if (vistos.has(id)) return true;
  vistos.add(id);
  if (vistos.size > 2000) {
    const primeiro = vistos.values().next().value;
    if (primeiro) vistos.delete(primeiro);
  }
  return false;
}

// Uma fila por conversa: mensagens do mesmo chat processam em ordem;
// chats diferentes, em paralelo.
const filas = new Map<string, Promise<void>>();
function enfileirar(chatId: string, tarefa: () => Promise<void>) {
  const anterior = filas.get(chatId) ?? Promise.resolve();
  const proxima = anterior.then(tarefa).catch((err) => {
    console.error(`[${chatId}] erro no processamento:`, err);
  });
  filas.set(chatId, proxima);
}

app.post("/webhook", (req, res) => {
  // 1. Segredo do webhook — sem ele, endpoint público é convite
  if (!WEBHOOK_SECRET || req.header("x-webhook-secret") !== WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  // Formato varia por provedor; este é o shape mínimo que o bridge espera.
  const { phone, messageId, fromMe, text } = req.body ?? {};
  const mensagem: string | undefined = text?.message ?? text;

  // 2. Responde o webhook JÁ (provedores têm timeout curto); processa depois
  res.sendStatus(200);

  if (fromMe || !phone || !mensagem || typeof mensagem !== "string") return;
  if (messageId && jaVisto(messageId)) return;

  // 3. Allowlist — só números autorizados falam com o agente. Silêncio pro resto.
  if (!ALLOWED.has(phone)) {
    console.warn(`ignorado: ${phone} fora da allowlist`);
    return;
  }

  enfileirar(phone, async () => {
    const resposta = await responderNoChat(phone, mensagem);
    await enviarTexto(phone, resposta);
  });
});

const porta = Number(process.env.PORT ?? 3000);
app.listen(porta, () => console.log(`bridge ouvindo em :${porta}`));
