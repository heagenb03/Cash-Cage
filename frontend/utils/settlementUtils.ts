import { Settlement } from '@/types/game';

export interface GroupedSettlement {
  recipient: string;
  totalAmount: number;
  payments: Array<{
    from: string;
    amount: number;
  }>;
}

export function groupSettlementsByRecipient(
  settlements: Settlement[]
): GroupedSettlement[] {
  // Group settlements by recipient
  const grouped = settlements.reduce<Record<string, GroupedSettlement>>((acc, settlement) => {
    const { to, from, amount } = settlement;
    if (!acc[to]) {
      acc[to] = {
        recipient: to,
        totalAmount: 0,
        payments: [],
      };
    }
    acc[to].totalAmount += amount;
    acc[to].payments.push({ from, amount });
    return acc;
  }, {});

  // Convert to array and sort alphabetically by recipient
  return Object.values(grouped).sort((a, b) =>
    a.recipient.localeCompare(b.recipient)
  );
}

/**
 * Sorts payments within a grouped settlement by amount (largest first)
 */
export function sortPaymentsByAmount(
  groupedSettlement: GroupedSettlement
): GroupedSettlement {
  return {
    ...groupedSettlement,
    payments: [...groupedSettlement.payments].sort((a, b) => b.amount - a.amount)
  };
}
