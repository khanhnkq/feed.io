import { ArrowUpRight, Check, KeyRound, Server } from "lucide-react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8088";

export function LoginScreen() {
  return (
    <main id="main-content" className="min-h-screen md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(420px,.85fr)]">
      <section
        className="relative flex min-h-[48vh] flex-col justify-between overflow-hidden bg-[#171914] px-6 py-7 text-[#f7f8ef] after:pointer-events-none after:absolute after:-bottom-[18vw] after:-right-[5vw] after:text-[min(66vw,760px)] after:font-black after:leading-[.75] after:tracking-[-.12em] after:text-[#22251e] after:content-['F'] md:min-h-screen md:px-[clamp(40px,6vw,96px)] md:py-12"
        aria-labelledby="login-title"
      >
        <div className="relative z-10 flex items-center gap-3 text-xl font-extrabold tracking-[-.04em]">
          <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
            F
          </span>
          <span>feed.io</span>
        </div>
        <div className="relative z-10 max-w-[760px] py-18 md:py-24">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.13em] text-[#a9ad9f]">
            Private review workspace
          </p>
          <h1
            id="login-title"
            className="m-0 max-w-[830px] text-[clamp(50px,16vw,76px)] font-bold leading-[.84] tracking-[-.075em] text-balance md:text-[clamp(58px,7vw,110px)]"
          >
            Feedback that keeps the cut moving.
          </h1>
          <p className="mt-6 max-w-[600px] text-base leading-relaxed text-[#aeb1a6] md:mt-8">
            One self-hosted place for your agency to review media, collect precise notes and
            deliver the final version.
          </p>
        </div>
        <p className="relative z-10 m-0 hidden text-xs text-[#777b70] md:block">
          Built for small teams. Hosted on your infrastructure.
        </p>
      </section>

      <section
        className="grid min-h-[52vh] place-items-center content-center gap-6 bg-paper px-5 py-12 md:px-12"
        aria-labelledby="session-title"
      >
        <div className="w-full max-w-[430px] rounded-[14px] border border-[#d4d6cc] bg-surface p-8 shadow-[7px_7px_0_#e2e3dc] md:p-[42px] md:shadow-[12px_12px_0_#e2e3dc]">
          <span className="block border-b border-line pb-[18px] font-mono text-[10px] font-bold tracking-[.12em] text-muted">
            01 / ACCESS
          </span>
          <div
            className="mt-[30px] grid size-[52px] place-items-center rounded-full border border-ink bg-lime md:mt-[42px]"
            aria-hidden="true"
          >
            <KeyRound size={25} strokeWidth={1.7} />
          </div>
          <h2 id="session-title" className="mt-6 text-4xl font-bold leading-none tracking-[-.05em]">
            Enter your workspace
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Continue through the local Keycloak identity service. Your tokens stay in secure cookies.
          </p>
          <a
            className="mt-[30px] inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-5 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
            href={`${apiBaseUrl}/api/v1/auth/login`}
          >
            Continue with Keycloak <ArrowUpRight size={17} />
          </a>
          <div
            className="mt-7 grid grid-cols-2 gap-x-3.5 gap-y-2.5 border-t border-line pt-5 text-[11px] text-muted"
            aria-label="Authentication details"
          >
            <span className="flex items-center gap-1.5">
              <Check size={14} /> PKCE protected
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} /> Refresh rotation
            </span>
            <span className="flex items-center gap-1.5">
              <Server size={14} /> Self-hosted
            </span>
          </div>
        </div>
        <p className="m-0 max-w-[400px] text-center text-[11px] leading-relaxed text-muted">
          First time here? Ask your workspace owner to create your account and organization membership.
        </p>
      </section>
    </main>
  );
}
