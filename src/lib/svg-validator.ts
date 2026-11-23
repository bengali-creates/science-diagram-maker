import { DOMParser } from "xmldom";
import { ValidationCheck } from "@/types";

export interface SvgValidationResult {
  isValid: boolean;
  checks: {
    xmlValid: boolean;
    viewBoxContained: boolean;
    hasTitleAndLabels: boolean;
    hasAnimation: boolean;
    customSemanticRichness: boolean;
    noOverlappingLabels: boolean;
  };
  checkDetails: ValidationCheck[];
  feedbackForRetry: string[];
  cleanSvg: string;
}

/**
 * Strips markdown code blocks and extracts raw SVG markup
 */
export function extractSvg(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();

  // Strip markdown code fences if present
  const svgBlockMatch = text.match(/```(?:xml|svg)?\s*([\s\S]*?)```/i);
  if (svgBlockMatch && svgBlockMatch[1]) {
    text = svgBlockMatch[1].trim();
  }

  // Find start and end of <svg ... </svg>
  const svgStartIndex = text.indexOf("<svg");
  const svgEndIndex = text.lastIndexOf("</svg>");

  if (svgStartIndex !== -1 && svgEndIndex !== -1) {
    return text.substring(svgStartIndex, svgEndIndex + 6).trim();
  }

  return text;
}

interface ParsedViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
  maxX: number;
  maxY: number;
}

function parseViewBox(svgEl: Element): ParsedViewBox | null {
  const vbAttr = svgEl.getAttribute("viewBox") || svgEl.getAttribute("viewbox");
  if (vbAttr) {
    const parts = vbAttr
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return {
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3],
        maxX: parts[0] + parts[2],
        maxY: parts[1] + parts[3],
      };
    }
  }

  const wAttr = svgEl.getAttribute("width");
  const hAttr = svgEl.getAttribute("height");
  if (wAttr && hAttr) {
    const w = parseFloat(wAttr);
    const h = parseFloat(hAttr);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return {
        minX: 0,
        minY: 0,
        width: w,
        height: h,
        maxX: w,
        maxY: h,
      };
    }
  }

  return null;
}

/**
 * Basic 2D Affine Transform Matrix [a, b, c, d, e, f]
 */
interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

function identityMatrix(): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiplyMatrices(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function applyTransformToPoint(m: Matrix2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

/**
 * Parses SVG transform string e.g. "translate(370, 340) rotate(-126.87)"
 */
function parseTransformString(transformStr: string | null): Matrix2D {
  if (!transformStr) return identityMatrix();
  let result = identityMatrix();

  const regex = /([a-zA-Z]+)\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transformStr)) !== null) {
    const type = match[1].toLowerCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    let step = identityMatrix();
    if (type === "translate" && args.length >= 1) {
      const tx = args[0];
      const ty = args.length > 1 ? args[1] : 0;
      step = { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
    } else if (type === "rotate" && args.length >= 1) {
      const rad = (args[0] * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      if (args.length >= 3) {
        const cx = args[1];
        const cy = args[2];
        const t1: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy };
        const rot: Matrix2D = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
        const t2: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy };
        step = multiplyMatrices(t1, multiplyMatrices(rot, t2));
      } else {
        step = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      }
    } else if (type === "scale" && args.length >= 1) {
      const sx = args[0];
      const sy = args.length > 1 ? args[1] : sx;
      step = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    }

    result = multiplyMatrices(result, step);
  }

  return result;
}

/**
 * Computes cumulative transform up to the root <svg>
 */
function getCumulativeTransform(el: Element): Matrix2D {
  let current: Element | null = el;
  let cumulative = identityMatrix();

  while (current && current.tagName.toLowerCase() !== "svg") {
    const transformAttr = current.getAttribute("transform");
    if (transformAttr) {
      const m = parseTransformString(transformAttr);
      cumulative = multiplyMatrices(m, cumulative);
    }
    current = current.parentNode as Element | null;
  }

  return cumulative;
}

