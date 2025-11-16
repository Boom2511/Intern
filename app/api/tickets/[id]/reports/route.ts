/**
 * API Route: POST /api/tickets/[id]/reports
 * Create a problem report from end user with optional image uploads
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, generateFileName, isStorageConfigured } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const createdBy = formData.get('createdBy') as string;
    const images = formData.getAll('images') as File[];

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรายละเอียดปัญหา' },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Ticket นี้' },
        { status: 404 }
      );
    }

    // Upload images to Supabase Storage (or fallback to base64)
    const imageUrls: string[] = [];

    if (isStorageConfigured()) {
      // Use cloud storage
      for (const image of images) {
        if (image && image.size > 0) {
          try {
            const bytes = await image.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = generateFileName(params.id, image.name);
            const publicUrl = await uploadFile(buffer, fileName, image.type);
            imageUrls.push(publicUrl);
          } catch (error) {
            console.error('Failed to upload image:', error);
            // Continue with other images
          }
        }
      }
    } else {
      // Fallback to base64 (not recommended for production)
      console.warn('Cloud storage not configured, using base64 fallback');
      for (const image of images) {
        if (image && image.size > 0) {
          const bytes = await image.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${image.type};base64,${base64}`;
          imageUrls.push(dataUrl);
        }
      }
    }

    // Create note with isFromEndUser = true
    const note = await prisma.note.create({
      data: {
        ticketId: params.id,
        content: content.trim(),
        createdBy: createdBy || 'ลูกค้า',
        isFromEndUser: true,
        images: imageUrls,
      },
    });

    // Update ticket status to PENDING when end user reports a problem
    await prisma.ticket.update({
      where: { id: params.id },
      data: { status: 'PENDING' },
    });

    // Create status history record
    await prisma.statusHistory.create({
      data: {
        ticketId: params.id,
        fromStatus: ticket.status,
        toStatus: 'PENDING',
        changedBy: 'System',
        note: 'สถานะเปลี่ยนเป็น PENDING เนื่องจากมีรายงานปัญหาจากพนักงาน',
      },
    });

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการส่งรายงาน' },
      { status: 500 }
    );
  }
}
