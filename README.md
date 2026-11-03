# 🎫 Help Desk System - ไปรษณีย์ไทย

ระบบจัดการ Ticket สำหรับไปรษณีย์ไทย พัฒนาด้วย Next.js 14, TypeScript, Prisma และ Tailwind CSS

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-brightgreen)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

> ✅ **Production Ready** - เชื่อมต่อ Supabase และพร้อม Deploy บน Vercel

## คุณสมบัติหลัก

### 🎫 จัดการ Tickets
- สร้าง Ticket ใหม่พร้อมข้อมูลลูกค้า
- ค้นหาลูกค้าเดิมด้วยเบอร์โทรศัพท์
- เลขที่ Ticket สร้างอัตโนมัติ (รูปแบบ: TH-YYYYMMDD-XXXX)
- แจ้งเตือนถ้าลูกค้ามี Ticket ที่ยังไม่ปิด
- กรอง Tickets ตามสถานะและความสำคัญ
- ค้นหาด้วย Ticket No, ชื่อลูกค้า, เบอร์โทร

### 👤 จัดการลูกค้า
- บันทึกข้อมูลลูกค้าอัตโนมัติ
- ดู Tickets ทั้งหมดของลูกค้า
- ป้องกันการสร้างลูกค้าซ้ำ

### 📊 Dashboard และรายงาน
- สถิติ Tickets แยกตามสถานะ
- แสดง Tickets ล่าสุด
- ภาพรวมการทำงาน

### 📝 บันทึกและติดตาม
- เพิ่มบันทึกและความคิดเห็น
- Timeline แสดงประวัติการทำงาน
- อัปเดตสถานะ Ticket

### 🗺️ Organization แบบ Zone ID hierarchy
- ใช้ `ZONE_ID` เป็นตัวระบุหลักและสร้างลำดับชั้นจาก prefix โดยไม่ใช้ `NAME` หรือ `EMPLOYEE_ID`
- รองรับ Region (`REG`), Zone (`ZNE`) และพื้นที่นำจ่าย (`EMS`/`CAR`)
- แยกแสดง Zone ตามแผนก เพิ่ม แก้ไข และลบ Zone ผ่านหน้าเว็บ
- จัด hierarchy ด้วยการลากวาง Zone ID พร้อมยุบ/ขยายแต่ละระดับ
- เลือก Direct manager ของพนักงานด้วย `ZONE_ID`
- ข้อมูลพนักงานและสายรายงานเดิมแสดงแยกจาก Direct manager ที่อ้างอิง `ZONE_ID`

## เทคโนโลยีที่ใช้

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Icons:** Lucide React
- **Date Handling:** date-fns

## การติดตั้ง

### 1. Clone โปรเจค

```bash
cd helpdesk-thailand
```

### ฐานข้อมูลสำหรับพัฒนาในเครื่อง

การรันแอปในโหมด development ใช้ฐานข้อมูล PostgreSQL ในเครื่องชื่อ `helpdesk_local` เท่านั้น
ก่อนเริ่ม ให้คัดลอก `.env.local.example` เป็น `.env.local` ค่าในไฟล์นี้จะไม่แก้ไข `.env` หรือฐานข้อมูล production

1. เปิดใช้งาน Docker Desktop โดยต้องเปิด virtualization และ WSL 2
2. เริ่ม PostgreSQL สำหรับทดสอบ:

   ```bash
   npm run db:local:up
   ```

3. สร้าง schema จาก Prisma:

   ```bash
   npm run db:local:push
   ```

4. สร้างบัญชีผู้ใช้ทดสอบในฐานข้อมูล local:

   ```bash
   npm run db:local:seed
   ```

5. ตรวจการเชื่อมต่อและจำนวนข้อมูล (ไม่แสดงรหัสผ่าน):

   ```bash
   npm run db:local:status
   ```

6. รันแอปตามปกติด้วย `npm run dev`
7. เมื่อหยุดใช้งาน ให้หยุด container ด้วย `npm run db:local:down` (ข้อมูลใน volume จะยังอยู่)

คำสั่ง `db:local:push`, `db:local:seed` และ `db:local:status` ตรวจสอบ host และชื่อฐานข้อมูลก่อนทำงาน และจะปฏิเสธ URL ที่ไม่ใช่ localhost หรือไม่ใช่ `helpdesk_local`

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่าฐานข้อมูล

สร้างไฟล์ `.env.local` และแก้ไข DATABASE_URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

### 4. สร้าง Database Schema

