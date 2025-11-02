/**
 * TypeScript Type Definitions
 * Centralized type definitions for the Help Desk system
 */

import { Ticket, Customer, Note, TicketStatus, Priority } from '@prisma/client';

// Extended types with relations
export type TicketWithCustomer = Ticket & {
  customer: Customer;
  notes?: Note[];
};

export type CustomerWithTickets = Customer & {
  tickets: Ticket[];
};

export type TicketWithRelations = Ticket & {
  customer: Customer;
  notes: Note[];
};

// Form data types
export interface CreateTicketFormData {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  subject: string;
  description: string;
  priority: Priority;
  assignedTo?: string;
}

export interface UpdateTicketFormData {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: Priority;
  assignedTo?: string;
}

export interface CreateNoteFormData {
  ticketId: string;
  content: string;
  createdBy: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and search types
export interface TicketFilters {
  status?: TicketStatus;
  priority?: Priority;
  search?: string;
  customerId?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerSearchParams {
  phone?: string;
  name?: string;
  email?: string;
}

// Statistics types for dashboard
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  pendingTickets: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByPriority: Record<Priority, number>;
  recentTickets: TicketWithCustomer[];
}

// Export Prisma types
export type { Ticket, Customer, Note, TicketStatus, Priority };
