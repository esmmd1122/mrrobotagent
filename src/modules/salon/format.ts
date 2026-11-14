export function toman(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

export function faDateTime(date: Date) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function faDate(date: Date) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'medium',
  }).format(date)
}
