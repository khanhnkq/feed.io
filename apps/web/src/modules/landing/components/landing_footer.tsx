import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface py-12 text-xs text-muted">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-lime font-black text-ink">
              F
            </span>
            <div>
              <strong className="block text-sm font-bold text-ink">
                feed.io
              </strong>
              <span>Frame-accurate video collaboration platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 font-mono text-[11px] text-ink">
            <span className="size-2 rounded-full bg-[#4ecb71] animate-pulse" />
            <span>Systems Normal</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 md:flex-row">
          <p className="font-mono text-[11px]">
            &copy; {new Date().getFullYear()} Feed.io. Built for video craftspeople.
          </p>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/login" className="hover:text-ink">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-ink">
              Register
            </Link>
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
