/**
 * Ticket Detail Page
 * View and manage a specific ticket
 */

import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import TicketDetail from '@/components/tickets/TicketDetail';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TicketPageProps {
  params: {
    id: string;
  };
}

export default async function TicketPage({ params }: TicketPageProps) {
  let ticket = null;
  let error = null;

  try {
    // Fetch real ticket from database
    ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      notFound();
    }
  } catch (err) {
    console.error('Error fetching ticket:', err);
    error = 'ไม่สามารถโหลดข้อมูล Ticket ได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล';
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <TicketDetail ticket={ticket} />
    </div>
  );
}
