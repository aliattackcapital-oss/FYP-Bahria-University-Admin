import type { CallLog } from '@/types'

/** Sample logs for the mid-defense demo. Replace with DB data later. */
export const callLogs: CallLog[] = [
  {
    id: 'call-001',
    name: 'Ayesha Khan',
    phone: '+92 300 1234567',
    email: 'ayesha.khan@email.com',
    durationSeconds: 247,
    timestamp: '2026-08-10T09:15:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hello, this is Ali from the university helpline. How can I help you today?',
        timestampSeconds: 2,
      },
      {
        speaker: 'Caller',
        text: 'Assalam o alaikum. I wanted to ask about the BS Computer Science admission requirements.',
        timestampSeconds: 8,
      },
      {
        speaker: 'Ali',
        text: 'Wa alaikum assalam. For BS Computer Science, applicants need intermediate or equivalent with at least 50% marks, plus the university entry test.',
        timestampSeconds: 16,
      },
      {
        speaker: 'Caller',
        text: 'Is Mathematics compulsory in intermediate?',
        timestampSeconds: 32,
      },
      {
        speaker: 'Ali',
        text: 'Yes, Mathematics is required for the CS program. Pre-engineering or ICS backgrounds are typically preferred.',
        timestampSeconds: 40,
      },
      {
        speaker: 'Caller',
        text: 'Got it, shukriya.',
        timestampSeconds: 55,
      },
    ],
  },
  {
    id: 'call-002',
    name: 'Bilal Ahmed',
    phone: '+92 321 9876543',
    email: 'bilal.ahmed@outlook.com',
    durationSeconds: 312,
    timestamp: '2026-08-10T11:42:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hi, you\'ve reached Ali at the university helpline. What can I do for you?',
        timestampSeconds: 1,
      },
      {
        speaker: 'Caller',
        text: 'I need to know the semester fee for the BBA program.',
        timestampSeconds: 9,
      },
      {
        speaker: 'Ali',
        text: 'The BBA tuition fee is PKR 95,000 per semester. That does not include the admission or security deposit.',
        timestampSeconds: 17,
      },
      {
        speaker: 'Caller',
        text: 'Are there any scholarships available for merit students?',
        timestampSeconds: 32,
      },
      {
        speaker: 'Ali',
        text: 'Yes. Merit scholarships of up to 25% are offered based on intermediate and entry-test scores. Need-based aid is also available.',
        timestampSeconds: 40,
      },
      {
        speaker: 'Caller',
        text: 'Okay, thanks. I\'ll apply online.',
        timestampSeconds: 58,
      },
    ],
  },
  {
    id: 'call-003',
    name: 'Fatima Zahra',
    phone: '+92 333 4567890',
    email: 'fatima.zahra@gmail.com',
    durationSeconds: 189,
    timestamp: '2026-08-09T16:05:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hello, this is Ali from the university helpline.',
        timestampSeconds: 1,
      },
      {
        speaker: 'Caller',
        text: 'Hi Ali. When do Fall semester classes start, and what is the registration deadline?',
        timestampSeconds: 7,
      },
      {
        speaker: 'Ali',
        text: 'Fall classes begin on 1 September. Course registration closes one week before that, on 25 August.',
        timestampSeconds: 18,
      },
      {
        speaker: 'Caller',
        text: 'Can I still add or drop courses after classes start?',
        timestampSeconds: 35,
      },
      {
        speaker: 'Ali',
        text: 'Yes, the add/drop window stays open for the first two weeks of the semester.',
        timestampSeconds: 44,
      },
    ],
  },
  {
    id: 'call-004',
    name: 'Hassan Raza',
    phone: '+92 345 1122334',
    email: 'hassan.raza@company.pk',
    durationSeconds: 421,
    timestamp: '2026-08-09T14:20:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Good afternoon, this is Ali. How may I assist you?',
        timestampSeconds: 2,
      },
      {
        speaker: 'Caller',
        text: 'I submitted my online admission form last week. How do I check the application status?',
        timestampSeconds: 10,
      },
      {
        speaker: 'Ali',
        text: 'You can track it on the admissions portal using your CNIC and application ID. Merit lists are also posted there.',
        timestampSeconds: 22,
      },
      {
        speaker: 'Caller',
        text: 'My application ID is ADM-2026-88421. Has the first merit list been announced?',
        timestampSeconds: 38,
      },
      {
        speaker: 'Ali',
        text: 'The first merit list for Fall 2026 will be published on 18 August. You\'ll also get an SMS if you\'re selected.',
        timestampSeconds: 52,
      },
      {
        speaker: 'Caller',
        text: 'After selection, how many days do I have to pay the admission fee?',
        timestampSeconds: 70,
      },
      {
        speaker: 'Ali',
        text: 'Selected candidates must pay within five working days of the merit-list announcement to secure their seat.',
        timestampSeconds: 82,
      },
    ],
  },
  {
    id: 'call-005',
    name: 'Sana Malik',
    phone: '+92 312 7788990',
    email: 'sana.malik@hotmail.com',
    durationSeconds: 156,
    timestamp: '2026-08-08T19:30:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hello, Ali here from the university helpline. How can I help?',
        timestampSeconds: 1,
      },
      {
        speaker: 'Caller',
        text: 'Do you offer an evening program for working students in Software Engineering?',
        timestampSeconds: 8,
      },
      {
        speaker: 'Ali',
        text: 'Yes. The BS Software Engineering evening program runs Monday to Thursday, 5:30 PM to 9:00 PM.',
        timestampSeconds: 18,
      },
      {
        speaker: 'Caller',
        text: 'Is the degree the same as the morning program?',
        timestampSeconds: 35,
      },
      {
        speaker: 'Ali',
        text: 'Yes, the curriculum and degree award are identical. Only the class timings differ.',
        timestampSeconds: 42,
      },
    ],
  },
  {
    id: 'call-006',
    name: 'Usman Ali',
    phone: '+92 301 5566778',
    email: 'usman.ali@yahoo.com',
    durationSeconds: 278,
    timestamp: '2026-08-08T10:12:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hi, this is Ali at the university helpline. What brings you in today?',
        timestampSeconds: 2,
      },
      {
        speaker: 'Caller',
        text: 'I want to transfer from another university into your Electrical Engineering program. What\'s the process?',
        timestampSeconds: 9,
      },
      {
        speaker: 'Ali',
        text: 'You\'ll need official transcripts, a NOC from your current university, and at least a 2.5 CGPA. Credits are evaluated course by course.',
        timestampSeconds: 22,
      },
      {
        speaker: 'Caller',
        text: 'How many credit hours can usually be transferred?',
        timestampSeconds: 42,
      },
      {
        speaker: 'Ali',
        text: 'Up to 50% of the degree credit hours may be transferred, subject to departmental approval.',
        timestampSeconds: 50,
      },
      {
        speaker: 'Caller',
        text: 'Alright, I\'ll prepare the documents. Thank you.',
        timestampSeconds: 65,
      },
    ],
  },
  {
    id: 'call-007',
    name: 'Maryam Hussain',
    phone: '+92 334 2233445',
    email: 'maryam.hussain@email.pk',
    durationSeconds: 203,
    timestamp: '2026-08-07T13:48:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Hello, you\'re speaking with Ali from the university helpline.',
        timestampSeconds: 1,
      },
      {
        speaker: 'Caller',
        text: 'Assalam o alaikum. What documents are required for MS Data Science admission?',
        timestampSeconds: 7,
      },
      {
        speaker: 'Ali',
        text: 'Wa alaikum assalam. You\'ll need a 16-year education degree, official transcripts, CNIC copy, two recommendation letters, and a statement of purpose.',
        timestampSeconds: 16,
      },
      {
        speaker: 'Caller',
        text: 'Is a GAT or entry test mandatory?',
        timestampSeconds: 38,
      },
      {
        speaker: 'Ali',
        text: 'Yes. A valid GAT General or the university\'s own graduate entry test is required for MS programs.',
        timestampSeconds: 45,
      },
    ],
  },
  {
    id: 'call-008',
    name: 'Omar Farooq',
    phone: '+92 315 6677889',
    email: 'omar.farooq@gmail.com',
    durationSeconds: 364,
    timestamp: '2026-08-07T08:55:00+05:00',
    audioUrl: null,
    transcript: [
      {
        speaker: 'Ali',
        text: 'Good morning, this is Ali from the university helpline. How can I help you?',
        timestampSeconds: 2,
      },
      {
        speaker: 'Caller',
        text: 'I missed the fee payment deadline for this semester. Can I still register for classes?',
        timestampSeconds: 10,
      },
      {
        speaker: 'Ali',
        text: 'Late fee payment is allowed with a surcharge of PKR 5,000 until the end of the first week of classes.',
        timestampSeconds: 20,
      },
      {
        speaker: 'Caller',
        text: 'After that, do courses get dropped automatically?',
        timestampSeconds: 38,
      },
      {
        speaker: 'Ali',
        text: 'Yes. If dues remain unpaid after the late window, your course registration is cancelled and you must re-register next term.',
        timestampSeconds: 46,
      },
      {
        speaker: 'Caller',
        text: 'Understood. I\'ll pay today. Thanks a lot.',
        timestampSeconds: 62,
      },
    ],
  },
]
