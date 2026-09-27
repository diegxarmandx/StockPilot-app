// Decimal strings stay strings: no floating-point arithmetic for monetary values.
export function formatMoney(value: string): string {
  const [whole, fraction = ''] = value.split('.')
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}
