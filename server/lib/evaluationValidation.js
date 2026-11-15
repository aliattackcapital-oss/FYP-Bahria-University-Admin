const LIKERT_LABELS = [
  { value: 5, label: 'Strongly Agree' },
  { value: 4, label: 'Agree' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Disagree' },
  { value: 1, label: 'Strongly Disagree' },
]

const VALID_RATINGS = new Set([1, 2, 3, 4, 5])

export const EVALUATION_QUESTIONS = [
  'The AI provided accurate and relevant answers to the caller’s questions.',
  'The AI understood the caller’s request correctly.',
  'The AI communicated clearly and professionally throughout the conversation.',
  'The AI provided sufficient information to resolve the caller’s inquiry.',
  'Overall, the AI handled the call effectively.',
]

export const ADMIN_FLAG_STATUSES = new Set([
  'flagged',
  'under_review',
  'changes_implemented',
  'resolved',
])

export { LIKERT_LABELS }

function pickRating(body, index) {
  const camel = body[`ratingQ${index}`]
  const snake = body[`rating_q${index}`]
  if (camel !== undefined && camel !== null && camel !== '') return Number(camel)
  if (snake !== undefined && snake !== null && snake !== '') return Number(snake)
  return NaN
}

export function computeAverageRating(ratings) {
  const sum = ratings.rating_q1 + ratings.rating_q2 + ratings.rating_q3 + ratings.rating_q4 + ratings.rating_q5
  return Math.round((sum / 5) * 100) / 100
}

export function parseEvaluationPayload(body) {
  const ratings = {}
  for (let i = 1; i <= 5; i += 1) {
    const value = pickRating(body, i)
    if (!VALID_RATINGS.has(value)) {
      throw new Error(`Question ${i} requires a rating from 1 to 5.`)
    }
    ratings[`rating_q${i}`] = value
  }

  const averageRating = computeAverageRating(ratings)
  const suggestions = String(body?.suggestions ?? body?.notes ?? '').trim() || null

  const flagForAdmin = Boolean(body?.flagForAdminReview ?? body?.flag_for_admin)
  let flagPriority = null
  let flagReason = null

  if (flagForAdmin) {
    flagPriority = String(body?.flagPriority ?? body?.flag_priority ?? 'normal').trim().toLowerCase()
    if (flagPriority !== 'normal' && flagPriority !== 'urgent') {
      throw new Error('Flag priority must be normal or urgent.')
    }
    flagReason = String(body?.flagReason ?? body?.flag_reason ?? '').trim()
    if (!flagReason) {
      throw new Error('A reason is required when flagging for admin review.')
    }
  }

  return {
    ratings,
    averageRating,
    suggestions,
    flagForAdmin,
    flagPriority,
    flagReason,
  }
}

export function isLikertSchemaColumnMissing(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('rating_q1') || msg.includes('average_rating')
}