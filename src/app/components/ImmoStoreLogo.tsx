import React from "react";

/**
 * ImmoStore brand logo — geometric house silhouette on dark background
 * with an accent circle, inspired by modern real-estate branding.
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
      {/* Dark rounded background */}
      <rect width="48" height="48" rx="12" fill="#1C201E" />

      {/* Orange accent circle — top right */}
      <circle cx="40" cy="8" r="5" fill="#E85D2A" />

      {/* House / building silhouette — white geometric shape */}
      {/* Roof / triangle peak */}
      <path
        d="M24 8L36 20V40H28V28H20V40H12V20L24 8Z"
        fill="white"
      />
      {/* Inner cutout to form the chimney / roof detail */}
      <rect x="22" y="28" width="4" height="12" fill="#1C201E" />
    </svg>
  );
}
