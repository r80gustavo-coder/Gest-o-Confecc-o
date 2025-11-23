import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

// NOTE: In a real app, API keys should not be exposed on the client side.
// Since this is a requested purely frontend demo, we assume the environment variable or a safe context.
// However, the prompt specifically says process.env.API_KEY is available.

export const generateSalesAnalysis = async (orders: Order[]) => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare data summary for the AI to minimize token usage
    const summary = orders.map(o => ({
      date: o.createdAt.split('T')[0],
      total: o.totalPieces,
      items: o.items.map(i => `${i.reference} (${i.color}) x${i.totalQty}`).join(', ')
    })).slice(-50); // Analyze last 50 orders to avoid hitting limits

    const prompt = `
      Atue como um analista de negócios sênior para uma confecção de roupas.
      Analise os seguintes dados de vendas recentes (JSON simplificado):
      ${JSON.stringify(summary)}
      
      Por favor, forneça um resumo executivo curto (máximo 3 parágrafos) em Português cobrindo:
      1. Tendências de vendas (está aumentando ou diminuindo?).
      2. Quais referências ou cores parecem ser os "Best Sellers".
      3. Sugestão de ação para a semana que vem.
      
      Não use markdown complexo, apenas texto corrido e bullet points simples.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar a análise no momento. Verifique a chave de API.";
  }
};