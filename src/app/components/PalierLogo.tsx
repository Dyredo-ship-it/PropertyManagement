import React from "react";

/**
 * Palier brand logo — renders the actual logo image file.
 */
export function PalierLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="Palier"
      width={size}
      height={size}
      className={className}
      style={{
        borderRadius: size * 0.22,
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}
