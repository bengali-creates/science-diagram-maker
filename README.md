# Udhi Technologies — Science Diagram Maker
### AI-Generated Animated Science Diagrams for UK GCSE Students

A production-grade Next.js web application built for the **Udhi Technologies Home Assignment**. The system prompts Google Gemini 3.5 series models (`gemini-3.5-flash-lite` and `gemini-3.5-flash`) to generate animated SVG science diagrams for UK GCSE students, runs 6 deterministic automated code checks (with automated batched error-solving retries up to 5 attempts and an interactive human revision studio), and provides a comprehensive reviewer dashboard for curriculum evaluation.

---

## 🖥️ How to Run It on Your Computer

### Prerequisites
- **Node.js**: v18.17+ or v20+ (Node 20+ recommended)
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### 1. Clone the Repository
```bash
git clone https://github.com/Debasish-bengali/science-diagram-maker.git
cd science-diagram-maker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Zero-Setup Note**: Setting `.env.local` is optional! The web application includes an in-browser **API Key Modal** (`Set API Key` button in the top navigation). Evaluators can enter their own free Google AI Studio key directly in the UI, stored securely in browser `localStorage`. Furthermore, precomputed verification results for all 5 core curriculum concepts are preloaded from `results.json`, allowing instant offline evaluation with **zero API configuration required**.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 5. Run the Automated Test Suites
You can run the deterministic verification and collision test suites independently:
```bash
# Run the 6 deterministic AST validator checks on valid & invalid SVGs
npx tsx scripts/test-validator.ts

# Test polygon-stroke and label collision detection
npx tsx scripts/test-polygon-collision.ts
```

### 6. Build and Start for Production
```bash
npm run build
npm start
```

---

## 📊 Results Table

The following table summarizes the generation and verification metrics across the 5 core UK GCSE curriculum concepts (Maths, Physics, Biology, Chemistry). All 5 diagrams passed all 6 deterministic code checks.

| # | Concept | Subject | Pass or Fail | Retries | Cost (USD) | Input / Output Tokens | Model Used |
| :-: | :--- | :---: | :---: | :-: | :---: | :---: | :---: |
| **1** | **Pythagoras' theorem** | Maths | **Pass (6/6)** | 0 | $0.000297 | 382 / 894 | `gemini-3.5-flash-lite` |
| **2** | **Parts of a circle** | Maths | **Pass (6/6)** | 0 | $0.000285 | 395 / 852 | `gemini-3.5-flash-lite` |
| **3** | **Series circuit** | Physics | **Pass (6/6)** | 1 | $0.000594 | 795 / 1,780 | `gemini-3.5-flash-lite` |
| **4** | **Photosynthesis** | Biology | **Pass (6/6)** | 1 | $0.000607 | 812 / 1,820 | `gemini-3.5-flash-lite` |
| **5** | **States of matter** | Chemistry | **Pass (6/6)** | 1 | $0.000620 | 820 / 1,860 | `gemini-3.5-flash-lite` |

- **Overall Curriculum Pass Rate**: **100% (5 / 5 Passed)**
- **Total Cost for All 5 Diagrams**: **~$0.002403 USD** (less than a quarter of a cent).
- **Average Generation Latency**: **~8–12 seconds per diagram**.

---

## 🔍 What Failed, and How We Fixed It

During engineering and testing, we encountered several real-world failures across LLM output handling, cloud serverless limits, and geometric validation math. Here is what failed and how each issue was resolved:

### 1. Vercel Serverless 180s Timeout on Multi-Attempt Retries
- **What Failed**: When the server ran up to 5 sequential LLM generation passes inside a single HTTP serverless function, total request time exceeded Vercel's hard 180-second execution limit (`Vercel Runtime Timeout Error: Task timed out after 180 seconds`).
- **How We Fixed It**: Refactored the architecture into a **Client-Orchestrated Retry Loop**. The client modal executes each generation pass as a discrete, fast HTTP request (~10–12s each) with `maxOutputTokens: 2500`. If any checks fail, the client aggregates the defects via `summarizeValidationErrors()`, feeds the previous SVG and targeted feedback into the next pass, and keeps execution completely immune to cloud serverless timeouts.

### 2. `@google/generative-ai` SDK Stream Parser Crash (`unhandledRejection`)
- **What Failed**: The official `@google/generative-ai` SDK's `generateContentStream` method threw an uncaught rejection (`[GoogleGenerativeAI Error]: Failed to parse stream`) when network packets split or SSE streams dropped mid-turn. This triggered an unhandled rejection error (exit code 128) that terminated the server process.
- **How We Fixed It**: Switched from the fragile SDK stream parser to direct REST `model.generateContent()` with token chunking. The backend receives the verified completion and streams chunks over a standard Server-Sent Events (SSE) `ReadableStream` to the browser, giving users real-time typewriter terminal animation while eliminating SDK stream parser crashes.

### 3. Google AI Studio 503 Spikes & Transient "network error" Breakdown
- **What Failed**: During global peak traffic periods, Google AI Studio returned `503 Service Unavailable` ("model is experiencing high demand") across shared free quotas, causing dropped network sockets. The frontend caught `TypeError: Failed to fetch` or `"network error"`, which didn't match standard rate limit regexes, displaying a cryptic red error box instead of an actionable resolution.
- **How We Fixed It**:
  1. Implemented **Automatic Cross-Model Fallback**: when `gemini-3.5-flash-lite` encounters 503/429 demand limits, the backend automatically fails over to `gemini-3.5-flash` with jittered exponential backoff.
  2. In the frontend, expanded error detection to recognize `503`, `504`, `429`, `"network error"`, and `"failed to fetch"`.
  3. Added an in-pass auto-retry: if a network blip occurs during a pass, the client waits 1.5s and retries that pass automatically before surfacing errors.
  4. Displayed an amber **Rate Limit & High Demand Action Card** with immediate one-click model switching, pass retrying, and personal API key configuration.

### 4. Transform-Aware Coordinate & Bounding-Box False Positives
- **What Failed**:
  - In Pythagoras' theorem, rotated elements (such as the tilted square $c^2$ with `transform="rotate(-36.87)"`) and pill label badges (`<rect rx="6" fill="#ffffff" />`) inside `<g>` groups evaluated to local element coordinates in `shapeEnclosesBox`.
  - The validator failed to recognize that text sat on a white pill card, falling back to the dark `#0f172a` canvas and triggering a false contrast failure (`1.0:1` ratio).
  - Additionally, comparing Axis-Aligned Bounding Boxes (AABBs) of rotated geometric squares against adjacent squares touching at vertices falsely triggered boundary collision errors.
