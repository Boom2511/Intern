# โครงสร้างโปรเจค Help Desk System

## 📁 โครงสร้างไฟล์ทั้งหมด

```
helpdesk-thailand/
│
├── 📂 app/                           # Next.js App Router (Pages & Routing)
│   ├── 📂 api/                      # API Routes (Backend)
│   │   ├── 📂 tickets/
│   │   │   ├── route.ts            # GET /api/tickets, POST /api/tickets
│   │   │   └── 📂 [id]/
│   │   │       └── route.ts        # GET/PATCH/DELETE /api/tickets/:id
│   │   └── 📂 customers/
│   │       └── 📂 search/
│   │           └── route.ts        # GET /api/customers/search?phone=xxx
│   │
│   ├── 📂 tickets/                  # Ticket Pages
│   │   ├── page.tsx                # /tickets - รายการ tickets
│   │   ├── 📂 new/
│   │   │   └── page.tsx            # /tickets/new - สร้าง ticket
│   │   └── 📂 [id]/
│   │       └── page.tsx            # /tickets/:id - รายละเอียด ticket
│   │
│   ├── 📂 dashboard/
│   │   └── page.tsx                # /dashboard - Dashboard หน้าแรก
│   │
│   ├── layout.tsx                  # Root Layout (Navbar, global styles)
│   ├── page.tsx                    # / - หน้าแรก (Home/Landing)
│   └── globals.css                 # Global CSS styles
│
├── 📂 components/                   # React Components
│   ├── 📂 tickets/                 # Ticket-related components
│   │   ├── TicketForm.tsx         # ฟอร์มสร้าง/แก้ไข ticket
│   │   ├── TicketList.tsx         # รายการ tickets + filter/search
│   │   ├── TicketCard.tsx         # การ์ด ticket แต่ละอัน
│   │   ├── TicketDetail.tsx       # หน้ารายละเอียด ticket
│   │   ├── CustomerSearch.tsx     # ค้นหาลูกค้าด้วยเบอร์โทร
│   │   └── StatusBadge.tsx        # แสดง badge สถานะ
│   │
│   ├── 📂 ui/                      # Reusable UI Components
│   │   ├── button.tsx             # ปุ่ม
│   │   ├── card.tsx               # การ์ด container
│   │   ├── input.tsx              # Input field
│   │   ├── select.tsx             # Dropdown select (Radix UI)
│   │   ├── dialog.tsx             # Modal dialog (Radix UI)
│   │   └── badge.tsx              # Badge/label
│   │
│   └── Navbar.tsx                  # Navigation bar
│
├── 📂 lib/                          # Library & Utilities
│   ├── prisma.ts                   # Prisma Client instance (singleton)
│   ├── utils.ts                    # Helper functions (format, validate, etc.)
│   └── validations.ts              # Form validation logic
│
├── 📂 prisma/                       # Database (Prisma ORM)
│   ├── schema.prisma               # Database schema definition
│   └── seed.ts                     # Seed data for testing
│
├── 📂 types/                        # TypeScript Type Definitions
│   └── index.ts                    # All TypeScript interfaces/types
│
├── 📄 .env.example                  # Environment variables template
├── 📄 .env.local                    # Environment variables (local, gitignored)
├── 📄 .eslintrc.json               # ESLint configuration
├── 📄 .gitignore                   # Git ignore rules
├── 📄 next.config.js               # Next.js configuration
├── 📄 next-env.d.ts                # Next.js TypeScript declarations
├── 📄 package.json                 # NPM dependencies & scripts
├── 📄 postcss.config.mjs           # PostCSS configuration
├── 📄 tailwind.config.ts           # Tailwind CSS configuration
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 README.md                    # Project documentation
├── 📄 SETUP_GUIDE.md               # Installation guide
└── 📄 PROJECT_STRUCTURE.md         # This file
```

## 📋 รายละเอียดแต่ละโฟลเดอร์

### 📂 app/ - Application Routes

**App Router ของ Next.js 14** ใช้โครงสร้างไฟล์เป็นตัวกำหนด routing

