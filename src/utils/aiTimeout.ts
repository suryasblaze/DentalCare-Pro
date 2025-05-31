export function getAIRequestTimeout(): number {
  return Number(import.meta.env.VITE_AI_REQUEST_TIMEOUT_MS) || 120000;
} 