- **How We Fixed It**:
  - Implemented 2D affine matrix math (`getCumulativeTransform`) in [svg-validator.ts](file:///d:/coding/science-diagram-maker/src/lib/svg-validator.ts) to project all transformed corners into global viewBox space.
  - Opaque pill cards now correctly shield text from strokes passing underneath in `lineCutsThroughTextBox`.
  - Restricted box-overlap checks strictly to UI card banners (`s1.isCardBanner && s2.isCardBanner`), preventing geometric diagram shapes (which naturally align or meet at vertices) from generating false collision flags.

### 5. Markdown Code Fences Ingestion
- **What Failed**: LLM outputs frequently wrapped SVG code in ````xml ... ```` or ````svg ... ```` markdown blocks, or prepended conversational remarks ("Here is your SVG diagram:").
- **How We Fixed It**: Created `extractSvg()` in `src/lib/svg-validator.ts`, which isolates the content strictly from `<svg` to `</svg>`, stripping code blocks and guaranteeing clean XML for DOM parsing.

---

## 🚀 What We Would Do With One More Day

If granted an additional day of development, we would implement the following high-impact enhancements:

1. **Multimodal Visual Reflection Loop (Vision Agent)**:
   - Render the generated SVG to a headless PNG canvas buffer using Puppeteer or `@resvg/resvg-js`.
   - Send the rendered image back to Gemini 3.5's vision capabilities for visual inspection (evaluating visual balance, font hierarchy, aesthetic color palettes, and clutter that static AST checks cannot detect).
2. **LangGraph / Python State Machine Microservice**:
   - Leverage the decoupled `IDiagramService` interface in the codebase to connect to a dedicated Python LangGraph microservice (`DIAGRAM_SERVICE_PROVIDER=langgraph`), orchestrating formal multi-agent supervisor/coder/reviewer reflection graphs.
3. **Interactive Teacher Timeline & Scrubbing Controls**:
   - Provide step-by-step playback controls (e.g. *Step 1: Ingestion $\rightarrow$ Step 2: Chloroplast Absorption $\rightarrow$ Step 3: Glucose Creation*) allowing UK GCSE teachers to pause, rewind, and scrub through scientific processes during live classroom lectures.
4. **Automated MP4 / GIF Video Rendering Pipeline**:
   - Connect an automated video rendering pipeline (using Remotion or Puppeteer frame capture) to export 60fps high-definition MP4/GIF animations directly into Udhi Technologies' automated video production workflows.
5. **Student Interactive Recall & Quiz Mode**:
   - Add a student mode that blanks out labels and allows students to drag and drop scientific terms into correct diagram locations with immediate self-marking feedback.

---

## 🤖 Which AI Tools Were Used, and For What

| Tool | Your usage |
| :--- | :--- |
| **Antigravity** | Frontend and backend development, coding, implementation and modifications |
| **Claude** | Technical research, engineering verification, reviewing system designs and validating engineering decisions |

### Supporting Generative AI Models
- **Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`)**: Primary generative model utilized via API for high-speed, cost-effective vector code synthesis, structured XML generation, and continuous SMIL/CSS keyframe animation.
- **Google Gemini 3.5 Flash (`gemini-3.5-flash`)**: Secondary failover model used when free-tier demand spikes or rate limits occurred on the Lite model.
