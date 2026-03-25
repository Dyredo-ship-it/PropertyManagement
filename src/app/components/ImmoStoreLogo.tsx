import React from "react";

/**
 * ImmoStore brand logo — a stylized building silhouette inside a rounded shape.
 * Renders as an SVG so it scales perfectly at any size.
 */
export function ImmoStoreLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="14" fill="var(--primary)" />

      {/* Main building (center tall) */}
      <rect x="18" y="10" width="12" height="28" rx="2" fill="white" opacity="0.95" />
      {/* Windows on main building */}
      <rect x="21" y="14" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      <rect x="24.5" y="14" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      <rect x="21" y="19" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      <rect x="24.5" y="19" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      <rect x="21" y="24" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      <rect x="24.5" y="24" width="2.5" height="2.5" rx="0.5" fill="var(--primary)" opacity="0.4" />
      {/* Door */}
      <rect x="22" y="32" width="4" height="6" rx="1" fill="var(--primary)" opacity="0.3" />

      {/* Left building (shorter) */}
      <rect x="8" y="20" width="9" height="18" rx="2" fill="white" opacity="0.75" />
      <rect x="10.5" y="23" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="13.5" y="23" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="10.5" y="27" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="13.5" y="27" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />

      {/* Right building (medium) */}
      <rect x="31" y="16" width="9" height="22" rx="2" fill="white" opacity="0.85" />
      <rect x="33.5" y="19" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="36.5" y="19" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="33.5" y="23" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="36.5" y="23" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="33.5" y="27" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
      <rect x="36.5" y="27" width="2" height="2" rx="0.5" fill="var(--primary)" opacity="0.3" />
    </svg>
  );
}
