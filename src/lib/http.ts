export async function readResponseJson<T = { error?: string }>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const lower = text.toLowerCase();
    if (lower.includes("request entity") || response.status === 413) {
      throw new Error("Arquivo grande demais para o servidor. Envie um PDF de até 10 MB.");
    }
    throw new Error(text.slice(0, 160).trim() || `Erro HTTP ${response.status}.`);
  }
}
