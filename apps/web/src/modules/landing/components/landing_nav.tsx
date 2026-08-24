"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/modules/ui";

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/landing" className="flex items-center gap-3 group">
          <span className="grid size-9 place-items-center rounded-lg bg-lime font-black text-ink transition group-hover:scale-105">
            F
          </span>
          <span className="text-xl font-bold tracking-tight text-ink">
            feed<span className="text-muted">.io</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Features
          </a>
          <a
            href="#architecture"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Architecture
          </a>
          <a
            href="#workflow"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Workflow
          </a>
          <a
            href="#pricing"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Pricing
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Button href="/login" size="sm" variant="ghost">
            Sign in
          </Button>
          <Button href="/register" size="sm" variant="primary">
            Get started free
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="grid size-10 place-items-center rounded-lg border border-line md:hidden text-ink"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-line bg-surface px-5 py-6 md:hidden">
          <nav className="flex flex-col gap-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-ink"
            >
              Features
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-ink"
            >
              Architecture
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-ink"
            >
              Workflow
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-ink"
            >
              Pricing
            </a>
            <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-line">
              <Button href="/login" size="md" variant="outline" fullWidth>
                Sign in
              </Button>
              <Button href="/register" size="md" variant="primary" fullWidth>
                Get started free
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
