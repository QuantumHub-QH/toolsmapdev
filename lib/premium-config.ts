export const PREMIUM_DURATIONS = [
  { value: '7d', label: '1 minggu' },
  { value: '1m', label: '1 bulan' },
  { value: '3m', label: '3 bulan' },
  { value: '6m', label: '6 bulan' },
  { value: '8m', label: '8 bulan' },
  { value: '1y', label: '1 tahun' },
] as const;

export type PremiumDuration = (typeof PREMIUM_DURATIONS)[number]['value'];

export const PREMIUM_PLANS = [
  { duration: '7d', price: 'Rp10.000', label: '1 Minggu' },
  { duration: '1m', price: 'Rp30.000', label: '1 Bulan' },
  { duration: '3m', price: 'Rp50.000', label: '3 Bulan' },
  { duration: '8m', price: 'Rp100.000', label: '8 Bulan' },
] as const;
