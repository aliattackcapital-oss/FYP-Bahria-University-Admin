import type { DashboardStats } from '../types'

/** Dashboard summary metrics only — call logs stay empty until DB integration. */
export const dashboardStats: DashboardStats = {
  totalCalls: 186,
  averageMinutesPerCall: 4.6,
  totalMinutesConsumed: 854,
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  callsTrend: [18, 24, 21, 32, 28, 12, 15],
  avgMinutesTrend: [4.1, 3.8, 5.2, 4.6, 5.0, 3.9, 4.4],
  totalMinutesTrend: [74, 91, 109, 147, 140, 47, 66],
}
