# ⚡ Quick Start Guide

Get CyberAgent Studio running in production in 15 minutes.

---

## 🎯 5-Minute Setup

### 1. Clone & Install (2 min)

```bash
git clone https://github.com/Shafiqdeveloper786/CyberAgent-Studio.git
cd CyberAgent-Studio
npm install
```

### 2. Environment Setup (3 min)

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# REQUIRED - Get these values:
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
MONGODB_URI=<from MongoDB Atlas>
EMAIL_USER=<your-gmail@gmail.com>
EMAIL_PASS=<gmail-app-password>
GROQ_API_KEY=<from console.groq.com>
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
ADMIN_EMAIL=<your-email@example.com>
```

### 3. Deploy (5 min)

```bash
# Option A: One-click deploy
# Click: https://vercel.com/new/clone?repository-url=https://github.com/Shafiqdeveloper786/CyberAgent-Studio

# Option B: Manual deploy
npm i -g vercel
vercel --prod
```

### 4. Configure Vercel (5 min)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Click "Redeploy"

---

## 🔑 Getting Your API Keys

### MongoDB Atlas (2 min)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Database Access → Add User → Copy credentials
4. Network Access → Add IP → `0.0.0.0/0`
5. Connect → Copy connection string

### Gmail App Password (2 min)

1. Google Account → Security
2. Enable 2-Step Verification
3. App Passwords → Generate "Mail" password
4. Copy 16-character password

### Groq API Key (1 min)

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up
3. Create API key
4. Copy key (starts with `gsk_`)

---

## ✅ Verify Deployment

### Test These Features:

1. **Homepage** - `https://your-domain.vercel.app`
2. **Auth** - `https://your-domain.vercel.app/auth`
3. **Dashboard** - `https://your-domain.vercel.app/dashboard`
4. **Admin** - `https://your-domain.vercel.app/admin` (if admin email matches)

### Quick Tests:

```bash
# Test locally first
npm run dev
# Visit http://localhost:3000

# Build check
npm run build
# Should complete without errors

# Type check
npx tsc --noEmit
# Should show no errors
```

---

## 🚨 Common Issues & Quick Fixes

### "MongoDB connection failed"
→ Add `0.0.0.0/0` to MongoDB Atlas IP whitelist

### "Email not sending"
→ Use Gmail App Password (not regular password)

### "OTP not received"
→ Check spam folder, verify EMAIL_USER and EMAIL_PASS

### "Build fails"
→ Run `npx tsc --noEmit` locally and fix errors

---

## 📚 Next Steps

1. **Read Full Documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Review Checklist:** [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
3. **Customize:** Update branding, colors, and features
4. **Launch:** Announce to users!

---

## 🆘 Need Help?

- **Documentation:** See [README.md](./README.md)
- **Deployment Guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues:** [GitHub Issues](https://github.com/Shafiqdeveloper786/CyberAgent-Studio/issues)

---

<div align="center">

**You're ready to launch!** 🚀

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

</div>