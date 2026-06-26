# 🚢 CyberAgent Studio — Production Deployment Guide

This guide will help you deploy CyberAgent Studio to production on Vercel with MongoDB Atlas.

---

## 📋 Pre-Deployment Checklist

### 1. MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new project and cluster (free tier M0 is sufficient)
   - Wait for cluster to be ready (~5 minutes)

2. **Database User**
   - Go to Database Access → Add New Database User
   - Create username and strong password
   - Grant "Read and write to any database" permissions

3. **Network Access**
   - Go to Network Access → Add IP Address
   - Add `0.0.0.0/0` (allows Vercel IPs)
   - Or add specific Vercel IP ranges for better security

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your preferred database name

### 2. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for development)
6. Copy Client ID and Client Secret

### 3. Groq API Key

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up or log in
3. Create new API key
4. Copy the key (starts with `gsk_`)

### 4. Gmail App Password

1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate app password for "Mail"
5. Copy the 16-character password

---

## 🚀 Deployment Steps

### Step 1: Prepare Repository

```bash
# Clone the repository
git clone https://github.com/Shafiqdeveloper786/CyberAgent-Studio.git
cd CyberAgent-Studio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Step 2: Configure Environment Variables

Edit `.env.local` with your values:

```env
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-random-32-char-string>
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=CyberAgent Studio <your-email@gmail.com>
GROQ_API_KEY=gsk_your-groq-api-key
HF_API_TOKEN=hf_your-hf-token
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
ADMIN_EMAIL=admin@example.com
```

**Generate NEXTAUTH_SECRET:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 3: Test Locally

```bash
# Run development server
npm run dev

# Test all features:
# - User registration/login
# - Agent creation
# - Knowledge base upload
# - Chat widget
# - Admin panel (if admin email matches)
```

### Step 4: Deploy to Vercel

#### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shafiqdeveloper786/CyberAgent-Studio)

#### Option B: Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 5: Configure Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.local`:
   - `NEXTAUTH_URL` → `https://your-domain.vercel.app`
   - `NEXTAUTH_SECRET` → your generated secret
   - `MONGODB_URI` → your MongoDB connection string
   - `EMAIL_HOST` → `smtp.gmail.com`
   - `EMAIL_PORT` → `587`
   - `EMAIL_USER` → your Gmail
   - `EMAIL_PASS` → your app password
   - `EMAIL_FROM` → `CyberAgent Studio <your-email@gmail.com>`
   - `GROQ_API_KEY` → your Groq API key
   - `HF_API_TOKEN` → your HuggingFace token
   - `NEXT_PUBLIC_BASE_URL` → `https://your-domain.vercel.app`
   - `ADMIN_EMAIL` → your admin email

3. **Important:** Set all variables for "Production" environment

### Step 6: Redeploy

```bash
# Trigger new deployment with env vars
vercel --prod
```

Or click "Redeploy" in Vercel Dashboard.

---

## ✅ Post-Deployment Verification

### Critical Tests

1. **Authentication Flow**
   - [ ] Visit `https://your-domain.vercel.app/auth`
   - [ ] Test OTP email delivery
   - [ ] Verify Google OAuth (if configured)
   - [ ] Test logout functionality

2. **Agent Creation**
   - [ ] Create new agent
   - [ ] Configure system prompt
   - [ ] Set accent color and theme
   - [ ] Save successfully

3. **Knowledge Base**
   - [ ] Upload PDF document
   - [ ] Verify processing completes
   - [ ] Check embeddings are created

4. **Chat Widget**
   - [ ] Get embed code from dashboard
   - [ ] Test on external HTML page
   - [ ] Verify async loading
   - [ ] Test chat functionality

5. **Admin Panel** (if admin email matches)
   - [ ] Access `/admin`
   - [ ] Check user list loads
   - [ ] Verify transaction history
   - [ ] Test support ticket system

6. **Email Notifications**
   - [ ] OTP verification email
   - [ ] Support ticket confirmation
   - [ ] Admin notification emails
   - [ ] Reply notifications

### Performance Checks

```bash
# Run Lighthouse audit
npm run build
npm run start
# Then run Lighthouse in Chrome DevTools
```

- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

---

## 🔧 Troubleshooting

### Common Issues

**1. MongoDB Connection Fails**
```
Error: MongooseServerSelectionError
```
**Solution:** 
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0)
- Verify connection string format
- Ensure database user has correct permissions

