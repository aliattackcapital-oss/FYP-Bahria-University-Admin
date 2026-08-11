import { CreatorCard } from '@/components/CreatorCard'
import { students, supervisors } from '@/lib/creators'
import type { Creator } from '@/types'

function CreatorSection({
  title,
  people,
}: {
  title: string
  people: Creator[]
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-wrap gap-4">
        {people.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </section>
  )
}

export function Creators() {
  return (
    <div className="space-y-10">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">Creators</h1>
      </div>

      <CreatorSection title="Students" people={students} />
      <CreatorSection title="Supervisor" people={supervisors} />
    </div>
  )
}
