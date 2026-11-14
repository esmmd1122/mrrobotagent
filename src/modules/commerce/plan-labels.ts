export const PLAN_DURATION_UNITS = ['DAY', 'MONTH', 'YEAR', 'LIFETIME'] as const
export type PlanDurationUnit = (typeof PLAN_DURATION_UNITS)[number]

const UNIT_FA: Record<PlanDurationUnit, string> = {
  DAY: 'روز',
  MONTH: 'ماه',
  YEAR: 'سال',
  LIFETIME: 'مادام‌العمر',
}

export function formatPlanDuration(value: number | null | undefined, unit: string | null | undefined) {
  if (unit === 'LIFETIME' || !unit) return 'مادام‌العمر'
  const n = value ?? 1
  const label = UNIT_FA[unit as PlanDurationUnit] || unit
  return `${n.toLocaleString('fa-IR')} ${label}`
}

export function isPlanDurationUnit(u: string): u is PlanDurationUnit {
  return (PLAN_DURATION_UNITS as readonly string[]).includes(u)
}