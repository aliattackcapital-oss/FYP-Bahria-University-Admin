import { useNavigate } from 'react-router-dom'
import { CallEvaluationForm } from '@/components/CallEvaluationForm'

type CallReviewFormProps = {
  callId: string
}

export function CallReviewForm({ callId }: CallReviewFormProps) {
  const navigate = useNavigate()
  return (
    <CallEvaluationForm
      callId={callId}
      onSuccess={() => {
        window.setTimeout(
          () => navigate('/review-queue?tab=finished', { replace: true }),
          1200,
        )
      }}
    />
  )
}