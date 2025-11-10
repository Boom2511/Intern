# แก้ปัญหา Prisma Connection Pool Timeout บน Vercel

## ปัญหาที่เกิดขึ้น
```
Timed out fetching a new connection from the connection pool.
More info: http://pris.ly/d/connection-pool
(Current connection pool timeout: 10, connection limit: 1)
```

## สาเหตุ
ใน Serverless environment (Vercel), แต่ละ request จะสร้าง function instance ใหม่ และพยายามเชื่อมต่อ database พร้อมกัน หาก connection limit ต่ำเกินไป (เช่น 1) จะเกิด connection timeout

## วิธีแก้

### 1. ตรวจสอบ DATABASE_URL บน Vercel

ไปที่ **Vercel Dashboard** → **Project Settings** → **Environment Variables**

ตรวจสอบว่า `DATABASE_URL` มีค่าตามนี้:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true&connection_limit=1
```

**สำคัญ:**
- ✅ ใช้ `pgbouncer=true` เสมอสำหรับ serverless
- ✅ `connection_limit=1` เหมาะสำหรับ Vercel (serverless)

### 2. ตรวจสอบ NEXTAUTH_URL

ต้องตั้งค่า `NEXTAUTH_URL` บน Vercel ให้ถูกต้อง:

```
NEXTAUTH_URL=https://your-app-name.vercel.app
```

**หมายเหตุ:** อย่าลืมเปลี่ยน `your-app-name` เป็นชื่อโปรเจกต์จริงของคุณ

### 3. ตั้งค่า Environment Variables อื่นๆ บน Vercel

ตรวจสอบว่าได้ตั้งค่าครบทุกตัว:

- `DATABASE_URL` - connection string จาก Supabase
- `NEXTAUTH_SECRET` - random secret key
- `NEXTAUTH_URL` - URL ของแอพบน Vercel
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE access token
- `LINE_DEFAULT_GROUP_ID` - LINE group ID
- `CRON_SECRET` - secret สำหรับ cron jobs

### 4. Redeploy

หลังจากตั้งค่า environment variables แล้ว:

1. ไปที่ **Deployments**
2. กด **...** (three dots) ที่ deployment ล่าสุด
3. เลือก **Redeploy**
4. เลือก **Use existing Build Cache** (unchecked)
5. กด **Redeploy**

## การตรวจสอบว่าแก้สำเร็จ

1. เปิด Vercel logs (Runtime Logs)
2. ลองเข้าแอพและสร้าง ticket
3. ต้องไม่เห็น error `Timed out fetching a new connection`

## Tips เพิ่มเติม

### ถ้ายังมีปัญหา Connection Pool

ลอง**เพิ่ม Connection Limit** ใน Supabase:

1. ไปที่ Supabase Dashboard
2. Settings → Database
3. เพิ่ม Max connections (แนะนำ 20-30 สำหรับ free tier)

### ถ้า Database ช้า

ลองใช้ Direct Connection สำหรับ development:

```env
# Local development - ใช้ direct connection (เร็วกว่า)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Production (Vercel) - ใช้ pgBouncer
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true&connection_limit=1"
```

## เอกสารอ้างอิง

- [Prisma Connection Pool](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
