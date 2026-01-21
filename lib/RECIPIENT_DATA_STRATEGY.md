# Recipient Data Strategy

## Overview
This document explains the data architecture for storing customer/recipient information in the Thailand Post Help Desk System.

---

## Problem Statement

**Original Issue:** Data duplication between `Customer` and `Ticket` tables
- Customer: `name`, `phone`
- Ticket: `recipientName`, `recipientPhone`, `recipientAddress`

This caused:
- ❌ Duplicate data storage
- ❌ Data inconsistency risk
- ❌ Confusion about single source of truth

---

## Solution: Hybrid Approach (Keep Both)

### Principle: **Transactional Snapshot + Master Data**

```
Customer Table (Master Data)
├── name          ← Current customer name
├── phone         ← Current customer phone (unique)
└── address       ← Current customer address

Ticket Table (Transactional Snapshot)
├── customerId    ← Reference to Customer
├── recipientName     ← Snapshot at ticket creation
├── recipientPhone    ← Snapshot at ticket creation
└── recipientAddress  ← Snapshot at ticket creation
```

---

## Data Flow

### 1. Creating a Ticket

```typescript
// Step 1: Update/Create Customer (Master Data)
const customer = await prisma.customer.upsert({
  where: { phone: customerPhone },
  update: {
    name: customerName,
    address: customerAddress  // Latest address
  },
  create: {
    name: customerName,
    phone: customerPhone,
    address: customerAddress
  }
});

// Step 2: Create Ticket with snapshot of customer data
const ticket = await prisma.ticket.create({
  data: {
    customerId: customer.id,
    recipientName: customer.name,      // ← Snapshot
    recipientPhone: customer.phone,    // ← Snapshot
    recipientAddress: customer.address // ← Snapshot
  }
});
```

### 2. Editing a Ticket

```typescript
// Update BOTH Customer (master) and Ticket (snapshot)
await prisma.customer.update({
  where: { id: ticket.customerId },
  data: { 
    name: newName,
    address: newAddress 
  }
});

await prisma.ticket.update({
  where: { id: ticketId },
  data: {
    recipientName: newName,
    recipientAddress: newAddress
  }
});
```

### 3. Displaying Ticket Data

```typescript
// Use helper functions with fallback logic
import { getRecipientName, getRecipientPhone, getRecipientAddress } from '@/lib/recipient-utils';

const displayName = getRecipientName(ticket);
// Priority: ticket.customer.name > ticket.recipientName

const displayPhone = getRecipientPhone(ticket);
// Priority: ticket.customer.phone > ticket.recipientPhone

const displayAddress = getRecipientAddress(ticket);
// Priority: ticket.customer.address > ticket.recipientAddress
```

---

## Why Keep Both?

### ✅ Benefits

1. **Historical Accuracy**
   - Ticket preserves recipient info at creation time
   - Even if customer moves, old tickets show correct historical address
   
   Example:
   ```
   Day 1: Ticket #001 created → Address: Bangkok
   Day 5: Customer moves → Update Customer.address = Chiang Mai
   Day 10: Ticket #002 created → Address: Chiang Mai
   
   Result:
   - Ticket #001 still shows Bangkok ✓ (correct historical data)
   - Ticket #002 shows Chiang Mai ✓ (current data)
   ```

2. **Data Integrity**
   - If Customer record is deleted, Ticket still has recipient info
   - No data loss on orphaned tickets

3. **Performance**
   - Query tickets without JOIN (recipient fields available directly)
   - JOIN only when need full customer profile

4. **Backward Compatibility**
   - Old tickets (before migration) continue to work
   - Fallback logic ensures no breaking changes

### ⚠️ Trade-offs

1. **Storage**: Duplicate data requires more storage
   - Mitigated by: Storage is cheap, data integrity is expensive

2. **Consistency**: Must update two places
   - Mitigated by: API handles this automatically (see `/api/tickets/[id]/route.ts`)

---

## Use Cases

### Case 1: Standard Flow (Customer = Recipient)
```
Create ticket → Customer.address = "123 Bangkok"
                Ticket.recipientAddress = "123 Bangkok"

Display ticket → Show "123 Bangkok" (from Customer or Ticket, same value)
```

