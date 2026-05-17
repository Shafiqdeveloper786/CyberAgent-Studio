/**
 * POST /api/knowledge  — ingest a file or URL
 * GET  /api/knowledge?agentId=<id>   — list metadata docs
 * GET  /api/knowledge?test=true      — full auto-test (no file upload needed)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";
import { generateEmbedding, chunkText } from "@/lib/embeddings";

/* ══════════════════════════════════════════════════════
   MOCK TEXT — "Nexus Project" manual used for auto-test
══════════════════════════════════════════════════════ */
const NEXUS_MANUAL = `
Nexus Project — Internal Operations Manual v2.4

OVERVIEW
The Nexus Project is a classified AI research initiative founded in 2022.
It focuses on three core pillars: autonomous reasoning, multi-modal
understanding, and secure communication protocols.

TEAM STRUCTURE
Project Lead: Dr. Elena Vasquez
Engineering: 14 senior engineers across 3 time zones.
Security clearance Level 3 required for all team members.

SYSTEM ARCHITECTURE
The primary model is codenamed "Nexus-7" running on 512 H100 GPUs.
Training data: 2.1 trillion tokens from curated internal sources.
Inference latency target: under 200 ms for 90 % of requests.

DEPLOYMENT PROTOCOLS
All deployments require dual approval from the engineering lead and
the security officer. Zero-downtime via blue-green strategy.
Rollback window: 24 hours post-deployment.

SECURITY PROTOCOLS
Data encrypted at rest using AES-256.
All API calls authenticated via rotating JWT tokens with a 4-hour expiry.
Intrusion detection scans run every 15 minutes.

BUDGET & RESOURCES
Annual compute budget: $4.2 million.
Cloud provider: Hybrid (AWS + on-premise cluster).
Total storage capacity: 50 petabytes.

KNOWN ISSUES
Issue NX-441: Memory leak in the inference pipeline under high concurrent load.
Issue NX-388: Occasional hallucination in multi-hop reasoning tasks.
Workaround for NX-441: Restart inference pods every 6 hours.

CONTACTS
Technical issues  : nexus-ops@internal.ai
Security incidents: security@internal.ai  (24/7 on-call)
`.trim();

