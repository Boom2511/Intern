# Production Testing Checklist - LINE Notifications

## 📋 Pre-deployment Checklist

### ✅ Environment Variables บน Vercel
ตรวจสอบว่าตั้งค่าครบทุกตัวแล้ว:

1. **Database:**
   - `DATABASE_URL` - พร้อม pgbouncer=true และ connection_limit=1

2. **NextAuth:**
   - `NEXTAUTH_URL` - **สำคัญ!** ต้องเป็น `https://your-project.vercel.app`
   - `NEXTAUTH_SECRET` - random secret key

3. **LINE API:**
   - `LINE_CHANNEL_ACCESS_TOKEN` - ✅ คุณมีแล้ว
   - `LINE_DEFAULT_GROUP_ID` - ✅ คุณมีแล้ว: `Cad0f444d4cb63b528704d8d7c6c03239`

4. **Cron (Optional):**
   - `CRON_SECRET` - สำหรับ SLA monitoring

---

## 🧪 Testing Steps

### Step 1: ตรวจสอบ Deployment Status
1. ไปที่ Vercel Dashboard
2. ดู latest deployment - ต้อง Ready (green)
3. เช็ค build logs - ต้องไม่มี errors

### Step 2: ทดสอบ Simple Text Message
```bash
curl https://your-project.vercel.app/api/line/debug-test
```

**Expected Result:**
```json
{
  "success": true,
  "message": "✅ Test message sent! Check your LINE group."
}
```

### Step 3: ทดสอบ Flex Message
```bash
curl -X POST https://your-project.vercel.app/api/line/test-department-flex \
  -H "Content-Type: application/json" \
  -d '{"groupId":"Cad0f444d4cb63b528704d8d7c6c03239"}'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "ส่ง Department Flex Message สำเร็จ!"
}
```

**ต้องเห็นใน LINE:**
- 🔔 Flex Message card สวยงาม
- มีข้อมูล ticket
- มี button "ดู Ticket"

### Step 4: สร้าง Ticket จริงบนเว็บ

1. **เข้าเว็บ:** `https://your-project.vercel.app/tickets/new`

2. **กรอกข้อมูล:**
   - ชื่อผู้รับ: ทดสอบ ระบบ
   - เบอร์โทร: 0812345678
   - ที่อยู่: กรุงเทพฯ
   - ประเภทปัญหา: เลือกอะไรก็ได้
   - **แผนก: เลือก "ทดสอบ" หรือแผนกที่ต้องการ** ⚠️ สำคัญ!
   - รายละเอียด: ทดสอบการแจ้งเตือน

3. **กด Submit**

4. **เช็ค LINE Group:**
   - ต้องได้รับ Flex Message ภายใน 1-2 วินาที
   - มีข้อมูล ticket ครบถ้วน
   - Button "ดู Ticket" กดแล้วเปิดหน้า ticket detail ได้

---

## 🐛 Troubleshooting

### ถ้าไม่ได้รับ notification:

#### 1. เช็ค Vercel Logs
```
Vercel Dashboard → Project → Deployments → Latest → Runtime Logs
```

ดูว่ามี:
- ✅ `LINE message sent successfully to: Cad...`
- ❌ `LINE API Error` - ถ้าเจอต้องแก้

#### 2. เช็ค Console Logs
ดูว่ามีข้อความเหล่านี้:
```
=== LINE Notification Debug ===
LINE configured: true
Ticket department: TEST
Group ID: Cad0f444d4cb63b528704d8d7c6c03239
✅ Sending department assignment notification...
✅ LINE notification sent successfully
```

#### 3. เช็คว่าเงื่อนไขถูกต้อง
Notification จะส่งเมื่อ:
- ✅ สร้าง ticket ใหม่ **และเลือกแผนก**
- ✅ หรืออัพเดท ticket **จากไม่มีแผนก → มีแผนก**

**จะไม่ส่งถ้า:**
- ❌ สร้าง ticket โดยไม่เลือกแผนก
- ❌ Ticket มีแผนกอยู่แล้ว แล้วแก้ไขแผนกเป็นอันอื่น

---

## 📊 Success Criteria

การทดสอบถือว่าสำเร็จเมื่อ:

1. ✅ Simple text message ส่งได้
2. ✅ Flex Message ส่งได้ (จาก test endpoint)
3. ✅ **สร้าง ticket จริงแล้วได้รับ Flex Message ใน LINE**
4. ✅ กด button "ดู Ticket" แล้วเปิดหน้า ticket detail ได้
5. ✅ ข้อมูลใน notification ครบถ้วนถูกต้อง

---

## 🎯 Expected Behavior

เมื่อสร้าง ticket ใหม่พร้อมเลือกแผนก:

1. **Backend logs (Vercel):**
   ```
   === LINE Notification Debug ===
   LINE configured: true
   Ticket department: TEST
   Body department: TEST
   Existing ticket department: null
   Group ID: Cad0f444d4cb63b528704d8d7c6c03239
   ✅ Sending department assignment notification...
   ✅ LINE notification sent successfully
   📤 Response: {"sentMessages":[{"id":"..."}]}
   ```

2. **LINE Group receives:**
   - Flex Message card
   - Ticket number: TK-20250110-XXXX
   - Department: ทดสอบ (หรือแผนกที่เลือก)
   - Customer info
   - Problem description
   - Button: "📋 ดู Ticket"

3. **Click button opens:**
   - Ticket detail page
   - URL: `https://your-app.vercel.app/tickets/{id}?mode=client`

---

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- LINE Developers Console: https://developers.line.biz/console/
- Debug endpoint: `https://your-app.vercel.app/api/line/debug-test`
- Test Flex endpoint: `https://your-app.vercel.app/api/line/test-department-flex`
- Create ticket: `https://your-app.vercel.app/tickets/new`

---

## 📝 Notes

- ตรวจสอบว่า bot อยู่ใน LINE group แล้ว
- Group ID ต้องถูกต้อง: `Cad0f444d4cb63b528704d8d7c6c03239`
- ต้องเลือกแผนกตอนสร้าง ticket
- Notification จะส่งทันทีที่สร้าง ticket สำเร็จ
