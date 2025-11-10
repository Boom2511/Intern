/**
 * Ticket Detail Layout
 * Conditional layout for ticket detail page based on view mode
 */

import Navbar from '@/components/Navbar';

interface TicketLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default function TicketLayout({ children, params }: TicketLayoutProps) {
  // Note: searchParams is not available in layouts in App Router
  // We'll handle the mode detection in the page component instead
  // This layout will be used by both client and staff views

  return <>{children}</>;
}
