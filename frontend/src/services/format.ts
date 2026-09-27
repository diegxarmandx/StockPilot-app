// Decimal strings stay strings: no floating-point arithmetic for monetary values.
export function formatMoney(value: string): string {
  const [whole, fraction = ''] = value.split('.')
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}

// Preview arithmetic uses integer cents. The server remains authoritative.
export function moneyCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}
export function centsDecimal(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`
}
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
