import axios from 'axios';
// ADICIONAR: Importa a nova biblioteca pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// A chave de API será configurada como uma Variável de Ambiente na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Lista de origens permitidas
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', // Adicionado para vercel dev
  'https://sapiens-rdrgs.web.app',
  'https://sapiens-git-wip-rdrgs-projects-team.vercel.app' // URL do seu deploy
];

export default async function handler(req, res) {
  // Lógica de CORS
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
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: "O parâmetro 'fileUrl' é obrigatório." });
    }

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const pdfBuffer = response.data;

    // --- CÓDIGO DE LEITURA DO PDF SUBSTITUÍDO ---
    const pdfData = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdfData.numPages; i++) {
        const page = await pdfData.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    const text = fullText;
    // --- FIM DA SUBSTITUIÇÃO ---

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Não foi possível extrair texto do PDF." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Você é um assistente especialista em calendários acadêmicos.
      Analise o seguinte texto e identifique eventos importantes para um estudante, como Início e Fim do Período, Feriados, Matrículas, Trancamentos, Provas, etc.
      Retorne a resposta como um array JSON válido. Cada objeto deve ter os campos: "title" (string), "date" (string no formato 'YYYY-MM-DD'), e "category" (string).
      
      Texto para análise:
      ---
      ${text}
      ---
    `;

    const result = await model.generateContent(prompt);
    const aiResponseText = result.response.text();
    
    const jsonStringMatch = aiResponseText.match(/\[[\s\S]*\]/);
    if (!jsonStringMatch) {
      console.error("Resposta da IA não continha um JSON válido:", aiResponseText);
      return res.status(500).json({ error: "A IA não retornou uma resposta no formato esperado." });
    }
    
    const events = JSON.parse(jsonStringMatch[0]);

    return res.status(200).json({ events });

  } catch (error) {
    console.error("Erro na função serverless:", error);
    // Retorna uma mensagem de erro mais detalhada para depuração
    return res.status(500).json({ 
        error: "Ocorreu um erro interno ao processar o calendário.",
        details: error.message 
    });
  }
};