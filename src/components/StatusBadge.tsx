import React from 'react';

interface Props {
  status: string;
  type?: 'order' | 'payment' | 'stock' | 'source';
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status.toUpperCase()) {
    case 'NEW':
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'CONFIRMED':
      bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'PROCESSING':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'PACKED':
      bg = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'SHIPPED':
      bg = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;
    case 'DELIVERED':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'CANCELLED':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'RETURNED':
      bg = 'bg-orange-50 text-orange-700 border-orange-200';
      break;
    case 'PAID':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'PARTIALLY_PAID':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'UNPAID':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'REFUNDED':
      bg = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'IN_STOCK':
    case 'HEALTHY':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'LOW_STOCK':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'OUT_OF_STOCK':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'SUCCESS':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'FAILURE':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'PENDING_CONFIRMATION':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${bg}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
