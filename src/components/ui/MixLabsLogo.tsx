/**
 * MixLabs brand mark — the bowtie/cross-arrows logo.
 * Uses currentColor so it inherits whatever text color the parent sets.
 * Works correctly in dark mode (white parent text → white logo)
 * and light mode (dark parent text → dark logo). Never inverts.
 *
 * Usage:
 *   <MixLabsLogo size={20} />
 */
export default function MixLabsLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MixLabs"
    >
      {/* Left triangle — points right ► */}
      <path d="M 1 1 L 1 35 L 27 18 Z" fill="currentColor" />
      {/* Right triangle — points left ◄ */}
      <path d="M 43 1 L 43 35 L 17 18 Z" fill="currentColor" />
      {/* Vertical bar on the right | */}
      <rect x="46" y="1" width="7" height="34" rx="1.5" fill="currentColor" />
    </svg>
  );
}
