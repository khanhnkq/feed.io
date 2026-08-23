import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center content-center gap-5 p-8 text-center">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[.13em] text-muted">404 / Not found</p>
      <h1 className="m-0 max-w-[650px] text-[clamp(40px,7vw,80px)] font-bold tracking-[-.06em]">
        This review frame does not exist.
      </h1>
      <Link
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-5 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
        href="/projects"
      >
        Return to projects
      </Link>
    </main>
  );
}
