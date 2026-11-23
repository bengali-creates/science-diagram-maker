# Udhi Technologies — Science Diagram Maker
### AI-Generated Animated Science Diagrams for UK GCSE Students

A production-grade Next.js web application built for the **Udhi Technologies Home Assignment**. The system prompts Google Gemini 3.5 series models (`gemini-3.5-flash-lite` and `gemini-3.5-flash`) to generate animated SVG science diagrams for UK GCSE students, runs deterministic code checks (with 1-time automated retry feedback loops on validation errors and an interactive human revision studio), and provides an interactive reviewer dashboard for curriculum evaluation.

---

## 🚀 Live Demo & Deployment
- **Live URL**: [Deployable on Vercel / Render / Netlify]
- **Repository**: [GitHub Repository URL]

---

## 🛠️ Tech Stack & Architecture Decisions

| Component | Choice | Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router, TypeScript)** | Modern React framework, fast Turbopack compilation, API routes for secure key handling, and seamless Vercel deployment. |
| **Styling & UI** | **Tailwind CSS v4 + Shadcn UI Primitives** | Semantic HSL design tokens, accessible Radix UI primitives (`Button`, `Card`, `Badge`, `Dialog`, `Tabs`, `Tooltip`), eliminating hardcoded neon hex colors. |
| **Motion** | **Framer Motion + SMIL / CSS SVG Animation** | Tactile spring micro-interactions on cards, tabs, and modals; native CSS `@keyframes` and SVG `<animate>` elements inside the diagrams for 60fps vector motion. |
| **Theming** | **`next-themes` (Light, Dark, System)** | Accessible theme switching with animated icons and CSS variables responding dynamically without flash of unstyled content. |
| **AI Models** | **Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`)** | Best free tier limits (high RPM), low latency, and cost-effective generation. Seamless fallback to `gemini-3.5-flash`. |
| **SVG Engine** | **`xmldom` + 2D Affine Transform Matrix Validator** | Deterministic AST-based parsing with coordinate math for rotated elements, polygon coordinate validation, and bounding-box collision detection. |
| **Persistence** | **Browser `localStorage` + `results.json`** | Instant, zero-latency client storage ensuring reviewer choices survive page refreshes with zero database configuration. `results.json` provides preloaded zero-API startup. |
| **Pluggable Core** | **`IDiagramService` Service Layer** | Decouples diagram generation from the UI: runs native in-house execution now, and can swap to a LangGraph/LangChain microservice later by setting `DIAGRAM_SERVICE_PROVIDER=langgraph`. |

---

## 📋 The 6 Automated SVG Code Checks

Before accepting any AI-generated SVG, the system runs 6 deterministic checks in code:

1. **Check 1: XML Well-Formedness & Parseability**
   - Validates that the raw SVG string can be parsed into a DOM tree without unclosed tags or XML fatal syntax errors.
2. **Check 2: ViewBox Clamping & Boundary Check (Transform-Aware)**
   - Extracts `viewBox="0 0 width height"`. Computes full 2D affine transform matrices (`translate`, `rotate`, `scale`) for nested `<g>` elements and projects polygon vertices to ensure all visual elements stay strictly within the viewBox (with 5% buffer tolerance).
3. **Check 3: Descriptive Title & 3+ Text Labels**
   - Verifies the presence of a `<title>` tag and at least 3 distinct educational `<text>` labels describing specific parts of the scientific concept.
4. **Check 4: Animated Motion Presence**
   - Verifies active animation mechanisms: SMIL (`<animate>`, `<animateTransform>`, `<animateMotion>`) OR CSS `<style>` containing `@keyframes` and `animation:` rules.
5. **Check 5 (Custom Check): Semantic Vector Richness & Scalability**
   - Ensures the output is an authentic graphical diagram rather than an empty container with text: checks for responsive `viewBox` attributes and verifies the presence of at least 3 core SVG vector shape primitives (`<path>`, `<circle>`, `<rect>`, `<ellipse>`, `<polygon>`, or `<line>`).
6. **Check 6 (Custom Check): Zero Text & Element Collisions**
   - Performs pairwise Axis-Aligned Bounding Box (AABB) intersection detection between text labels and critical diagram elements to prevent unreadable overlapping text (e.g. formula banners overlapping triangle vertices or labels occluding each other).

### Automated Feedback Retry Loop
If any check fails during generation, the system executes **1 automated retry**, informing the model of the exact failure reasons (e.g. *"Text collision detected: label 'Hypotenuse' overlaps with shape 'rect'. Shift coordinates by at least 30px."*).

### Human-in-the-Loop AI Revision Studio
Reviewers can click **"AI Revision"** on any row to open the Reviewer Retry Studio, supply custom feedback (e.g., *"Move formula banner up 40px"*), choose one-click preset critique chips, and watch a multi-step live progress loader as the AI revises and re-verifies the diagram.

### API Error Handling & Backoff
On receiving `429` (Rate Limited) or `503` (Service Unavailable), the system executes exponential backoff with randomized jitter (2s, 4s, 8s) up to 3 times before returning an actionable error message to the UI.

---

## 📊 Results Table (Part A)

All 5 core UK GCSE science concepts were processed and saved to `results.json`. They load immediately on initial page load with zero API latency.

| # | Concept | Subject | XML Valid | ViewBox Contained | Title + 3+ Labels | Animation | Vector Richness | Zero Collisions | Retries | Input / Output Tokens | Cost (USD) | Review Status |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :-: | :-: | :-: | :-: |
| **1** | **Pythagoras' theorem** | Maths | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 382 / 894 | $0.000297 | ✅ Approved |
| **2** | **Parts of a circle** | Maths | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 395 / 852 | $0.000285 | ✅ Approved |
| **3** | **Series circuit** | Physics | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 410 / 915 | $0.000305 | ✅ Approved |
| **4** | **Photosynthesis** | Biology | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 388 / 880 | $0.000293 | ✅ Approved |
| **5** | **States of matter** | Chemistry | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 398 / 940 | $0.000312 | ✅ Approved |

**Total Estimated Cost for all 5 diagrams:** **~$0.001492 USD** (less than 2 tenths of a cent).

---

## 🖥️ How to Run Locally

### Prerequisites
- Node.js 18.17+ or 20+
- npm, pnpm, or yarn

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/science-diagram-maker.git
cd science-diagram-maker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: You can also enter the API key directly in the web app UI using the "Set API Key" button, which saves securely in your browser session).*

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production
```bash
npm run build
npm start
```

---

## 💡 Reviewer Persistence Decision: Why LocalStorage?

For saving reviewer decisions (**Approve** / **Reject** and the **Reviewer Note**), we chose **browser `localStorage`** (with an "Export Decisions JSON" button) for the following reasons:
1. **Zero Database Dependency**: Allows reviewers to test the application instantly upon opening the live Vercel/Netlify link without needing database credentials, connection pools, or migrations.
2. **Instant & Resilient**: Preserves decisions instantly across page reloads, browser tab closing, and network reconnections with 0ms latency.
3. **Privacy & Independence**: Reviewers evaluate diagrams independently without overwriting each other's verdicts in a shared testing database.
4. **Portability**: Includes an "Export Decisions" button that downloads a timestamped `.json` file containing all reviewer decisions and notes for downstream LMS/CMS integration.

---

## 🔑 Why `ApiKeyModal.tsx` Exists Alongside `.env`

While `GEMINI_API_KEY` can be set in `.env` (or Vercel environment variables), `ApiKeyModal.tsx` solves critical deployment and evaluation edge cases:
1. **Zero-Setup Evaluator Testing**: An external reviewer cloning or visiting a public deployment doesn't need write-access to the host server's `.env`. They can paste their own free Google AI Studio key and test live generation immediately.
2. **Rate Limit Circuit Breaker**: If the server's shared API key reaches its free-tier rate limit (15 requests/minute), a user can immediately override it in the UI with their personal key without restarting the server.
3. **Privacy & Security**: Keys entered via the modal are stored solely in the reviewer's browser `localStorage` and sent over HTTPS only when invoking generation. They are never committed to git or exposed to third parties.

---

## 🔍 What Failed, and How We Fixed It

1. **AI Output Wrapping (Markdown Code Fences)**
   - *Problem*: LLMs frequently wrap code in ` ```xml ` or ` ```svg ` blocks or include explanatory text before/after the SVG.
   - *Fix*: Created the `extractSvg` function in `src/lib/svg-validator.ts` using regex to cleanly isolate the `<svg ... </svg>` block, ensuring the XML parser receives strictly well-formed SVG markup.
2. **Transform-Aware ViewBox Coordinate Clipping**
   - *Problem*: Shapes rotated inside groups (e.g. `<g transform="rotate(-36.87 200 400)">`) reported local coordinates `x=0, y=0`, but geometrically rotated outside the 800x600 viewBox or into formula banners.
   - *Fix*: Implemented full 2D affine matrix transformation parsing in `svg-validator.ts`. The validator projects all 4 rotated corner coordinates into world space before evaluating boundary bounds.
3. **Text and Label Collisions**
   - *Problem*: Model outputs occasionally placed labels directly over geometric shapes or other labels (e.g., hypotenuse square corner cutting across the formula banner).
   - *Fix*: Added Check 6 with pairwise AABB collision detection, distinguishing intentional containment (like particles inside a beaker) from partial boundary collisions and label collisions, with automatic targeted feedback during retries.
4. **Gemini API 429 Rate Limits**
   - *Problem*: Free tier Google AI Studio accounts have strict requests-per-minute limits. Rapid consecutive calls trigger `429 Resource Exhausted`.
   - *Fix*: Added exponential backoff with randomized jitter (2000ms $\rightarrow$ 4000ms $\rightarrow$ 8000ms) up to 3 retries in `callGeminiWithBackoff`. In the frontend, if a 429 occurs, a clear warning card explains the rate limit with a countdown and provides an option to enter an alternate key.

---

## 🚀 What We Would Do With One More Day

1. **LangGraph Microservice Deployment**:
   - Spin up a dedicated Python FastAPI / LangGraph microservice with state graphs that manage multi-turn visual reflection loops (using Gemini multimodal vision to visually inspect rendered SVGs).
2. **Interactive Diagram Scrubbing & Step Controls**:
   - Add a timeline scrubber (e.g., Step 1: Reactants $\rightarrow$ Step 2: Energy Absorption $\rightarrow$ Step 3: Products) so GCSE teachers can pause and step through the animation during classroom lectures.
3. **Export to MP4 / GIF Video Pipeline**:
   - Integrate an automated SVG-to-video rendering pipeline (e.g. via Remotion or Puppeteer canvas recording) to directly export high-definition animations into Udhi Technologies' automated video production workflow.
4. **Student Quiz Mode**:
   - Create an interactive toggle that hides the labels and lets GCSE students drag-and-drop the correct scientific terms onto the diagram to test recall.

---

## 🤖 Which AI Tools Were Used, and For What

- **Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) / Gemini 3.5 Flash**:
  - Used via API as the core generative engine to draw and animate SVG diagrams from natural language curriculum prompts. Best free tier quota on Google AI Studio.
- **Antigravity (Google DeepMind Agent)**:
  - Used for rapid project architecture scaffolding, deterministic SVG test suite creation, responsive Next.js frontend development, and Git commit management.
