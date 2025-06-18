import React from "react";

/**
 * PUBLIC_INTERFACE
 * TradeFusionLogo - SVG logo for the TradeFusion app that visually combines finance and modern vibes.
 * Use next to logo/app name for brand identity.
 */
const TradeFusionLogo = ({ size = 28, style = {}, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    style={{
      display: "inline-block",
      verticalAlign: "middle",
      ...style,
    }}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="TradeFusion Logo"
    role="img"
  >
    {/* Outer Circle: fintech blue */}
    <circle
      cx="16"
      cy="16"
      r="15"
      fill="#0f4c81"
      stroke="#ff6f61"
      strokeWidth="2.4"
    />
    {/* Graph lines: stylized 'fusion/arrows' */}
    <polyline
      points="8,21 14,14 18,19 24,8"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Accent spark: */}
    <circle
      cx="24"
      cy="8"
      r="2"
      fill="#ff6f61"
      stroke="#fff"
      strokeWidth="1"
    />
  </svg>
);

export default TradeFusionLogo;
