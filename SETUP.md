# User Authentication System Setup

ระบบ User Management ได้ถูกสร้างเสร็จแล้ว!

## วิธีติดตั้ง (Quick Start):

### 1. Run Prisma Migration
```bash
npx prisma db push
```

### 2. Seed ข้อมูลผู้ใช้เริ่มต้น
```bash
npm run db:seed
```

### 3. เริ่มใช้งาน
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000 (จะ redirect ไป /login อัตโนมัติ)

## บัญชีทดสอบที่ถูกสร้าง:

### 🔐 ADMINISTRATOR (เข้าถึงได้ทุกอย่าง)
- **Email:** admin@example.com
- **Password:** admin123
- **สิทธิ์:** User Management + CEC + Test Pages

### 👨‍💼 ADMIN (จัดการผู้ใช้ + CEC)
- **Email:** test.admin@example.com
- **Password:** admin123
- **สิทธิ์:** User Management + CEC (ไม่เห็น Test Pages)

### 👤 OPERATOR (CEC เท่านั้น)
- **Email:** operator@example.com
- **Password:** operator123
- **สิทธิ์:** CEC เท่านั้น (ไม่เห็น User Management และ Test Pages)

---

## โครงสร้างระบบ:

### สิทธิ์การใช้งาน (Roles):

#### 1. ADMINISTRATOR - เข้าถึงได้ทุกอย่าง
- ✅ User Management (/staff)
- ✅ CEC (Dashboard, Tickets, ฯลฯ)
- ✅ Test Pages (/test-flex, /api/test-line)

#### 2. ADMIN - จัดการผู้ใช้ + CEC
- ✅ User Management (/staff)
- ✅ CEC (Dashboard, Tickets, ฯลฯ)
- ❌ Test Pages (จะถูกบล็อก)

#### 3. OPERATOR - CEC เท่านั้น
- ✅ CEC (Dashboard, Tickets, ฯลฯ)
- ❌ User Management (redirect ไป dashboard)
- ❌ Test Pages (จะถูกบล็อก)

### Public Access:
- Tickets ที่เปิดด้วย `?mode=client` สามารถเข้าถึงได้โดยไม่ต้อง login
- ใช้สำหรับให้ลูกค้าดูข้อมูล ticket จาก LINE

---

## ไฟล์ที่สร้างใหม่:

### Authentication Core:
```
lib/auth.ts                      # Auth utilities, permissions, role checking
middleware.ts                    # Authentication middleware (ตรวจสอบทุก request)
```

### API Routes:
```
app/api/auth/login/route.ts     # Login endpoint
app/api/auth/logout/route.ts    # Logout endpoint
app/api/auth/me/route.ts        # Get current user
app/api/users/route.ts          # List & Create users
app/api/users/[id]/route.ts     # Update & Delete users
```

### UI Pages:
```
app/login/page.tsx              # Login page (สวยงาม responsive)
app/staff/page.tsx              # User Management page (CRUD users)
```

### Components:
```
components/ui/label.tsx         # Label component (สำหรับ form)
```

### Database:
```
prisma/schema.prisma            # เพิ่ม User model + UserRole enum
prisma/seed.ts                  # Seed script สร้าง test users
```

---

## การใช้งาน:

### 1. Login
1. เปิด http://localhost:3000
2. จะ redirect ไปหน้า login อัตโนมัติ
3. ใช้บัญชีใดบัญชีหนึ่งจากด้านบน

### 2. จัดการผู้ใช้ (Admin/Administrator เท่านั้น)
1. ไปที่ `/staff` หรือคลิก "User Management" ในเมนู
2. คลิก "เพิ่มผู้ใช้ใหม่" เพื่อสร้าง user
3. กรอกข้อมูล:
   - อีเมล
   - รหัสผ่าน
   - ชื่อ
   - สิทธิ์การใช้งาน (Role)
4. คลิก "เพิ่มผู้ใช้"

### 3. แก้ไขผู้ใช้
- คลิกไอคอน ✏️ (Pencil) เพื่อแก้ไข
- เปลี่ยนข้อมูลได้ทุกอย่างรวมถึงรหัสผ่าน
- เว้นว่างช่อง password หากไม่ต้องการเปลี่ยน

### 4. ลบผู้ใช้
- คลิกไอคอน 🗑️ (Trash) เพื่อลบ
- ไม่สามารถลบตัวเองได้

