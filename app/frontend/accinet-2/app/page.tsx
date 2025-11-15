'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  Layers,
  Map as MapIcon,
  Radar,
  Route,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';

type Feature = {
  title: string;
  copy: string;
  icon: LucideIcon;
};

type PipelineStep = {
  title: string;
  detail: string;
};

type Metric = {
  label: string;
  value: string;
};

const features: Feature[] = [
  {
    title: 'Predictive route gradients',
    copy: 'Blend crash probabilities with live traffic to spotlight high-risk segments before dispatch.',
    icon: Route,
  },
  {
    title: 'Hex-grid risk lens',
    copy: 'H3 overlays keep the entire Texas network in view with smooth zoom transitions.',
    icon: Layers,
  },
  {
    title: 'Traffic fusion',
    copy: 'HERE speed, incidents, and closures stream directly into the scoring surface.',
    icon: Radar,
  },
  {
    title: 'Crash intelligence cards',
    copy: 'Dig into patterns per corridor with cause, severity, and weather pivots.',
    icon: Activity,
  },
  {
    title: 'Tunable thresholds',
    copy: 'Dial confidence, daypart, and facility type to tailor alerts for ops centers.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Embeddable map',
    copy: 'Drop the AcciNet experience into any dashboard with a lightweight API.',
    icon: Sparkles,
  },
  {
    title: 'Historical crash analysis',
    copy: 'Explore time-series heatmaps of historical crash density across Texas with interactive year range selection.',
    icon: Activity,
  },
];

const pipeline: PipelineStep[] = [
  {
    title: 'Ingest',
    detail: 'TxDOT crashes, HERE traffic, ERA5 weather, and roadway geometry normalize into segments + cells.',
  },
  {
    title: 'Score',
    detail: 'XGBoost + GNN experiments compute per-segment crash risk with temporal holdouts for integrity.',
  },
  {
    title: 'Render',
    detail: 'Scores hydrate gradient routes, heat maps, and story cards instantly inside the browser.',
  },
];

const metrics: Metric[] = [
  { value: '1.2M+', label: 'segments scored nightly' },
  { value: '47%', label: 'fewer blind spots vs. legacy heat maps' },
  { value: '94%', label: 'confidence on critical corridors' },
];

const badges = ['TxDOT Safety', 'TTI Labs', 'Gulf Freight', 'Civic Ops', 'Austin Innovation'];

