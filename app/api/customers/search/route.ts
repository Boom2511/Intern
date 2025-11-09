/**
 * Customer Search API Route
 * GET /api/customers/search?phone=xxx - Search customer by phone number
 * Returns customer with their open tickets
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizePhone } from '@/lib/validations';

/**
 * GET /api/customers/search
 * Query params:
 * - phone: Customer phone number (required)
 * - name: Customer name (optional, for fuzzy search)
 * - email: Customer email (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');
    const email = searchParams.get('email');

    // Build where clause
    const where: any = {};

    if (phone) {
      const cleanPhone = sanitizePhone(phone);
      where.phone = cleanPhone;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    // At least one search parameter is required
    if (!phone && !name && !email) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเงื่อนไขการค้นหา (เบอร์โทร, ชื่อ, หรืออีเมล)' },
        { status: 400 }
      );
    }

    // Search for customer
    const customer = await prisma.customer.findFirst({
      where,
      include: {
        tickets: {
          where: {
            status: {
              notIn: ['CLOSED', 'RESOLVED'], // Only include open/pending tickets
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      // Return success but with null data when customer not found
      return NextResponse.json({
        success: true,
        data: null,
        hasOpenTickets: false,
        openTicketsCount: 0,
      });
    }

    // Return customer with warning if they have open tickets
    return NextResponse.json({
      success: true,
      data: customer,
      hasOpenTickets: customer.tickets.length > 0,
      openTicketsCount: customer.tickets.length,
    });
  } catch (error) {
    console.error('Error searching customer:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า' },
      { status: 500 }
    );
  }
}