```bash
npx prisma generate
npx prisma db push
```

### 5. (Optional) Seed ข้อมูลทดสอบ

```bash
npx prisma db seed
```

### 6. รันเซิร์ฟเวอร์

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่: [http://localhost:3000](http://localhost:3000)

## โครงสร้างโปรเจค

```
helpdesk-thailand/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── tickets/        # Ticket endpoints
│   │   └── customers/      # Customer endpoints
│   ├── dashboard/          # Dashboard page
│   ├── tickets/            # Ticket pages
│   │   ├── new/           # Create ticket
│   │   └── [id]/          # Ticket detail
│   ├── layout.tsx
│   └── page.tsx
├── components/              # React Components
│   ├── tickets/            # Ticket-related components
│   │   ├── TicketForm.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── CustomerSearch.tsx
│   │   └── StatusBadge.tsx
│   ├── ui/                 # UI components
│   └── Navbar.tsx
├── lib/                     # Utilities
│   ├── prisma.ts           # Prisma client
│   ├── utils.ts            # Helper functions
│   └── validations.ts      # Validation logic
├── prisma/                  # Database
│   ├── schema.prisma       # Schema definition
│   └── seed.ts             # Seed data
├── types/                   # TypeScript types
│   └── index.ts
└── .env.local              # Environment variables
```

## API Endpoints

### Tickets

- `GET /api/tickets` - รายการ Tickets (รองรับ filters)
- `POST /api/tickets` - สร้าง Ticket ใหม่
- `GET /api/tickets/[id]` - รายละเอียด Ticket
- `PATCH /api/tickets/[id]` - อัปเดต Ticket
- `DELETE /api/tickets/[id]` - ลบ Ticket

### Customers

- `GET /api/customers/search?phone=xxx` - ค้นหาลูกค้าด้วยเบอร์โทร

## Database Schema

### Customer
- ข้อมูลลูกค้า (ชื่อ, เบอร์โทร, อีเมล)
- Relation: มีหลาย Tickets

### Ticket
- ข้อมูล Ticket (เลขที่, หัวข้อ, รายละเอียด, สถานะ, ความสำคัญ)
- Relation: ของลูกค้า 1 คน, มีหลาย Notes

### Note
- บันทึกและความคิดเห็น
- Relation: ของ Ticket 1 อัน

## สถานะ Ticket (TicketStatus)

- `NEW` - ใหม่
- `IN_PROGRESS` - กำลังดำเนินการ
- `PENDING` - รอดำเนินการ
- `RESOLVED` - แก้ไขแล้ว
- `CLOSED` - ปิด

## ระดับความสำคัญ (Priority)

- `LOW` - ต่ำ
- `MEDIUM` - ปานกลาง
- `HIGH` - สูง
- `URGENT` - เร่งด่วน

## คำสั่งที่มีประโยชน์

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Prisma Studio (Database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Create migration
npx prisma migrate dev

# Seed database
npx prisma db seed

# Lint
npm run lint
```

## การพัฒนาต่อ

### TODO List

- [ ] เชื่อมต่อฐานข้อมูล PostgreSQL
- [ ] ติดตั้ง dependencies: `npm install`
- [ ] รัน Prisma migrations: `npx prisma db push`
- [ ] ทดสอบระบบด้วยข้อมูล seed
- [ ] เพิ่ม Authentication (NextAuth.js)
- [ ] เพิ่มระบบอัพโหลดไฟล์แนบ
- [ ] เพิ่มการแจ้งเตือนทาง Email
- [ ] เพิ่ม Export รายงาน (PDF, Excel)
- [ ] เพิ่ม Real-time updates (WebSocket)
- [ ] เพิ่มระบบค้นหาขั้นสูง
- [ ] เพิ่ม Mobile responsive improvements
- [ ] Unit tests และ Integration tests

### Features ที่อาจเพิ่มในอนาคต

- 📧 ระบบแจ้งเตือนทาง Email
- 📱 Responsive design ที่ดีขึ้น
- 🔔 Real-time notifications
- 📎 Upload ไฟล์แนบใน Ticket
- 📊 รายงานขั้นสูง (Export PDF/Excel)
- 🔍 ค้นหาขั้นสูงด้วย Full-text search
- 👥 ระบบจัดการผู้ใช้และสิทธิ์
- 🏷️ Tags และ Categories
- ⏱️ SLA tracking
- 💬 Chat แบบ real-time

## License

This project is private and proprietary.

## ผู้พัฒนา

พัฒนาสำหรับไปรษณีย์ไทย
