# คู่มือการติดตั้ง LINE LIFF

คู่มือนี้จะแนะนำวิธีการสร้างและตั้งค่า LINE LIFF (LINE Front-end Framework) สำหรับระบบ PostServe Help Desk

## 📋 สิ่งที่ต้องเตรียม

1. ✅ LINE Official Account (มีอยู่แล้ว)
2. ✅ LINE Developers Console Access
3. ✅ Channel Access Token (มีอยู่แล้ว)
4. 🆕 LIFF App ที่จะสร้างใหม่

---

## 🚀 ขั้นตอนการสร้าง LIFF App

### ขั้นตอนที่ 1: เข้า LINE Developers Console

1. เข้า [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Provider ที่มี PostServe Bot อยู่
3. เลือก Messaging API Channel ของ PostServe

### ขั้นตอนที่ 2: สร้าง LIFF App

1. ใน Channel นั้น ไปที่แท็บ **"LIFF"**
2. กดปุ่ม **"Add"** เพื่อสร้าง LIFF App ใหม่

### ขั้นตอนที่ 3: กรอกข้อมูล LIFF App

กรอกข้อมูลดังนี้:

| Field | Value | คำอธิบาย |
|-------|-------|----------|
| **LIFF app name** | `PostServe Ticket Viewer` | ชื่อ LIFF app (ใช้ภายใน) |
| **Size** | `Full` | ขนาดหน้าจอ (เลือก Full เพื่อใช้เต็มจอ) |
| **Endpoint URL** | `https://your-domain.com/liff/tickets` | URL ของ LIFF app (แก้ตาม domain จริง) |
| **Scope** | ☑ `profile`<br>☑ `openid` | ขอสิทธิ์ดูข้อมูล profile ผู้ใช้ |
| **Bot link feature** | `On (Normal)` | เปิดใช้งาน (แนะนำ) |
| **Scan QR** | `Off` | ปิด (ไม่ใช้ในระบบนี้) |
| **Module mode** | `Off` | ปิด |

**ตัวอย่าง Endpoint URL:**
```
Production:  https://postserve.yourdomain.com/liff/tickets
Development: https://your-ngrok-url.ngrok.io/liff/tickets
```

### ขั้นตอนที่ 4: บันทึกและคัดลอก LIFF ID

1. กดปุ่ม **"Add"** เพื่อสร้าง LIFF App
2. หลังจากสร้างเสร็จ จะเห็น **LIFF ID** (รูปแบบ: `1234567890-abcdefgh`)
3. **คัดลอก LIFF ID** นี้ไว้

---

## ⚙️ ขั้นตอนการตั้งค่าในโปรเจค

### 1. เพิ่ม LIFF ID ใน Environment Variables

แก้ไขไฟล์ `.env.local`:

```bash
# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LINE_DEFAULT_GROUP_ID=your_default_group_id

# LIFF Configuration (เพิ่มใหม่)
NEXT_PUBLIC_LIFF_ID=1234567890-abcdefgh

# Base URL (สำหรับ fallback)
NEXT_PUBLIC_BASE_URL=https://postserve.yourdomain.com
```

**⚠️ สำคัญ:** `NEXT_PUBLIC_LIFF_ID` ต้องมี prefix `NEXT_PUBLIC_` เพื่อให้ใช้ใน client-side ได้

### 2. Run Database Migration

```bash
# Generate Prisma client (อัพเดต schema)
npx prisma generate

# Run migration (เมื่อ database เชื่อมต่อได้)
npx prisma migrate deploy
```

Migration จะเพิ่มฟิลด์ใหม่ใน `StatusHistory` table:
- `changedByLineUserId` - LINE User ID
- `changedByLineName` - ชื่อจาก LINE profile
- `changedByLineAvatar` - รูปโปรไฟล์ LINE

### 3. Restart Development Server

```bash
npm run dev
```

---

## 🧪 ขั้นตอนการทดสอบ LIFF

### 1. ทดสอบบน Desktop (LINE Desktop App)

1. เปิด LINE Desktop App
2. เข้ากลุ่มที่มี PostServe Bot
3. สร้าง ticket ใหม่ผ่าน web (หรือใช้ test endpoint)
4. รอรับข้อความแจ้งเตือนใน LINE
5. กดปุ่ม "เริ่มดำเนินการ"
6. ควรเห็นหน้า LIFF เปิดขึ้นมา

### 2. ทดสอบบน Mobile (LINE Mobile App)

1. เปิด LINE Mobile App
2. เข้ากลุ่มที่มี PostServe Bot
3. กดปุ่มในข้อความที่ Bot ส่งมา
4. LIFF จะเปิดแบบ Full Screen
5. ทดสอบกดปุ่ม "รับงาน" / "แก้ไขเสร็จแล้ว"

### 3. ตรวจสอบ Status History

```sql
-- ดู status history ที่อัพเดตจาก LIFF
SELECT
  t.ticketNo,
  sh.fromStatus,
  sh.toStatus,
  sh.changedBy,
  sh.changedByLineName,
  sh.createdAt
FROM "StatusHistory" sh
JOIN "Ticket" t ON sh."ticketId" = t.id
WHERE sh."changedByLineUserId" IS NOT NULL
ORDER BY sh."createdAt" DESC
LIMIT 10;
```

---

## 🔍 Troubleshooting

### ปัญหา 1: LIFF ไม่เปิด / หน้าจอขาว

**สาเหตุ:**
- LIFF ID ไม่ถูกต้อง
- Endpoint URL ไม่ตรงกับ path ที่ตั้งไว้
- ยังไม่ restart development server หลังแก้ `.env.local`

**วิธีแก้:**
```bash
# 1. เช็ค LIFF ID ใน .env.local
cat .env.local | grep LIFF

# 2. Restart dev server
npm run dev

# 3. เช็ค console log ใน browser DevTools
# เปิด LIFF → F12 → Console → ดู error
```

### ปัญหา 2: "Unauthorized" เมื่อกดปุ่มอัพเดต

**สาเหตุ:**
- LINE profile ไม่สามารถดึงได้
- LIFF ไม่ได้ login

**วิธีแก้:**
```javascript
// เช็คใน browser console
liff.isLoggedIn() // ควรเป็น true
liff.getProfile() // ควรได้ userId, displayName
```

### ปัญหา 3: ข้อความ "LIFF ID is not configured"

**สาเหตุ:**
- ไม่ได้ตั้งค่า `NEXT_PUBLIC_LIFF_ID` ใน `.env.local`
- ตั้งชื่อตัวแปรผิด (ต้องมี `NEXT_PUBLIC_`)

**วิธีแก้:**
```bash
# ตรวจสอบ
echo $NEXT_PUBLIC_LIFF_ID

# หรือใน Next.js
console.log(process.env.NEXT_PUBLIC_LIFF_ID)
```

### ปัญหา 4: LIFF ใช้ได้บน Desktop แต่ไม่ได้บน Mobile

**สาเหตุ:**
- Endpoint URL ใช้ localhost หรือ http://
- Mobile ต้องใช้ HTTPS เท่านั้น

**วิธีแก้:**
```bash
# Development: ใช้ ngrok
ngrok http 3000

# ได้ URL: https://abc123.ngrok.io
# แก้ Endpoint URL ใน LIFF Console เป็น: https://abc123.ngrok.io/liff/tickets
```

---

## 📊 ตรวจสอบการทำงาน

### 1. ดู Logs ใน Server

```bash
# Terminal จะแสดง log เมื่อมีการอัพเดตผ่าน LIFF
[LIFF] Ticket TH-20250108-0001 status updated: NEW → IN_PROGRESS by LINE user สมชาย
```

### 2. ดู Network Requests (Browser DevTools)

1. เปิด LIFF ใน LINE
2. กด F12 → Network tab
3. กดปุ่ม "รับงาน"
4. ดู request ไปที่ `/api/liff/tickets/[id]/status`
5. Response ควรเป็น `{ success: true }`

---

## 🎯 Features ที่ทำงานแล้ว

| Feature | Status | Description |
|---------|--------|-------------|
| ✅ View Ticket | ทำงาน | ดูรายละเอียด ticket ผ่าน LIFF |
| ✅ Update Status | ทำงาน | อัพเดตสถานะจาก NEW → IN_PROGRESS → RESOLVED |
| ✅ LINE Profile | ทำงาน | บันทึกชื่อและรูปจาก LINE |
| ✅ Status History | ทำงาน | บันทึกประวัติการเปลี่ยนสถานะ |
| ✅ Mobile Responsive | ทำงาน | UI ปรับตามหน้าจอ mobile |
| ❌ Send Message Back | ไม่ทำ | ไม่ส่งข้อความกลับกลุ่ม (ประหยัด quota) |

---

## 🔐 Security Notes

### 1. LIFF Endpoint เป็น Public
- ใครก็เข้าได้ถ้ามี URL (`/liff/tickets/[id]`)
- แต่ต้อง Login ด้วย LINE ก่อน (LIFF SDK บังคับ)
- ระบบเก็บ LINE userId ไว้ใน database

### 2. การยืนยันตัวตน
- ไม่ได้ตรวจสอบว่า LINE userId ตรงกับพนักงานคนไหน
- แนะนำ: เพิ่ม whitelist LINE userId ในภายหลัง

```typescript
// ตัวอย่าง: ตรวจสอบ whitelist
const allowedUsers = ['U1234567890abcdef', 'U0987654321zyxwvu'];
if (!allowedUsers.includes(lineUserId)) {
  return { error: 'Unauthorized' };
}
```

---

## 📝 Next Steps (Optional)

### 1. เพิ่ม Whitelist LINE Users
- สร้าง table `AllowedLineUsers`
- เก็บ LINE userId ของพนักงานที่อนุญาต
- ตรวจสอบก่อนอนุญาตให้อัพเดต

### 2. เพิ่ม Rich Menu
- สร้าง Rich Menu สำหรับพนักงาน
- มีปุ่ม "ดู Tickets ของฉัน"
- ใช้ LIFF เปิดหน้ารายการ tickets

### 3. เพิ่ม Notification กลับ (Optional)
- หากต้องการส่ง message กลับกลุ่มเมื่ออัพเดต
- แก้ไข `/api/liff/tickets/[id]/status/route.ts`
- เพิ่มโค้ดส่ง LINE message หลัง update ticket

```typescript
// ตัวอย่าง: ส่ง message กลับกลุ่ม
import { lineService } from '@/lib/line';

// หลัง update ticket
await lineService.sendTextMessage(
  groupId,
  `✅ ${lineName} รับงาน ${ticket.ticketNo} แล้ว`
);
```

---

## 📚 References

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [LIFF API Reference](https://developers.line.biz/en/reference/liff/)
- [@line/liff SDK](https://www.npmjs.com/package/@line/liff)

---

## ✅ Checklist การติดตั้ง

- [ ] สร้าง LIFF App ใน LINE Developers Console
- [ ] คัดลอก LIFF ID
- [ ] เพิ่ม `NEXT_PUBLIC_LIFF_ID` ใน `.env.local`
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate deploy` (production)
- [ ] Restart development server
- [ ] ทดสอบสร้าง ticket ใหม่
- [ ] ทดสอบเปิด LIFF จาก LINE
- [ ] ทดสอบกดปุ่ม "รับงาน"
- [ ] ตรวจสอบ status history ใน database

---

**🎉 เสร็จสมบูรณ์!** ระบบ LIFF พร้อมใช้งานแล้ว