/* ══════════════════════════════════════
   GET handler — normal list + auto-test
══════════════════════════════════════ */
export async function GET(req: Request) {
  const url      = new URL(req.url);
  const testMode = url.searchParams.get("test") === "true";

  /* ── Auto-test branch ── */
  if (testMode) return runAutoTest(req);

  /* ── Normal list branch ── */
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = url.searchParams.get("agentId")?.trim();
  if (!agentId) return NextResponse.json({ error: "agentId param required." }, { status: 400 });

  try {
    await connectDB();
    const agent = await Agent.findOne({ _id: agentId, userId: session.user.id }).lean();
    if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

    const sources = await Knowledge
      .find({ agentId, userId: session.user.id })
      .sort({ createdAt: -1 }).lean();

    return NextResponse.json({ sources });
  } catch (err) {
    console.error("[knowledge GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

/* ══════════════════════════════════════════════════════════════
   AUTO-TEST  GET /api/knowledge?test=true
   Runs the full ingestion pipeline with hardcoded mock data.
   Does NOT require a real file upload.
══════════════════════════════════════════════════════════════ */
async function runAutoTest(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  /* Collect every step's result so the response is a complete report */
  const report: {
    step:    string;
    ok:      boolean;
    detail:  string;
    data?:   unknown;
  }[] = [];

  const pass = (step: string, detail: string, data?: unknown) => {
    console.log(`[AUTO-TEST] ✓ ${step}: ${detail}`);
    report.push({ step, ok: true, detail, data });
  };
  const fail = (step: string, detail: string, data?: unknown) => {
    console.error(`[AUTO-TEST] ✗ ${step}: ${detail}`);
    report.push({ step, ok: false, detail, data });
  };

  console.log("\n");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   KNOWLEDGE PIPELINE AUTO-TEST STARTING      ║");
  console.log("╚══════════════════════════════════════════════╝");

  /* ────────────────────────────────────────
     STEP 1 — Auth
  ──────────────────────────────────────── */
  if (!session?.user?.id) {
    fail("Auth", "No active session — visit /auth to sign in first.");
    return NextResponse.json({ ok: false, report }, { status: 401 });
  }
  pass("Auth", `Signed in as userId=${session.user.id}`);

  /* ────────────────────────────────────────
     STEP 2 — MongoDB connection
  ──────────────────────────────────────── */
  try {
    await connectDB();
    const maskedUri = (process.env.MONGODB_URI ?? "")
      .replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
      .slice(0, 90);
    pass("DB Connect", `Host=${mongoose.connection.host} | DB=${mongoose.connection.name}`, {
      host: mongoose.connection.host,
      db:   mongoose.connection.name,
      uri:  maskedUri,
    });
  } catch (dbErr) {
    fail("DB Connect", `FAILED — ${(dbErr as Error).message}`);
    return NextResponse.json({ ok: false, report }, { status: 500 });
  }

  /* ────────────────────────────────────────
     STEP 3 — Resolve agentId
     Use the caller's first saved agent if available,
     otherwise generate a synthetic ObjectId so we can
     still test the embedding + DB-write path.
  ──────────────────────────────────────── */
  let testAgentId: string;
  let testUserId = session.user.id;
  let usingRealAgent = false;

  const firstAgent = await Agent
    .findOne({ userId: session.user.id })
    .select("_id name")
    .lean<{ _id: mongoose.Types.ObjectId; name: string }>();

  if (firstAgent) {
    testAgentId    = firstAgent._id.toString();
    usingRealAgent = true;
    pass("Agent Resolve", `Using real agent "${firstAgent.name}" (${testAgentId})`);
  } else {
    testAgentId = new mongoose.Types.ObjectId().toString();
    pass(
      "Agent Resolve",
      `No agents found — using synthetic ObjectId=${testAgentId}. ` +
      "Create an agent in the dashboard for a full RAG test."
    );
  }

  /* ────────────────────────────────────────
     STEP 4 — Text preparation
  ──────────────────────────────────────── */
  const text = NEXUS_MANUAL;
  pass("Mock Text", `Nexus Project manual — ${text.length} chars`);

  /* ────────────────────────────────────────
     STEP 5 — Chunking
  ──────────────────────────────────────── */
  const chunks = chunkText(text, 500, 50);
  if (chunks.length === 0) {
    fail("Chunking", "0 chunks produced — chunkText bug.");
    return NextResponse.json({ ok: false, report }, { status: 500 });
  }
  pass("Chunking", `${chunks.length} chunks produced`, {
    count:      chunks.length,
    firstChunk: chunks[0].slice(0, 80),
  });

  /* ────────────────────────────────────────
     STEP 6 — Embedding (with mock fallback)
  ──────────────────────────────────────── */
  let embeddingSource = "not tested";
  const sampleEmbedding: number[] = [];

  console.log("[AUTO-TEST] Testing embedding on first chunk…");
  try {
    const result = await generateEmbedding(chunks[0], "auto-test-sample");
    if (result.vector.length === 384) {
      embeddingSource = result.source;
      sampleEmbedding.push(...result.vector);
      pass("Embedding", `Source=${result.source} — 384 dims`, {
        source:  result.source,
        dims:    result.vector.length,
        sample3: result.vector.slice(0, 3),
      });
    } else {
      throw new Error(`Unexpected dims: ${result.vector.length}`);
    }
  } catch (embedErr) {
    fail("Embedding", `HF API failed: ${(embedErr as Error).message}`);
    return NextResponse.json({ ok: false, report }, { status: 500 });
  }

  /* ────────────────────────────────────────
     STEP 7 — Build chunk documents
  ──────────────────────────────────────── */
  console.log(`[AUTO-TEST] Building ${chunks.length} chunk docs (using ${embeddingSource} vectors)…`);

  const chunkDocs: {
    knowledgeId: mongoose.Types.ObjectId;
    agentId:     mongoose.Types.ObjectId;
    userId:      mongoose.Types.ObjectId;
    fileName:    string;
    content:     string;
    embedding:   number[];
    chunkIndex:  number;
  }[] = [];

  /* Use the already-embedded first chunk; mock the rest to avoid waiting */
  for (let i = 0; i < chunks.length; i++) {
    let embedding: number[];

    if (i === 0) {
      embedding = sampleEmbedding;
    } else {
      const r = await generateEmbedding(chunks[i], `auto-test-${i}`);
      embedding = r.vector;
    }

    chunkDocs.push({
      knowledgeId: new mongoose.Types.ObjectId(),
      agentId:     new mongoose.Types.ObjectId(testAgentId),
      userId:      new mongoose.Types.ObjectId(testUserId),
      fileName:    "nexus-project-manual-[AUTO-TEST].txt",
      content:     chunks[i],
      embedding,
      chunkIndex:  i,
    });
  }

  pass("Chunk Docs Built", `${chunkDocs.length} docs ready (source: ${embeddingSource})`, {
    totalDocs:         chunkDocs.length,
    embeddingDims:     chunkDocs[0].embedding.length,
    embeddingSource: embeddingSource,
  });

  /* ────────────────────────────────────────
     STEP 8 — insertMany into knowledgechunks
  ──────────────────────────────────────── */
  console.log("[AUTO-TEST] Calling KnowledgeChunk.insertMany()…");
  let insertedIds: string[] = [];

  try {
    const inserted = await KnowledgeChunk.insertMany(chunkDocs, { ordered: false });
    insertedIds = inserted.map((d) => d._id.toString());
    pass("DB Write", `${inserted.length} chunks saved to 'knowledgechunks'`, {
      count:    inserted.length,
      firstId:  insertedIds[0],
      database: mongoose.connection.name,
    });
  } catch (insertErr) {
    const e = insertErr as Error & { code?: number; writeErrors?: unknown[] };
    fail("DB Write", `insertMany FAILED — ${e.message}`, {
      errorName:   e.name,
      errorCode:   e.code,
      writeErrors: e.writeErrors,
    });
    return NextResponse.json({ ok: false, report }, { status: 500 });
  }

  /* ────────────────────────────────────────
     STEP 9 — Read back to confirm persistence
  ──────────────────────────────────────── */
  console.log("[AUTO-TEST] Verifying by reading back from DB…");
  try {
    const readBack = await KnowledgeChunk
      .find({ agentId: new mongoose.Types.ObjectId(testAgentId) })
      .select("content chunkIndex")
      .sort({ chunkIndex: 1 })
      .lean<{ content: string; chunkIndex: number }[]>();

    if (readBack.length === 0) {
      fail("DB Read-back", "Query returned 0 docs immediately after insertMany — possible DB name mismatch.");
    } else {
      pass("DB Read-back", `Read ${readBack.length} docs back from DB ✓`, {
        count:        readBack.length,
        firstContent: readBack[0].content.slice(0, 80),
      });
    }
  } catch (readErr) {
    fail("DB Read-back", `Query FAILED — ${(readErr as Error).message}`);
  }

  /* ────────────────────────────────────────
     STEP 10 — Summary
  ──────────────────────────────────────── */
  const allOk = report.every((r) => r.ok);

  console.log("\n");
  console.log(allOk
    ? "╔══════════════════════════════════════════════╗\n║   AUTO-TEST PASSED — Pipeline fully working  ║\n╚══════════════════════════════════════════════╝"
    : "╔══════════════════════════════════════════════╗\n║   AUTO-TEST COMPLETED WITH FAILURES          ║\n╚══════════════════════════════════════════════╝"
  );
  report.forEach((r) => console.log(`  ${r.ok ? "✓" : "✗"} ${r.step}: ${r.detail}`));

  return NextResponse.json({
    ok:              allOk,
    embeddingSource: embeddingSource,
    usingRealAgent,
    chunksInserted:  insertedIds.length,
    agentId:         testAgentId,
    report,
    nextStep: usingRealAgent
      ? `Vector search ready (${embeddingSource}). Chat with agent ${testAgentId} to test RAG.`
      : "Create an agent in the dashboard, then re-run the test for a full end-to-end RAG check.",
  });
}

/* ══════════════════════════════════════
   POST /api/knowledge  (multipart/form-data)
   Fields: agentId + file OR url
══════════════════════════════════════ */
export async function POST(req: Request) {
  /* ── Single outer try-catch — nothing can crash the server ── */
  try {
    console.log("\n════════════════════════════════════════════════");
    console.log("[knowledge POST] ▶ Upload Pipeline Starting…");
    console.log("════════════════════════════════════════════════");

    /* ── Auth ── */
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("[knowledge POST] ✗ No session.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[knowledge POST] ✓ Auth —", session.user.id);

    /* ── FormData ── */
    const formData = await req.formData();
    const agentId  = (formData.get("agentId") as string | null)?.trim();
    const urlSrc   = (formData.get("url")     as string | null)?.trim();
    const file     =  formData.get("file") as File | null;

    console.log("[knowledge POST] agentId:", agentId ?? "MISSING");
    console.log("[knowledge POST] file   :", file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "(none)");

    if (!agentId)         return NextResponse.json({ error: "agentId is required."      }, { status: 400 });
    if (!file && !urlSrc) return NextResponse.json({ error: "Provide a file or URL."    }, { status: 400 });

    /* ── DB connect ── */
    await connectDB();
    console.log("[knowledge POST] ✓ DB:", mongoose.connection.name, "@", mongoose.connection.host);

    /* ── Verify agent ownership ── */
    const agent = await Agent.findOne({ _id: agentId, userId: session.user.id }).lean();
    if (!agent) {
      console.error("[knowledge POST] ✗ Agent not found:", agentId);
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    console.log("[knowledge POST] ✓ Agent OK");

    /* ════ URL source — fetch → parse → chunk → embed → store ════ */
    if (urlSrc) {
      /* ── Validate URL format ── */
      let targetUrl: string;
      try {
        targetUrl = new URL(urlSrc).href;
      } catch {
        return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
      }

      console.log("\n[knowledge POST] ── URL SCRAPE PIPELINE ──");
      console.log("[knowledge POST] Target:", targetUrl);

      /* ── STAGE 1: Fetch with full browser-simulation headers ──────────────
         Sites like Wikipedia, Notion, and Cloudflare-protected pages inspect
         the User-Agent and Accept headers. Without them the server either
         returns 403, a bot-check page, or an empty body.
      ────────────────────────────────────────────────────────────────────── */
      let html: string;
      try {
        const res = await fetch(targetUrl, {
          method:  "GET",
          headers: {
            "User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language":           "en-US,en;q=0.9",
            "Accept-Encoding":           "gzip, deflate, br",
            "Cache-Control":             "no-cache",
            "Pragma":                    "no-cache",
            "DNT":                       "1",
            "Connection":                "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest":            "document",
            "Sec-Fetch-Mode":            "navigate",
            "Sec-Fetch-Site":            "none",
            "Sec-Fetch-User":            "?1",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        html = await res.text();
        console.log(`[knowledge POST] ✓ Fetched ${html.length} chars`);
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error("[knowledge POST] ✗ Fetch failed:", msg);
        return NextResponse.json(
          { error: `Could not reach URL: ${msg}` },
          { status: 422 }
        );
      }

      /* ── STAGE 2: Parse HTML with cheerio + extract meaningful text ───────
         Removal order matters: kill scripts/styles first, then structural
         chrome (nav/header/footer/aside), then pull content from the most
         specific semantic containers before falling back to <body>.
      ────────────────────────────────────────────────────────────────────── */
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cheerio = require("cheerio") as typeof import("cheerio");
      const $       = cheerio.load(html);

      /* Purge noise elements so their text never leaks into the corpus */
      $(
        "script, style, noscript, iframe, svg, canvas," +
        "nav, header, footer, aside," +
        "[role='navigation'],[role='banner'],[role='complementary'],[role='search']," +
        ".nav,.navbar,.sidebar,.footer,.header,.menu,.breadcrumb," +
        ".ad,.ads,.advertisement,.cookie,.cookie-banner,.popup"
      ).remove();

      /* Try progressively wider content selectors */
      const CONTENT_SELECTORS = [
        "article", "main", "[role='main']",
        ".content", ".post-content", ".entry-content", ".article-body",
        "#content", "#main", "#article",
      ];

      let rawText = "";
      for (const sel of CONTENT_SELECTORS) {
        const candidate = $(sel).text();
        if (candidate.trim().length > 300) { rawText = candidate; break; }
      }

      /* Fallback to full body text if no semantic container yielded content */
      if (!rawText.trim()) rawText = $("body").text();

      /* Normalise whitespace: collapse spaces and limit consecutive newlines */
      rawText = rawText
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      console.log(`[knowledge POST] ✓ Extracted ${rawText.length} chars of clean text`);
      console.log("[knowledge POST] Preview:", JSON.stringify(rawText.slice(0, 150)));

      /* ── No extractable text (JS-rendered SPA, bot wall, etc.) ── */
      if (!rawText.trim()) {
        const doc = await Knowledge.create({
          agentId, userId: session.user.id,
          fileName: urlSrc, fileType: "url", fileUrl: urlSrc, fileSize: 0,
        });
        console.warn("[knowledge POST] ⚠ No text extracted — metadata saved only.");
        return NextResponse.json(
          { doc, warning: "No text content found at this URL. The page may require JavaScript to render." },
          { status: 201 }
        );
      }

      /* ── STAGE 3: Chunk ── */
      const chunks = chunkText(rawText, 500, 50);
      console.log(`[knowledge POST] ✓ ${chunks.length} chunks ready`);

      /* ── STAGE 4: Save metadata doc ── */
      const metadataDoc = await Knowledge.create({
        agentId, userId: session.user.id,
        fileName: urlSrc,
        fileType: "url",
        fileUrl:  urlSrc,
        fileSize: Buffer.byteLength(rawText, "utf8"),
      }) as { _id: mongoose.Types.ObjectId };
      console.log("[knowledge POST] ✓ Metadata doc:", metadataDoc._id.toString());

      /* ── STAGE 5: Embed + store chunks ── */
      console.log(`[knowledge POST] ── Embedding ${chunks.length} URL chunks ──`);
      const urlChunkDocs: object[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const { vector } = await generateEmbedding(chunks[i], `[${i + 1}/${chunks.length}]`);
        urlChunkDocs.push({
          knowledgeId: metadataDoc._id,
          agentId,
          userId:      session.user.id,
          fileName:    urlSrc,
          content:     chunks[i],
          embedding:   vector,
          chunkIndex:  i,
        });
        console.log(`[knowledge POST] [${i + 1}/${chunks.length}] ✓ ${vector.length}-dim`);
      }

      const inserted = await KnowledgeChunk.insertMany(urlChunkDocs, { ordered: false });
      console.log(`[knowledge POST] ✓ ${inserted.length} URL chunks saved to MongoDB`);

      console.log("\n[knowledge POST] ── URL PIPELINE COMPLETE ──");
      console.table([{
        "URL":          urlSrc.slice(0, 60),
        "Chars":        rawText.length,
        "Chunks Saved": inserted.length,
        "DB":           mongoose.connection.name,
        "Status":       "✓ SUCCESS",
      }]);

      return NextResponse.json(
        { doc: metadataDoc, chunksCreated: inserted.length },
        { status: 201 }
      );
    }

    if (!file) return NextResponse.json({ error: "File missing." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "txt";
    const fileType =
      ext === "pdf"  ? "pdf"  :
      ext === "docx" ? "docx" :
      ext === "doc"  ? "doc"  :
      ext === "md"   ? "md"   : "txt";

    /* ════ STAGE 1: PDF / DOCX / DOC / text extraction ════ */
    console.log("\n[knowledge POST] ── STAGE 1: Text Extraction ──");
    let rawText = "";

    if (fileType === "pdf") {
      console.log("[knowledge POST] Parsing PDF with pdf-parse…");
      const buffer = Buffer.from(await file.arrayBuffer());
      console.log("[knowledge POST] Buffer:", buffer.length, "bytes");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (
        buf: Buffer
      ) => Promise<{ text: string; numpages: number }>;

      const parsed = await pdfParse(buffer);
      rawText      = parsed.text ?? "";
      console.log(`[knowledge POST] ✓ PDF parsed: ${parsed.numpages} pages, ${rawText.length} chars`);
    } else if (fileType === "docx" || fileType === "doc") {
      /* mammoth handles both modern .docx (OOXML) and legacy .doc (binary) */
      console.log(`[knowledge POST] Parsing ${fileType.toUpperCase()} with mammoth…`);
      const buffer = Buffer.from(await file.arrayBuffer());

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth") as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };

      const result = await mammoth.extractRawText({ buffer });
      rawText      = result.value ?? "";
      console.log(`[knowledge POST] ✓ ${fileType.toUpperCase()} parsed: ${rawText.length} chars`);
    } else {
      rawText = await file.text();
      console.log(`[knowledge POST] ✓ Text read: ${rawText.length} chars`);
    }

    console.log("[knowledge POST] Preview:", JSON.stringify(rawText.slice(0, 150)));

    if (!rawText.trim()) {
      /* Scanned/image PDF — save metadata but skip chunking */
      const doc = await Knowledge.create({
        agentId, userId: session.user.id,
        fileName: file.name, fileType, fileUrl: "", fileSize: file.size,
      });
      console.warn("[knowledge POST] ⚠ No text extracted — metadata saved, 0 chunks.");
      return NextResponse.json(
        { doc, warning: "No text found in file (image-only PDF?). Upload a text-based PDF." },
        { status: 201 }
      );
    }

    /* ════ STAGE 2: Chunking ════ */
    console.log("\n[knowledge POST] ── STAGE 2: Chunking ──");
    const chunks = chunkText(rawText, 500, 50);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "Chunking produced 0 chunks." }, { status: 500 });
    }
    console.log(`[knowledge POST] ✓ ${chunks.length} chunks ready`);

    /* Save file metadata doc */
    const metadataDoc = await Knowledge.create({
      agentId, userId: session.user.id,
      fileName: file.name, fileType, fileUrl: "", fileSize: file.size,
    }) as { _id: mongoose.Types.ObjectId };
    console.log("[knowledge POST] ✓ Metadata doc:", metadataDoc._id.toString());

    /* ════ STAGE 3: HF Embeddings ════ */
    console.log(`\n[knowledge POST] ── STAGE 3: HF Embeddings (${chunks.length} chunks) ──`);

    const chunkDocs: object[] = [];
    let hfCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const { vector } = await generateEmbedding(
        chunks[i],
        `[${i + 1}/${chunks.length}]`
      );
      hfCount++;

      chunkDocs.push({
        knowledgeId: metadataDoc._id,
        agentId,
        userId:      session.user.id,
        fileName:    file.name,
        content:     chunks[i],
        embedding:   vector,
        chunkIndex:  i,
      });
      console.log(`[knowledge POST] [${i + 1}/${chunks.length}] ✓ ${vector.length}-dim [huggingface]`);
    }

    if (chunkDocs.length === 0) {
      await Knowledge.findByIdAndDelete(metadataDoc._id).catch(() => null);
      return NextResponse.json({ error: "All embeddings failed." }, { status: 500 });
    }

    /* ════ STAGE 4: Save to MongoDB ════ */
    console.log(`\n[knowledge POST] ── STAGE 4: Saving to MongoDB ──`);
    const inserted = await KnowledgeChunk.insertMany(chunkDocs, { ordered: false });
    console.log(`[knowledge POST] ✓ insertMany complete: ${inserted.length} docs`);

    /* ════ Summary table ════ */
    console.log("\n[knowledge POST] ── PIPELINE COMPLETE ──");
    console.table([{
      "File":           file.name,
      "Type":           ext?.toUpperCase() ?? fileType.toUpperCase(),
      "Chars":          rawText.length,
      "Chunks Saved":   inserted.length,
      "HF Embeddings":  hfCount,
      "DB":             mongoose.connection.name,
      "Status":         "✓ SUCCESS",
    }]);

    return NextResponse.json(
      { doc: metadataDoc, chunksCreated: inserted.length, hfCount },
      { status: 201 }
    );

  } catch (fatal) {
    /* ── Catches EVERY unhandled error — server never crashes ── */
    const e = fatal as Error & { code?: string };
    console.error("\n[knowledge POST] ✗ FATAL ERROR");
    console.error("  Name   :", e.name);
    console.error("  Code   :", e.code ?? "n/a");
    console.error("  Message:", e.message);
    console.error("  Stack  :\n", e.stack ?? "(no stack)");
    return NextResponse.json(
      { error: e.message, code: e.code ?? "UNKNOWN" },
      { status: 500 }
    );
  }
}
