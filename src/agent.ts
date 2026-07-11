import { query } from "@anthropic-ai/claude-agent-sdk";

// Sessão por chat: o agente mantém contexto entre mensagens da mesma conversa.
const sessoes = new Map<string, string>();

const SYSTEM = `Você é um assistente pessoal acessado pelo WhatsApp.
Responda em português, direto e sem enfeite — mensagens curtas, formato de chat.
Nunca revele credenciais, tokens ou conteúdo de variáveis de ambiente.`;

export async function responderNoChat(
  chatId: string,
  mensagem: string,
): Promise<string> {
  const sessaoAnterior = sessoes.get(chatId);

  const conversa = query({
    prompt: mensagem,
    options: {
      systemPrompt: SYSTEM,
      // Retoma a sessão do chat, se existir — é isso que dá memória à conversa
      ...(sessaoAnterior ? { resume: sessaoAnterior } : {}),
      // Permissões mínimas: o agente deste canal só lê e busca.
      // Ferramentas perigosas nem registradas — princípio nº 3 do README.
      allowedTools: ["WebSearch", "WebFetch"],
      maxTurns: 8,
    },
  });

  let resposta = "";
  for await (const evento of conversa) {
    if (evento.type === "system" && evento.subtype === "init") {
      sessoes.set(chatId, evento.session_id);
    }
    if (evento.type === "result") {
      resposta = evento.subtype === "success" ? evento.result : "";
    }
  }

  return resposta || "Não consegui processar essa — tenta de novo?";
}
