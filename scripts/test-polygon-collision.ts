import { validateSvg } from "../src/lib/svg-validator";
const flawedPythagorasSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Pythagoras' Theorem</title>
  <defs>
    <style>
      @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } }
      .anim { animation: pulse 2s infinite; }
    </style>
  </defs>
  <!-- Background -->
  <rect width="800" height="600" fill="#ffffff" />
  
  <!-- Right triangle -->
  <polygon points="200,400 500,400 200,150" fill="#f1f5f9" stroke="#0f172a" stroke-width="3" />
  
  <!-- Right angle box -->
  <rect x="200" y="375" width="25" height="25" fill="none" stroke="#0f172a" stroke-width="2" />
  
  <!-- Flawed overlapping label right across the hypotenuse edge -->
  <text x="310" y="280" font-size="16" fill="#0f172a">c (Hypotenuse)</text>
  
  <!-- Other labels -->
  <text x="350" y="430" font-size="16" fill="#0f172a">Adjacent a = 12</text>
  <text x="120" y="275" font-size="16" fill="#0f172a">Opposite b = 16</text>
  <text x="300" y="80" font-size="22" font-weight="bold" fill="#0f172a">Pythagoras' Theorem</text>
</svg>
`;

console.log(
  "=== Testing Detection of Flawed User Diagram (Polygon Edge on Text) ===",
);
const res = validateSvg(flawedPythagorasSvg);
console.log("Is Valid:", res.isValid);
console.log("Collision Check Passed:", res.checks.noOverlappingLabels);
console.log("Feedback:", res.feedbackForRetry);

if (res.checks.noOverlappingLabels === false) {
  console.log(" SUCCESS: Flawed overlapping diagram was CORRECTLY REJECTED!");
} else {
  console.error(" FAIL: Flawed diagram was not rejected!");
  process.exit(1);
}