#### API Routes (`app/api/`)
- **tickets/route.ts**: จัดการ GET (list) และ POST (create) tickets
- **tickets/[id]/route.ts**: จัดการ GET (detail), PATCH (update), DELETE
- **customers/search/route.ts**: ค้นหาลูกค้าจากเบอร์โทร

#### Pages (`app/`)
- **page.tsx**: หน้าแรก (landing page)
- **dashboard/page.tsx**: Dashboard แสดงสถิติ
- **tickets/page.tsx**: รายการ tickets ทั้งหมด
- **tickets/new/page.tsx**: ฟอร์มสร้าง ticket ใหม่
- **tickets/[id]/page.tsx**: รายละเอียด ticket

#### Layout
- **layout.tsx**: Layout หลักของแอพ (Navbar, global wrapper)
- **globals.css**: CSS styles ทั่วทั้งแอพ

---

### 📂 components/ - React Components

#### Ticket Components (`components/tickets/`)

**TicketForm.tsx**
- ฟอร์มสร้าง/แก้ไข ticket
- ค้นหาลูกค้าเดิม
- Validation
- แจ้งเตือน duplicate tickets

**TicketList.tsx**
- แสดงรายการ tickets
- Filter ตามสถานะ
- Search ด้วย keyword
- Sort ตามวันที่

**TicketCard.tsx**
- การ์ดแสดง ticket แต่ละอัน
- Badge สถานะและ priority
- ข้อมูลลูกค้า

**TicketDetail.tsx**
- รายละเอียด ticket เต็ม
- Timeline บันทึก
- อัปเดตสถานะ
- เพิ่ม notes

**CustomerSearch.tsx**
- ค้นหาลูกค้าด้วยเบอร์โทร
- Real-time search
- แจ้งเตือนถ้ามี tickets เปิดอยู่

**StatusBadge.tsx**
- แสดง badge สถานะพร้อมสี

#### UI Components (`components/ui/`)

ส่วนประกอบ UI พื้นฐานที่ใช้ซ้ำได้ ทุกอัน:
- **button.tsx**: ปุ่มพร้อม variants
- **card.tsx**: Container card
- **input.tsx**: Text input field
- **select.tsx**: Dropdown (ใช้ Radix UI)
- **dialog.tsx**: Modal (ใช้ Radix UI)
- **badge.tsx**: Label/status badge

#### Other Components
- **Navbar.tsx**: Navigation bar หลัก

---

### 📂 lib/ - Utilities & Helpers

**prisma.ts**
- Prisma Client singleton instance
- ป้องกัน multiple connections ใน development

**utils.ts**
- Helper functions:
  - `cn()`: Merge Tailwind classes
  - `generateTicketNumber()`: สร้างเลข ticket
  - `formatThaiDate()`: Format วันที่แบบไทย
  - `formatRelativeTime()`: เวลาแบบ relative (2 hours ago)
  - `validateThaiPhone()`: Validate เบอร์โทรไทย
  - `formatThaiPhone()`: Format เบอร์โทร
  - `getStatusColor()`, `getPriorityColor()`: สีของ badge
  - `getStatusLabel()`, `getPriorityLabel()`: แปลเป็นภาษาไทย

**validations.ts**
- Validation functions:
  - `validateCreateTicket()`: Validate ข้อมูล ticket ใหม่
  - `validateUpdateTicket()`: Validate ข้อมูลอัปเดต
  - `validateCreateNote()`: Validate บันทึก
  - `sanitizePhone()`: ทำความสะอาดเบอร์โทร

---

### 📂 prisma/ - Database

**schema.prisma**
- Database schema definition
- Models: Customer, Ticket, Note
- Enums: TicketStatus, Priority
- Relations & indexes

**seed.ts**
- Script สำหรับเพิ่มข้อมูลทดสอบ
- รัน: `npm run db:seed`

---

### 📂 types/ - TypeScript Types

**index.ts**
- Type definitions ทั้งหมด:
  - `TicketWithCustomer`
  - `CustomerWithTickets`
  - `TicketWithRelations`
  - `CreateTicketFormData`
  - `UpdateTicketFormData`
  - `ApiResponse`
  - `PaginatedResponse`
  - `TicketFilters`
  - และอื่นๆ

---