### Case 2: Customer Updates Address
```
Old Ticket #001 → recipientAddress = "123 Bangkok" (historical)
Customer.address updated → "456 Chiang Mai"
New Ticket #002 → recipientAddress = "456 Chiang Mai" (snapshot of new address)

Display Ticket #001 → "123 Bangkok" ✓ (correct for that delivery)
Display Ticket #002 → "456 Chiang Mai" ✓ (correct for that delivery)
```

### Case 3: Edit Ticket (Staff corrects address)
```
Before: recipientAddress = "123 Bangkok" (wrong)
        Customer.address = "123 Bangkok"

Staff edits ticket → "789 Phuket" (correct)

After:  recipientAddress = "789 Phuket" ✓
        Customer.address = "789 Phuket" ✓ (also updated for future tickets)
```

---

## Migration Status

### Phase 1: Schema ✅
- Added `Customer.address` field (nullable)
- Added comments to indicate legacy fields

### Phase 2: Database ✅
- Migration: `20260121234058_add_customer_address`
- Old data preserved (NULL for existing customers)

### Phase 3: API Logic ✅
- Create ticket: Snapshot customer data to recipient fields
- Edit ticket: Update both Customer and Ticket
- Helper functions: `getRecipient*()` with fallback logic

### Phase 4: UI Components ✅
- `TicketInfoCard`: Uses helper functions
- `TicketCard`: Uses helper functions
- Displays correct data for both old and new tickets

---

## Future Considerations

### Option 1: Keep Current Strategy (Recommended)
- Maintains historical accuracy
- No further changes needed

### Option 2: Full Normalization (Not Recommended)
- Remove recipient fields from Ticket
- Always JOIN Customer
- Risk: Lose historical data when customer info changes
- Risk: Performance impact on large datasets

### Option 3: Separate Recipient Table
- Create `Recipient` model
- Ticket → Recipient (many-to-one)
- Complex but handles "send to different person" use cases
- Consider only if business requirements change

---

## Developer Guidelines

### When Creating Tickets
```typescript
// ✅ DO: Use Customer data as source
recipientName: customer.name,
recipientPhone: customer.phone,
recipientAddress: customer.address

// ❌ DON'T: Use form data directly
recipientName: formData.recipientName  // Wrong! Use customer.name
```

### When Displaying Data
```typescript
// ✅ DO: Use helper functions
import { getRecipientAddress } from '@/lib/recipient-utils';
const address = getRecipientAddress(ticket);

// ❌ DON'T: Access fields directly
const address = ticket.recipientAddress  // Wrong! No fallback logic
```

### When Querying Tickets
```typescript
// ✅ DO: Include customer relation
const ticket = await prisma.ticket.findUnique({
  where: { id },
  include: { customer: true }  // Always include for helper functions to work
});

// ⚠️ CAUTION: Querying without customer relation
// Helper functions will fallback to ticket.recipient* fields
```

---

## Testing Checklist

- [ ] Create new ticket → Customer.address populated
- [ ] Create new ticket → Ticket.recipientAddress = Customer.address
- [ ] Edit ticket address → Both Customer and Ticket updated
- [ ] Display old ticket (no Customer.address) → Shows Ticket.recipientAddress
- [ ] Display new ticket → Shows Customer.address
- [ ] Customer changes address → Old tickets unchanged, new tickets use new address

---

## Questions & Answers

**Q: Why not just use Customer data and remove recipient fields?**
A: Tickets are transactional records that should preserve data at creation time. Like invoices, they should show the address where items were delivered, even if customer moves later.

**Q: What if recipient is different from customer (send to friend)?**
A: Current system: Staff can manually edit recipient info in ticket. Advanced solution: Create separate Recipient model (future consideration).

**Q: Performance impact of storing duplicate data?**
A: Minimal. Storage is cheap, and we gain query performance by not requiring JOIN every time. Data integrity is more valuable.

**Q: What happens to old tickets?**
A: Fallback logic ensures old tickets (recipientAddress set, Customer.address NULL) still display correctly using Ticket.recipientAddress.

---

Last Updated: 2026-01-21
