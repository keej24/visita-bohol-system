# 🚀 Quick Deploy to Vercel

## Fastest Way to Deploy

### **Option 1: Run PowerShell Script (Easiest)**

```powershell
cd admin-dashboard
.\deploy-vercel.ps1
```

Follow the prompts!

---

### **Option 2: Manual Commands**

```powershell
cd admin-dashboard

# First time only:
vercel login

# Deploy:
vercel --prod
```

---

## 📋 After First Deployment

### **Add Environment Variables to Vercel:**

1. Go to: https://vercel.com/dashboard
2. Click your project: `visita-bohol`
3. Settings → Environment Variables
4. Copy these from your `.env` file:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

5. Redeploy to apply changes

---

## ✅ Verify Deployment

Your site: `https://visita-bohol.vercel.app`

Test:
- [ ] Login page loads
- [ ] Can login with test accounts
- [ ] Data loads from Firebase
- [ ] Images display correctly
- [ ] Multi-tab login works

---

## 🔄 Auto-Deploy with GitHub

**Enable push-to-deploy:**

1. Vercel Dashboard → Your Project
2. Settings → Git → Connect Repository
3. Choose: `keej24/visita-bohol-system`
4. Root Directory: `admin-dashboard`

Now: `git push` = auto-deploy! 🎉

---

**Full Guide:** See `VERCEL_DEPLOYMENT_GUIDE.md`
