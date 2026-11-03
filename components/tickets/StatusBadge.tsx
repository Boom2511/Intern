/**
 * StatusBadge Component
 * Displays ticket status with appropriate color coding
 */

import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { TicketStatus } from '@/types';

interface StatusBadgeProps {
  status: TicketStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
