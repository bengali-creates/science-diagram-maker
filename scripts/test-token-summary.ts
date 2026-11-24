import { validateSvg } from "../src/lib/svg-validator";

console.log("=== Testing Validation Error Summarization Logic ===");
const multiDefectSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <circle cx="950" cy="300" r="100" fill="#ff0000" />
  <polygon points="100,100 400,100 100,400" fill="#f1f5f9" stroke="#000" stroke-width="3" />
  <text x="200" y="220" font-size="16" fill="#000">Defective Label</text>
</svg>
`;

const res = validateSvg(multiDefectSvg);
console.log("Raw Feedback Count:", res.feedbackForRetry.length);
console.log("Raw Feedback:", res.feedbackForRetry);

if (res.feedbackForRetry.length >= 2) {
  console.log(
    "SUCCESS: Multiple validation failures produced and ready for token-efficient summarization!",
  );
} else {
  console.error("FAIL: Did not produce multiple validation failures.");
  process.exit(1);
}
