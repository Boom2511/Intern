# 📋 คำแนะนำการ Migrate ข้อมูลเบอร์โทรศัพท์

## ปัญหาที่แก้ไข
ข้อมูล `recipientPhone` ในตาราง Ticket เก่ามีการเก็บไม่สม่ำเสมอ:
- บางรายการเป็น formatted format: `081 234 5678`
- บางรายการเป็น E.164 format: `+66812345678`

การแก้ไขนี้จะทำให้ทุกรายการเป็น E.164 format เหมือนกันทั้งหมด

---

## วิธีการรัน Migration

### ขั้นตอนที่ 1: เปิด Terminal/Command Prompt
ใช้ Terminal ปกติ (ไม่ใช่ PowerShell ของ IDE)

### ขั้นตอนที่ 2: ไปที่ folder โปรเจค
```bash
cd C:\Users\Admin\Downloads\Intern
```

### ขั้นตอนที่ 3: รัน Migration Script
```bash
npx tsx scripts/migrate-recipient-phones-to-e164.ts
```

หรือถ้าใช้ yarn:
```bash
yarn tsx scripts/migrate-recipient-phones-to-e164.ts
```

---

## ผลลัพธ์ที่คาดหวัง

Script จะแสดงผลลัพธ์คล้ายๆ แบบนี้:

```
🔄 Starting migration of recipientPhone to E.164 format...

📊 Found 150 tickets to process

✅ abc123: 081 234 5678 → +66812345678
✅ def456: 02 345 6789 → +6623456789
⏭️  ghi789: Already in E.164 format (skipped)
...

📈 Migration Summary:
   ✅ Successfully converted: 120
   ⏭️  Already E.164 (skipped): 25
   ❌ Failed to convert: 5
   📊 Total processed: 150

✨ Migration completed!
```

---

## หมายเหตุสำคัญ

### ⚠️ ก่อนรัน Migration:
- ✅ **Backup database** ก่อนรัน (แม้ว่าจะปลอดภัย แต่ควรระวังเสมอ)
- ✅ ปิด application ที่กำลังรันอยู่
- ✅ ตรวจสอบว่ามี internet connection (สำหรับ parse เบอร์โทร)

### 📊 หลังรัน Migration:
- ทุก `recipientPhone` ในตาราง Ticket จะเป็น **+66XXXXXXXXX**
- Reports (preview และ Excel) จะแสดงเบอร์โทรแบบสม่ำเสมอ
- ไม่กระทบกับข้อมูลอื่นๆ ในระบบ

---

## การตรวจสอบผลลัพธ์

### ตรวจสอบใน Database:
```sql
-- ตรวจสอบว่ายังมีเบอร์โทรที่ไม่ใช่ E.164 หรือไม่
SELECT COUNT(*) as non_e164_count
FROM "Ticket"
WHERE "recipientPhone" NOT LIKE '+66%';

-- ดูตัวอย่างข้อมูลที่แปลงแล้ว
SELECT "ticketNo", "recipientPhone"
FROM "Ticket"
LIMIT 10;
```

---

## Rollback (กรณีเกิดปัญหา)

ถ้าต้องการ rollback ให้ restore จาก backup database ที่ทำไว้

---

## สรุปการแก้ไขทั้งหมด

การแก้ไขครั้งนี้ประกอบด้วย:

1. ✅ **TicketForm.tsx** - แปลง recipientPhone เป็น E.164 ก่อนสร้าง ticket ใหม่
2. ✅ **TicketDetail.tsx** - แปลง recipientPhone เป็น E.164 ก่อน update (มีอยู่แล้ว)
3. ✅ **Reports** - แสดงเบอร์โทรเป็น E.164 format
4. ✅ **Migration Script** - แปลงข้อมูลเก่าให้เป็น E.164

---

## ติดต่อ

หากมีปัญหาในการรัน migration กรุณาแจ้งทีมพัฒนา
