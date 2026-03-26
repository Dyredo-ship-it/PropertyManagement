import React from "react";

/**
 * ImmoStore brand logo — renders the actual logo image file.
 */
export function ImmoStoreLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="ImmoStore"
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