**2. Email Not Sending**
```
Error: Invalid login
```
**Solution:**
- Use Gmail App Password (not regular password)
- Enable 2-Step Verification
- Check EMAIL_FROM matches authenticated user

**3. OTP Not Received**
```
Email not arriving
```
**Solution:**
- Check spam folder
- Verify EMAIL_USER and EMAIL_PASS
- Test with different email provider
- Check Vercel logs for SMTP errors

**4. Build Fails**
```
TypeScript errors
```
**Solution:**
```bash
# Run type check locally
npx tsc --noEmit

# Fix any type errors before deploying
```

**5. Widget Not Loading**
```
Embed script fails
```
**Solution:**
- Verify NEXT_PUBLIC_BASE_URL is correct
- Check CORS settings in next.config.ts
- Ensure embed.js is in public folder
- Test with hardcoded agent ID

---

## 📊 Monitoring & Maintenance

### Vercel Analytics

1. Enable Vercel Analytics in dashboard
2. Monitor:
   - Page load times
   - API response times
   - Error rates
   - Bandwidth usage

### MongoDB Atlas Monitoring

1. Check cluster metrics:
   - Operations per second
   - Connection count
   - Storage usage
   - Query performance

2. Set up alerts for:
   - High CPU usage
   - Storage limits
   - Connection pool exhaustion

### Application Monitoring

Add to your application:

```typescript
// lib/monitoring.ts
export function logError(error: Error, context?: Record<string, any>) {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Optional: Send to external monitoring service
  // Sentry, LogRocket, etc.
}
```

---

## 🔐 Security Best Practices

### Production Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] NEXTAUTH_SECRET is strong and random
- [ ] Admin email is secured
- [ ] API keys are rotated regularly
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] XSS protection active
- [ ] Error messages don't leak sensitive info

### Regular Maintenance

- [ ] Rotate API keys monthly
- [ ] Review MongoDB access logs
- [ ] Update dependencies weekly
- [ ] Monitor error rates daily
- [ ] Backup database weekly
- [ ] Review user permissions quarterly

---

## 📈 Scaling Considerations

### When to Scale

**Database:**
- Current: MongoDB Atlas M0 (512MB)
- Scale to M10 when: > 1000 agents, > 100k messages/month

**Vercel:**
- Current: Hobby (Free)
- Scale to Pro ($20/month) when: > 100GB bandwidth, need team collaboration

**Groq API:**
- Free tier: 30 requests/minute
- Scale to paid when: > 1000 daily active users

### Optimization Tips

1. **Database Indexes**
   ```javascript
   // Add indexes for common queries
   db.agents.createIndex({ userId: 1, createdAt: -1 });
   db.quotas.createIndex({ agentId: 1, date: 1 }, { unique: true });
   ```

2. **Caching**
   - Enable Vercel Edge Cache for static assets
   - Use Redis for session storage (if needed)

3. **CDN**
   - Vercel Edge Network (automatic)
   - Consider Cloudflare for additional caching

---

## 🎯 Launch Checklist

### Pre-Launch (1 week before)

- [ ] Complete all deployment steps above
- [ ] Test all features thoroughly
- [ ] Set up monitoring and alerts
- [ ] Prepare launch announcement
- [ ] Set up support email/chat

### Launch Day

- [ ] Deploy to production
- [ ] Run post-deployment tests
- [ ] Monitor error logs (first 2 hours critical)
- [ ] Test on multiple devices/browsers
- [ ] Verify email delivery
- [ ] Check analytics tracking

### Post-Launch (1 week after)

- [ ] Monitor performance metrics daily
- [ ] Fix any reported bugs
- [ ] Gather user feedback
- [ ] Plan feature updates
- [ ] Document lessons learned

---

## 🆘 Support

If you encounter issues:

1. Check [GitHub Issues](https://github.com/Shafiqdeveloper786/CyberAgent-Studio/issues)
2. Review Vercel deployment logs
3. Check MongoDB Atlas logs
4. Review email delivery logs
5. Open new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Screenshots (if applicable)

---

## 📄 License

MIT © [Shafiqdeveloper786](https://github.com/Shafiqdeveloper786)

---

<div align="center">

**Ready for production!** 🚀

Built with ⚡ by CyberAgent Studio Team

</div>