interface TextBoundingBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Validates an SVG string against all required rules
 */
export function validateSvg(rawInput: string): SvgValidationResult {
  const cleanSvg = extractSvg(rawInput);
  const feedback: string[] = [];

  let xmlDoc: Document | null = null;
  const parseErrors: string[] = [];

  // Check 1: The SVG is valid and can be parsed
  let xmlValid = false;
  let parseDetail = "SVG parsed successfully as valid XML.";

  try {
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (msg: string) => parseErrors.push(msg),
        fatalError: (msg: string) => parseErrors.push(msg),
      },
    });

    if (!cleanSvg || !cleanSvg.includes("<svg")) {
      throw new Error("No <svg> tag detected in output");
    }

    xmlDoc = parser.parseFromString(cleanSvg, "image/svg+xml");
    const docElement = xmlDoc?.documentElement;

    if (!docElement || docElement.tagName.toLowerCase() !== "svg") {
      throw new Error("Root element is not <svg>");
    }

    if (parseErrors.length > 0) {
      throw new Error(parseErrors.join("; "));
    }

    xmlValid = true;
  } catch (err: unknown) {
    xmlValid = false;
    const msg = err instanceof Error ? err.message : String(err);
    parseDetail = `XML parsing failed: ${msg}`;
    feedback.push(`The SVG code must be well-formed XML without syntax errors. Error: ${msg}`);
  }

  // Check 2: Nothing is drawn outside the viewBox (Transform-Aware)
  let viewBoxContained = false;
  let viewBoxDetail = "All elements are contained within the defined viewBox coordinates.";
  const textBoxes: TextBoundingBox[] = [];

  if (xmlDoc && xmlValid) {
    const svgEl = xmlDoc.documentElement;
    const vb = parseViewBox(svgEl);

    if (!vb) {
      viewBoxContained = false;
      viewBoxDetail = "Missing or invalid 'viewBox' attribute (e.g. viewBox=\"0 0 800 600\").";
      feedback.push("Provide an explicit 'viewBox' attribute on the <svg> element, e.g. viewBox=\"0 0 800 600\".");
    } else {
      // 5% margin tolerance for strokes and baselines
      const toleranceX = vb.width * 0.05;
      const toleranceY = vb.height * 0.05;
      const allowedMinX = vb.minX - toleranceX;
      const allowedMaxX = vb.maxX + toleranceX;
      const allowedMinY = vb.minY - toleranceY;
      const allowedMaxY = vb.maxY + toleranceY;

      const outOfBounds: string[] = [];

      // Check circles
      const circles = svgEl.getElementsByTagName("circle");
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const m = getCumulativeTransform(c);
        const rawCx = parseFloat(c.getAttribute("cx") || "0");
        const rawCy = parseFloat(c.getAttribute("cy") || "0");
        const r = parseFloat(c.getAttribute("r") || "0");
        const pt = applyTransformToPoint(m, rawCx, rawCy);

        if (
          pt.x - r < allowedMinX ||
          pt.x + r > allowedMaxX ||
          pt.y - r < allowedMinY ||
          pt.y + r > allowedMaxY
        ) {
          outOfBounds.push(`<circle cx="${rawCx}" cy="${rawCy}" r="${r}">`);
        }
      }

      // Check rects (transform 4 corners)
      const rects = svgEl.getElementsByTagName("rect");
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        const m = getCumulativeTransform(r);
        const x = parseFloat(r.getAttribute("x") || "0");
        const y = parseFloat(r.getAttribute("y") || "0");
        const width = parseFloat(r.getAttribute("width") || "0");
        const height = parseFloat(r.getAttribute("height") || "0");

        const corners = [
          applyTransformToPoint(m, x, y),
          applyTransformToPoint(m, x + width, y),
          applyTransformToPoint(m, x, y + height),
          applyTransformToPoint(m, x + width, y + height),
        ];

        const minX = Math.min(...corners.map((p) => p.x));
        const maxX = Math.max(...corners.map((p) => p.x));
        const minY = Math.min(...corners.map((p) => p.y));
        const maxY = Math.max(...corners.map((p) => p.y));

        if (
          minX < allowedMinX ||
          maxX > allowedMaxX ||
          minY < allowedMinY ||
          maxY > allowedMaxY
        ) {
          outOfBounds.push(`<rect x="${x}" y="${y}" w="${width}" h="${height}">`);
        }
      }

      // Check lines
      const lines = svgEl.getElementsByTagName("line");
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const m = getCumulativeTransform(l);
        const p1 = applyTransformToPoint(
          m,
          parseFloat(l.getAttribute("x1") || "0"),
          parseFloat(l.getAttribute("y1") || "0")
        );
        const p2 = applyTransformToPoint(
          m,
          parseFloat(l.getAttribute("x2") || "0"),
          parseFloat(l.getAttribute("y2") || "0")
        );

        if (
          Math.min(p1.x, p2.x) < allowedMinX ||
          Math.max(p1.x, p2.x) > allowedMaxX ||
          Math.min(p1.y, p2.y) < allowedMinY ||
          Math.max(p1.y, p2.y) > allowedMaxY
        ) {
          outOfBounds.push(`<line x1="${l.getAttribute("x1")}" y1="${l.getAttribute("y1")}">`);
        }
      }

      // Check polygons and polylines
      const polygons = [
        ...Array.from(svgEl.getElementsByTagName("polygon")),
        ...Array.from(svgEl.getElementsByTagName("polyline")),
      ];
      for (const poly of polygons) {
        const m = getCumulativeTransform(poly);
        const pointsStr = poly.getAttribute("points") || "";
        const rawPoints = pointsStr
          .trim()
          .split(/[\s,]+/)
          .map(Number);

        for (let j = 0; j < rawPoints.length; j += 2) {
          if (j + 1 < rawPoints.length && !isNaN(rawPoints[j]) && !isNaN(rawPoints[j + 1])) {
            const pt = applyTransformToPoint(m, rawPoints[j], rawPoints[j + 1]);
            if (
              pt.x < allowedMinX ||
              pt.x > allowedMaxX ||
              pt.y < allowedMinY ||
              pt.y > allowedMaxY
            ) {
              outOfBounds.push(`<polygon point (${rawPoints[j]}, ${rawPoints[j + 1]})>`);
              break;
            }
          }
        }
      }

      // Check text elements & record bounding boxes for collision checking
      const texts = svgEl.getElementsByTagName("text");
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        const m = getCumulativeTransform(t);
        const textContent = t.textContent?.trim() || "";
        if (!textContent) continue;

        const rawX = parseFloat(t.getAttribute("x") || "0");
        const rawY = parseFloat(t.getAttribute("y") || "0");
        const pt = applyTransformToPoint(m, rawX, rawY);

        const fontSize = parseFloat(t.getAttribute("font-size") || "14");
        const anchor = (t.getAttribute("text-anchor") || "start").toLowerCase();
        const estWidth = textContent.length * fontSize * 0.55;
        const estHeight = fontSize * 1.1;

        let left = pt.x;
        if (anchor === "middle") {
          left = pt.x - estWidth / 2;
        } else if (anchor === "end") {
          left = pt.x - estWidth;
        }
        const top = pt.y - estHeight * 0.85;

        const box: TextBoundingBox = {
          id: `text-${i}`,
          text: textContent,
          x: left,
          y: top,
          width: estWidth,
          height: estHeight,
          minX: left,
          maxX: left + estWidth,
          minY: top,
          maxY: top + estHeight,
        };
        textBoxes.push(box);

        if (
          box.minX < allowedMinX ||
          box.maxX > allowedMaxX ||
          box.minY < allowedMinY ||
          box.maxY > allowedMaxY
        ) {
          outOfBounds.push(`<text "${textContent.slice(0, 15)}...">`);
        }
      }

      if (outOfBounds.length > 0) {
        viewBoxContained = false;
        viewBoxDetail = `${outOfBounds.length} element(s) exceed viewBox [${vb.minX}, ${vb.minY}, ${vb.width}, ${vb.height}]. Ex: ${outOfBounds.slice(0, 2).join(", ")}`;
        feedback.push(
          `All shapes and texts must stay within viewBox dimensions (0 0 ${vb.width} ${vb.height}). Some elements (${outOfBounds.slice(0, 2).join(", ")}) were placed out of bounds.`
        );
      } else {
        viewBoxContained = true;
        viewBoxDetail = `ViewBox [${vb.minX}, ${vb.minY}, ${vb.width}, ${vb.height}] verified. All transform-projected elements fit inside.`;
      }
    }
  } else {
    viewBoxContained = false;
    viewBoxDetail = "Cannot check viewBox due to invalid XML.";
  }

  // Check 3: It has a title and at least 3 text labels
  let hasTitleAndLabels = false;
  let titleDetail = "";
  if (xmlDoc && xmlValid) {
    const titleElements = xmlDoc.getElementsByTagName("title");
    const hasSvgTitle = titleElements.length > 0 && !!titleElements[0].textContent?.trim();

    const textElements = xmlDoc.getElementsByTagName("text");
    const validLabels: string[] = [];

    for (let i = 0; i < textElements.length; i++) {
      const text = textElements[i].textContent?.trim();
      if (text && text.length > 0) {
        validLabels.push(text);
      }
    }

    const hasTitle =
      hasSvgTitle ||
      validLabels.some(
        (txt, idx) => idx === 0 && txt.length > 3
      );

    const hasMinThreeLabels = validLabels.length >= 3;

    if (hasTitle && hasMinThreeLabels) {
      hasTitleAndLabels = true;
      titleDetail = `Passed: Has title and ${validLabels.length} educational text labels.`;
    } else {
      hasTitleAndLabels = false;
      const issues: string[] = [];
      if (!hasTitle) issues.push("Missing <title> tag");
      if (validLabels.length < 3)
        issues.push(`Found only ${validLabels.length} text label(s) (minimum 3 required)`);
      titleDetail = `Failed: ${issues.join(" and ")}.`;
      feedback.push(
        "Include an explicit <title> tag and at least 3 clear <text> labels explaining parts of the diagram."
      );
    }
  } else {
    hasTitleAndLabels = false;
    titleDetail = "Cannot check title/labels due to invalid XML.";
  }

  // Check 4: It has at least one animation
  let hasAnimation = false;
  let animationDetail = "";
  if (cleanSvg) {
    const hasSmilAnimation =
      /<(animate|animateTransform|animateMotion|set)\b/i.test(cleanSvg);
    const hasKeyframes =
      /@keyframes\b/i.test(cleanSvg) && /animation:\s*[^;]+;/i.test(cleanSvg);
    const hasInlineAnimation = /style="[^"]*animation:[^"]*"/i.test(cleanSvg);

    if (hasSmilAnimation || hasKeyframes || hasInlineAnimation) {
      hasAnimation = true;
      const types: string[] = [];
      if (hasSmilAnimation) types.push("SMIL");
      if (hasKeyframes) types.push("CSS @keyframes");
      if (hasInlineAnimation) types.push("Inline CSS");
      animationDetail = `Passed: Active animation detected (${types.join(", ")}).`;
    } else {
      hasAnimation = false;
      animationDetail =
        "Failed: No animation detected. Requires SMIL (<animate>) or CSS @keyframes.";
      feedback.push(
        "Add at least one visible animation using either SMIL (<animate>, <animateTransform>) or CSS (@keyframes in <style> tag) to demonstrate the scientific motion or process."
      );
    }
  } else {
    hasAnimation = false;
    animationDetail = "No SVG provided to check animation.";
  }

  // Check 5 (Custom Check): Semantic Graphic Richness & Responsiveness
  let customSemanticRichness = false;
  let customDetail = "";
  if (xmlDoc && xmlValid) {
    const shapeTags = [
      "path",
      "circle",
      "rect",
      "ellipse",
      "line",
      "polygon",
      "polyline",
    ];
    let totalShapes = 0;
    const foundTags: string[] = [];

    for (const tag of shapeTags) {
      const count = xmlDoc.getElementsByTagName(tag).length;
      if (count > 0) {
        totalShapes += count;
        foundTags.push(`${tag} (${count})`);
      }
    }

    const hasViewBoxAttr = !!xmlDoc.documentElement.getAttribute("viewBox");
    const hasMinShapes = totalShapes >= 3;

    if (hasViewBoxAttr && hasMinShapes) {
      customSemanticRichness = true;
      customDetail = `Passed: Graphic richness with ${totalShapes} vector shapes [${foundTags.join(", ")}] and responsive viewBox.`;
    } else {
      customSemanticRichness = false;
      const issues: string[] = [];
      if (!hasViewBoxAttr) issues.push("Missing responsive viewBox attribute");
      if (totalShapes < 3)
        issues.push(`Only ${totalShapes} vector shape(s) found (requires >= 3)`);
      customDetail = `Failed: ${issues.join("; ")}.`;
      feedback.push(
        "Diagram must be visually rich: include at least 3 distinct vector shape elements (<path>, <circle>, <rect>, <line>, or <polygon>) and a responsive viewBox."
      );
    }
  } else {
    customSemanticRichness = false;
    customDetail = "Cannot check graphic richness due to invalid XML.";
  }

  // Check 6: Comprehensive Collision & Overlap Detector (Text-on-Text and Shape-on-Shape)
  let noOverlappingLabels = true;
  let overlapDetail = "No collisions or label overlaps detected.";
  const collidingPairs: string[] = [];

  // 1. Text-on-Text pairwise overlap
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      const b1 = textBoxes[i];
      const b2 = textBoxes[j];

      // AABB overlap check with a small margin allowance
      const margin = 2;
      const overlapsX = b1.minX + margin < b2.maxX && b1.maxX - margin > b2.minX;
      const overlapsY = b1.minY + margin < b2.maxY && b1.maxY - margin > b2.minY;

      if (overlapsX && overlapsY) {
        noOverlappingLabels = false;
        collidingPairs.push(`Text "${b1.text.slice(0, 15)}" collides with Text "${b2.text.slice(0, 15)}"`);
      }
    }
  }

  // 2. Shape-on-Shape / Card-on-Shape overlap check (excluding canvas container)
  if (xmlDoc && xmlValid) {
    const rectEls = xmlDoc.documentElement.getElementsByTagName("rect");
    const prominentBoxes: Array<{ name: string; minX: number; maxX: number; minY: number; maxY: number }> = [];

    for (let i = 0; i < rectEls.length; i++) {
      const r = rectEls[i];
      const m = getCumulativeTransform(r);
      const x = parseFloat(r.getAttribute("x") || "0");
      const y = parseFloat(r.getAttribute("y") || "0");
      const w = parseFloat(r.getAttribute("width") || "0");
      const h = parseFloat(r.getAttribute("height") || "0");

      // Skip background container
      if (w >= 700 || h >= 500) continue;

      const corners = [
        applyTransformToPoint(m, x, y),
        applyTransformToPoint(m, x + w, y),
        applyTransformToPoint(m, x, y + h),
        applyTransformToPoint(m, x + w, y + h),
      ];

      const minX = Math.min(...corners.map((p) => p.x));
      const maxX = Math.max(...corners.map((p) => p.x));
      const minY = Math.min(...corners.map((p) => p.y));
      const maxY = Math.max(...corners.map((p) => p.y));

      prominentBoxes.push({
        name: `Shape [${Math.round(minX)}, ${Math.round(minY)}]`,
        minX,
        maxX,
        minY,
        maxY,
      });
    }

    // Check if prominent elements like formula banners or cards collide with rotated content
    for (let i = 0; i < prominentBoxes.length; i++) {
      for (let j = i + 1; j < prominentBoxes.length; j++) {
        const s1 = prominentBoxes[i];
        const s2 = prominentBoxes[j];

        // Check for partial boundary clipping / collision (not full containment)
        const s1ContainsS2 = s1.minX <= s2.minX && s1.maxX >= s2.maxX && s1.minY <= s2.minY && s1.maxY >= s2.maxY;
        const s2ContainsS1 = s2.minX <= s1.minX && s2.maxX >= s1.maxX && s2.minY <= s1.minY && s2.maxY >= s1.maxY;

        if (!s1ContainsS2 && !s2ContainsS1) {
          const overlapX = Math.min(s1.maxX, s2.maxX) - Math.max(s1.minX, s2.minX);
          const overlapY = Math.min(s1.maxY, s2.maxY) - Math.max(s1.minY, s2.minY);

          // If they partially intersect across boundaries
          if (overlapX > 15 && overlapY > 15) {
            noOverlappingLabels = false;
            collidingPairs.push(`Elements partially overlap across boundaries (${Math.round(overlapX)}x${Math.round(overlapY)}px overlap)`);
          }
        }
      }
    }
  }

  if (!noOverlappingLabels) {
    overlapDetail = `Failed: ${collidingPairs.length} collision(s) detected: ${collidingPairs.slice(0, 2).join("; ")}.`;
    feedback.push(
      `Elements and text labels must not collide or overlap. Detected collisions: ${collidingPairs.slice(0, 2).join("; ")}. Reposition elements with adequate clearance.`
    );
  } else {
    overlapDetail = "Passed: All elements and text labels have distinct, non-overlapping coordinates.";
  }

  const allPassed =
    xmlValid &&
    viewBoxContained &&
    hasTitleAndLabels &&
    hasAnimation &&
    customSemanticRichness &&
    noOverlappingLabels;

  const checkDetails: ValidationCheck[] = [
    {
      id: "xml-valid",
      name: "Valid XML / SVG Parse",
      description: "SVG syntax is well-formed XML and parses without errors.",
      passed: xmlValid,
      details: parseDetail,
    },
    {
      id: "viewbox-bounds",
      name: "Within ViewBox Bounds",
      description: "All graphical and text elements stay within the defined viewBox dimensions (transform-aware).",
      passed: viewBoxContained,
      details: viewBoxDetail,
    },
    {
      id: "title-and-labels",
      name: "Title & 3+ Text Labels",
      description: "Includes a descriptive <title> and at least 3 distinct educational <text> labels.",
      passed: hasTitleAndLabels,
      details: titleDetail,
    },
    {
      id: "has-animation",
      name: "Animated Motion",
      description: "Contains at least one active SMIL or CSS keyframe animation.",
      passed: hasAnimation,
      details: animationDetail,
    },
    {
      id: "semantic-richness",
      name: "Visual Richness (Custom Check)",
      description: "Contains at least 3 vector shapes (<path>, <circle>, <rect>, etc.) and responsive viewBox.",
      passed: customSemanticRichness,
      details: customDetail,
    },
    {
      id: "no-overlapping-labels",
      name: "Zero Label Collisions",
      description: "Ensures text labels do not collide or render directly over each other.",
      passed: noOverlappingLabels,
      details: overlapDetail,
    },
  ];

  return {
    isValid: allPassed,
    checks: {
      xmlValid,
      viewBoxContained,
      hasTitleAndLabels,
      hasAnimation,
      customSemanticRichness,
      noOverlappingLabels,
    },
    checkDetails,
    feedbackForRetry: feedback,
    cleanSvg,
  };
}
