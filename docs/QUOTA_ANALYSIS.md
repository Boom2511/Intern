# LINE API Quota Analysis

## ข้อมูลจาก LINE Developers Console

### วันที่ 24 พฤศจิกายน 2025

**สถานการณ์:**
- เริ่มต้น: 64/300 quota used
- ทำการทดสอบ: สร้าง 1 ticket → ส่งไปทดสอบ 6 กลุ่ม
- ผลลัพธ์: **234 Paid Messages** ถูกส่งออกไป
- **Total messages วันนั้น: 2,305 messages!**

### การคำนวณ

```
234 messages / 6 กลุ่ม = 39 messages ต่อกลุ่ม
39 messages / 1 ticket = 39 attempts ต่อ ticket!
```

**นี่ไม่ปกติ!** ปกติควรเป็น:
- 1 ticket → 1 notification per group
- ถ้า fail + retry 4 times = สูงสุด 5 messages per group
- **ไม่ใช่ 39!**

## 🚨 สาเหตุที่เป็นไปได้

### 1. Retry Loop Bug (โอกาสสูง 80%)

มี retry loop ที่ทำให้:
- Backend retry exponentially
- Frontend retry on top
- Rate limiter retry
= Compound retries!

**Evidence:**
- Max retries ในโค้ด = 4
- แต่ส่งจริง = 39 attempts
- **39 >> 4** = มี retry loop!

### 2. Duplicate Submission (โอกาส 15%)

Frontend อาจ submit ticket หลายครั้ง:
- Double-click submit button
- Browser back/forward
- Network timeout + retry

### 3. Old Code Before Fix (โอกาส 5%)

การทดสอบเกิดวันที่ 24 พฤศจิกายน
- ตอนนั้นยังไม่มี quota detection
- ยังไม่มี emergency kill switch
- Retry logic อาจมี bug

## 📊 Usage Pattern Analysis

| Date       | Total Messages | Paid Messages | Pattern |
|------------|----------------|---------------|---------|
| 11/26/2025 | 1,470          | 0             | Normal  |
| 11/25/2025 | 1,384          | 0             | Normal  |
| **11/24/2025** | **2,305**  | **234**       | **🚨 Spike!** |
| 11/23/2025 | 1,011          | 2             | Normal  |
| 11/22/2025 | 1,139          | 4             | Normal  |

**Paid Messages โดยปกติ: 0-8 per day**
**Paid Messages วันที่ 24: 234 = เพิ่มขึ้น 30x!**

## 💡 สิ่งที่ต้องทำ

### 1. ตรวจสอบ Database

```sql
-- ดู tickets ที่สร้างวันที่ 24 พ.ย.
SELECT * FROM tickets
WHERE DATE(createdAt) = '2024-11-24'
ORDER BY createdAt;

-- ดูว่ามี duplicate หรือไม่
SELECT ticketNo, COUNT(*) as count
FROM tickets
WHERE DATE(createdAt) = '2024-11-24'
GROUP BY ticketNo
HAVING count > 1;
```

### 2. ตรวจสอบ Vercel Logs (วันที่ 24 พ.ย.)

ค้นหา:
- `POST /api/tickets` - มีกี่ครั้ง?
- `"API Request"` - มี request IDs ซ้ำหรือไม่?
- `"API Retry"` - มี retry เกินปกติหรือไม่?

### 3. Root Cause

**ถ้าเจอ:**
- Database มี tickets ซ้ำ → Frontend duplicate submission
- Logs มี request IDs เดียวกัน retry 39 ครั้ง → Backend retry loop
- Logs มี request IDs ต่างกัน → Frontend polling/retry

## 🛠️ แก้ไขที่ทำไปแล้ว

✅ เพิ่ม quota detection (fail fast)
✅ เพิ่ม emergency kill switch
✅ แก้ retry logic ให้ถูกต้อง
✅ เพิ่ม notification status ใน response
✅ Fix logging ให้ accurate

## 📈 Expected vs Actual

### ถ้าทำงานปกติ:

```
1 ticket × 6 groups = 6 notifications
6 × 4 retries (worst case) = 24 messages
```

### ที่เกิดจริง:

```
234 messages!
234 / 24 = 9.75x มากกว่าที่คาดหวัง
```

**Conclusion:** มี bug ที่ทำให้ retry/resend มากกว่าปกติ ~10 เท่า!

## 🎯 Next Steps

1. ตรวจสอบ database หา tickets วันที่ 24 พ.ย.
2. ตรวจสอบ Vercel logs วันที่ 24 พ.ย.
3. Reproduce bug ใน staging (ถ้าหาสาเหตุเจอ)
4. Fix และ test
5. Deploy fix
6. Monitor quota usage

## 📝 Notes

- ปัญหานี้เกิด**ก่อน**ที่จะมี fixes ล่าสุด
- Code ใหม่ที่ deploy ไปแล้วควรป้องกันปัญหานี้แล้ว
- แต่ควร verify ด้วยการ test อีกครั้ง (พอ quota reset)

---

**Created:** 2025-11-27
**Status:** Under Investigation
