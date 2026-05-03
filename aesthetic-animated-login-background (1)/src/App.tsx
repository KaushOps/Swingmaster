import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";

type PointerPosition = {
  x: number;
  y: number;
};

const defaultPointer = { x: 52, y: 34 } satisfies PointerPosition;

export default function App() {
  const [pointer, setPointer] = useState<PointerPosition>(defaultPointer);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    document.title = "Aureline | Sign in";
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    setPointer({
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#e7dfd1] text-[#1d140f]"
      onPointerLeave={() => setPointer(defaultPointer)}
      onPointerMove={handlePointerMove}
      style={{
        "--pointer-x": `${pointer.x}%`,
        "--pointer-y": `${pointer.y}%`,
      } as CSSProperties}
    >
      <div className="absolute inset-0 mesh opacity-95" />
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(circle at var(--pointer-x) var(--pointer-y), rgba(255,255,255,0.5), transparent 18%), radial-gradient(circle at 18% 20%, rgba(219,74,43,0.25), transparent 30%), radial-gradient(circle at 82% 80%, rgba(248,163,72,0.22), transparent 26%)",
        }}
      />
      <div className="absolute inset-0 grain mix-blend-soft-light" />
      <div className="absolute -left-28 top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#db4a2b]/35 blur-3xl animate-float-slow" />
      <div className="absolute right-[-10rem] top-[8%] h-[26rem] w-[26rem] rounded-full bg-[#f8a348]/35 blur-3xl animate-float-medium" />
      <div className="absolute bottom-[-8rem] left-[20%] h-[22rem] w-[22rem] rounded-full bg-[#8d5738]/20 blur-3xl animate-drift" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="absolute inset-y-0 left-[58%] hidden w-px bg-gradient-to-b from-transparent via-[#c97b53]/35 to-transparent lg:block" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 lg:px-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="max-w-2xl animate-rise">
            <div className="flex items-center gap-3 text-[#6f574b]">
              <LogoMark />
              <span className="text-xs uppercase tracking-[0.45em]">Aureline Studio</span>
            </div>
            <h1 className="mt-6 text-6xl font-semibold leading-[0.88] tracking-[-0.08em] text-[#1d140f] sm:text-7xl lg:text-[7.4rem]">
              Sign in through a warmer lens.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5c4b40]">
              A fluid editorial login surface inspired by poster design, soft haze, and moving color fields.
            </p>
            <p className="mt-8 max-w-lg text-sm uppercase tracking-[0.28em] text-[#8b6f60]">
              Calm motion. Quiet contrast. Immediate focus.
            </p>
          </section>

          <section className="relative lg:justify-self-end">
            <div className="absolute -inset-8 rounded-[2.75rem] bg-white/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/40 bg-[rgba(255,250,244,0.48)] p-8 shadow-[0_30px_120px_rgba(56,30,14,0.18)] backdrop-blur-2xl animate-rise [animation-delay:140ms] sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-[#8a6a5c]">Secure access</p>
                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#1e1612]">
                    Welcome back
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d6b9a6]/60 bg-white/55">
                  <LockIcon />
                </div>
              </div>

              {signedIn ? (
                <div className="mt-10 space-y-5">
                  <div className="rounded-[1.5rem] border border-[#d4b8a7]/50 bg-white/45 p-5 text-[#4f3f36]">
                    <p className="text-sm uppercase tracking-[0.3em] text-[#8b6f60]">Session ready</p>
                    <p className="mt-3 text-lg leading-8">
                      Your demo login submitted cleanly. Hook this surface to your auth provider when ready.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSignedIn(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d4b8a7]/60 px-5 py-3 text-sm font-medium text-[#2a1d16] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/65"
                  >
                    Return to login
                  </button>
                </div>
              ) : (
                <form
                  className="mt-10 space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSignedIn(true);
                  }}
                >
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-[#4f3f36]">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@studio.com"
                      className="w-full border-b border-[#c9ac98]/70 bg-transparent px-0 pb-3 text-base text-[#1e1612] placeholder:text-[#8b6f60]/70 outline-none transition-colors duration-300 focus:border-[#d95d31]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-4">
                      <label htmlFor="password" className="text-sm font-medium text-[#4f3f36]">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-sm text-[#8b6f60] transition-colors duration-300 hover:text-[#d95d31]"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full border-b border-[#c9ac98]/70 bg-transparent px-0 pb-3 text-base text-[#1e1612] placeholder:text-[#8b6f60]/70 outline-none transition-colors duration-300 focus:border-[#d95d31]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(120deg,#1e1612_10%,#b94a2c_46%,#ef9d44_86%)] bg-[length:200%_200%] px-6 py-4 text-sm font-semibold uppercase tracking-[0.34em] text-[#fff8f1] shadow-[0_16px_40px_rgba(146,66,33,0.3)] transition-transform duration-300 hover:-translate-y-0.5 animate-sheen"
                  >
                    <span className="relative z-10">Enter workspace</span>
                    <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.26)_50%,transparent_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </button>

                  <p className="text-sm leading-6 text-[#6d574a]">
                    By continuing, you accept the calm chaos of this demo interface.
                  </p>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LogoMark() {
  return (
    <svg className="h-5 w-5 text-[#d05a31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3 4.5 20.5h15L12 3Z" />
      <path d="M12 8v6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-5 w-5 text-[#a86a50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </svg>
  );
}
