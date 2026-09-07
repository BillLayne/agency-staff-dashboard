export type AiTask = 'organize-notes' | 'extract-notes' | 'property-report' | 'county-map';

export interface AiAttachment {
  mimeType: string;
  data: string;
  name?: string;
}

export interface AiRequest {
  task: AiTask;
  text: string;
  customerName?: string;
  address?: string;
  attachment?: AiAttachment;
  attachments?: AiAttachment[];
}

// The endpoint owns instructions and provider credentials. These fields are source data only.
export async function requestAi(request: AiRequest, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<string> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 100000);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403 || response.redirected) {
      throw new Error('Your session has expired or AI access was denied. Sign in again, then retry. Your draft is preserved.');
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('The AI endpoint is unavailable or returned a sign-in page. Check your session and retry.');
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(response.status === 413 ? 'The attachments are too large. Remove a file and retry.'
        : response.status === 429 ? 'AI is busy. Wait a moment and retry.'
        : typeof data?.error === 'string' ? data.error : `AI request failed (HTTP ${response.status}). Please retry.`);
    }
    if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('AI returned an empty or invalid response. Please retry.');
    return data.text;
  } catch (error) {
    if (timedOut) throw new Error('AI took too long. Your draft is preserved; please retry.');
    if (controller.signal.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    if (error instanceof TypeError) throw new Error('Could not reach AI. Check your connection and retry.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
