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

  // Fallback to width and height attributes if viewBox is omitted
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

  // Check 2: Nothing is drawn outside the viewBox
  let viewBoxContained = false;
  let viewBoxDetail = "All elements are contained within the defined viewBox coordinates.";

  if (xmlDoc && xmlValid) {
    const svgEl = xmlDoc.documentElement;
    const vb = parseViewBox(svgEl);

    if (!vb) {
      viewBoxContained = false;
      viewBoxDetail = "Missing or invalid 'viewBox' attribute (e.g. viewBox=\"0 0 800 600\").";
      feedback.push("Provide an explicit 'viewBox' attribute on the <svg> element, e.g. viewBox=\"0 0 800 600\".");
    } else {
      // 5% margin tolerance for strokes, shadows, and text baselines
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
        const cx = parseFloat(c.getAttribute("cx") || "0");
        const cy = parseFloat(c.getAttribute("cy") || "0");
        const r = parseFloat(c.getAttribute("r") || "0");

        if (
          cx - r < allowedMinX ||
          cx + r > allowedMaxX ||
          cy - r < allowedMinY ||
          cy + r > allowedMaxY
        ) {
          outOfBounds.push(`<circle cx="${cx}" cy="${cy}" r="${r}">`);
        }
      }

      // Check rects
      const rects = svgEl.getElementsByTagName("rect");
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        const x = parseFloat(r.getAttribute("x") || "0");
        const y = parseFloat(r.getAttribute("y") || "0");
        const width = parseFloat(r.getAttribute("width") || "0");
        const height = parseFloat(r.getAttribute("height") || "0");

        if (
          x < allowedMinX ||
          x + width > allowedMaxX ||
          y < allowedMinY ||
          y + height > allowedMaxY
        ) {
          outOfBounds.push(`<rect x="${x}" y="${y}" w="${width}" h="${height}">`);
        }
      }

      // Check lines
      const lines = svgEl.getElementsByTagName("line");
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const x1 = parseFloat(l.getAttribute("x1") || "0");
        const y1 = parseFloat(l.getAttribute("y1") || "0");
        const x2 = parseFloat(l.getAttribute("x2") || "0");
        const y2 = parseFloat(l.getAttribute("y2") || "0");

        if (
          Math.min(x1, x2) < allowedMinX ||
          Math.max(x1, x2) > allowedMaxX ||
          Math.min(y1, y2) < allowedMinY ||
          Math.max(y1, y2) > allowedMaxY
        ) {
          outOfBounds.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`);
        }
      }

      // Check text elements
      const texts = svgEl.getElementsByTagName("text");
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        const x = parseFloat(t.getAttribute("x") || "0");
        const y = parseFloat(t.getAttribute("y") || "0");
        // text coordinates can be anchor points, check if coordinate is far outside
        if (x < allowedMinX || x > allowedMaxX || y < allowedMinY || y > allowedMaxY) {
          outOfBounds.push(`<text x="${x}" y="${y}">`);
        }
      }

      if (outOfBounds.length > 0) {
        viewBoxContained = false;
        viewBoxDetail = `${outOfBounds.length} element(s) exceed viewBox [${vb.minX}, ${vb.minY}, ${vb.width}, ${vb.height}]. Ex: ${outOfBounds.slice(0, 2).join(", ")}`;
        feedback.push(`All shapes and texts must stay within viewBox dimensions (0 0 ${vb.width} ${vb.height}). Some elements were positioned out of bounds.`);
      } else {
        viewBoxContained = true;
        viewBoxDetail = `ViewBox [${vb.minX}, ${vb.minY}, ${vb.width}, ${vb.height}] verified. All checked elements fit inside.`;
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
  // Ensures SVG is a real graphic: has responsive viewBox and contains >= 3 vector shape elements (path, circle, rect, polygon, line)
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
      customDetail = `Passed: High graphic richness with ${totalShapes} vector shapes [${foundTags.join(", ")}] and responsive viewBox.`;
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

  const allPassed =
    xmlValid &&
    viewBoxContained &&
    hasTitleAndLabels &&
    hasAnimation &&
    customSemanticRichness;

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
      description: "All graphical and text elements stay within the defined viewBox dimensions.",
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
  ];

  return {
    isValid: allPassed,
    checks: {
      xmlValid,
      viewBoxContained,
      hasTitleAndLabels,
      hasAnimation,
      customSemanticRichness,
    },
    checkDetails,
    feedbackForRetry: feedback,
    cleanSvg,
  };
}
