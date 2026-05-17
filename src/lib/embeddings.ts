/**
 * lib/embeddings.ts — HuggingFace Cloud Embeddings
 *
 * Model    : BAAI/bge-small-en-v1.5  (384-dim, feature-extraction)
 * Endpoint : https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5
 * Why BGE  : HF router treats all-MiniLM-L6-v2 as sentence-similarity (needs src+target pairs).
 *            BGE-small-en-v1.5 is tagged feature-extraction, returns flat 384-dim vectors.
 * Retries  : up to 2 (handles "model is loading" 503)
 *
 * NO mock fallback — throws on real failure so the terminal shows the exact error.
 * Set HF_API_TOKEN in .env.local (https://huggingface.co/settings/tokens).
 */

export type EmbeddingSource = "huggingface";

export interface EmbeddingResult {
  vector: number[];
  source: EmbeddingSource;
}

const MODEL_ID = "BAAI/bge-small-en-v1.5";
const HF_URL   = `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`;
const EXPECTED = 384;
const RETRIES  = 2;
const TIMEOUT  = 60_000;

/* ════════════════════════════════════════════════════
   Core HF API call  (recursive retry on 503)
════════════════════════════════════════════════════ */
async function callHF(text: string, attempt = 0): Promise<number[]> {
  const token = (process.env.HF_API_TOKEN ?? "").trim();

  if (!token) {
    throw new Error(
      "HF_API_TOKEN is not set in .env.local.\n" +
      "  Get a free token at https://huggingface.co/settings/tokens"
    );
  }

  const truncated = text.slice(0, 512);
  console.log(`[embeddings] Attempt ${attempt + 1}/${RETRIES + 1} → POST ${HF_URL}`);
  console.log(`[embeddings] Input (${truncated.length} chars): "${truncated.slice(0, 60).replace(/\n/g, " ")}…"`);

  const controller = new AbortController();
  const tid        = setTimeout(() => controller.abort(), TIMEOUT);

  let res: Response;
  try {
    res = await fetch(HF_URL, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ inputs: truncated }),
    });
  } catch (fetchErr) {
    clearTimeout(tid);
    const msg = (fetchErr as Error).message;
    if (msg.includes("abort")) throw new Error(`HF API timed out after ${TIMEOUT / 1000}s`);
    throw new Error(`HF fetch failed: ${msg}`);
  }
  clearTimeout(tid);

  console.log(`[embeddings] HF status: ${res.status} ${res.statusText}`);

  /* ── 503 = model still loading on HF's side → wait then retry ── */
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    const wait = Math.min(((body.estimated_time as number) ?? 20) + 5, 60);

    if (attempt < RETRIES) {
      console.log(`[embeddings] Model is loading — waiting ${wait}s then retrying…`);
      await new Promise((r) => setTimeout(r, wait * 1_000));
      return callHF(text, attempt + 1);
    }
    throw new Error(`HF 503 after ${RETRIES + 1} attempts: ${JSON.stringify(body).slice(0, 150)}`);
  }

  /* ── Any other non-2xx → throw with body for debugging ── */
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HF API ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }

  /* ── Parse the JSON response ── */
  const raw = await res.json() as unknown;
  return parseEmbedding(raw);
}

/* ════════════════════════════════════════════════════
   Response shape normaliser

   BGE-small returns a flat [384] array.
   Guard cases for other HF shapes kept for safety:

   A. [[f, f, …]]           — shape [1, 384]
   B. [[[f,…]*seq, …]]      — shape [1, seq_len, 384]  (mean-pool)
   C. [f, f, …]             — shape [384]              (flat — BGE default)
════════════════════════════════════════════════════ */
function parseEmbedding(raw: unknown): number[] {
  console.log("[embeddings] Parsing response…");

  /* Case C — flat array of numbers (BGE default) */
  if (Array.isArray(raw) && typeof raw[0] === "number") {
    console.log(`[embeddings] Shape: flat [${(raw as number[]).length}]`);
    return raw as number[];
  }

  /* Case A — [[...]] shape [1, 384] */
  if (
    Array.isArray(raw) &&
    Array.isArray(raw[0]) &&
    typeof (raw[0] as unknown[])[0] === "number"
  ) {
    const vec = raw[0] as number[];
    console.log(`[embeddings] Shape: [[${vec.length}]] — using raw[0]`);
    return vec;
  }

  /* Case B — [[[...]]] shape [1, seq_len, dim] — mean-pool the seq dimension */
  if (
    Array.isArray(raw) &&
    Array.isArray(raw[0]) &&
    Array.isArray((raw[0] as unknown[])[0])
  ) {
    const tokens = raw[0] as number[][];
    const dims   = tokens[0].length;
    console.log(
      `[embeddings] Shape: token-level [1][${tokens.length} tokens][${dims} dims] — mean-pooling`
    );
    const mean = Array.from({ length: dims }, (_, d) =>
      tokens.reduce((s, t) => s + t[d], 0) / tokens.length
    );
    return mean;
  }

  throw new Error(
    `Unrecognised HF response shape: ${JSON.stringify(raw).slice(0, 300)}`
  );
}

/* ════════════════════════════════════════════════════
   PUBLIC API
════════════════════════════════════════════════════ */

/**
 * generateEmbedding
 * Returns a 384-dim vector via HuggingFace (BAAI/bge-small-en-v1.5).
 * THROWS on failure — no silent mock fallback.
 */
export async function generateEmbedding(
  text:  string,
  label = "",
): Promise<EmbeddingResult> {
  const tag = label || text.slice(0, 50).replace(/\s+/g, " ").trim();
  console.log(`[embeddings] ▶ embed "${tag}"`);

  const vector = await callHF(text);

  if (vector.length !== EXPECTED) {
    throw new Error(
      `Expected ${EXPECTED}-dim embedding but got ${vector.length}. ` +
      `Check the model output format.`
    );
  }

  console.log(`[embeddings] ✓ ${vector.length}-dim [huggingface]`);
  return { vector, source: "huggingface" };
}

/** Split text into overlapping chunks for RAG indexing */
export function chunkText(
  text:    string,
  size    = 500,
  overlap = 50,
): string[] {
  const step   = size - overlap;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + size).trim();
    if (chunk.length > 30) chunks.push(chunk);
  }
  console.log(
    `[embeddings] chunkText: ${text.length} chars → ${chunks.length} chunks ` +
    `(size=${size}, overlap=${overlap})`
  );
  return chunks;
}
