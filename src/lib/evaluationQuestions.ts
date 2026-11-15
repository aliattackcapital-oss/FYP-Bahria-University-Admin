export const LIKERT_OPTIONS = [
  { value: 5 as const, label: 'Strongly Agree' },
  { value: 4 as const, label: 'Agree' },
  { value: 3 as const, label: 'Neutral' },
  { value: 2 as const, label: 'Disagree' },
  { value: 1 as const, label: 'Strongly Disagree' },
]

export const EVALUATION_QUESTIONS = [
  'The AI provided accurate and relevant answers to the caller’s questions.',
  'The AI understood the caller’s request correctly.',
  'The AI communicated clearly and professionally throughout the conversation.',
  'The AI provided sufficient information to resolve the caller’s inquiry.',
  'Overall, the AI handled the call effectively.',
]

export type LikertRating = 1 | 2 | 3 | 4 | 5

export function averageFromRatings(ratings: Record<number, LikertRating | null>) {
  const values = [1, 2, 3, 4, 5].map((i) => ratings[i]).filter((v): v is LikertRating => v != null)
  if (values.length !== 5) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round((sum / 5) * 100) / 100
}

export const ADMIN_FLAG_STATUS_LABELS: Record<string, string> = {
  flagged: 'Flagged',
  under_review: 'Under Review',
  changes_implemented: 'Changes Implemented',
  resolved: 'Resolved',
}