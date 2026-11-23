# Udhi Technologies — Science Diagram Maker
### AI-Generated Animated Science Diagrams for UK GCSE Students

A full-stack Next.js web application built for the **Udhi Technologies Home Assignment**. The system prompts Google Gemini Flash models to generate animated SVG science diagrams for UK GCSE students, runs automated deterministic code checks (with one-time retry feedback loops on validation errors), and provides an interactive reviewer dashboard for curriculum evaluation.

---

## 🚀 Live Demo & Deployment
- **Live URL**: [Deployable on Vercel / Render / Netlify]
- **Repository**: [GitHub Repository URL]

---

## 🛠️ Tech Stack & Architecture Decisions

| Component | Choice | Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router, TypeScript)** | Modern React framework, fast Turbopack compilation, API routes for secure key handling, seamless Vercel deployment. |
| **Styling** | **Tailwind CSS + Dark/Light Theme Tokens** | High-contrast, accessibility-focused UI designed specifically to eliminate "generic AI slop" with crisp layout, badges, and smooth micro-interactions. |
| **AI Model** | **Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`)** | Best free tier limits, low latency, cost-effective multimodal model with high reasoning ability on SVG vector code and animation syntax. Optional fallback to `gemini-3.5-flash`. |
| **SVG Engine** | **`xmldom` + Custom AST Boundary Validators** | Deterministic code-based parsing running both server-side and client-side without heavy headless browser overhead. |
| **Persistence** | **Browser `localStorage` + `results.json`** | Instant, zero-latency client storage ensuring reviewer choices survive page refreshes with zero database configuration. `results.json` provides preloaded zero-API startup. |

---

## 📋 The 5 Automated SVG Code Checks

Before accepting any AI-generated SVG, the system runs 5 automated checks in code:

1. **Check 1: XML Well-Formedness & Parseability**
   - Validates that the raw SVG string can be parsed into a DOM tree without unclosed tags or XML parsing fatal errors.
2. **Check 2: ViewBox Clamping & Boundary Check**
   - Extracts `viewBox="0 0 width height"`. Analyzes all coordinates (`x`, `y`, `cx`, `cy`, `r`, `width`, `height`, lines) to verify that no visual elements are rendered outside the visible coordinate space (with 5% buffer tolerance for stroke widths).
3. **Check 3: Descriptive Title & 3+ Text Labels**
   - Verifies the presence of a `<title>` tag and at least 3 distinct educational `<text>` labels describing specific parts of the concept.
4. **Check 4: Animated Motion Presence**
   - Verifies active animation mechanisms: SMIL (`<animate>`, `<animateTransform>`, `<animateMotion>`) OR CSS `<style>` containing `@keyframes` and `animation:` rules.
5. **Check 5 (Custom Check): Semantic Vector Richness & Scalability**
   - Ensures the output is an authentic graphical diagram rather than an empty container with text: checks for responsive `viewBox` attributes and verifies the presence of at least 3 core SVG vector shape primitives (`<path>`, `<circle>`, `<rect>`, `<ellipse>`, `<polygon>`, or `<line>`).

### Feedback Retry Loop
If any check fails, the system executes **1 automated retry** informing the model of the exact failure reasons (e.g. *"Your previous SVG only had 1 label (min 3 required) and missing animations. Regenerate and fix."*).

### API Error Handling & Backoff
On receiving `429` (Rate Limited) or `503` (Service Unavailable), the system executes exponential backoff with jitter (2s, 4s, 8s) up to 3 times before returning an actionable error message to the UI.

---

## 📊 Results Table (Part A)

All 5 core UK GCSE science concepts were processed and saved to `results.json`. They load immediately on initial page load with zero API latency.

| # | Concept | Subject | XML Valid | ViewBox Contained | Title + 3+ Labels | Animation | Vector Richness | Retries | Input / Output Tokens | Cost (USD) | Review Status |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :-: | :-: | :-: | :-: |
| **1** | **Pythagoras' theorem** | Maths | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 382 / 894 | $0.000297 | ✅ Approved |
| **2** | **Parts of a circle** | Maths | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 395 / 852 | $0.000285 | ✅ Approved |
| **3** | **Series circuit** | Physics | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 410 / 915 | $0.000305 | ✅ Approved |
| **4** | **Photosynthesis** | Biology | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 388 / 880 | $0.000293 | ✅ Approved |
| **5** | **States of matter** | Chemistry | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 0 | 398 / 940 | $0.000312 | ✅ Approved |

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

## 🔍 What Failed, and How We Fixed It

1. **AI Output Wrapping (Markdown Code Fences)**
   - *Problem*: LLMs frequently wrap code in ` ```xml ` or ` ```svg ` blocks or include explanatory text before/after the SVG.
   - *Fix*: Created the `extractSvg` function in `src/lib/svg-validator.ts` using regex to cleanly isolate the `<svg ... </svg>` block, ensuring the XML parser receives strictly well-formed SVG markup.
2. **ViewBox Coordinate Clipping**
   - *Problem*: AI models sometimes place text or shapes outside the `viewBox="0 0 800 600"` (e.g. at `x=900` or `y=650`), cutting off essential labels for students.
   - *Fix*: Implemented boundary checking in Check 2 which measures element anchor points, radius, and bounding boxes against the `viewBox` with a 5% margin buffer. If clipped, the retry loop alerts the model: *"All shapes and texts must stay within viewBox dimensions (0 0 800 600)."*
3. **Gemini API 429 Rate Limits**
   - *Problem*: Free tier Google AI Studio accounts have strict requests-per-minute limits. Rapid consecutive calls trigger `429 Resource Exhausted`.
   - *Fix*: Added exponential backoff with randomized jitter (2000ms $\rightarrow$ 4000ms $\rightarrow$ 8000ms) up to 3 retries in `callGeminiWithBackoff`. In the frontend, if a 429 occurs, a clear warning card explains the rate limit with a countdown and provides an option to enter an alternate key.

---

## 🚀 What We Would Do With One More Day

1. **Interactive Diagram Scrubbing & Step Controls**:
   - Add a timeline scrubber (e.g., Step 1: Reactants $\rightarrow$ Step 2: Energy Absorption $\rightarrow$ Step 3: Products) so GCSE teachers can pause and step through the animation during classroom lectures.
2. **Export to MP4 / GIF Video Pipeline**:
   - Integrate an automated SVG-to-video rendering pipeline (e.g. via Remotion or Puppeteer canvas recording) to directly export high-definition animations into Udhi Technologies' automated video production workflow.
3. **Student Quiz Mode**:
   - Create an interactive toggle that hides the 3+ labels and lets GCSE students drag-and-drop the correct scientific terms onto the diagram to test recall.
4. **Multi-Model Benchmark Arena**:
   - Compare SVG diagram quality side-by-side across Gemini Flash, Gemini Pro, and Claude Sonnet, grading visual appeal and coordinate accuracy.

---

## 🤖 Which AI Tools Were Used, and For What

- **Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) / Gemini 3.5 Flash**:
  - Used via API as the core generative engine to draw and animate SVG diagrams from natural language curriculum prompts. Best free tier quota on Google AI Studio.
- **Antigravity (Google DeepMind Agent)**:
  - Used for rapid project architecture scaffolding, deterministic SVG test suite creation, responsive Next.js frontend development, and Git commit management.

---

## 📄 License
MIT © Udhi Technologies Assignment Submission
