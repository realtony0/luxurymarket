"use client";

import Link from "next/link";
import Image from "next/image";

const motionClass = "animate-[fade-in-up_0.5s_var(--ease-out-expo)_both]";

export default function HomeHero() {
  const delay = (i: number) => ({ animationDelay: `${i * 80}ms` });

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="absolute inset-0">
        <Image
          src="/IMG_5635.JPG"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div
          className="absolute inset-0 bg-[var(--foreground)]/70 transition-opacity duration-700"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className={`font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl ${motionClass}`}
          style={delay(0)}
        >
          Luxury Market
        </h1>
        <p
          className={`mt-3 text-[var(--muted)] sm:text-lg ${motionClass}`}
          style={delay(1)}
        >
          Mode et univers. Livraison internationale.
        </p>
        <div className={`mt-10 flex flex-col items-center gap-3 ${motionClass}`} style={delay(2)}>
          <Link
            href="/mode"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-white transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foreground)]"
          >
            Mode
          </Link>
          <Link
            href="/tout"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full border-2 border-[var(--muted)] bg-transparent px-8 py-3.5 text-sm font-medium text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foreground)]"
          >
            Tout
          </Link>
        </div>
        <p
          className={`mt-8 text-center text-xs text-[var(--muted)] ${motionClass}`}
          style={delay(3)}
        >
          Livraison internationale
        </p>
      </div>
    </div>
  );
}
