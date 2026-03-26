import React from "react";

/**
 * ImmoStore brand logo — white house silhouette with a vertical split
 * on a dark rounded background, with an orange accent dot.
 * Matches the reference: two halves of a house with a gap in the middle.
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
      <rect width="48" height="48" rx="11" fill="#1A1D1B" />

      {/* Orange accent circle — top right */}
      <circle cx="40.5" cy="7.5" r="4.5" fill="#E8572A" />

      {/* House silhouette — left half */}
      <path
        d="M10 22L22.5 10V38H10V22Z"
        fill="white"
      />

      {/* House silhouette — right half */}
      <path
        d="M38 22L25.5 10V38H38V22Z"
        fill="white"
      />
    </svg>
  );
}