export default function LandingPage() {
  const year = new Date().getFullYear();

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    });

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    const targets = document.querySelectorAll<HTMLElement>('[data-fade]');
    targets.forEach((el) => observer?.observe(el));

    return () => observer?.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen p-[clamp(1rem,4vw,2.5rem)] bg-[radial-gradient(circle_at_20%_20%,rgba(64,196,255,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(189,130,255,0.17),transparent_50%),#04060b] text-[#f0f3ff] overflow-x-hidden overflow-y-auto no-scrollbar">
      <Particles
        id="tsparticles"
        options={{
          background: {
            color: {
              value: 'transparent',
            },
          },
          fpsLimit: 120,
          particles: {
            color: {
              value: ['#38bdf8', '#a855f7'],
            },
            links: {
              enable: true,
              distance: 120,
              opacity: 0.3,
            },
            move: {
              enable: true,
              speed: 1,
            },
            number: {
              density: {
                enable: true,
                value_area: 800,
              },
              value: 120,
            },
            opacity: {
              value: 0.5,
            },
            shape: {
              type: 'circle',
            },
            size: {
              value: 3,
            },
          },
          detectRetina: true,
        }}
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      <div className="absolute -top-40 -left-30 w-[420px] h-[420px] blur-[140px] opacity-35 z-0 bg-cyan-400" aria-hidden />
      <div className="absolute -bottom-50 -right-25 w-[420px] h-[420px] blur-[140px] opacity-35 z-0 bg-purple-500" aria-hidden />

      <header className="sticky top-4 z-10 mx-auto mb-[clamp(2rem,6vw,4rem)] max-w-[1100px]">
        <div className="flex items-center justify-between gap-6 py-3.5 px-6 rounded-full bg-[rgba(6,13,24,0.85)] border border-white/7 backdrop-blur-2xl shadow-[0_30px_80px_rgba(5,5,10,0.45)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-cyan-400/90 to-indigo-400/60 border border-white/15 shadow-[0_12px_30px_rgba(5,6,11,0.65)] grid place-items-center overflow-hidden" aria-hidden="true">
              <img 
                src="/AcciNet_Logo.svg" 
                alt="AcciNet Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="m-0 font-semibold">AcciNet</p>
              <span className="block text-xs text-[rgba(240,243,255,0.65)]">Crash network intelligence</span>
            </div>
          </div>
          <nav className="flex items-center gap-5 text-sm text-[rgba(240,243,255,0.75)]" aria-label="Primary">
            <a href="#platform" className="text-inherit no-underline transition-colors hover:text-white">Platform</a>
            <a href="#features" className="text-inherit no-underline transition-colors hover:text-white">Layers</a>
            <a href="#pipeline" className="text-inherit no-underline transition-colors hover:text-white">Pipeline</a>
            <Link href="/density" className="text-inherit no-underline transition-colors hover:text-white">Historical</Link>
            <a href="#contact" className="text-inherit no-underline transition-colors hover:text-white">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-[rgba(240,243,255,0.85)] no-underline text-sm">
              Docs
            </a>
            <Link className="inline-flex items-center gap-1.5 py-3 px-5.5 rounded-full font-semibold no-underline text-sm border border-transparent transition-all bg-gradient-to-r from-gray-100 to-blue-100 text-[#05060b] shadow-[0_15px_40px_rgba(17,25,40,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(17,25,40,0.45)]" href="/map">
              Launch map
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-[1] flex flex-col gap-[clamp(2.5rem,6vw,4.5rem)] max-w-[1200px] mx-auto">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(1.5rem,4vw,4rem)] items-center" id="platform">
          <div
            className="glass-panel glass-panel--strong opacity-0 translate-y-7 transition-all duration-700 ease-out p-6 lg:p-8 text-center lg:text-left"
            data-fade
          >
            <p className="text-xs tracking-[0.4em] uppercase text-[rgba(240,243,255,0.65)] m-0">Texas-wide crash forecasting</p>
            <h1 className="text-[clamp(2.25rem,4vw,3.8rem)] my-1.5 mb-4 leading-tight m-0">Predict risk. Reroute with confidence.</h1>
            <p className="text-[rgba(240,243,255,0.75)] text-base leading-relaxed max-w-[520px] m-0 mx-auto lg:mx-0">
              AcciNet fuses live traffic, weather, and historical crash intelligence to highlight safer
              corridors before an incident builds. Switch between gradient routes and hex overlays without
              losing context. Explore historical crash patterns with interactive time-series heatmaps.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3.5 mt-7">
              <Link className="glass-button text-sm font-semibold no-underline inline-flex items-center gap-1.5 py-3 px-5.5" href="/map">
                Launch map
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link className="glass-button text-sm font-semibold no-underline inline-flex items-center gap-1.5 py-3 px-5.5" href="/density">
                Historical view
                <ArrowRight size={18} aria-hidden />
              </Link>
              <a className="glass-chip inline-flex items-center gap-1.5 no-underline" href="#features">
                See capabilities
              </a>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mt-8">
              {metrics.map((metric) => (
                <div key={metric.label} className="glass-panel rounded-2xl p-4 px-5">
                  <strong className="block text-[1.7rem] mb-1.5">{metric.value}</strong>
                  <span className="text-sm text-[rgba(240,243,255,0.7)]">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center opacity-0 translate-y-7 transition-all duration-700 ease-out delay-[120ms]" aria-hidden data-fade>
            <div className="glass-panel glass-panel--strong w-full max-w-[420px] rounded-[30px] p-5">
              <div className="flex items-center justify-between text-sm text-[rgba(240,243,255,0.7)]">
                <span>Realtime overlay</span>
                <span className="px-2.5 py-0.5 rounded-full text-[0.7rem] tracking-[0.15em] uppercase border border-red-400/65 text-red-200">Live</span>
              </div>
              <div className="my-4 rounded-[22px] border border-white/8 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.35),transparent_65%),radial-gradient(circle_at_70%_70%,rgba(248,113,113,0.4),transparent_65%),#05070e] relative h-60 overflow-hidden">
                <div className="absolute top-[20%] left-[10%] w-40 h-40 rounded-full opacity-45 blur-[30px] bg-blue-500" />
                <div className="absolute bottom-[15%] right-[15%] w-40 h-40 rounded-full opacity-45 blur-[30px] bg-pink-500" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:40px_40px] opacity-25" />
                <div className="absolute inset-[30px] rounded-[30px] border border-white/8 flex items-center justify-center">
                  <div className="w-4/5 h-2 rounded-full bg-gradient-to-r from-cyan-400 via-yellow-400 to-red-500 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.7)]" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-[rgba(240,243,255,0.7)]">
                <div>
                  <p className="m-0 text-[0.7rem] uppercase tracking-[0.1em] text-[rgba(240,243,255,0.45)]">Route band</p>
                  <strong className="block text-base text-white">0.18 → 0.62 risk</strong>
                </div>
                <div>
                  <p className="m-0 text-[0.7rem] uppercase tracking-[0.1em] text-[rgba(240,243,255,0.45)]">Confidence</p>
                  <strong className="block text-base text-white">94%</strong>
                </div>
                <div>
                  <p className="m-0 text-[0.7rem] uppercase tracking-[0.1em] text-[rgba(240,243,255,0.45)]">Alternate</p>
                  <strong className="block text-base text-white">−37% exposure</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel glass-panel--strong rounded-3xl p-6 pb-12 text-center text-[rgba(240,243,255,0.75)] opacity-0 translate-y-7 transition-all duration-700 ease-out flex flex-col items-center gap-6" data-fade>
          <p className="-mb-8 max-w-[640px]">Built with transportation labs, agencies, and civic engineering teams.</p>
          <div className="flex flex-wrap justify-center gap-3 " role="list">
            {badges.map((badge, index) => (
              <div
                key={badge}
                className="glass-chip opacity-0 translate-y-7 transition-all duration-700 ease-out"
                role="listitem"
                data-fade
                style={{ transitionDelay: `${150 + index * 40}ms` }}
              >
                {badge}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-8 mb-8" id="features">
          <div className="rounded-3xl glass-panel glass-panel--strong opacity-0 translate-y-7 transition-all duration-700 ease-out p-6 lg:p-8 text-center lg:text-left" data-fade>
            <p className="text-xs tracking-[0.4em] uppercase text-[rgba(240,243,255,0.65)] m-0">Precision overlays</p>
            <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] my-2 m-0">Layers that explain the network at a glance.</h2>
            <p className="m-0 text-[rgba(240,243,255,0.75)] max-w-[560px] mx-auto lg:mx-0">
              Toggle between routes, hex grids, and crash cards without reloading. Every surface stays in
              sync so analysts and operators stay aligned.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="glass-panel glass-panel--strong p-6 rounded-2xl min-h-[190px] transition-all hover:-translate-y-[1.5px] opacity-0 translate-y-7 duration-700 ease-out"
                  data-fade
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 grid place-items-center text-cyan-300">
                    <Icon size={18} aria-hidden />
                  </div>
                  <h3 className="my-3 mt-3 text-base m-0">{feature.title}</h3>
                  <p className="m-0 text-[rgba(240,243,255,0.7)] text-sm leading-relaxed">{feature.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" id="pipeline">
          <div
            className="glass-panel glass-panel--strong rounded-[1.8rem] p-6 lg:p-8 opacity-0 translate-y-7 transition-all duration-700 ease-out flex flex-col h-full"
            data-fade
            style={{ transitionDelay: '60ms' }}
          >
            <p className="text-xs tracking-[0.4em] uppercase text-[rgba(240,243,255,0.65)] m-0">Signal fusion</p>
            <h3 className="m-0 my-2">From raw feeds to actionable layers.</h3>
            <p className="m-0 my-2">
              AcciNet keeps every dataset synchronized and versioned. You're always looking at the latest
              risk context without re-running notebooks.
            </p>
            <ul className="list-none p-0 my-6 flex flex-col gap-3.5 text-[rgba(240,243,255,0.8)]">
              <li className="flex items-start gap-2.5">
                <Shield size={18} aria-hidden />
                <span>Data integrity rules guard against leakage and stale scores.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapIcon size={18} aria-hidden />
                <span>Route + hex overlays are optimized for MapLibre and Leaflet.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Radar size={18} aria-hidden />
                <span>Live incidents fade in with gentle motion cues for dispatch clarity.</span>
              </li>
            </ul>
            <Link className="glass-button inline-flex items-center gap-1.5 py-3 px-5.5 font-semibold no-underline text-sm mt-4 lg:mt-auto" href="/map">
              Explore the live view
            </Link>
          </div>

          <div className="glass-panel glass-panel--strong rounded-[1.8rem] pt-6 pb-16 px-6 lg:p-8 flex flex-col gap-4 h-full my-8">
            {pipeline.map((step, index) => (
              <div
                key={step.title}
                className="glass-panel flex gap-4 p-4.5 px-5 rounded-2xl opacity-0 translate-y-7 transition-all duration-700 ease-out"
                data-fade
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="text-sm tracking-[0.3em] text-[rgba(240,243,255,0.6)]">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h4 className="m-0 mb-1.5">{step.title}</h4>
                  <p className="m-0 text-[rgba(240,243,255,0.7)] leading-snug">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel glass-panel--strong mt-4 p-[clamp(1.5rem,3vw,2.5rem)] rounded-3xl flex flex-wrap justify-between gap-5 items-center opacity-0 translate-y-7 transition-all duration-700 ease-out" id="contact" data-fade>
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-[rgba(240,243,255,0.65)] m-0">Deploy AcciNet</p>
            <h3 className="m-0 my-2">Bring safer routing to your network.</h3>
            <p className="m-0 mt-1.5 text-[rgba(240,243,255,0.85)] max-w-[540px]">Embed the map, stream the data, or partner with us on corridor pilots across Texas.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link className="glass-button inline-flex items-center gap-1.5 py-3 px-5.5 font-semibold no-underline text-sm" href="/map">
              Launch map
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link className="glass-button inline-flex items-center gap-1.5 py-3 px-5.5 font-semibold no-underline text-sm" href="/density">
              Historical analysis
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a className="glass-chip inline-flex items-center gap-1.5 no-underline" href="mailto:team@accinet.ai">
              Contact team
            </a>
          </div>
        </section>
      </main>

      <footer className="mt-12 pt-8 border-t border-white/5 flex justify-between flex-wrap gap-2 text-sm text-[rgba(240,243,255,0.65)]">
        <span>© {year} AcciNet</span>
        <div>
          <a href="mailto:press@accinet.ai" className="text-inherit no-underline ml-4 hover:text-white">Press</a>
          <Link href="/map" className="text-inherit no-underline ml-4 hover:text-white">Live map</Link>
          <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-inherit no-underline ml-4 hover:text-white">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
