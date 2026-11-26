// app/page.tsx
// WHAT IT'S FOR: the home page, at /. A short line saying what this app is. The status page
// (behind the sign-in) comes in a later step.
// WHO USES IT: anyone who opens the live address.
// WHY THE NAME: "page.tsx" at the top of app/ is the Next.js name for the home page.

export default function HomePage() {
  return (
    <main className="!max-w-md">
      <h1 className="!mb-1">Weekly Digest</h1>
      <p className="!mt-0">A weekly review of a barbershop&apos;s appointments, for the owner. Made-up data only.</p>
    </main>
  );
}
