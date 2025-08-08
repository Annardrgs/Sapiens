import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sapiens-rdrgs.web.app',
  'https://sapiens-git-wip-rdrgs-projects-team.vercel.app'
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "O texto extraído do PDF é muito curto." });
    }

    // O restante do código que chama a IA do Gemini permanece IGUAL
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Você é um assistente especialista em calendários acadêmicos.
      Analise o seguinte texto e identifique eventos importantes para um estudante, como Início e Fim do Período, Feriados, Matrículas, Trancamentos, Provas, etc.
      Retorne a resposta SOMENTE como um array JSON válido. Cada objeto deve ter os campos: "title" (string), "date" (string no formato 'YYYY-MM-DD'), e "category" (string).
      NÃO inclua markdown (como \`\`\`json) na sua resposta.
      
      Texto para análise:
      ---
      ${text}
      ---
    `;

    // **LÓGICA DE STREAMING CORRETA**
    const result = await model.generateContentStream(prompt);

    // Configura o cabeçalho para indicar uma resposta em streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.writeHead(200); // Envia o status 200 OK

    // Itera sobre os "pedaços" da resposta e os envia para o cliente
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    // Finaliza a conexão quando o stream termina
    res.end();

  } catch (error) {
    console.error("Erro na função serverless:", error);
    // Não podemos enviar um JSON aqui se o stream já começou,
    // mas em caso de erro antes do stream, isso funcionará.
    if (!res.headersSent) {
        res.status(500).json({ 
            error: "Ocorreu um erro interno ao processar o calendário.",
            details: error.message 
        });
    } else {
        res.end(); // Apenas encerra a conexão se um erro ocorrer durante o stream
    }
  }
};