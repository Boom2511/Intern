/**
 * Recipient Utilities
 * Helper functions for getting recipient information with fallback logic
 * Priority: Customer data > Ticket legacy fields
 */

import { Customer, Ticket } from '@prisma/client';

export type TicketWithCustomer = Ticket & {
  customer: Customer;
};

/**
 * Get recipient name with fallback
 * Priority: customer.name > ticket.recipientName
 */
export function getRecipientName(ticket: TicketWithCustomer): string {
  return ticket.customer.name || ticket.recipientName || '';
}

/**
 * Get recipient phone with fallback
 * Priority: customer.phone > ticket.recipientPhone
 */
export function getRecipientPhone(ticket: TicketWithCustomer): string {
  return ticket.customer.phone || ticket.recipientPhone || '';
}

/**
 * Get recipient address with fallback
 * Priority: customer.address > ticket.recipientAddress
 */
export function getRecipientAddress(ticket: TicketWithCustomer): string {
  return ticket.customer.address || ticket.recipientAddress || '';
}

/**
 * Get all recipient info at once
 */
export function getRecipientInfo(ticket: TicketWithCustomer) {
  return {
    name: getRecipientName(ticket),
    phone: getRecipientPhone(ticket),
    address: getRecipientAddress(ticket),
  };
}

/**
 * Check if recipient data comes from customer (new way) vs ticket legacy fields
 */
export function isUsingCustomerData(ticket: TicketWithCustomer): boolean {
  return !!(ticket.customer.address || ticket.customer.name || ticket.customer.phone);
}
