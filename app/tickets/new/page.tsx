/**
 * Create New Ticket Page
 * Form for creating a new support ticket
 */

import TicketForm from '@/components/tickets/TicketForm';

export default function NewTicketPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">สร้าง Ticket ใหม่</h1>
        <p className="text-gray-600 mt-2">
          กรอกข้อมูลเพื่อสร้างคำร้องหรือปัญหาใหม่
        </p>
      </div>

      <TicketForm mode="create" />
    </div>
  );
}
