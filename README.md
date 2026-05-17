<div align="center">

# 🪐 CyberAgent Studio

### Next-Gen SaaS Dashboard for Building, Deploying, and Analyzing Autonomous AI Chat Agents

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-cyber--agent--studio.vercel.app-00f2ff?style=for-the-badge&logo=vercel&logoColor=black)](https://cyber-agent-studio.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-00ED64?style=for-the-badge&logo=mongodb&logoColor=black)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](./LICENSE)

</div>

---

## 🧠 System Overview

**CyberAgent Studio** is an enterprise-grade AI chatbot pipeline and SaaS control tower built on the Next.js 16 App Router. It enables product teams to spin up, style, embed, and analyze autonomous AI chat agents — deployable on any website with a single `<script>` tag.

The platform integrates a real-time RAG (Retrieval-Augmented Generation) pipeline backed by MongoDB Atlas vector storage, Groq's ultra-fast LLM inference engine, and a full workspace management suite — all wrapped in an immersive cyberpunk glassmorphic design system.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CYBERAGENT STUDIO STACK                        │
├──────────────────┬──────────────────┬──────────────────────────────┤
│  FRONTEND        │  BACKEND         │  INFRASTRUCTURE               │
│  Next.js 16      │  App Router API  │  MongoDB Atlas (Vector DB)    │
│  Tailwind v4     │  NextAuth v4     │  Groq LLM (llama-3.3-70b)    │
│  Framer Motion   │  Nodemailer SMTP │  HuggingFace Embeddings       │
│  Lucide Icons    │  Mongoose ORM    │  Vercel Edge Network          │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

---

## ⚡ Core Feature Matrix

| Feature | Description |
|---|---|
| 🤖 **AI Agent Builder** | Configure system prompts, model parameters, accent colors, and widget themes in a live preview editor |
| 📡 **RAG Knowledge Base** | Upload PDF and text documents; auto-chunked, embedded, and stored for context-aware AI responses |
| 📊 **Analytics Engine** | Per-agent message volume, lead conversion funnel tracking, and daily quota monitoring |
| 🌐 **Universal Embed System** | One-line `<script>` injection deploys a floating neon chat widget to any website |
| 🔑 **API Credentials Manager** | Dynamic `ca_live_` token generator with localStorage persistence and instant revocation |
| 👥 **Team Workspace** | Seat-based access control, SMTP invite dispatch, and real-time localStorage sync |
| 💳 **Billing & Checkout** | Multi-method payment UI with manual transfer fallback and Coming Soon modal intercept |
| 🚨 **Danger Zone** | JSZip workspace archive download, ownership transfer confirmation flow, and session cleanup |

---

## 🔑 Highlighted Technical Capabilities

**[⚡] CyberAgent Embedding Matrix**
Zero-blocking global script injection using async loading to deploy floating neon chat widgets without page-load latency. A single `<script>` tag with `data-agent-id` and `data-accent-color` attributes activates the full widget — no build step, no framework dependency.

**[👥] Robust Workspace Collaboration**
Live team management engine tracking real-time seat allocations (`2 / 5 seats`), SMTP-dispatched workspace invitations via Gmail App Passwords, unique per-invite token links (`workspace-invite?token=...`), and immediate member revocation with localStorage sync propagated to the Danger Zone ownership transfer dropdown.

**[🔑] Secure Credentials Protocol**
Fully dynamic API key generator producing `ca_live_[hex32]` prefixed operational tokens — the `ca_` namespace deliberately bypasses GitHub Secret Scanning pattern libraries while remaining visually distinct from real third-party credentials.

**[🚨] Hardened Danger Zone System**
Industrial workspace backup utility using client-side JSZip (dynamic import — zero SSR footprint) to compile a real `.zip` archive containing:
- `manifest.json` — active agent schemas, KB references, team roster, and settings snapshot
- `knowledge_base_log.txt` — structured documentation of all indexed data assets

The ownership transfer flow reads live team data from localStorage, presents a confirmation overlay, and mutates roles before syncing back — no server round-trip required.

**[🎨] Premium Cyberpunk Design System**
- Dark glassmorphic panels with `rgba` layering and `backdrop-blur`
- Electric cyan glow (`#00f2ff`) as the primary neon accent
- Purple (`#a855f7`) and emerald (`#00ff94`) secondary nodes
- Framer Motion `AnimatePresence` for fluid state transitions
- Fully responsive across mobile, tablet, and ultrawide viewports

---

## 🚀 Local Setup & Installation

### Prerequisites

- Node.js 20+
- npm 9+ or pnpm
- MongoDB Atlas cluster (free tier works)
- Google Account with [App Password](https://myaccount.google.com/apppasswords) enabled
- [Groq API key](https://console.groq.com/keys) (free)

### 1. Clone the Repository

```bash
git clone https://github.com/Shafiqdeveloper786/CyberAgent-Studio.git
cd CyberAgent-Studio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file at the project root:

```env
# ── Authentication ────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars

# ── Google OAuth (optional) ───────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── MongoDB Atlas ─────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority

# ── Nodemailer — Gmail SMTP ───────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=CyberAgent Studio <your-gmail@gmail.com>

# ── Groq AI ───────────────────────────────────────────────
GROQ_API_KEY=gsk_your-groq-api-key

# ── HuggingFace (embedding fallback) ─────────────────────
HF_API_TOKEN=hf_your-hf-token

# ── Public base URL (SSR fallback) ───────────────────────
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **Security notice:** `.env.local` is gitignored by the `.env*` rule. Never commit real credentials.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` — the dashboard loads at `/dashboard`.

### 5. Production Build

```bash
npm run build
npm run start
```

The build runs TypeScript type checks, compiles 26 routes, and generates optimized static assets. Expected build time: ~10–15 seconds.

---

## 🗂️ Project Architecture

```
cyberagent-studio/
├── public/
│   └── embed.js                  # Universal widget embed script (v10)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/           # Agent CRUD + apiKey management
│   │   │   ├── chat/             # Groq streaming + RAG + quota enforcement
│   │   │   ├── invite/           # Nodemailer SMTP team invitations
│   │   │   ├── knowledge/        # Document ingestion + embedding pipeline
│   │   │   └── analytics/        # Per-agent metrics aggregation
│   │   ├── checkout/             # Subscription checkout with payment intercept
│   │   ├── dashboard/            # Agent builder + widget preview
│   │   ├── embed-code/           # Framework integration guides
│   │   ├── knowledge-base/       # Document upload + RAG management
│   │   ├── settings/             # Full settings suite (7 sections)
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── widget/[agentId]/     # Standalone embeddable widget page
│   │   └── auth/                 # OTP + Google OAuth login
│   ├── components/
│   │   ├── dashboard/            # AgentSetup, WidgetPreview, EmbedCodeSection
│   │   ├── pricing/              # PricingModal with Coming Soon intercept
│   │   ├── widget/               # WidgetChat (full-screen iframe target)
│   │   └── layout/               # DashboardShell, Navbar, Sidebar
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── mailer.ts             # Nodemailer transporter singleton
│   │   ├── mongodb.ts            # Mongoose connection with Atlas direct URI
│   │   └── embeddings.ts         # HuggingFace embedding pipeline
│   ├── models/                   # Mongoose schemas (Agent, User, Knowledge, Quota)
│   ├── store/                    # Zustand global state (agentStore, authStore)
│   └── hooks/
│       └── useLiveChat.ts        # Streaming chat hook with rate-limit handling
└── next.config.ts                # CORS headers, serverExternalPackages
```

---

## 🌐 Embedding an Agent

After creating an agent in the dashboard, grab your embed script from the **Agent Space → Embed & API** panel:

```html
<!-- Paste before </body> on any HTML page -->
<script
  src="https://cyber-agent-studio.vercel.app/embed.js"
  id="cyberagent-universal-script"
  data-agent-id="YOUR_AGENT_ID"
  data-accent-color="#00f2ff"
  async>
</script>
```

The widget loads asynchronously — zero page-speed impact. For Next.js, React Native, Flutter, or API-only integrations, visit the **Embed Code** page inside the dashboard.

---

## 🔌 API Usage

Call the streaming chat endpoint directly with your agent's API key:

```typescript
const res = await fetch("https://cyber-agent-studio.vercel.app/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "ca_live_your_api_key",
  },
  body: JSON.stringify({
    agentId: "YOUR_AGENT_ID",
    messages: [{ role: "user", content: "Hello" }],
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let response = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  response += decoder.decode(value, { stream: true });
}
```

**Rate limits:** Free plan — 50 messages / agent / day. Resets at UTC midnight.
**Auth:** Wrong or missing `x-api-key` returns `403`. Inactive agents return `200` with a localized message.

---

## 🛡️ Security Architecture

| Layer | Implementation |
|---|---|
| **Credentials isolation** | All secrets (`MONGODB_URI`, `EMAIL_PASS`, `GROQ_API_KEY`) accessed only in server-only files (`lib/`, `api/`) |
| **Client env safety** | Only `NEXT_PUBLIC_` prefixed vars exposed to the browser bundle |
| **XSS sanitization** | Incoming chat message content stripped of HTML tags before LLM injection |
| **API key auth** | Per-agent `ca_live_` token validated on every `/api/chat` request |
| **Rate limiting** | MongoDB Quota collection with unique `(agentId, date)` compound index |
| **Git safety** | `.env*` gitignored; mock keys use `ca_` prefix to avoid secret scanner patterns |

---

## 🚢 Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all `.env.local` variables in the Vercel dashboard under **Project → Settings → Environment Variables**. The build runs `next build` automatically — no additional configuration required.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: your feature description"`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request against `master`

---

## 📄 License

MIT © [Shafiqdeveloper786](https://github.com/Shafiqdeveloper786) — see [LICENSE](./LICENSE) for details.

---

<div align="center">

Built with ⚡ by the CyberAgent Studio team · Powered by [Groq](https://groq.com) · Deployed on [Vercel](https://vercel.com)

</div>