## 🔄 Data Flow

### การสร้าง Ticket ใหม่

```
1. User fills form → TicketForm.tsx
2. TicketForm validates → lib/validations.ts
3. POST request → app/api/tickets/route.ts
4. API validates again
5. Check/create customer → prisma (Customer model)
6. Generate ticket number → lib/utils.ts
7. Create ticket → prisma (Ticket model)
8. Return response → TicketForm
9. Redirect to tickets list
```

### การดู Ticket Detail

```
1. User clicks ticket → tickets/page.tsx
2. Navigate to → tickets/[id]/page.tsx
3. Fetch ticket → app/api/tickets/[id]/route.ts
4. Prisma query with relations
5. Return ticket + customer + notes
6. Display in → TicketDetail.tsx
```

### การค้นหาลูกค้า

```
1. User types phone → CustomerSearch.tsx
2. Real-time search
3. GET request → app/api/customers/search/route.ts
4. Prisma query by phone
5. Return customer + open tickets
6. Display with warning if has open tickets
```

---

## 🎨 Styling System

- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible components
- **class-variance-authority**: Type-safe variants
- **tailwind-merge**: Merge classes safely

---

## 🗄️ Database Models

### Customer
```typescript
{
  id: string (cuid)
  name: string
  phone: string (unique)
  email: string | null
  tickets: Ticket[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Ticket
```typescript
{
  id: string (cuid)
  ticketNo: string (unique) // TH-YYYYMMDD-XXXX
  customerId: string
  customer: Customer
  subject: string
  description: string (text)
  status: TicketStatus
  priority: Priority
  assignedTo: string | null
  notes: Note[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Note
```typescript
{
  id: string (cuid)
  ticketId: string
  ticket: Ticket
  content: string (text)
  createdBy: string
  createdAt: DateTime
}
```

---

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | รายการ tickets (รองรับ filters) |
| POST | `/api/tickets` | สร้าง ticket ใหม่ |
| GET | `/api/tickets/:id` | รายละเอียด ticket |
| PATCH | `/api/tickets/:id` | อัปเดต ticket |
| DELETE | `/api/tickets/:id` | ลบ ticket |
| GET | `/api/customers/search?phone=xxx` | ค้นหาลูกค้า |

---

## 📦 Dependencies

### Production
- **next**: Framework
- **react**, **react-dom**: UI library
- **@prisma/client**: Database ORM
- **@radix-ui/***: Accessible components
- **tailwindcss**: Styling
- **lucide-react**: Icons
- **date-fns**: Date formatting

### Development
- **typescript**: Type safety
- **prisma**: Database toolkit
- **eslint**: Code linting
- **tsx**: TypeScript executor (for seed)

---

## 📝 Configuration Files

- **tsconfig.json**: TypeScript compiler options
- **tailwind.config.ts**: Tailwind CSS configuration
- **next.config.js**: Next.js configuration
- **postcss.config.mjs**: PostCSS plugins
- **.eslintrc.json**: ESLint rules
- **.gitignore**: Git ignore patterns
- **.env.local**: Environment variables (local)
- **.env.example**: Environment template

---

## 🎯 Key Features Implementation

### Auto-generate Ticket Number
- Format: `TH-YYYYMMDD-XXXX`
- Function: `generateTicketNumber()` in `lib/utils.ts`
- Used in: `app/api/tickets/route.ts`

### Customer Duplicate Prevention
- Search by phone before creating
- Component: `CustomerSearch.tsx`
- API: `app/api/customers/search/route.ts`

### Warning for Open Tickets
- Check customer's open tickets
- Display in: `CustomerSearch.tsx`
- Badge warning if has unclosed tickets

### Ticket Filtering & Search
- Component: `TicketList.tsx`
- Filter by: status, priority
- Search by: ticket no, customer name, phone

### Timeline & Notes
- Display in: `TicketDetail.tsx`
- Add notes via API
- Chronological order (newest first)

---

## 🔐 Security Considerations

- Input validation on both client & server
- SQL injection protection (Prisma ORM)
- Environment variables for secrets
- CORS configuration (Next.js API)
- Rate limiting (to be added)

---

## 📚 Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs/primitives)
