import type { Creator } from '@/types'

/**
 * Drop portrait files in `public/creators/` using the `photo` filename below.
 */
export const creators: Creator[] = [
  {
    id: 'ali-rashid',
    name: 'Ali Rashid',
    enrollment: '02-134231-013',
    role: 'student',
    photo: 'ali-rashid.png',
  },
  {
    id: 'anum-shahid',
    name: 'Anum Shahid',
    enrollment: '02-134231-027',
    role: 'student',
    photo: 'anum-shahid.png',
  },
  {
    id: 'javeria',
    name: 'Javeria',
    enrollment: '02-134231-059',
    role: 'student',
    photo: 'javeria.png',
  },
  {
    id: 'malik-m-ali',
    name: 'Sir Malik M. Ali',
    role: 'supervisor',
    photo: 'malik-m-ali.jpg',
  },
]

export const students = creators.filter((creator) => creator.role === 'student')
export const supervisors = creators.filter(
  (creator) => creator.role === 'supervisor',
)
