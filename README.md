<div align="center">

# CyberAgent Studio

**Enterprise-Grade AI Chatbot Builder & Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

</div>

---

## Overview

CyberAgent Studio is a full-stack SaaS platform that enables businesses to create, configure, deploy, and manage AI-powered chatbot agents. Built with Next.js 16, TypeScript, and MongoDB Atlas, it provides an enterprise-ready solution with subscription billing, team management, real-time analytics, and embeddable widget deployment.

## Key Features

### 🤖 AI Agent Management
- Create and configure custom AI chatbot agents with unique personas
- Real-time widget preview with live styling customization
- One-click embed code generation for any website
- Knowledge base integration with document upload (PDF, TXT)

### 📊 Analytics & Monitoring
- Per-agent message volume tracking and resolution rate metrics
- Admin dashboard with user growth charts, agent distribution, and system health
- Automated weekly performance report emails delivered every Monday

### 🔐 Authentication & Security
- Passwordless OTP authentication via email
- Google OAuth integration
- JWT-secured team invitation workflow
- Role-based access control (User / Admin)

### 💳 Subscription & Billing
- Three-tier subscription model (Free / Pro / Enterprise)
- Stripe integration for payment processing
- Transaction history and payment management in admin panel
- Daily message quota enforcement with automated limit notifications

### 🔔 Real-Time Notifications
- Bell icon notification center with unread badge count
- Notification types: Welcome, Subscription, Limit Warning, System
- Mark as read/unread, mark all as read

### 👥 Team Management
- Admin panel with user management (block/unblock, plan assignment)
- Secure JWT-based invitation system with auto-registration
- Agent-level metrics per team member

### 📧 Professional Email System
- Corporate-grade transactional email templates
- OTP verification, team invitations, limit warnings, weekly reports
- Gmail SMTP with App Password support

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | NextAuth.js (OTP + Google OAuth) |
| **Styling** | Tailwind CSS 4 |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Email** | Nodemailer (Gmail SMTP) |
| **Payments** | Stripe API |
| **Caching** | SWR (stale-while-revalidate) |
| **Scheduling** | node-cron |
| **Icons** | Lucide React |

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas cluster
- Gmail account with App Password

### Installation

```bash
git clone https://github.com/your-org/cyberagent-studio.git
cd cyberagent-studio
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/CyberAgentStudio?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Email (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Provider
OPENAI_API_KEY=your-openai-key

# Admin
ADMIN_EMAIL=admin@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_...

# Cron
CRON_SECRET=your-cron-secret

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── admin/            # Admin dashboard
│   ├── api/              # REST API endpoints
│   │   ├── admin/        # Admin metrics, user management, weekly reports
│   │   ├── agents/       # CRUD for AI agents
│   │   ├── analytics/    # Analytics data endpoints
│   │   ├── auth/         # OTP send/verify
│   │   ├── chat/         # AI chat endpoint
│   │   ├── invite/       # Team invitation system
│   │   ├── knowledge/    # Knowledge base management
│   │   └── notifications/# Notification CRUD
│   ├── auth/             # Authentication page
│   ├── dashboard/        # Main agent workspace
│   ├── invite/           # Invitation landing page
│   └── settings/         # User settings & team management
├── components/           # Reusable React components
│   ├── auth/             # Auth modal, login card, OTP verification
│   ├── dashboard/        # Agent setup, saved agents, widget styling
│   ├── layout/           # Sidebar, Navbar, DashboardShell
│   └── ui/               # Shared UI primitives
├── lib/                  # Utilities & services
│   ├── auth.ts           # NextAuth configuration
│   ├── cron.ts           # Background job scheduler
│   ├── email.ts          # Email templates & sending
│   ├── mongodb.ts        # Database connection singleton
│   └── swr.ts            # SWR hooks & fetcher
├── models/               # Mongoose schemas
└── store/                # Zustand state management
```

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin` | Admin dashboard metrics |
| GET | `/api/admin/weekly-report` | Trigger weekly performance emails |
| GET/POST | `/api/agents` | List/create agents |
| PATCH/DELETE | `/api/agents/[id]` | Update/delete agent |
| POST | `/api/chat` | AI chat completion |
| POST | `/api/invite` | Generate team invitation |
| POST | `/api/invite/accept` | Accept invitation |
| GET | `/api/notifications` | Fetch user notifications |
| POST | `/api/auth/send-otp` | Send OTP email |
| POST | `/api/auth/verify-otp` | Verify OTP code |

## Deployment

Optimized for deployment on **Vercel**:

```bash
npx vercel --prod
```

For self-hosted environments, ensure `CRON_SECRET` is set and configure an external scheduler (e.g., Upstash QStash) to call `GET /api/admin/weekly-report` weekly.

---

<div align="center">
  <sub>Built with ❤️ by the CyberAgent Studio team</sub>
</div>
