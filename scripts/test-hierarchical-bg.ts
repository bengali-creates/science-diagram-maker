import { validateSvg } from "../src/lib/svg-validator";
const nestedTransparentSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Nested Container Test</title>
  <defs>
    <style>
      @keyframes pulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }
      .anim { animation: pulse 1s infinite; }
    </style>
  </defs>
  <!-- Grandparent container: Dark navy card -->
  <g id="grandparent-card" fill="#0f172a">
    <rect x="50" y="50" width="700" height="500" rx="12" fill="#0f172a" />
    
    <!-- Parent container: Explicitly transparent -->
    <g id="parent-container" fill="transparent" style="background: none;">
      <!-- Child group: fill="none" -->
      <g id="inner-group" fill="none">
        <!-- White text: should have high contrast (> 10:1) on #0f172a -->
        <text x="100" y="120" font-size="20" fill="#ffffff">Contained White Label</text>
        <text x="100" y="160" font-size="16" fill="#38bdf8">Contained Cyan Label</text>
        <text x="100" y="200" font-size="16" fill="#e2e8f0">Contained Slate Label</text>
      </g>
    </g>
  </g>
  <circle cx="400" cy="300" r="40" fill="#38bdf8" class="anim" />
  <line x1="100" y1="240" x2="300" y2="240" stroke="#38bdf8" stroke-width="2" />
</svg>
`;

console.log("=== Testing Hierarchical Parent Container Resolution ===");
const res = validateSvg(nestedTransparentSvg);
console.log("Valid:", res.isValid);
console.log("Checks:", res.checks);
console.log("Feedback:", res.feedbackForRetry);

if (!res.checks.customSemanticRichness) {
  console.error(
    "FAIL: Did not bubble up through transparent parent containers!",
  );
  process.exit(1);
} else {
  console.log(
    "SUCCESS: Bubbled up through transparent parent containers to grandparent #0f172a!",
  );
}
const lowContrastSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Low Contrast Test</title>
  <defs>
    <style>
      @keyframes pulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }
      .anim { animation: pulse 1s infinite; }
    </style>
  </defs>
  <g fill="#0f172a">
    <rect x="50" y="50" width="700" height="500" rx="12" fill="#0f172a" />
    <g fill="transparent">
      <!-- Dark text on dark background (#0f172a) should be detected as low contrast! -->
      <text x="100" y="120" font-size="20" fill="#1e293b">Invisible Dark Label</text>
      <text x="100" y="160" font-size="16" fill="#0f172a">Invisible Black Label</text>
      <text x="100" y="200" font-size="16" fill="#334155">Invisible Slate Label</text>
    </g>
  </g>
  <circle cx="400" cy="300" r="40" fill="#38bdf8" class="anim" />
  <line x1="100" y1="240" x2="300" y2="240" stroke="#38bdf8" stroke-width="2" />
</svg>
`;

console.log(
  "\n=== Testing Low Contrast Detection on Hierarchical Background ===",
);
const resLow = validateSvg(lowContrastSvg);
console.log("Valid:", resLow.isValid);
console.log(
  "Custom Semantic Richness Passed:",
  resLow.checks.customSemanticRichness,
);
console.log("Feedback:", resLow.feedbackForRetry);

if (resLow.checks.customSemanticRichness === false) {
  console.log(
    "SUCCESS: Correctly flagged low contrast through transparent container hierarchy!",
  );
} else {
  console.error(
    "FAIL: Failed to detect low contrast on hierarchical container background!",
  );
  process.exit(1);
}
