/**
 * The landing page FAQ, shared by the rendered accordion and the FAQPage
 * structured data.
 *
 * These must not drift: search engines treat FAQ markup that does not match
 * the visible page as spam, so both consumers read this one array rather than
 * keeping their own copy.
 */
export const FAQS: readonly (readonly [string, string])[] = [
  [
    "What is Aartha?",
    "Aartha is a personal finance app for salaried people. It turns your salary, commitments, goals, and days until payday into one clear daily spending number.",
  ],
  [
    "How does Safe to Spend Today work?",
    "Aartha subtracts protected bills, savings, investments, and recorded spending, then paces the remainder across the days until payday.",
  ],
  [
    "Does Aartha work with my salary date?",
    "Yes. Your cycle can start on any payday, whether that is the 1st, 7th, 25th, or another date.",
  ],
  [
    "Do I need to connect my bank account?",
    "No. You stay in control and add only the information you want Aartha to use.",
  ],
  ["Is Aartha free?", "You can join the waitlist now and use the interactive demo for free."],
  [
    "Can I change my bills, savings, or salary later?",
    "Yes. Update any input whenever life changes and your daily number recalculates.",
  ],
] as const;
