"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Props = {
  name: string;
  images: string[];
};

export default function ProductGallery({ name, images }: Props) {
  const gallery = useMemo(
    () =>
      Array.from(
        new Set(
          images
            .map((image) => (typeof image === "string" ? image.trim() : ""))
            .filter(Boolean)
        )
      ),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] || gallery[0] || "";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--card)]">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : null}
      </div>

      {gallery.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {gallery.map((image, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                  selected
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                }`}
                aria-label={`Voir photo ${index + 1}`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="96px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
