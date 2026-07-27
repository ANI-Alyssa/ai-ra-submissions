import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-sans text-xs uppercase tracking-widest text-gold">
          AI R&amp;A Submissions
        </p>
        <h1 className="mt-2 font-serif text-3xl text-navy">
          Ready to submit something <span className="italic text-gold">decision-ready</span>?
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Every submission gets AI-reviewed before it ever reaches Alyssa — so only complete,
          decision-ready requests make it through.
        </p>
      </div>
      <Link
        href="/submit"
        className="inline-block rounded-sm bg-teal px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white hover:bg-teal/90"
      >
        New Submission
      </Link>
    </div>
  );
}
