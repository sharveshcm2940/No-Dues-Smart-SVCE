import React from 'react';

export const Badge = ({ children, text, color, variant = 'info', className = '' }) => {
  const content = children ?? text;
  const resolvedVariant = color === 'amber' ? 'warning' : color || variant;
  const variants = {
    primary: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    hold: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const getVariantByText = (text) => {
    if (!text || typeof text !== 'string') return variants[resolvedVariant] || variants.info;
    const lower = text.toLowerCase();
    if (lower.includes('approved') || lower.includes('eligible') || lower.includes('returned') || lower.includes('paid') || lower.includes('resolved') || lower.includes('completed')) {
      return variants.success;
    }
    if (lower.includes('pending') || lower.includes('progress') || lower.includes('open') || lower.includes('issued')) {
      return variants.warning;
    }
    if (lower.includes('rejected') || lower.includes('dues pending') || lower.includes('unpaid') || lower.includes('overdue')) {
      return variants.danger;
    }
    if (lower.includes('hold')) {
      return variants.hold;
    }
    if (lower.includes('locked') || lower.includes('not submitted') || lower.includes('n/a')) {
      return variants.secondary;
    }
    return variants[resolvedVariant] || variants.info;
  };

  const badgeStyle = getVariantByText(content);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
      {content}
    </span>
  );
};

export default Badge;
