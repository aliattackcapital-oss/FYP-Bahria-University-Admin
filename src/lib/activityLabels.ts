export function describeActivityAction(action: string, metadata?: Record<string, unknown>) {
  switch (action) {
    case 'review.claimed':
      return 'Claimed this call from the review queue to evaluate it.'
    case 'review.started':
      return 'Opened the call review screen (recording and evaluation form).'
    case 'call.evaluated': {
      const flagged = Boolean(metadata?.flagForAdmin)
      const avg = metadata?.averageRating
      if (flagged) {
        return `Submitted a full evaluation and flagged it for super admin review${
          avg != null ? ` (average score ${avg} out of 5)` : ''
        }.`
      }
      return `Submitted a completed human evaluation for this call${
        avg != null ? ` (average score ${avg} out of 5)` : ''
      }.`
    }
    default:
      return 'Review-related activity on this call.'
  }
}

function isFlagged(metadata?: Record<string, unknown>) {
  return Boolean(metadata?.flagForAdmin ?? metadata?.flag_for_admin)
}

export function activityListSummary(_action: string, metadata?: Record<string, unknown>) {
  const avg = metadata?.averageRating ?? metadata?.average_rating
  const avgText = avg != null ? `Score ${avg}/5` : 'Score recorded'
  return isFlagged(metadata) ? `${avgText} · flagged` : avgText
}