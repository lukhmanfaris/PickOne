import React, { useState } from "react";
import { Work } from "../types";

interface VectorArtworkProps {
  work: Work;
  index: number;
  className?: string;
}

export const VectorArtwork: React.FC<VectorArtworkProps> = ({ work, index, className = "" }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // If user provided an image and it hasn't errored
  if (work.img && !imgFailed) {
    return (
      <img
        src={work.img}
        alt={work.name}
        onError={() => setImgFailed(true)}
        className={`w-full h-full object-contain p-2 select-none ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Generative vector lockups matching the reference aesthetic
  const name = (work.name || "Route").slice(0, 18);
  const styleIdx = typeof work.presetStyle === "number" ? work.presetStyle : index % 5;
  const ink = "#1d2129";
  const blue = "#007AFF";
  const brass = "#F5A623";

  switch (styleIdx) {
    case 0:
      // Kinetic Swiss: Modern sans, geometric divider, vibrant accent
      return (
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full ${className}`}
        >
          <defs>
            <linearGradient id={`grad0-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7f9fc" />
              <stop offset="100%" stopColor="#e9eef5" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#grad0-${index})`} rx="8" />
          <circle cx="200" cy="115" r="32" fill="none" stroke={blue} strokeWidth="3" strokeDasharray="6 4" />
          <text
            x="200"
            y="170"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="800"
            fontSize="34"
            letterSpacing="-0.03em"
            fill={ink}
          >
            {name}
          </text>
          <line x1="140" y1="192" x2="260" y2="192" stroke={brass} strokeWidth="2.5" strokeLinecap="round" />
          <text
            x="200"
            y="218"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="10"
            letterSpacing="3"
            fill="#687385"
          >
            ROUTE {index + 1 < 10 ? `0${index + 1}` : index + 1}
          </text>
        </svg>
      );

    case 1:
      // Neo-Monolith: Solid cobalt blue card with clean white branding
      return (
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full ${className}`}
        >
          <rect width="400" height="300" fill={blue} rx="8" />
          <rect x="30" y="30" width="340" height="240" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="4" />
          <text
            x="200"
            y="155"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize="36"
            letterSpacing="-0.02em"
            fill="#ffffff"
          >
            {name}
          </text>
          <circle cx="200" cy="190" r="4.5" fill={brass} />
          <line x1="170" y1="190" x2="188" y2="190" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="212" y1="190" x2="230" y2="190" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>
      );

    case 2:
      // Soft Organic: Architectural boundary with spaced tracking
      return (
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full ${className}`}
        >
          <defs>
            <linearGradient id={`grad2-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fafbfe" />
              <stop offset="100%" stopColor="#ebf0f7" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#grad2-${index})`} rx="8" />
          <rect x="42" y="42" width="316" height="216" fill="none" stroke={ink} strokeWidth="1.5" rx="3" />
          <rect x="48" y="48" width="304" height="204" fill="none" stroke="rgba(0,122,255,0.15)" strokeWidth="1" rx="2" />
          <text
            x="200"
            y="158"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="400"
            fontSize="28"
            letterSpacing="6"
            fill={ink}
          >
            {name.toUpperCase()}
          </text>
          <circle cx="200" cy="190" r="3" fill={blue} />
        </svg>
      );

    case 3:
      // Dual Horizon: Overlapping geometric shapes
      return (
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full ${className}`}
        >
          <defs>
            <linearGradient id={`grad3-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdfdfd" />
              <stop offset="100%" stopColor="#f0f3f8" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#grad3-${index})`} rx="8" />
          <g transform="translate(45, 10)">
            <path d="M40 160 L100 70 L160 160 Z" fill={brass} />
            <path d="M120 160 L180 70 L240 160 Z" fill={blue} opacity="0.88" />
          </g>
          <text
            x="200"
            y="218"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="600"
            fontSize="24"
            letterSpacing="-0.01em"
            fill={ink}
          >
            {name}
          </text>
        </svg>
      );

    case 4:
    default:
      // Atelier Serif: Editorial balance
      return (
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full ${className}`}
        >
          <defs>
            <linearGradient id={`grad4-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f6f7fb" />
              <stop offset="100%" stopColor="#e3e8f0" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#grad4-${index})`} rx="8" />
          <circle cx="200" cy="115" r="40" fill="none" stroke={ink} strokeWidth="1" />
          <circle cx="200" cy="115" r="46" fill="none" stroke={brass} strokeWidth="0.75" strokeDasharray="3 3" />
          <text
            x="200"
            y="126"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontStyle="italic"
            fontWeight="700"
            fontSize="30"
            fill={blue}
          >
            {name.charAt(0) || "D"}
          </text>
          <text
            x="200"
            y="190"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontWeight="600"
            fontSize="26"
            letterSpacing="0.02em"
            fill={ink}
          >
            {name}
          </text>
          <text
            x="200"
            y="216"
            textAnchor="middle"
            fontFamily="-apple-system, sans-serif"
            fontSize="10"
            letterSpacing="2"
            fill="#7b8494"
          >
            CONCEPT EDITION
          </text>
        </svg>
      );
  }
};
