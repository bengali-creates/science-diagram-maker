import { validateSvg } from "../src/lib/svg-validator";

const sampleValidSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Pythagoras Theorem Diagram</title>
  <defs>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; transform: scale(1.02); }
      }
      .animated-box {
        animation: pulse 2s infinite ease-in-out;
        transform-origin: center;
      }
    </style>
  </defs>
  <!-- Shapes -->
  <polygon points="250,400 550,400 250,150" fill="#3b82f6" fill-opacity="0.2" stroke="#2563eb" stroke-width="3" />
  <rect x="250" y="375" width="25" height="25" fill="none" stroke="#2563eb" stroke-width="2" />
  <rect x="150" y="150" width="100" height="250" fill="#10b981" fill-opacity="0.3" stroke="#059669" stroke-width="2" class="animated-box" />
  <!-- Labels -->
  <text x="380" y="430" font-family="sans-serif" font-size="16" fill="#1e293b">Side a (adjacent)</text>
  <text x="210" y="275" font-family="sans-serif" font-size="16" fill="#1e293b">Side b (opposite)</text>
  <text x="420" y="260" font-family="sans-serif" font-size="16" fill="#1e293b">Hypotenuse c</text>
  <text x="250" y="520" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">a² + b² = c²</text>
</svg>
`;

const sampleInvalidSvg = `
<svg viewBox="0 0 800 600">
  <circle cx="950" cy="300" r="100" />
</svg>
`;

console.log("=== Testing Valid SVG ===");
const resValid = validateSvg(sampleValidSvg);
console.log("Valid SVG Result:", resValid.isValid, resValid.checks);

console.log("\n=== Testing Invalid SVG ===");
const resInvalid = validateSvg(sampleInvalidSvg);
console.log("Invalid SVG Result:", resInvalid.isValid, resInvalid.checks);
console.log("Feedback:", resInvalid.feedbackForRetry);

if (resValid.isValid && !resInvalid.isValid) {
  console.log("\n>>> ALL VALIDATION TESTS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
} else {
  console.error("Validation tests failed!");
  process.exit(1);
}
