<div align="center">

# 🪐 CyberAgent Studio

### Enterprise-Grade AI Chatbot Platform — Build, Deploy & Analyze Autonomous AI Agents

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-cyber--agent--studio.vercel.app-00f2ff?style=for-the-badge&logo=vercel&logoColor=black)](https://cyber-agent-studio.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-00ED64?style=for-the-badge&logo=mongodb&logoColor=black)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](./LICENSE)

</div>

---

## 🧠 System Overview

**CyberAgent Studio** is a production-ready SaaS platform for building, deploying, and managing autonomous AI chatbot agents. Built on Next.js 16 with App Router, it provides a complete solution for creating intelligent conversational AI systems that can be embedded into any website with a single script tag.

### Key Capabilities

- 🤖 **AI Agent Builder** — Configure system prompts, model parameters, and widget themes with live preview
- 📡 **RAG Knowledge Base** — Upload PDF/text documents; auto-chunked, embedded, and stored for context-aware responses
- 📊 **Analytics Dashboard** — Per-agent message volume, lead conversion tracking, and quota monitoring
- 🌐 **Universal Embed System** — One-line `<script>` tag deploys floating chat widget to any website
- 🔑 **API Credentials Manager** — Dynamic `ca_live_` token generator with instant revocation
- 👥 **Team Workspace** — Seat-based access control with SMTP invitations
- 💳 **Billing & Checkout** — Multi-method payment UI with manual transfer support
- 🚨 **Admin Panel** — Complete user management, transaction tracking, and support ticket system
- 🔄 **Workflow Builder** — Visual conversation flow designer with drag-and-drop nodes

---

## ⚡ Core Features

| Feature | Description |
|---|---|
| 🤖 **AI Agent Builder** | Configure prompts, models, colors, and themes with live preview |
| 📡 **RAG Knowledge Base** | Upload PDF/text docs; auto-embedded for context-aware AI |
| 📊 **Analytics Engine** | Message volume, conversion tracking, quota monitoring |
| 🌐 **Universal Embed** | One-line script tag deploys chat widget anywhere |
| 🔑 **API Credentials** | Dynamic `ca_live_` tokens with localStorage persistence |
| 👥 **Team Workspace** | Seat-based access, SMTP invites, real-time sync |
| 💳 **Billing System** | Multi-method payments with manual transfer fallback |
| 🚨 **Admin Panel** | User management, transactions, support tickets |
| 🔄 **Workflow Builder** | Visual node-based conversation flow designer |
| 📧 **Email Notifications** | OTP verification, support tickets, admin alerts |

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CYBERAGENT STUDIO STACK                        │
├──────────────────┬──────────────────┬──────────────────────────────┤
│  FRONTEND        │  BACKEND         │  INFRASTRUCTURE               │
│  Next.js 16      │  App Router API  │  MongoDB Atlas (Vector DB)    │
│  Tailwind v4     │  NextAuth v4     │  Groq LLM (llama-3.3-70b)    │
│  Framer Motion   │  Nodemailer SMTP │  HuggingFace Embeddings       │
│  Lucide Icons    │  Mongoose ORM    │  Vercel Edge Network          │
│  Zustand         │  Groq SDK        │  Production-Ready             │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

---

## 🚀 Production Deployment

### Prerequisites

- Node.js 20+ 
- npm 9+ or pnpm
- MongoDB Atlas cluster (free tier works)
- Google Account with [App Password](https://myaccount.google.com/apppasswords) enabled
- [Groq API key](https://console.groq.com/keys) (free)
- Vercel account (for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/Shafiqdeveloper786/CyberAgent-Studio.git
cd CyberAgent-Studio
npm install
```

### 2. Environment Configuration

Create `.env.local` at project root:

```env
# ── Authentication ────────────────────────────────────────
NEXTAUTH_URL=https://your-domain.vercel.app
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

# ── Public base URL ───────────────────────────────────────
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app

# ── Admin Configuration ───────────────────────────────────
ADMIN_EMAIL=admin@example.com
```

> **Security:** `.env.local` is gitignored. Never commit real credentials.

### 3. Production Build

```bash
# Test build locally
npm run build
npm run start

# Deploy to Vercel
vercel --prod
```

### 4. Post-Deployment

1. Set all environment variables in Vercel Dashboard → Settings → Environment Variables
2. Configure MongoDB Atlas IP whitelist (0.0.0.0/0 for Vercel)
3. Test OTP email delivery
4. Verify Groq API connectivity
5. Test embed script on external domain

---

## 📦 Project Structure

```
cyberagent-studio/
├── public/
│   ├── embed.js                  # Universal widget embed script (v10)
│   └── assets/                   # Logo and brand assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/           # Agent CRUD + API key management
│   │   │   ├── chat/             # Groq streaming + RAG + quota
│   │   │   ├── invite/           # Nodemailer SMTP invitations
│   │   │   ├── knowledge/        # Document ingestion + embeddings
│   │   │   ├── analytics/        # Per-agent metrics aggregation
│   │   │   ├── admin/            # Admin panel (users, transactions, support)
│   │   │   ├── inquiries/        # Customer inquiry management
│   │   │   └── auth/             # OTP + Google OAuth
│   │   ├── dashboard/            # Main workspace (agent builder, preview)
│   │   ├── workflow/             # Visual conversation flow builder
│   │   ├── widget/[agentId]/     # Standalone embeddable widget
│   │   ├── settings/             # Account & preferences
│   │   ├── analytics/            # Analytics dashboard
│   │   └── auth/                 # Login/verify pages
│   ├── components/
│   │   ├── dashboard/            # AgentSetup, WidgetPreview, EmbedCode
│   │   ├── workflow/             # WorkflowBuilder (node editor)
│   │   ├── widget/               # WidgetChat (iframe target)
│   │   ├── layout/               # DashboardShell, Navbar, Sidebar
│   │   ├── auth/                 # AuthModal, OtpVerification
│   │   └── pricing/              # PricingModal
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── mailer.ts             # Nodemailer transporter
│   │   ├── mongodb.ts            # Mongoose connection
│   │   ├── embeddings.ts         # HuggingFace pipeline
│   │   └── email.ts              # Email template generators
│   ├── models/                   # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Agent.ts
│   │   ├── Knowledge.ts
│   │   ├── Quota.ts
│   │   └── Inquiry.ts
│   ├── store/                    # Zustand state management
│   │   ├── agentStore.tsx
│   │   └── authStore.tsx
│   └── hooks/
│       └── useLiveChat.ts        # Streaming chat with rate limits
└── next.config.ts                # CORS, serverExternalPackages
```

---

## 🌐 Embedding an Agent

After creating an agent, grab your embed script from **Agent Space → Embed & API**:

```html
<!-- Paste before </body> on any HTML page -->
<script
  src="https://cyber-agent-studio.vercel.app/embed.js"
  id="cyberagent-universal-script"
  data-agent-id="YOUR_AGENT_ID"
  data-accent-color="#00f2ff"
  data-theme="corporate-light"
  async>
</script>
```

**Features:**
- Async loading — zero page-speed impact
- Auto-initializes on DOM ready
- Supports custom themes and accent colors
- Works on any HTML page (no framework required)

---

## 🔌 API Usage

Direct streaming chat endpoint:

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

**Rate Limits:** Free plan — 50 messages/agent/day (resets UTC midnight)  
**Auth:** Missing/invalid `x-api-key` returns `403`

---

## 🛡️ Security & Production Readiness

| Layer | Implementation |
|---|---|
| **Credentials isolation** | Secrets only in server files (`lib/`, `api/`) |
| **Client env safety** | Only `NEXT_PUBLIC_` vars exposed to browser |
| **XSS sanitization** | Chat messages stripped of HTML before LLM injection |
| **API key auth** | Per-agent `ca_live_` tokens validated on every request |
| **Rate limiting** | MongoDB Quota collection with compound indexes |
| **Git safety** | `.env*` gitignored; mock keys use `ca_` prefix |
| **CORS configured** | Proper headers in `next.config.ts` |
| **TypeScript strict** | Full type safety across codebase |
| **Error boundaries** | Graceful error handling in API routes |

---

## 🚢 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shafiqdeveloper786/CyberAgent-Studio)

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Post-Deploy Checklist:**
- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure MongoDB Atlas network access (0.0.0.0/0)
- [ ] Test email delivery (OTP + notifications)
- [ ] Verify Groq API connectivity
- [ ] Test embed script on external domain
- [ ] Enable Vercel Analytics (optional)
- [ ] Configure custom domain (optional)

---

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npx tsc --noEmit
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: your feature"`
4. Push to branch: `git push origin feat/your-feature`
5. Open Pull Request against `master`

---

## 📄 License

MIT © [Shafiqdeveloper786](https://github.com/Shafiqdeveloper786) — see [LICENSE](./LICENSE) for details.


---

## ⚙️ Quota Management & Agent Control

### Managing Agent Quotas via Admin Panel
System administrators can manage agent quotas dynamically from the Admin Panel:
1. Navigate to the **Agents** tab in the Admin Panel.
2. In the **Limits & Count Control** column, you can:
   - **Total Count**: Adjust the lifetime message count manually.
   - **Daily Limit**: Set a custom daily limit (default is `50` messages) for each specific agent.
   - **Set to Unlimited**: Toggle a checkbox to exempt specific agents from daily quota limits.
3. Click the checkmark button next to the fields to save limits. Changes take effect immediately in the database and apply to both current and future daily quotas.

### Unlimited Agent Mode
When the **Unlimited** mode is enabled for a specific agent:
- The system completely bypasses the daily rate-limit enforcement block (`enforceFreePlanCap`).
- Ideal for high-tier or client-facing showcase agents requiring zero-downtime availability.
- This bypass operates independently of the user's subscription tier.

### Quota Security Design (Fail-Closed Strategy)
To ensure system protection under load and avoid server exploitation:
- **Fail-Closed Quota Check**: If MongoDB Atlas or the Quota database becomes temporarily unavailable during a chat request, the system blocks the request with a `503 Service Unavailable` error instead of bypassing the cap. We prioritize platform stability over unlimited unauthorized usage.
- **Automated Notifications**: As soon as an agent's daily limit is hit:
  - All subsequent API requests are immediately blocked with a `423 Locked` response.
  - A single daily automated warning email is instantly dispatched via Nodemailer SMTP to the owner's registered address, detailing the limit depletion and reset time.

---

## 🎯 Production Status

✅ **Production Ready** — All core features implemented and tested  
✅ **Type Safe** — Full TypeScript coverage with strict mode  
✅ **Performance Optimized** — Async loading, edge-ready  
✅ **Security Hardened** — Credentials isolated, XSS protected, rate limited  
✅ **Scalable Architecture** — MongoDB Atlas, Vercel Edge Network  
✅ **Email System** — SMTP integration with OTP + notifications  
✅ **Admin Tools** — Complete management suite  
✅ **Documentation** — Comprehensive README + inline docs  

---

<div align="center">

Built with ⚡ by the CyberAgent Studio team · Powered by [Groq](https://groq.com) · Deployed on [Vercel](https://vercel.com)

</div>