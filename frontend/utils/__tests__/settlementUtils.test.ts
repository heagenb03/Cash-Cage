import {
  groupSettlementsByRecipient,
  sortPaymentsByAmount,
  GroupedSettlement,
} from '../settlementUtils';
import { Settlement } from '@/types/game';

describe('groupSettlementsByRecipient', () => {
  it('returns empty array for empty settlements', () => {
    expect(groupSettlementsByRecipient([])).toEqual([]);
  });

  it('groups a single settlement correctly', () => {
    const settlements: Settlement[] = [
      { from: 'Alice', to: 'Bob', amount: 50 },
    ];

    const result = groupSettlementsByRecipient(settlements);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      recipient: 'Bob',
      totalAmount: 50,
      payments: [{ from: 'Alice', amount: 50 }],
    });
  });

  it('groups multiple payers to the same recipient', () => {
    const settlements: Settlement[] = [
      { from: 'Alice', to: 'Charlie', amount: 30 },
      { from: 'Bob', to: 'Charlie', amount: 20 },
    ];

    const result = groupSettlementsByRecipient(settlements);
    expect(result).toHaveLength(1);
    expect(result[0].recipient).toBe('Charlie');
    expect(result[0].totalAmount).toBe(50);
    expect(result[0].payments).toHaveLength(2);
  });

  it('creates separate groups for different recipients', () => {
    const settlements: Settlement[] = [
      { from: 'Alice', to: 'Bob', amount: 30 },
      { from: 'Alice', to: 'Charlie', amount: 20 },
    ];

    const result = groupSettlementsByRecipient(settlements);
    expect(result).toHaveLength(2);
    // Sorted alphabetically by recipient
    expect(result[0].recipient).toBe('Bob');
    expect(result[1].recipient).toBe('Charlie');
  });

  it('sorts groups alphabetically by recipient name', () => {
    const settlements: Settlement[] = [
      { from: 'X', to: 'Zach', amount: 10 },
      { from: 'Y', to: 'Alice', amount: 20 },
      { from: 'Z', to: 'Mike', amount: 30 },
    ];

    const result = groupSettlementsByRecipient(settlements);
    expect(result.map(g => g.recipient)).toEqual(['Alice', 'Mike', 'Zach']);
  });
});

describe('sortPaymentsByAmount', () => {
  it('sorts payments in descending order by amount', () => {
    const grouped: GroupedSettlement = {
      recipient: 'Bob',
      totalAmount: 100,
      payments: [
        { from: 'Alice', amount: 20 },
        { from: 'Charlie', amount: 50 },
        { from: 'Dave', amount: 30 },
      ],
    };

    const result = sortPaymentsByAmount(grouped);
    expect(result.payments.map(p => p.amount)).toEqual([50, 30, 20]);
  });

  it('does not mutate the original object', () => {
    const grouped: GroupedSettlement = {
      recipient: 'Bob',
      totalAmount: 70,
      payments: [
        { from: 'Alice', amount: 20 },
        { from: 'Charlie', amount: 50 },
      ],
    };

    const result = sortPaymentsByAmount(grouped);
    expect(result).not.toBe(grouped);
    expect(result.payments).not.toBe(grouped.payments);
    // Original order preserved
    expect(grouped.payments[0].amount).toBe(20);
  });

  it('handles single payment', () => {
    const grouped: GroupedSettlement = {
      recipient: 'Bob',
      totalAmount: 50,
      payments: [{ from: 'Alice', amount: 50 }],
    };

    const result = sortPaymentsByAmount(grouped);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].amount).toBe(50);
  });

  it('handles empty payments', () => {
    const grouped: GroupedSettlement = {
      recipient: 'Bob',
      totalAmount: 0,
      payments: [],
    };

    const result = sortPaymentsByAmount(grouped);
    expect(result.payments).toEqual([]);
  });
});
