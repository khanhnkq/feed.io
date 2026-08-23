import { Check, Server } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ step, title, description, children, footer }: AuthShellProps) {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,.92fr)]"
    >
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-ink px-[clamp(40px,6vw,96px)] py-12 text-[#f7f8ef] after:pointer-events-none after:absolute after:-bottom-[15vw] after:-right-[4vw] after:text-[min(62vw,760px)] after:font-black after:leading-[.72] after:tracking-[-.12em] after:text-[#22251e] after:content-['F'] lg:flex">
        <Link className="relative z-10 flex items-center gap-3 text-xl font-extrabold tracking-[-.04em]" href="/login">
          <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
            F
          </span>
          feed.io
        </Link>
        <div className="relative z-10 max-w-[760px] py-20">
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#a9ad9f]">
            Private review workspace
          </p>
          <p className="m-0 max-w-[830px] text-[clamp(58px,7vw,108px)] font-bold leading-[.84] tracking-[-.075em] text-balance">
            Feedback that keeps the cut moving.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 text-xs text-[#aeb1a6]">
            <span className="flex items-center gap-2"><Check size={15} /> Review-ready workflow</span>
            <span className="flex items-center gap-2"><Server size={15} /> Fully self-hosted</span>
          </div>
        </div>
        <p className="relative z-10 text-xs text-[#777b70]">Your media. Your infrastructure. Your control.</p>
      </section>

      <section className="grid min-h-screen place-items-center content-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-[460px]">
          <Link className="mb-10 flex items-center gap-3 text-xl font-extrabold tracking-[-.04em] lg:hidden" href="/login">
            <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black">F</span>
            feed.io
          </Link>
          <div className="rounded-[14px] border border-[#d4d6cc] bg-surface p-7 shadow-[7px_7px_0_#e2e3dc] sm:p-10 sm:shadow-[12px_12px_0_#e2e3dc]">
            <span className="block border-b border-line pb-[18px] font-mono text-[10px] font-bold tracking-[.12em] text-muted">
              {step}
            </span>
            <h1 className="mt-8 text-[clamp(34px,8vw,46px)] font-bold leading-[.94] tracking-[-.055em] text-balance">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
          {footer ? <div className="mt-7 text-center text-xs leading-relaxed text-muted">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
