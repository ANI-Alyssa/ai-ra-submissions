import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
      <div className="relative overflow-hidden">
        <HeroBackdrop />

        <div className="relative mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <div className="max-w-xl rounded-md border border-navy/10 bg-white/90 p-8 shadow-xl backdrop-blur-sm sm:p-10">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-gold">
              AI R&amp;A Submissions
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-navy sm:text-5xl">
              Ready to submit something{" "}
              <span className="italic text-gold">decision-ready</span>?
            </h1>
            <p className="mt-4 text-slate-600">
              Every submission gets AI-reviewed before it ever reaches Alyssa — so only complete,
              decision-ready requests make it through.
            </p>
            <Link
              href="/submit"
              className="mt-8 inline-block rounded-sm bg-teal px-7 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white shadow-md transition hover:-translate-y-0.5 hover:bg-teal/90 hover:shadow-lg"
            >
              New Submission
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Abstract stand-in for the real site's warm hero photography — this is an internal ops tool,
// not the marketing site, so it gets an editorial gradient/bokeh treatment in the same navy/gold/
// teal palette rather than borrowing any actual photography.
function HeroBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 640"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBF8F4" />
          <stop offset="100%" stopColor="#F1E9DD" />
        </linearGradient>
        <radialGradient id="gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#B6A28C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#B6A28C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="teal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0ABAB5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0ABAB5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="navy" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#051C46" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#051C46" stopOpacity="0" />
        </radialGradient>
        <filter id="soften">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      <rect width="1600" height="640" fill="url(#base)" />

      <g filter="url(#soften)">
        <ellipse cx="1250" cy="120" rx="420" ry="320" fill="url(#gold)" />
        <ellipse cx="1500" cy="480" rx="380" ry="300" fill="url(#teal)" />
        <ellipse cx="250" cy="560" rx="500" ry="260" fill="url(#navy)" />
        <ellipse cx="150" cy="80" rx="300" ry="220" fill="url(#gold)" />
      </g>
    </svg>
  );
}
