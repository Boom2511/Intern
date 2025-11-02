# 🚀 Deployment Guide - Vercel

คำแนะนำการ Deploy โปรเจค Help Desk ไปยัง Vercel

---

## 📋 เตรียมความพร้อม

### 1. ตรวจสอบก่อน Deploy

- [x] Database เชื่อมต่อสำเร็จ (Supabase)
- [x] ลบ mock data ออกแล้ว
- [x] API routes ทำงานถูกต้อง
- [x] Error handling ครบถ้วน
- [ ] Test ทุก features ใน local
- [ ] Commit code ขึ้น GitHub

---

## 🔧 ขั้นตอนการ Deploy

### Step 1: Push Code to GitHub

```bash
# Initialize git (ถ้ายังไม่ได้ทำ)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Help Desk System"

# เชื่อมกับ GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/helpdesk-thailand.git

# Push
git push -u origin main
```

### Step 2: เชื่อมต่อ Vercel กับ GitHub

1. ไปที่ [https://vercel.com](https://vercel.com)
2. Sign in ด้วย GitHub account
3. คลิก **"Add New Project"**
4. เลือก repository **`helpdesk-thailand`**
5. คลิก **"Import"**

### Step 3: ตั้งค่า Environment Variables

ใน Vercel Dashboard > Settings > Environment Variables:

```env
# Database
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-x-ap-southeast-1.pooler.supabase.com:5432/postgres

# NextAuth (สร้าง secret ใหม่)
NEXTAUTH_SECRET=xxx-generate-new-secret-xxx
NEXTAUTH_URL=https://your-app.vercel.app

# Application
NODE_ENV=production
```

**สำคัญ:**
- ใช้ **Supabase Connection Pooler** URL (port 5432 หรือ 6543)
- สร้าง `NEXTAUTH_SECRET` ใหม่ด้วย: `openssl rand -base64 32`
- อัปเดต `NEXTAUTH_URL` เป็น URL ของ Vercel

### Step 4: Deploy!

1. คลิก **"Deploy"**
2. รอ build เสร็จ (ประมาณ 2-3 นาที)
3. เปิด URL ที่ได้: `https://your-app.vercel.app`

---

## ✅ Vercel Build Configuration

### Framework Preset
- **Framework**: Next.js
- **Build Command**: `prisma generate && next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Root Directory
- ไว้เป็น `./` (root)

---

## 🔄 การ Deploy ครั้งถัดไป

หลังจาก deploy ครั้งแรกแล้ว:

```bash
# แก้ไขโค้ด
git add .
git commit -m "Update: description"
git push

# Vercel จะ auto-deploy ทันที!
```

---

## 🐛 Troubleshooting

### ปัญหา: Build Failed - Prisma Error

**วิธีแก้:**
1. ตรวจสอบว่า `DATABASE_URL` ถูกต้อง
2. ใช้ Supabase **Transaction Pooler** (port 5432)
3. เพิ่ม build command: `prisma generate && next build`

### ปัญหา: Runtime Error - Can't connect to database

**วิธีแก้:**
1. ใช้ **Session Pooler** (port 6543) สำหรับ runtime
2. เพิ่ม `?pgbouncer=true` ใน DATABASE_URL
3. ตรวจสอบ Supabase project ไม่ paused

### ปัญหา: Environment Variables ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบว่าเพิ่ม env vars ใน Vercel Dashboard แล้ว
2. **Redeploy** หลังจากเพิ่ม env vars
3. ตรวจสอบว่าใช้ `process.env.VARIABLE_NAME` ในโค้ด

---

## 🔐 Production Environment Variables

สร้างไฟล์ `.env.production` (local testing):

```env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-x-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXTAUTH_SECRET="production-secret-key-change-this"
NEXTAUTH_URL="https://your-app.vercel.app"
NODE_ENV="production"
```

**หมายเหตุ:** ไฟล์นี้ไม่ต้อง commit (อยู่ใน `.gitignore` แล้ว)

---

## 📊 Performance Optimization

### 1. Enable Caching

ใน `next.config.js`:

```javascript
module.exports = {
  // ... existing config
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, must-revalidate',
        },
      ],
    },
  ],
};
```

### 2. Database Connection Pooling

ใช้ Supabase Session Pooler:

```
postgresql://...@aws-x-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 3. Image Optimization

Next.js auto-optimize images, แต่ควรใช้:
```jsx
import Image from 'next/image'
```

---

## 🌐 Custom Domain

### เชื่อมต่อ Domain ของคุณ:

1. ไปที่ Vercel Dashboard > Settings > Domains
2. คลิก **"Add Domain"**
3. ใส่ domain (เช่น `helpdesk.yourcompany.com`)
4. ทำตาม DNS configuration ที่แสดง

---

## 📈 Monitoring

### Vercel Analytics

1. ไปที่ Dashboard > Analytics
2. ดู:
   - Page views
   - Response times
   - Error rates
   - Geographic data

### Supabase Monitoring

1. Supabase Dashboard > Database > Logs
2. ตรวจสอบ:
   - Query performance
   - Connection pool usage
   - Error logs

---

## 🔄 CI/CD Pipeline

Vercel มี CI/CD built-in:

```
git push → GitHub → Vercel Auto-Deploy → Production
```

### Preview Deployments

- **Every push** = Preview deployment
- **Merge to main** = Production deployment
- URL: `https://helpdesk-thailand-git-branch-name.vercel.app`

---

## 📝 Checklist หลัง Deploy

- [ ] เปิด URL ตรวจสอบทำงานถูกต้อง
- [ ] ทดสอบสร้าง Ticket ใหม่
- [ ] ทดสอบค้นหา Customer
- [ ] ทดสอบอัปเดตสถานะ
- [ ] ทดสอบเพิ่ม Notes
- [ ] ตรวจสอบ Dashboard stats
- [ ] ทดสอบบน Mobile
- [ ] Setup monitoring/alerts

---

## 🆘 Support

หากมีปัญหา:

1. **Vercel Docs**: https://vercel.com/docs
2. **Next.js Docs**: https://nextjs.org/docs
3. **Supabase Docs**: https://supabase.com/docs
4. **GitHub Issues**: Create issue ใน repository

---

## 🎉 Done!

ระบบ Help Desk ของคุณพร้อมใช้งานแล้ว!

**Production URL**: `https://your-app.vercel.app`

สามารถแชร์ URL นี้กับทีมได้เลย 🚀
