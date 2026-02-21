import Link from "next/link";
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] active:scale-[0.98]",
  secondary:
    "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 active:scale-[0.98]",
  outline:
    "border-2 border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]/10",
} as const;

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-3.5 text-sm",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
