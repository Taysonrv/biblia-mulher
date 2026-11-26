import { generationBody, parseGeneration } from './composition.mjs';

export function geminiRequest(outline, duration, model) {
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw Error('invalid-model');
  const base = generationBody(outline, duration, model);
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    body: {
      systemInstruction: { parts: [{ text: base.instructions }] },
      contents: [{ role: 'user', parts: [{ text: base.input }] }],
      generationConfig: { candidateCount: 1, maxOutputTokens: 20000,
        responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: base.text.format.schema } } },
    },
  };
}

export function parseGemini(response, source, duration) {
  if (response?.promptFeedback?.blockReason || response?.candidates?.length !== 1) throw Error('blocked');
  const candidate = response.candidates[0];
  if (candidate.finishReason !== 'STOP') throw Error('incomplete');
  const parts = candidate.content?.parts;
  if (!Array.isArray(parts)) throw Error('invalid-output');
  const text = parts.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
  return parseGeneration({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }, source, duration);
}

export async function generateWithGemini({ outline, duration, model, apiKey, fetcher = fetch }) {
  if (!apiKey?.trim()) throw Error('not-configured');
  const request = geminiRequest(outline, duration, model);
  const response = await fetcher(request.url, { method: 'POST', signal: AbortSignal.timeout(270000),
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(request.body) });
  if (!response.ok) {
    const error = Error(response.status === 429 ? 'provider-quota' : 'provider');
    throw error;
  }
  return parseGemini(await response.json(), outline, duration);
}
