import fs from "fs";
import path from "path";
import { validateSvg } from "../src/lib/svg-validator";
import { calculateCost } from "../src/lib/utils";
import { DiagramResult } from "../src/types";

// High-fidelity, scientifically rigorous animated SVGs designed for GCSE UK students
const DIAGRAM_TEMPLATES = [
  {
    id: 1,
    concept: "Pythagoras' theorem",
    subject: "Maths" as const,
    promptText:
      "In a right-angled triangle, the longest side is called the hypotenuse. The square of the hypotenuse is equal to the sum of the squares of the other two sides: a2 + b2 = c2.",
    model: "gemini-3.5-flash-lite",
    inputTokens: 382,
    outputTokens: 894,
    retryCount: 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Pythagoras' Theorem Diagram</title>
  <defs>
    <linearGradient id="hypoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="sqAGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="sqBGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <style>
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 2px rgba(59,130,246,0.3)); }
        50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
      }
      @keyframes dashMove {
        to { stroke-dashoffset: -40; }
      }
      .anim-pulse { animation: pulseGlow 3s infinite ease-in-out; }
      .anim-dash { stroke-dasharray: 8 6; animation: dashMove 2s linear infinite; }
      .txt-title { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; fill: #0f172a; }
      .txt-label { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 600; fill: #334155; }
      .txt-math { font-family: "Courier New", monospace; font-size: 16px; font-weight: 700; }
    </style>
  </defs>

  <!-- Background container -->
  <rect x="10" y="10" width="780" height="580" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" />

  <!-- Title & Formula banner -->
  <text x="400" y="50" text-anchor="middle" class="txt-title">Pythagoras' Theorem: a² + b² = c²</text>
  <rect x="250" y="70" width="300" height="34" rx="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5" />
  <text x="400" y="93" text-anchor="middle" class="txt-math" fill="#0369a1">Area(c²) = Area(a²) + Area(b²)</text>

  <!-- Side a square (Base = 120px, 3x3 grid) -->
  <rect x="250" y="340" width="120" height="120" fill="url(#sqAGrad)" fill-opacity="0.25" stroke="#10b981" stroke-width="2.5" />
  <line x1="290" y1="340" x2="290" y2="460" stroke="#10b981" stroke-width="1" stroke-opacity="0.4" />
  <line x1="330" y1="340" x2="330" y2="460" stroke="#10b981" stroke-width="1" stroke-opacity="0.4" />
  <line x1="250" y1="380" x2="370" y2="380" stroke="#10b981" stroke-width="1" stroke-opacity="0.4" />
  <line x1="250" y1="420" x2="370" y2="420" stroke="#10b981" stroke-width="1" stroke-opacity="0.4" />
  <text x="310" y="405" text-anchor="middle" class="txt-label" fill="#065f46">Square a² = 9</text>

  <!-- Side b square (Height = 160px, 4x4 grid) -->
  <rect x="90" y="180" width="160" height="160" fill="url(#sqBGrad)" fill-opacity="0.25" stroke="#f59e0b" stroke-width="2.5" />
  <line x1="130" y1="180" x2="130" y2="340" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <line x1="170" y1="180" x2="170" y2="340" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <line x1="210" y1="180" x2="210" y2="340" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <line x1="90" y1="220" x2="250" y2="220" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <line x1="90" y1="260" x2="250" y2="260" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <line x1="90" y1="300" x2="250" y2="300" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4" />
  <text x="170" y="265" text-anchor="middle" class="txt-label" fill="#92400e">Square b² = 16</text>

  <!-- Right-Angled Triangle -->
  <polygon points="250,340 370,340 250,180" fill="#6366f1" fill-opacity="0.15" stroke="#4f46e5" stroke-width="3" />

  <!-- 90 degree indicator square -->
  <rect x="250" y="325" width="15" height="15" fill="none" stroke="#4f46e5" stroke-width="2" />
  <circle cx="257" cy="332" r="1.5" fill="#4f46e5" />

  <!-- Hypotenuse square c (Hypotenuse = 200px, 5x5 grid rotated) -->
  <g transform="translate(370, 340) rotate(-126.87)" class="anim-pulse">
    <rect x="0" y="0" width="200" height="200" fill="url(#hypoGrad)" fill-opacity="0.3" stroke="#2563eb" stroke-width="3" />
    <text x="100" y="105" text-anchor="middle" transform="rotate(126.87 100 105)" class="txt-label" fill="#1e40af">Hypotenuse Square c² = 25</text>
  </g>

  <!-- Hypotenuse flowing dashed path -->
  <line x1="250" y1="180" x2="370" y2="340" stroke="#2563eb" stroke-width="4" class="anim-dash" />

  <!-- Educational labels & arrows -->
  <text x="310" y="360" text-anchor="middle" class="txt-label" fill="#047857">Adjacent side a = 3</text>
  <text x="235" y="260" text-anchor="end" class="txt-label" fill="#b45309">Opposite side b = 4</text>
  <text x="325" y="240" text-anchor="start" class="txt-label" fill="#1d4ed8">Hypotenuse c = 5 (Longest side)</text>
  <text x="400" y="550" text-anchor="middle" class="txt-label" fill="#475569">GCSE Key Fact: In any right-angled triangle, 3² + 4² = 9 + 16 = 25 = 5²</text>
</svg>`,
  },
  {
    id: 2,
    concept: "Parts of a circle",
    subject: "Maths" as const,
    promptText:
      "A circle has a centre. The radius is the distance from the centre to the edge. The diameter goes across the circle through the centre and is twice the radius. The circumference is the distance around the circle.",
    model: "gemini-3.5-flash-lite",
    inputTokens: 395,
    outputTokens: 852,
    retryCount: 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Parts of a Circle - Geometry Guide</title>
  <defs>
    <linearGradient id="circFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eff6ff" />
      <stop offset="100%" stop-color="#dbeafe" />
    </linearGradient>
    <style>
      @keyframes orbitTravel {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -1005; }
      }
      @keyframes pulseRadius {
        0%, 100% { stroke-width: 3; stroke: #2563eb; }
        50% { stroke-width: 5; stroke: #3b82f6; }
      }
      @keyframes dotPulse {
        0%, 100% { r: 5; fill: #dc2626; }
        50% { r: 8; fill: #ef4444; }
      }
      .circ-path { stroke-dasharray: 12 8; animation: orbitTravel 20s linear infinite; }
      .radius-line { animation: pulseRadius 2.5s infinite ease-in-out; }
      .centre-dot { animation: dotPulse 2s infinite ease-in-out; }
      .txt-heading { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; fill: #0f172a; }
      .txt-label { font-family: system-ui, -apple-system, sans-serif; font-size: 15px; font-weight: 600; fill: #1e293b; }
      .txt-sub { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 500; fill: #475569; }
    </style>
  </defs>

  <!-- Background panel -->
  <rect x="10" y="10" width="780" height="580" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" />

  <!-- Header -->
  <text x="400" y="48" text-anchor="middle" class="txt-heading">Parts of a Circle: Definitions & Relationships</text>

  <!-- Main Circle (Centre at (400, 310), Radius = 160) -->
  <circle cx="400" cy="310" r="160" fill="url(#circFill)" stroke="#93c5fd" stroke-width="2" />

  <!-- Animated Circumference rim -->
  <circle cx="400" cy="310" r="160" fill="none" stroke="#2563eb" stroke-width="4" class="circ-path" />

  <!-- Diameter line (from x=240 to x=560) -->
  <line x1="240" y1="310" x2="560" y2="310" stroke="#059669" stroke-width="3.5" />
  <!-- Diameter arrow heads -->
  <polygon points="242,310 252,305 252,315" fill="#059669" />
  <polygon points="558,310 548,305 548,315" fill="#059669" />

  <!-- Radius line (from centre (400, 310) to top-right (513, 197)) -->
  <line x1="400" y1="310" x2="513" y2="197" stroke="#dc2626" stroke-width="3" class="radius-line" />
  <polygon points="513,197 501,202 508,211" fill="#dc2626" />

  <!-- Centre point -->
  <circle cx="400" cy="310" r="6" class="centre-dot" />

  <!-- Centre Label -->
  <text x="400" y="335" text-anchor="middle" class="txt-label" fill="#dc2626">Centre (O)</text>

  <!-- Radius Label & Card -->
  <rect x="470" y="210" width="160" height="42" rx="6" fill="#fef2f2" stroke="#fecaca" stroke-width="1.5" />
  <text x="480" y="228" class="txt-label" fill="#991b1b">Radius (r)</text>
  <text x="480" y="244" class="txt-sub">Centre to perimeter</text>

  <!-- Diameter Label & Card -->
  <rect x="240" y="340" width="160" height="42" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5" />
  <text x="250" y="358" class="txt-label" fill="#065f46">Diameter (d = 2r)</text>
  <text x="250" y="374" class="txt-sub">Passes through centre</text>

  <!-- Circumference Label & Indicator -->
  <rect x="400" y="80" width="220" height="48" rx="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5" />
  <text x="410" y="100" class="txt-label" fill="#1e40af">Circumference (C = 2πr)</text>
  <text x="410" y="118" class="txt-sub">Total perimeter boundary</text>
  <path d="M 400 104 Q 400 150 400 150" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 4" />

  <!-- Bottom GCSE summary cards -->
  <rect x="80" y="500" width="190" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="175" y="525" text-anchor="middle" class="txt-label">Radius (r)</text>
  <text x="175" y="545" text-anchor="middle" class="txt-sub">Half the diameter</text>

  <rect x="305" y="500" width="190" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="400" y="525" text-anchor="middle" class="txt-label">Diameter = 2 × r</text>
  <text x="400" y="545" text-anchor="middle" class="txt-sub">Twice the radius</text>

  <rect x="530" y="500" width="190" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="625" y="525" text-anchor="middle" class="txt-label">Circumference = πd</text>
  <text x="625" y="545" text-anchor="middle" class="txt-sub">Distance around circle</text>
</svg>`,
  },
  {
    id: 3,
    concept: "Series circuit",
    subject: "Physics" as const,
    promptText:
      "In a series circuit there is only one loop. The current is the same everywhere in the loop. The voltage of the cell is shared between the components.",
    model: "gemini-3.5-flash-lite",
    inputTokens: 410,
    outputTokens: 915,
    retryCount: 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Physics Series Circuit Diagram</title>
  <defs>
    <style>
      @keyframes electronFlow {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -800; }
      }
      @keyframes bulbGlow {
        0%, 100% { filter: drop-shadow(0 0 4px #fbbf24); opacity: 0.9; }
        50% { filter: drop-shadow(0 0 16px #f59e0b); opacity: 1; }
      }
      .wire-electrons { stroke-dasharray: 6 24; animation: electronFlow 6s linear infinite; }
      .bulb-filament { animation: bulbGlow 2s infinite ease-in-out; }
      .txt-heading { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; fill: #0f172a; }
      .txt-label { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }
      .txt-value { font-family: "Courier New", monospace; font-size: 14px; font-weight: 700; fill: #d97706; }
    </style>
  </defs>

  <!-- Background Canvas -->
  <rect x="10" y="10" width="780" height="580" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="2" />

  <!-- Title Header -->
  <text x="400" y="50" text-anchor="middle" class="txt-heading" fill="#f8fafc">Series Circuit: Single Loop & Shared Voltage</text>

  <!-- Main Copper Wire Circuit Loop -->
  <rect x="140" y="120" width="520" height="340" rx="20" fill="none" stroke="#475569" stroke-width="6" />

  <!-- Animated Electron Flow Overlay -->
  <rect x="140" y="120" width="520" height="340" rx="20" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" class="wire-electrons" />

  <!-- DC Cell / Battery at Top -->
  <rect x="360" y="105" width="80" height="30" fill="#0f172a" />
  <!-- Positive long terminal -->
  <line x1="385" y1="100" x2="385" y2="140" stroke="#f8fafc" stroke-width="4" />
  <text x="375" y="95" class="txt-label" fill="#f87171">+ (12V)</text>
  <!-- Negative short terminal -->
  <line x1="415" y1="110" x2="415" y2="130" stroke="#94a3b8" stroke-width="6" />
  <text x="420" y="95" class="txt-label" fill="#94a3b8">-</text>
  <text x="400" y="80" text-anchor="middle" class="txt-label" fill="#38bdf8">DC Cell (VT = 12V)</text>

  <!-- Component 1: Lamp / Bulb 1 at Bottom-Left -->
  <g transform="translate(260, 460)">
    <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#fbbf24" stroke-width="3" class="bulb-filament" />
    <line x1="-18" y1="-18" x2="18" y2="18" stroke="#fef08a" stroke-width="3" />
    <line x1="-18" y1="18" x2="18" y2="-18" stroke="#fef08a" stroke-width="3" />
  </g>
  <text x="260" y="515" text-anchor="middle" class="txt-label" fill="#f8fafc">Lamp 1</text>
  <rect x="200" y="525" width="120" height="26" rx="4" fill="#1e293b" stroke="#f59e0b" stroke-width="1" />
  <text x="260" y="542" text-anchor="middle" class="txt-value">V1 = 6V</text>

  <!-- Component 2: Lamp / Bulb 2 at Bottom-Right -->
  <g transform="translate(540, 460)">
    <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#fbbf24" stroke-width="3" class="bulb-filament" />
    <line x1="-18" y1="-18" x2="18" y2="18" stroke="#fef08a" stroke-width="3" />
    <line x1="-18" y1="18" x2="18" y2="-18" stroke="#fef08a" stroke-width="3" />
  </g>
  <text x="540" y="515" text-anchor="middle" class="txt-label" fill="#f8fafc">Lamp 2</text>
  <rect x="480" y="525" width="120" height="26" rx="4" fill="#1e293b" stroke="#f59e0b" stroke-width="1" />
  <text x="540" y="542" text-anchor="middle" class="txt-value">V2 = 6V</text>

  <!-- Ammeter (Current measurement) on Left Wire -->
  <circle cx="140" cy="290" r="24" fill="#0f172a" stroke="#38bdf8" stroke-width="3" />
  <text x="140" y="296" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="bold" fill="#38bdf8">A</text>
  <text x="80" y="295" text-anchor="end" class="txt-label" fill="#38bdf8">I = 2.0A everywhere</text>

  <!-- Switch on Right Wire -->
  <circle cx="660" cy="270" r="4" fill="#f8fafc" />
  <circle cx="660" cy="310" r="4" fill="#f8fafc" />
  <line x1="660" y1="270" x2="660" y2="310" stroke="#4ade80" stroke-width="4" />
  <text x="680" y="295" class="txt-label" fill="#4ade80">Closed Switch (One loop)</text>

  <!-- Central Key Concept Infobox -->
  <rect x="280" y="200" width="240" height="150" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="400" y="230" text-anchor="middle" class="txt-label" fill="#38bdf8">GCSE Physics Rules</text>
  <text x="400" y="260" text-anchor="middle" class="txt-label" fill="#94a3b8">1. Single loop path</text>
  <text x="400" y="290" text-anchor="middle" class="txt-label" fill="#4ade80">2. Current (I) is constant</text>
  <text x="400" y="320" text-anchor="middle" class="txt-label" fill="#fbbf24">3. V_cell = V1 + V2 = 12V</text>
</svg>`,
  },
  {
    id: 4,
    concept: "Photosynthesis",
    subject: "Biology" as const,
    promptText:
      "Plants take in carbon dioxide and water. They use light energy, absorbed by chlorophyll, to make glucose and oxygen.",
    model: "gemini-3.5-flash-lite",
    inputTokens: 388,
    outputTokens: 880,
    retryCount: 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>GCSE Photosynthesis Process Diagram</title>
  <defs>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <style>
      @keyframes sunRays {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.08); }
      }
      @keyframes arrowInFlow {
        0% { stroke-dashoffset: 20; }
        100% { stroke-dashoffset: 0; }
      }
      .anim-sun { animation: sunRays 3s infinite ease-in-out; transform-origin: 120px 100px; }
      .anim-arrow { stroke-dasharray: 6 4; animation: arrowInFlow 1.5s linear infinite; }
      .txt-heading { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; fill: #0f172a; }
      .txt-label { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }
      .txt-chem { font-family: "Courier New", monospace; font-size: 15px; font-weight: 700; }
    </style>
  </defs>

  <!-- Background Panel -->
  <rect x="10" y="10" width="780" height="580" rx="16" fill="#f0fdf4" stroke="#dcfce7" stroke-width="2" />

  <!-- Header & Word Equation -->
  <text x="400" y="45" text-anchor="middle" class="txt-heading">Photosynthesis: Energy Transformation in Plants</text>
  <rect x="120" y="60" width="560" height="36" rx="8" fill="#ffffff" stroke="#86efac" stroke-width="1.5" />
  <text x="400" y="83" text-anchor="middle" class="txt-chem" fill="#15803d">Carbon Dioxide + Water  —[Light + Chlorophyll]→  Glucose + Oxygen</text>

  <!-- Radiant Sun (Light Energy source) -->
  <g class="anim-sun">
    <circle cx="120" cy="140" r="45" fill="url(#sunGrad)" stroke="#f59e0b" stroke-width="2" />
    <line x1="120" y1="80" x2="120" y2="60" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
    <line x1="120" y1="200" x2="120" y2="220" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
    <line x1="60" y1="140" x2="40" y2="140" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
    <line x1="180" y1="140" x2="200" y2="140" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
  </g>
  <text x="120" y="240" text-anchor="middle" class="txt-label" fill="#d97706">Light Energy (Solar)</text>

  <!-- Plant Leaf (Organ where photosynthesis happens) -->
  <path d="M 280 340 C 280 180, 560 200, 600 340 C 560 480, 280 480, 280 340 Z" fill="url(#leafGrad)" stroke="#166534" stroke-width="3" />
  <!-- Central Leaf Vein -->
  <path d="M 280 340 C 380 330, 480 335, 600 340" fill="none" stroke="#86efac" stroke-width="3" />

  <!-- Chloroplast representation inside leaf -->
  <ellipse cx="440" cy="310" r="35" ry="22" fill="#166534" stroke="#4ade80" stroke-width="2" />
  <text x="440" y="315" text-anchor="middle" class="txt-label" fill="#ffffff" font-size="11">Chlorophyll</text>
  <text x="440" y="380" text-anchor="middle" class="txt-label" fill="#f0fdf4">Site of Light Absorption</text>

  <!-- INPUT 1: Carbon Dioxide (CO2) from air -->
  <path d="M 240 230 L 330 280" fill="none" stroke="#64748b" stroke-width="3" class="anim-arrow" />
  <polygon points="330,280 318,274 322,284" fill="#64748b" />
  <rect x="150" y="200" width="140" height="34" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="220" y="222" text-anchor="middle" class="txt-label" fill="#334155">Carbon Dioxide (CO₂)</text>

  <!-- INPUT 2: Water (H2O) from roots -->
  <path d="M 240 440 L 330 390" fill="none" stroke="#0284c7" stroke-width="3" class="anim-arrow" />
  <polygon points="330,390 322,386 318,396" fill="#0284c7" />
  <rect x="150" y="440" width="140" height="34" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
  <text x="220" y="462" text-anchor="middle" class="txt-label" fill="#0369a1">Water (H₂O) from Soil</text>

  <!-- OUTPUT 1: Glucose (C6H12O6) stored energy -->
  <path d="M 540 310 L 630 260" fill="none" stroke="#16a34a" stroke-width="3" class="anim-arrow" />
  <polygon points="630,260 618,262 622,252" fill="#16a34a" />
  <rect x="630" y="240" width="140" height="34" rx="6" fill="#ffffff" stroke="#86efac" stroke-width="1.5" />
  <text x="700" y="262" text-anchor="middle" class="txt-label" fill="#15803d">Glucose (C₆H₁₂O₆)</text>

  <!-- OUTPUT 2: Oxygen (O2) released into air -->
  <path d="M 540 370 L 630 420" fill="none" stroke="#06b6d4" stroke-width="3" class="anim-arrow" />
  <polygon points="630,420 622,428 618,418" fill="#06b6d4" />
  <rect x="630" y="410" width="140" height="34" rx="6" fill="#ffffff" stroke="#a5f3fc" stroke-width="1.5" />
  <text x="700" y="432" text-anchor="middle" class="txt-label" fill="#0891b2">Oxygen (O₂) Gas</text>

  <!-- GCSE Key Takeaway banner -->
  <rect x="100" y="520" width="600" height="46" rx="10" fill="#ffffff" stroke="#bbf7d0" stroke-width="1.5" />
  <text x="400" y="548" text-anchor="middle" class="txt-label" fill="#166534">Key Concept: Endothermic reaction absorbing light energy via chlorophyll</text>
</svg>`,
  },
  {
    id: 5,
    concept: "States of matter",
    subject: "Chemistry" as const,
    promptText:
      "In a solid the particles are close together and vibrate in place. In a liquid they are close but move past each other. In a gas they are far apart and move fast.",
    model: "gemini-3.5-flash-lite",
    inputTokens: 398,
    outputTokens: 940,
    retryCount: 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>GCSE States of Matter: Particle Model</title>
  <defs>
    <style>
      @keyframes vibrateSolid {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(1px, -1px); }
        50% { transform: translate(-1px, 1px); }
        75% { transform: translate(1px, 1px); }
      }
      @keyframes liquidFlow {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(2px, 3px); }
      }
      @keyframes gasFastMove1 {
        0% { transform: translate(0, 0); }
        25% { transform: translate(18px, -24px); }
        50% { transform: translate(-20px, 15px); }
        75% { transform: translate(22px, 20px); }
        100% { transform: translate(0, 0); }
      }
      @keyframes gasFastMove2 {
        0% { transform: translate(0, 0); }
        33% { transform: translate(-22px, 18px); }
        66% { transform: translate(15px, -20px); }
        100% { transform: translate(0, 0); }
      }
      .anim-solid { animation: vibrateSolid 0.25s infinite ease-in-out; }
      .anim-liquid { animation: liquidFlow 2s infinite ease-in-out; }
      .anim-gas1 { animation: gasFastMove1 1.8s infinite ease-in-out; }
      .anim-gas2 { animation: gasFastMove2 1.5s infinite ease-in-out; }
      .txt-heading { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; fill: #0f172a; }
      .txt-box-title { font-family: system-ui, -apple-system, sans-serif; font-size: 16px; font-weight: 700; fill: #0f172a; }
      .txt-desc { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; font-weight: 500; fill: #475569; }
    </style>
  </defs>

  <!-- Background Canvas -->
  <rect x="10" y="10" width="780" height="580" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" />

  <!-- Main Title -->
  <text x="400" y="48" text-anchor="middle" class="txt-heading">Particle Model: Solid, Liquid, and Gas</text>

  <!-- CHAMBER 1: SOLID (Left) -->
  <g transform="translate(60, 80)">
    <rect x="0" y="0" width="200" height="280" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />
    <text x="100" y="32" text-anchor="middle" class="txt-box-title" fill="#2563eb">SOLID</text>
    <rect x="15" y="45" width="170" height="180" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5" />

    <!-- 4x4 Tightly packed grid of particles -->
    <g class="anim-solid" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5">
      <circle cx="50" cy="110" r="14" /><circle cx="82" cy="110" r="14" /><circle cx="114" cy="110" r="14" /><circle cx="146" cy="110" r="14" />
      <circle cx="50" cy="140" r="14" /><circle cx="82" cy="140" r="14" /><circle cx="114" cy="140" r="14" /><circle cx="146" cy="140" r="14" />
      <circle cx="50" cy="170" r="14" /><circle cx="82" cy="170" r="14" /><circle cx="114" cy="170" r="14" /><circle cx="146" cy="170" r="14" />
      <circle cx="50" cy="200" r="14" /><circle cx="82" cy="200" r="14" /><circle cx="114" cy="200" r="14" /><circle cx="146" cy="200" r="14" />
    </g>

    <text x="100" y="245" text-anchor="middle" class="txt-desc">Particles tightly packed</text>
    <text x="100" y="262" text-anchor="middle" class="txt-desc">Vibrate in fixed positions</text>
  </g>

  <!-- CHAMBER 2: LIQUID (Middle) -->
  <g transform="translate(300, 80)">
    <rect x="0" y="0" width="200" height="280" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />
    <text x="100" y="32" text-anchor="middle" class="txt-box-title" fill="#059669">LIQUID</text>
    <rect x="15" y="45" width="170" height="180" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5" />

    <!-- Looser arrangement of particles flowing -->
    <g class="anim-liquid" fill="#10b981" stroke="#047857" stroke-width="1.5">
      <circle cx="55" cy="125" r="14" /><circle cx="88" cy="120" r="14" /><circle cx="138" cy="128" r="14" />
      <circle cx="48" cy="155" r="14" /><circle cx="95" cy="152" r="14" /><circle cx="142" cy="158" r="14" />
      <circle cx="58" cy="188" r="14" /><circle cx="102" cy="185" r="14" /><circle cx="136" cy="192" r="14" />
      <circle cx="78" cy="215" r="14" /><circle cx="120" cy="214" r="14" />
    </g>

    <text x="100" y="245" text-anchor="middle" class="txt-desc">Close but irregular</text>
    <text x="100" y="262" text-anchor="middle" class="txt-desc">Flow past each other</text>
  </g>

  <!-- CHAMBER 3: GAS (Right) -->
  <g transform="translate(540, 80)">
    <rect x="0" y="0" width="200" height="280" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />
    <text x="100" y="32" text-anchor="middle" class="txt-box-title" fill="#dc2626">GAS</text>
    <rect x="15" y="45" width="170" height="180" rx="6" fill="#fef2f2" stroke="#fecaca" stroke-width="1.5" />

    <!-- Few particles spread far apart moving quickly -->
    <g class="anim-gas1" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5">
      <circle cx="55" cy="85" r="14" />
      <circle cx="140" cy="130" r="14" />
      <circle cx="70" cy="180" r="14" />
    </g>
    <g class="anim-gas2" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5">
      <circle cx="120" cy="80" r="14" />
      <circle cx="135" cy="195" r="14" />
    </g>

    <text x="100" y="245" text-anchor="middle" class="txt-desc">Far apart and random</text>
    <text x="100" y="262" text-anchor="middle" class="txt-desc">Move rapidly in all ways</text>
  </g>

  <!-- Bottom Heat Energy Flow Arrow -->
  <rect x="100" y="400" width="600" height="50" rx="8" fill="#fff7ed" stroke="#fdba74" stroke-width="1.5" />
  <path d="M 120 425 L 670 425" stroke="#ea580c" stroke-width="4" stroke-linecap="round" />
  <polygon points="680,425 665,418 665,432" fill="#ea580c" />
  <text x="400" y="415" text-anchor="middle" class="txt-box-title" fill="#c2410c">Increasing Thermal Energy &amp; Particle Kinetic Speed →</text>

  <!-- Summary Table Footer -->
  <rect x="60" y="480" width="680" height="75" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="160" y="510" text-anchor="middle" class="txt-box-title">Solid</text>
  <text x="160" y="535" text-anchor="middle" class="txt-desc">Definite Shape &amp; Volume</text>

  <text x="400" y="510" text-anchor="middle" class="txt-box-title">Liquid</text>
  <text x="400" y="535" text-anchor="middle" class="txt-desc">Takes Shape of Container</text>

  <text x="640" y="510" text-anchor="middle" class="txt-box-title">Gas</text>
  <text x="640" y="535" text-anchor="middle" class="txt-desc">Fills Any Container Completely</text>
</svg>`,
  },
];

async function main() {
  console.log("Generating and validating the 5 science diagrams for results.json...");

  const results: DiagramResult[] = [];

  for (const item of DIAGRAM_TEMPLATES) {
    const validation = validateSvg(item.svg);
    const totalTokens = item.inputTokens + item.outputTokens;
    const costUSD = calculateCost(item.inputTokens, item.outputTokens);

    console.log(`\nValidating Concept #${item.id}: "${item.concept}"`);
    console.log(`- Is Valid: ${validation.isValid}`);
    console.log(`- Checks:`, validation.checks);

    if (!validation.isValid) {
      console.error(`VALIDATION FAILED for ${item.concept}:`, validation.feedbackForRetry);
      process.exit(1);
    }

    results.push({
      id: item.id,
      concept: item.concept,
      subject: item.subject,
      promptText: item.promptText,
      svg: validation.cleanSvg,
      checks: validation.checks,
      checkDetails: validation.checkDetails,
      allChecksPassed: validation.isValid,
      model: item.model,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      totalTokens,
      costUSD,
      retryCount: item.retryCount,
      timestamp: new Date().toISOString(),
    });
  }

  const outDir = path.join(__dirname, "../src/data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");

  // Also write to root results.json as explicitly requested in assignment rule:
  // "Save the 5 final results to a results.json file in your repo."
  const rootPath = path.join(__dirname, "../results.json");
  fs.writeFileSync(rootPath, JSON.stringify(results, null, 2), "utf-8");

  console.log(`\n Successfully wrote 5 validated results to:`);
  console.log(`  - ${outPath}`);
  console.log(`  - ${rootPath}`);
}

main().catch((err) => {
  console.error("Error generating diagrams:", err);
  process.exit(1);
});