### 5. Logout
- คลิกปุ่ม "ออกจากระบบ" มุมขวาบน

---

## Permission System:

### API Level Protection:
```typescript
// ตัวอย่าง: ตรวจสอบสิทธิ์ใน API route
import { getCurrentUser, hasPermission, Permission } from '@/lib/auth';

const currentUser = await getCurrentUser();
if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### Middleware Protection:
- Middleware ตรวจสอบ authentication ทุก request
- Public routes: `/login`, `/api/auth/*`
- Client mode: `?mode=client` bypass authentication

### Role-based Access:
```typescript
// ตรวจสอบว่า user สามารถเข้าถึง route นี้ได้หรือไม่
import { canAccessRoute } from '@/lib/auth';

if (!canAccessRoute(pathname, user.role)) {
  // Redirect หรือ block
}
```

---

## Security Features:

### 1. Password Security
- รหัสผ่านถูก hash ด้วย bcryptjs (cost factor: 10)
- ไม่เก็บ plaintext password

### 2. Session Management
- Session token เก็บใน httpOnly cookie
- Secure flag เมื่อ production
- SameSite: lax
- Auto-expire: 7 วัน

### 3. API Protection
- ทุก API route ตรวจสอบ authentication
- Permission checking ที่ API level
- ป้องกัน CSRF ด้วย httpOnly cookie

### 4. Input Validation
- Email validation
- Required field checking
- Duplicate email checking

---

## Troubleshooting:

### ปัญหา: Cannot connect to database
```bash
# ตรวจสอบ DATABASE_URL ใน .env
# ตรวจสอบว่า database server ทำงานอยู่
npx prisma db push
```

### ปัญหา: Prisma Client not generated
```bash
npx prisma generate
```

### ปัญหา: ลืมรหัสผ่าน admin
```bash
# รัน seed script ใหม่ (จะ upsert user เดิม)
npm run db:seed
```

### ปัญหา: Permission denied
- ตรวจสอบว่า login ด้วย role ที่ถูกต้อง
- OPERATOR ไม่สามารถเข้า /staff ได้
- ADMIN ไม่สามารถเข้า /test-flex ได้

---

## Advanced: สร้าง User ด้วย Prisma Studio

```bash
npx prisma studio
```

1. เปิด `User` model
2. คลิก "Add record"
3. กรอกข้อมูล:
   - email: your@email.com
   - password: (ใช้ hashed password จาก bcrypt)
   - name: Your Name
   - role: ADMINISTRATOR / ADMIN / OPERATOR
   - isActive: true
4. Save

**สำคัญ:** ต้องใช้ hashed password! ห้ามใส่ plaintext

---

## เปลี่ยนรหัสผ่าน User ที่มีอยู่:

```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('newpassword123', 10).then(hash => console.log('Hashed password:', hash));
"
```

คัดลอก hash แล้วไป update ใน Prisma Studio หรือ SQL

---

## Production Checklist:

- [ ] เปลี่ยนรหัสผ่าน default admin
- [ ] ตั้ง `NODE_ENV=production` ใน .env
- [ ] ใช้ HTTPS (จะเปิด secure cookie)
- [ ] ตั้งค่า DATABASE_URL ให้ถูกต้อง
- [ ] Backup database เป็นประจำ
- [ ] Monitor session expiry
- [ ] Implement rate limiting (optional)
- [ ] Setup logging system

---

## คำแนะนำเพิ่มเติม:

### เพิ่ม "Remember Me" Feature:
แก้ไขใน `lib/auth.ts`:
```typescript
export async function setSessionCookie(userId: string, rememberMe: boolean = false) {
  const expiryDays = rememberMe ? 30 : 7;
  // ... rest of code
}
```

### เพิ่ม Email Verification:
1. เพิ่ม field `emailVerified` ใน User model
2. สร้าง verification token system
3. ส่ง email verification link

### เพิ่ม Password Reset:
1. สร้าง PasswordReset model
2. Generate reset token
3. ส่ง email พร้อม reset link
4. Validate token และให้เปลี่ยน password

### Audit Log:
1. สร้าง AuditLog model
2. Log user actions (login, create, update, delete)
3. แสดงใน dashboard

---

**ติดปัญหาหรือต้องการความช่วยเหลือ?**
ติดต่อ: [admin@example.com]
