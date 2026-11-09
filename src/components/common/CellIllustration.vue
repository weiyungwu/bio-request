<template>
  <!-- Decorative hero art (stylized cell). Carries no required information. -->
  <svg viewBox="0 0 240 240" role="img" aria-label="細胞插畫" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cell-body" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#132a52" stop-opacity="0.9" />
      </radialGradient>
    </defs>
    <ellipse
      cx="120"
      cy="120"
      rx="104"
      ry="92"
      fill="url(#cell-body)"
      stroke="#2dd4bf"
      stroke-width="5"
    />
    <circle cx="112" cy="112" r="34" fill="#1c3a6b" stroke="#facc15" stroke-width="4" />
    <circle cx="104" cy="104" r="11" fill="#facc15" opacity="0.85" />
    <g fill="#a3e635" stroke="#0b1b3a" stroke-width="2">
      <ellipse cx="170" cy="86" rx="20" ry="10" transform="rotate(-25 170 86)" />
      <ellipse cx="66" cy="166" rx="18" ry="9" transform="rotate(20 66 166)" />
    </g>
    <path
      d="M150 150 q12 -10 24 0 t24 0"
      fill="none"
      stroke="#fca5a5"
      stroke-width="4"
      stroke-linecap="round"
    />
    <g fill="#e8f0fb" opacity="0.7">
      <circle cx="70" cy="80" r="4" />
      <circle cx="160" cy="180" r="3" />
      <circle cx="186" cy="130" r="3.5" />
      <circle cx="92" cy="186" r="3" />
    </g>
  </svg>
</template>
