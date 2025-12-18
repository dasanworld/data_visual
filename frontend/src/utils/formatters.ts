// Number formatting utilities

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ko-KR').format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
