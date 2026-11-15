import assert from 'node:assert/strict'
import {
  computeAverageRating,
  parseEvaluationPayload,
} from '../server/lib/evaluationValidation.js'

const baseRatings = {
  ratingQ1: 5,
  ratingQ2: 4,
  ratingQ3: 3,
  ratingQ4: 2,
  ratingQ5: 1,
}

assert.equal(computeAverageRating({ rating_q1: 5, rating_q2: 5, rating_q3: 5, rating_q4: 5, rating_q5: 5 }), 5)
assert.equal(
  computeAverageRating({ rating_q1: 5, rating_q2: 4, rating_q3: 3, rating_q4: 2, rating_q5: 1 }),
  3,
)

const parsed = parseEvaluationPayload({
  ...baseRatings,
  suggestions: '  More detail on fees ',
  flagForAdminReview: false,
})
assert.equal(parsed.averageRating, 3)
assert.equal(parsed.suggestions, 'More detail on fees')
assert.equal(parsed.flagForAdmin, false)

assert.throws(() => parseEvaluationPayload({ ...baseRatings, ratingQ3: 0 }), /Question 3/)

assert.throws(
  () =>
    parseEvaluationPayload({
      ...baseRatings,
      flagForAdminReview: true,
      flagPriority: 'normal',
      flagReason: '',
    }),
  /reason is required/,
)

const flagged = parseEvaluationPayload({
  ...baseRatings,
  flagForAdminReview: true,
  flagPriority: 'urgent',
  flagReason: 'Incorrect schedule',
})
assert.equal(flagged.flagPriority, 'urgent')
assert.equal(flagged.flagReason, 'Incorrect schedule')

console.log('evaluation-validate.test.mjs: ok')