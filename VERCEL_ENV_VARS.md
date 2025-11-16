# Environment Variables สำหรับ Vercel Production

คัดลอกทั้งหมดนี้ไปใส่ใน Vercel Dashboard → Settings → Environment Variables

---

## 🗄️ Database (Required)
```bash
DATABASE_URL="postgresql://postgres.ffmofolnfzpcxsektpiw:sS0_ssOMN9QzGg4O60-a@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

---

## 🔐 NextAuth (Required)
```bash
# ⚠️ สร้าง random string ใหม่สำหรับ production (ใช้: openssl rand -base64 32)
NEXTAUTH_SECRET="production-secret-please-change-this-to-random-string"

# URL ของเว็บไซต์
NEXTAUTH_URL="https://intern-tawny.vercel.app"
```

---

## 📱 LINE Messaging API (Required)
```bash
LINE_CHANNEL_ACCESS_TOKEN="uK2DrrOYz1rtC5f52yCEY+ebNZLooSxfyoYzHCHbCwFkxOt7/kKO5iHsgE35e+5+OzJIfhnaNQSt4hVO3gqAObPkHbF7USh0V6SOa1A0Sz17w2aCMlXVFLNfkMoHwIPnXSYxSTU+w6l4yKJcq3xzXQdB04t89/1O/w1cDnyilFU="

# Default group (fallback ถ้าแผนกไม่มี group เฉพาะ)
LINE_DEFAULT_GROUP_ID="Cad0f444d4cb63b528704d8d7c6c03239"
```

---

## 📱 LINE Groups สำหรับแต่ละแผนก (Optional - ถ้าไม่ใส่จะใช้ DEFAULT)

### วิธีหา LINE Group ID:
1. เพิ่ม Bot เข้ากลุ่ม LINE
2. ส่งข้อความอะไรก็ได้ในกลุ่ม
3. ดู webhook logs เพื่อหา Group ID (ขึ้นต้นด้วย 'C')

```bash
# แผนก D1
LINE_GROUP_DB1="ใส่ Group ID ของแผนก D1"

# แผนก D2
LINE_GROUP_DB2="ใส่ Group ID ของแผนก D2"

# แผนก D3
LINE_GROUP_DB3="ใส่ Group ID ของแผนก D3"

# แผนก D4
LINE_GROUP_DB4="ใส่ Group ID ของแผนก D4"

# แผนกนำจ่ายรถยนต์
LINE_GROUP_DB5="ใส่ Group ID ของแผนกนำจ่ายรถยนต์"

# แผนกบริการประชาชน (บป)
LINE_GROUP_DB6="ใส่ Group ID ของแผนกบริการประชาชน"

# แผนกทดสอบ
LINE_GROUP_TEST="Cad0f444d4cb63b528704d8d7c6c03239"
```

---

## ☁️ Supabase Storage (Required - สำหรับเก็บรูปภาพ)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://ffmofolnfzpcxsektpiw.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbW9mb2xuZnpwY3hzZWt0cGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MTg5MzUsImV4cCI6MjA1MTI5NDkzNX0.3kfM_DQakJsG7e7fNEFq9Jlq3Ox7k19YaCE9Nm-WfQs"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbW9mb2xuZnpwY3hzZWt0cGl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTcxODkzNSwiZXhwIjoyMDUxMjk0OTM1fQ.fEI9HFgNZsO_oGNg0oY6rCjEb5kNbMiTr-7tN2WFvP8"
SUPABASE_BUCKET_NAME="helpdesk-images"
```

**⚠️ สำคัญ**: ต้องสร้าง bucket ชื่อ `helpdesk-images` ใน Supabase Storage และเปิด **Public access**

---

## 🔒 Cron Job Security (Optional)
```bash
CRON_SECRET="your-random-secret-key-here"
```

---

## 📝 สรุปจำนวน Environment Variables

### ✅ Required (จำเป็น):
- `DATABASE_URL` - Supabase PostgreSQL
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Website URL
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE API
- `LINE_DEFAULT_GROUP_ID` - LINE default group
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `SUPABASE_BUCKET_NAME` - Storage bucket name

**รวม: 9 ตัว**

### 🔧 Optional (ถ้าต้องการ LINE group แยกแผนก):
- `LINE_GROUP_DB1`
- `LINE_GROUP_DB2`
- `LINE_GROUP_DB3`
- `LINE_GROUP_DB4`
- `LINE_GROUP_DB5`
- `LINE_GROUP_DB6`
- `LINE_GROUP_TEST`
- `CRON_SECRET`

**รวม: 8 ตัว**

---

## 🚀 วิธีใส่ใน Vercel

1. ไปที่ https://vercel.com/dashboard
2. เลือกโปรเจกต์ของคุณ
3. ไปที่ **Settings** → **Environment Variables**
4. คลิก **Add New**
5. ใส่ **Key** และ **Value** ตามด้านบน
6. เลือก **Production**, **Preview**, และ **Development** (ทั้ง 3 อัน)
7. คลิก **Save**
8. ทำซ้ำสำหรับ environment variables ทั้งหมด

---

## ⚙️ หลังจากเพิ่ม Environment Variables แล้ว

1. **Redeploy** โปรเจกต์:
   - ไปที่ Deployments tab
   - คลิก **Redeploy** ที่ deployment ล่าสุด
   - หรือ push commit ใหม่

2. **ตรวจสอบการทำงาน**:
   - ลองสร้าง ticket ใหม่
   - ลองอัพโหลดรูปภาพ (ควรไปที่ Supabase Storage)
   - ตรวจสอบ LINE notifications

3. **Migrate รูปภาพเก่า** (ถ้ามี):
   ```bash
   npm run migrate:images
   ```

---

## 🔍 ตรวจสอบว่าตั้งค่าถูกต้อง

เปิด Vercel Logs และดูว่า:
- ✅ ไม่มี error เกี่ยวกับ Database connection
- ✅ ไม่มี warning "Cloud storage not configured"
- ✅ LINE notifications ส่งได้ปกติ
- ✅ รูปภาพถูก upload ไปที่ Supabase Storage

---

## 📞 ติดปัญหา?

- Check Vercel Logs: Deployments → Latest → View Function Logs
- Check Supabase Logs: Supabase Dashboard → Logs
- Check LINE Webhook: LINE Developers Console → Messaging API → Webhook settings

---

**อัพเดตล่าสุด**: 2025-01-12
