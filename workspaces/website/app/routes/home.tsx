import type { Route } from './+types/home';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Link } from 'react-router';
import { baseOptions } from '@/lib/layout.shared';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Puth • Browser testing for all of us' },
    { name: 'description', content: 'Puth is a fast, stable browser testing tool with a live GUI.' },
  ];
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#ffe7d6_0%,_#f7f0ea_45%,_#f7f8fb_100%)]" />
        <div className="absolute -top-40 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,116,94,0.35),_rgba(255,116,94,0))] blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(46,118,255,0.25),_rgba(46,118,255,0))] blur-2xl" />

        <section className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-fd-muted-foreground uppercase">
              Browser testing, redesigned
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
              Puth is the calm, fast way to ship browser tests.
            </h1>
            <p className="text-base md:text-lg text-fd-muted-foreground max-w-xl">
              Built on Puppeteer with a client/server architecture, Puth stays stable under pressure and gives you a
              GUI that actually helps you debug.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/docs/getting-started"
                className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground"
              >
                Get started
              </Link>
              <Link
                to="/docs"
                className="rounded-full border border-fd-border bg-white/80 px-5 py-2.5 text-sm font-semibold text-fd-foreground"
              >
                Read the docs
              </Link>
            </div>
            <div className="grid gap-4 pt-4 md:grid-cols-3">
              {[
                {
                  title: 'Native clients',
                  desc: 'PHP, JS, Java, Go. One API, multiple SDKs.',
                },
                {
                  title: 'Snapshot-first',
                  desc: 'Failures capture rich snapshots you can replay.',
                },
                {
                  title: 'Built-in GUI',
                  desc: 'Live view and timeline without extra setup.',
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-sm text-fd-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border bg-white/90 p-4 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.6)]">
              <div className="rounded-2xl border bg-white/95 p-3">
                <div className="mb-3 flex items-center justify-between text-xs text-fd-muted-foreground">
                  <span>puth/gui</span>
                  <span className="rounded-full bg-fd-secondary px-2 py-0.5">live</span>
                </div>
                <img
                  src="/images/puth-gui.png"
                  alt="Puth GUI preview"
                  className="w-full rounded-xl border shadow-sm"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-8 left-6 right-6 rounded-[28px] border border-transparent bg-white/70 px-6 py-4 text-sm text-fd-muted-foreground shadow-lg backdrop-blur">
              “What you see is what you ship” snapshots, ready for CI artifacts.
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1200px] gap-6 px-6 pb-20 md:grid-cols-3">
          {[
            {
              title: 'Run it anywhere',
              desc: 'Docker, Podman, or npm. Puth stays local and controlled.',
            },
            {
              title: 'Fluent API',
              desc: 'Chainable browser actions with consistent timeouts and selectors.',
            },
            {
              title: 'CI-ready',
              desc: 'Capture snapshots to `/puth/storage/snapshots` automatically.',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </section>
      </div>

      <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 pb-16">
        <div className="rounded-3xl border bg-fd-secondary/40 p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fd-muted-foreground">Docs</p>
              <h2 className="text-2xl font-semibold">
                Everything you need to wire Puth into your workflow.
              </h2>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Start with the server setup, then dive into selectors, waits, and the Browser API.
              </p>
            </div>
            <Link
              to="/docs/getting-started"
              className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground"
            >
              Open docs
            </Link>
          </div>
        </div>
      </section>
    </HomeLayout>
  );
}
