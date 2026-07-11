// Envio de resposta — interface mínima de provedor de WhatsApp API.
// Troque o corpo desta função pelo formato do seu provedor; o resto do
// bridge não sabe (nem precisa saber) qual provedor está do outro lado.

const BASE = process.env.WPP_API_BASE ?? "";
const CLIENT_TOKEN = process.env.WPP_CLIENT_TOKEN ?? "";

export async function enviarTexto(phone: string, message: string): Promise<void> {
  if (!BASE) throw new Error("WPP_API_BASE não configurada");

  const resp = await fetch(`${BASE}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(CLIENT_TOKEN ? { "Client-Token": CLIENT_TOKEN } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!resp.ok) {
    throw new Error(`provedor respondeu ${resp.status}: ${await resp.text()}`);
  }
}
