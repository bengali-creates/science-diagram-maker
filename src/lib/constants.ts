import { ConceptDefinition } from "@/types";

export const SCIENCE_CONCEPTS: ConceptDefinition[] = [
  {
    id: 1,
    slug: "pythagoras-theorem",
    concept: "Pythagoras' theorem",
    subject: "Maths",
    promptText:
      "In a right-angled triangle, the longest side is called the hypotenuse. The square of the hypotenuse is equal to the sum of the squares of the other two sides: a2 + b2 = c2.",
  },
  {
    id: 2,
    slug: "parts-of-a-circle",
    concept: "Parts of a circle",
    subject: "Maths",
    promptText:
      "A circle has a centre. The radius is the distance from the centre to the edge. The diameter goes across the circle through the centre and is twice the radius. The circumference is the distance around the circle.",
  },
  {
    id: 3,
    slug: "series-circuit",
    concept: "Series circuit",
    subject: "Physics",
    promptText:
      "In a series circuit there is only one loop. The current is the same everywhere in the loop. The voltage of the cell is shared between the components.",
  },
  {
    id: 4,
    slug: "photosynthesis",
    concept: "Photosynthesis",
    subject: "Biology",
    promptText:
      "Plants take in carbon dioxide and water. They use light energy, absorbed by chlorophyll, to make glucose and oxygen.",
  },
  {
    id: 5,
    slug: "states-of-matter",
    concept: "States of matter",
    subject: "Chemistry",
    promptText:
      "In a solid the particles are close together and vibrate in place. In a liquid they are close but move past each other. In a gas they are far apart and move fast.",
  },
];

// Gemini Pricing Reference (Free tier / Pay-as-you-go reference rate for Gemini Flash)
// Input: $0.075 per 1,000,000 tokens ($0.000000075 / token)
// Output: $0.30 per 1,000,000 tokens ($0.00000030 / token)
export const GEMINI_FLASH_INPUT_COST_PER_TOKEN = 0.075 / 1_000_000;
export const GEMINI_FLASH_OUTPUT_COST_PER_TOKEN = 0.3 / 1_000_000;

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash"];
