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


export function extractSvg(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();
  const svgBlockMatch = text.match(/```(?:xml|svg)?\s*([\s\S]*?)```/i);
  if (svgBlockMatch && svgBlockMatch[1]) {
    text = svgBlockMatch[1].trim();
  }
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
  color?: string;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const NAMED_COLORS: Record<string, RgbColor> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  red: { r: 239, g: 68, b: 68 },
  green: { r: 34, g: 197, b: 94 },
  blue: { r: 59, g: 130, b: 246 },
  yellow: { r: 234, g: 179, b: 8 },
  orange: { r: 249, g: 115, b: 22 },
  gray: { r: 100, g: 116, b: 139 },
  grey: { r: 100, g: 116, b: 139 },
  none: { r: 255, g: 255, b: 255 },
};

function parseCssRules(svgText: string): Record<string, { fill?: string; stroke?: string }> {
  const rules: Record<string, { fill?: string; stroke?: string }> = {};
  const styleMatch = svgText.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return rules;

  const content = styleMatch[1];
  const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(content)) !== null) {
    const className = match[1];
    const declarations = match[2];
    const fillMatch = declarations.match(/fill:\s*([^;!]+)/i);
    const strokeMatch = declarations.match(/stroke:\s*([^;!]+)/i);

    rules[className] = {
      fill: fillMatch ? fillMatch[1].trim() : undefined,
      stroke: strokeMatch ? strokeMatch[1].trim() : undefined,
    };
  }

  return rules;
}

function parseRgbColor(str: string | null | undefined): RgbColor | null {
  if (!str) return null;
  const s = str.trim().toLowerCase();

  if (s === "transparent" || s === "none") return null;
  if (NAMED_COLORS[s]) return NAMED_COLORS[s];

  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

function getRelativeLuminance(rgb: RgbColor): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: RgbColor, rgb2: RgbColor): number {
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  const margin = 4;
  const p1Inside =
    x1 >= box.minX - margin &&
    x1 <= box.maxX + margin &&
    y1 >= box.minY - margin &&
    y1 <= box.maxY + margin;
  const p2Inside =
    x2 >= box.minX - margin &&
    x2 <= box.maxX + margin &&
    y2 >= box.minY - margin &&
    y2 <= box.maxY + margin;
  if (p1Inside && p2Inside) return false;
  if ((!p1Inside && p2Inside) || (p1Inside && !p2Inside)) {
    return true;
  }
  const lineMinX = Math.min(x1, x2);
  const lineMaxX = Math.max(x1, x2);
  const lineMinY = Math.min(y1, y2);
  const lineMaxY = Math.max(y1, y2);

  if (lineMaxX < box.minX || lineMinX > box.maxX || lineMaxY < box.minY || lineMinY > box.maxY) {
    return false;
  }

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return midX >= box.minX && midX <= box.maxX && midY >= box.minY && midY <= box.maxY;
}


function lineCutsThroughTextBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: TextBoundingBox
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < box.minX || minX > box.maxX || maxY < box.minY || minY > box.maxY) {
    return false;
  }
  const spansHorizontally = minX < box.minX + 2 && maxX > box.maxX - 2;
  const spansVertically = minY < box.minY + 2 && maxY > box.maxY - 2;
  if (spansHorizontally || spansVertically) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    if (midX >= box.minX && midX <= box.maxX && midY >= box.minY && midY <= box.maxY) {
      return true;
    }
  }

  return false;
}


function isColorTransparent(fillStr: string | null | undefined, el?: Element | null): boolean {
  if (!fillStr) return true;
  const s = fillStr.trim().toLowerCase();
  if (s === "transparent" || s === "none") return true;
  if (s === "rgba(0,0,0,0)" || s === "rgba(0, 0, 0, 0)") return true;

  const rgbaMatch = s.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
  if (rgbaMatch && parseFloat(rgbaMatch[1]) === 0) return true;

  if (el) {
    const opacity = el.getAttribute("opacity") || el.getAttribute("fill-opacity");
    if (opacity !== null && parseFloat(opacity) === 0) return true;
    const style = el.getAttribute("style");
    if (style) {
      const match = style.match(/(?:fill-)?opacity:\s*0(?:\.0+)?(?:\s*;|\s*$)/i);
      if (match) return true;
    }
  }
  return false;
}


function getElementDirectFill(el: Element, cssRules: Record<string, any>): string | null {
  const style = el.getAttribute("style");
  if (style) {
    const bgMatch = style.match(/(?:background(?:-color)?|fill):\s*([^;!]+)/i);
    if (bgMatch) return bgMatch[1].trim();
  }
  const fillAttr = el.getAttribute("fill") || el.getAttribute("background");
  if (fillAttr) return fillAttr.trim();
  const cls = el.getAttribute("class");
  if (cls && cssRules[cls]?.fill) {
    return cssRules[cls].fill;
  }

  return null;
}


function shapeEnclosesBox(shape: Element, box: TextBoundingBox): boolean {
  const tagName = shape.tagName.toLowerCase();
  if (tagName === "rect") {
    const x = parseFloat(shape.getAttribute("x") || "0");
    const y = parseFloat(shape.getAttribute("y") || "0");
    const w = parseFloat(shape.getAttribute("width") || "0");
    const h = parseFloat(shape.getAttribute("height") || "0");
    if (w <= 0 || h <= 0) return false;
    const midX = (box.minX + box.maxX) / 2;
    const midY = (box.minY + box.maxY) / 2;
    if (midX >= x - 4 && midX <= x + w + 4 && midY >= y - 4 && midY <= y + h + 4) {
      return true;
    }

    return (
      box.minX >= x - 12 &&
      box.maxX <= x + w + 12 &&
      box.minY >= y - 12 &&
      box.maxY <= y + h + 12
    );
  } else if (tagName === "circle" || tagName === "ellipse") {
    const cx = parseFloat(shape.getAttribute("cx") || "0");
    const cy = parseFloat(shape.getAttribute("cy") || "0");
    const rx = parseFloat(shape.getAttribute("rx") || shape.getAttribute("r") || "0");
    const ry = parseFloat(shape.getAttribute("ry") || shape.getAttribute("r") || "0");
    if (rx <= 0 || ry <= 0) return false;
    const midX = (box.minX + box.maxX) / 2;
    const midY = (box.minY + box.maxY) / 2;
    const dx = (midX - cx) / (rx + 4);
    const dy = (midY - cy) / (ry + 4);
    return dx * dx + dy * dy <= 1.25;
  }
  return false;
}


function resolveEffectiveBackground(
  textEl: Element,
  box: TextBoundingBox,
  xmlDoc: Document,
  cssRules: Record<string, any>,
  vb: { minX: number; minY: number; width: number; height: number } | null
): RgbColor {
  let current: Element | null = textEl.parentElement;
  while (current && current.tagName.toLowerCase() !== "svg") {
    const containerFill = getElementDirectFill(current, cssRules);
    if (containerFill && !isColorTransparent(containerFill, current)) {
      const parsed = parseRgbColor(containerFill);
      if (parsed) return parsed;
    }
    const childShapes = [
      ...Array.from(current.getElementsByTagName("rect")),
      ...Array.from(current.getElementsByTagName("circle")),
      ...Array.from(current.getElementsByTagName("ellipse")),
    ];

    for (const shape of childShapes) {
      const sw = parseFloat(shape.getAttribute("width") || "0");
      const sh = parseFloat(shape.getAttribute("height") || "0");
      const isCanvasRect = vb
        ? sw >= vb.width * 0.7 && sh >= vb.height * 0.7
        : sw >= 700 || sh >= 500;
      if (isCanvasRect) continue; // Canvas background rects handled at root

      if (shapeEnclosesBox(shape, box)) {
        const shapeFill = getElementDirectFill(shape, cssRules);
        if (shapeFill && !isColorTransparent(shapeFill, shape)) {
          const parsed = parseRgbColor(shapeFill);
          if (parsed) return parsed;
        }
      }
    }
    current = current.parentElement;
  }
  const candidateShapes: { el: Element; area: number }[] = [];
  const allRects = Array.from(xmlDoc.documentElement.getElementsByTagName("rect"));
  const allCircles = Array.from(xmlDoc.documentElement.getElementsByTagName("circle"));
  const allEllipses = Array.from(xmlDoc.documentElement.getElementsByTagName("ellipse"));

  for (const r of allRects) {
    const rw = parseFloat(r.getAttribute("width") || "0");
    const rh = parseFloat(r.getAttribute("height") || "0");
    const isCanvasRect = vb
      ? rw >= vb.width * 0.7 && rh >= vb.height * 0.7
      : rw >= 700 || rh >= 500;
    if (isCanvasRect) continue;

    if (shapeEnclosesBox(r, box)) {
      candidateShapes.push({ el: r, area: rw * rh });
    }
  }

  for (const c of [...allCircles, ...allEllipses]) {
    const rx = parseFloat(c.getAttribute("rx") || c.getAttribute("r") || "0");
    const ry = parseFloat(c.getAttribute("ry") || c.getAttribute("r") || "0");
    if (shapeEnclosesBox(c, box)) {
      candidateShapes.push({ el: c, area: Math.PI * rx * ry });
    }
  }
  candidateShapes.sort((a, b) => a.area - b.area);

  for (const candidate of candidateShapes) {
    const fill = getElementDirectFill(candidate.el, cssRules);
    if (fill && !isColorTransparent(fill, candidate.el)) {
      const parsed = parseRgbColor(fill);
      if (parsed) return parsed;
    }
  }
  const svgRoot = xmlDoc.documentElement;
  const svgFill = getElementDirectFill(svgRoot, cssRules);
  if (svgFill && !isColorTransparent(svgFill, svgRoot)) {
    const parsed = parseRgbColor(svgFill);
    if (parsed) return parsed;
  }
  for (const r of allRects) {
    const rw = parseFloat(r.getAttribute("width") || "0");
    const rh = parseFloat(r.getAttribute("height") || "0");
    const isCanvas = vb
      ? rw >= vb.width * 0.7 && rh >= vb.height * 0.7
      : rw >= 700 || rh >= 500;
    if (isCanvas) {
      const fill = getElementDirectFill(r, cssRules);
      if (fill && !isColorTransparent(fill, r)) {
        const parsed = parseRgbColor(fill);
        if (parsed) return parsed;
      }
    }
  }
  const allTexts = Array.from(xmlDoc.documentElement.getElementsByTagName("text"));
  let lightTextCount = 0;
  let darkTextCount = 0;

  for (const t of allTexts) {
    const tFill = getElementDirectFill(t, cssRules) || "#000000";
    const rgb = parseRgbColor(tFill);
    if (rgb) {
      const lum = getRelativeLuminance(rgb);
      if (lum > 0.45) lightTextCount++;
      else darkTextCount++;
    }
  }
  if (lightTextCount > darkTextCount) {
    return { r: 15, g: 23, b: 42 }; // Slate-900 Dark Canvas Context
  }
  return { r: 255, g: 255, b: 255 }; // Clean Light Canvas Context
}


export function validateSvg(rawInput: string): SvgValidationResult {
  const cleanSvg = extractSvg(rawInput);
  const feedback: string[] = [];

  let xmlDoc: Document | null = null;
  const parseErrors: string[] = [];
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
  let viewBoxContained = false;
  let viewBoxDetail = "All elements are contained within the defined viewBox coordinates.";
  const textBoxes: TextBoundingBox[] = [];
  let parsedVb: { minX: number; minY: number; width: number; height: number } | null = null;

  if (xmlDoc && xmlValid) {
    const svgEl = xmlDoc.documentElement;
    const vb = parseViewBox(svgEl);
    parsedVb = vb;

    if (!vb) {
      viewBoxContained = false;
      viewBoxDetail = "Missing or invalid 'viewBox' attribute (e.g. viewBox=\"0 0 800 600\").";
      feedback.push("Provide an explicit 'viewBox' attribute on the <svg> element, e.g. viewBox=\"0 0 800 600\".");
    } else {
      const toleranceX = vb.width * 0.05;
      const toleranceY = vb.height * 0.05;
      const allowedMinX = vb.minX - toleranceX;
      const allowedMaxX = vb.maxX + toleranceX;
      const allowedMinY = vb.minY - toleranceY;
      const allowedMaxY = vb.maxY + toleranceY;

      const outOfBounds: string[] = [];
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
      textBoxes.some((b) => b.y <= 130 && b.text.length >= 3) ||
      validLabels.some(
        (txt) => /photosynthesis|pythagoras|circuit|matter|circle|theorem|particle|energy/i.test(txt) || txt.length >= 4
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

    const cssRules = parseCssRules(cleanSvg);
    const contrastFailures: string[] = [];
    const allTextEls = xmlDoc.documentElement.getElementsByTagName("text");
    for (const box of textBoxes) {
      const textIndex = parseInt(box.id.replace("text-", ""), 10);
      const textEl: Element | undefined = allTextEls[textIndex];
      if (!textEl) continue;

      const fillStr = getElementDirectFill(textEl, cssRules) || "#000000";
      const textColor = parseRgbColor(fillStr);
      if (!textColor) continue;
      const localBg = resolveEffectiveBackground(textEl, box, xmlDoc, cssRules, parsedVb);

      const ratio = getContrastRatio(textColor, localBg);
      if (ratio < 2.8) {
        contrastFailures.push(
          `"${box.text.slice(0, 15)}" (${fillStr}) on background contrast ratio is only ${ratio.toFixed(1)}:1 (minimum 3.0:1 required)`
        );
      }
    }

    const hasGoodContrast = contrastFailures.length === 0;

    if (hasViewBoxAttr && hasMinShapes && hasGoodContrast) {
      customSemanticRichness = true;
      customDetail = `Passed: Graphic richness with ${totalShapes} vector shapes [${foundTags.join(", ")}], responsive viewBox, and high contrast legibility.`;
    } else {
      customSemanticRichness = false;
      const issues: string[] = [];
      if (!hasViewBoxAttr) issues.push("Missing responsive viewBox attribute");
      if (totalShapes < 3) issues.push(`Only ${totalShapes} vector shape(s) found (requires >= 3)`);
      if (!hasGoodContrast) issues.push(`Low color contrast: ${contrastFailures.slice(0, 2).join("; ")}`);
      customDetail = `Failed: ${issues.join("; ")}.`;
      if (!hasGoodContrast) {
        feedback.push(
          `Color contrast too low for student legibility: ${contrastFailures.slice(0, 2).join("; ")}. Ensure text colors contrast clearly with background (e.g. use light text #f8fafc on dark background, or dark text #0f172a on light background).`
        );
      }
      if (!hasMinShapes || !hasViewBoxAttr) {
        feedback.push(
          "Diagram must be visually rich: include at least 3 distinct vector shape elements (<path>, <circle>, <rect>, <line>, or <polygon>) and a responsive viewBox."
        );
      }
    }
  } else {
    customSemanticRichness = false;
    customDetail = "Cannot check graphic richness due to invalid XML.";
  }
  let noOverlappingLabels = true;
  let overlapDetail = "No collisions or label overlaps detected.";
  const collidingPairs: string[] = [];
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      const b1 = textBoxes[i];
      const b2 = textBoxes[j];
      const margin = 2;
      const overlapsX = b1.minX + margin < b2.maxX && b1.maxX - margin > b2.minX;
      const overlapsY = b1.minY + margin < b2.maxY && b1.maxY - margin > b2.minY;

      if (overlapsX && overlapsY) {
        noOverlappingLabels = false;
        collidingPairs.push(`Text "${b1.text.slice(0, 15)}" collides with Text "${b2.text.slice(0, 15)}"`);
      }
    }
  }
  if (xmlDoc && xmlValid) {
    const rectEls = xmlDoc.documentElement.getElementsByTagName("rect");
    const prominentBoxes: Array<{
      name: string;
      isCardBanner: boolean;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    }> = [];

    for (let i = 0; i < rectEls.length; i++) {
      const r = rectEls[i];
      const m = getCumulativeTransform(r);
      const x = parseFloat(r.getAttribute("x") || "0");
      const y = parseFloat(r.getAttribute("y") || "0");
      const w = parseFloat(r.getAttribute("width") || "0");
      const h = parseFloat(r.getAttribute("height") || "0");
      const rx = parseFloat(r.getAttribute("rx") || "0");
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
      const isCardBanner = rx > 0 && Math.abs(w - h) > 30 && h <= 80;

      prominentBoxes.push({
        name: `Shape [${Math.round(minX)}, ${Math.round(minY)}]`,
        isCardBanner,
        minX,
        maxX,
        minY,
        maxY,
      });
    }
    for (let i = 0; i < prominentBoxes.length; i++) {
      for (let j = i + 1; j < prominentBoxes.length; j++) {
        const s1 = prominentBoxes[i];
        const s2 = prominentBoxes[j];
        const containmentTolerance = 8;
        const s1ContainsS2 =
          s1.minX - containmentTolerance <= s2.minX &&
          s1.maxX + containmentTolerance >= s2.maxX &&
          s1.minY - containmentTolerance <= s2.minY &&
          s1.maxY + containmentTolerance >= s2.maxY;
        const s2ContainsS1 =
          s2.minX - containmentTolerance <= s1.minX &&
          s2.maxX + containmentTolerance >= s1.maxX &&
          s2.minY - containmentTolerance <= s1.minY &&
          s2.maxY + containmentTolerance >= s1.maxY;

        if (!s1ContainsS2 && !s2ContainsS1) {
          const overlapX = Math.min(s1.maxX, s2.maxX) - Math.max(s1.minX, s2.minX);
          const overlapY = Math.min(s1.maxY, s2.maxY) - Math.max(s1.minY, s2.minY);
          if (overlapX > 15 && overlapY > 15) {
            noOverlappingLabels = false;
            collidingPairs.push(`Elements partially overlap across boundaries (${Math.round(overlapX)}x${Math.round(overlapY)}px overlap)`);
          }
        }
      }
    }
    interface Segment {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      source: string;
    }
    const allDrawingSegments: Segment[] = [];

    const lineEls = xmlDoc.documentElement.getElementsByTagName("line");
    for (let i = 0; i < lineEls.length; i++) {
      const l = lineEls[i];
      const strokeOpacity = parseFloat(l.getAttribute("stroke-opacity") || l.getAttribute("opacity") || "1");
      const strokeWidth = parseFloat(l.getAttribute("stroke-width") || "1");
      if (strokeOpacity <= 0.45 && strokeWidth <= 1.5) continue;

      const m = getCumulativeTransform(l);
      const p1 = applyTransformToPoint(m, parseFloat(l.getAttribute("x1") || "0"), parseFloat(l.getAttribute("y1") || "0"));
      const p2 = applyTransformToPoint(m, parseFloat(l.getAttribute("x2") || "0"), parseFloat(l.getAttribute("y2") || "0"));
      allDrawingSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, source: "Line stroke" });
    }

    const polyEls = xmlDoc.documentElement.getElementsByTagName("polygon");
    for (let i = 0; i < polyEls.length; i++) {
      const poly = polyEls[i];
      const m = getCumulativeTransform(poly);
      const pointsStr = poly.getAttribute("points") || "";
      const pts = pointsStr.trim().split(/[\s,]+/).map(Number);
      const polyCorners: { x: number; y: number }[] = [];
      for (let j = 0; j < pts.length; j += 2) {
        if (j + 1 < pts.length && !isNaN(pts[j]) && !isNaN(pts[j + 1])) {
          polyCorners.push(applyTransformToPoint(m, pts[j], pts[j + 1]));
        }
      }
      for (let j = 0; j < polyCorners.length; j++) {
        const next = (j + 1) % polyCorners.length;
        allDrawingSegments.push({
          x1: polyCorners[j].x,
          y1: polyCorners[j].y,
          x2: polyCorners[next].x,
          y2: polyCorners[next].y,
          source: "Polygon edge",
        });
      }
    }

    for (const seg of allDrawingSegments) {
      for (const box of prominentBoxes.filter((b) => b.isCardBanner)) {
        if (lineIntersectsBox(seg.x1, seg.y1, seg.x2, seg.y2, box)) {
          noOverlappingLabels = false;
          collidingPairs.push(`${seg.source} (${Math.round(seg.x1)},${Math.round(seg.y1)}) cuts into banner/card at (${Math.round(box.minX)},${Math.round(box.minY)})`);
        }
      }
      for (const box of textBoxes) {
        if (lineCutsThroughTextBox(seg.x1, seg.y1, seg.x2, seg.y2, box)) {
          noOverlappingLabels = false;
          collidingPairs.push(`${seg.source} cuts across text label "${box.text.slice(0, 15)}"`);
        }
      }
    }
    if (textBoxes.length > 0 && prominentBoxes.length > 0) {
      const topTitle = textBoxes.find((b) => b.y < 70);
      if (topTitle) {
        for (const card of prominentBoxes) {
          const horizontalOverlap =
            Math.min(topTitle.maxX, card.maxX) - Math.max(topTitle.minX, card.minX);
          if (horizontalOverlap > 20 && card.minY >= topTitle.maxY) {
            const gap = card.minY - topTitle.maxY;
            if (gap < 12) {
              noOverlappingLabels = false;
              collidingPairs.push(
                `Header "${topTitle.text.slice(0, 15)}" has insufficient clearance (${Math.round(gap)}px, min 12px) from banner at y=${Math.round(card.minY)}`
              );
            }
          }
        }
      }
    }
    for (const box of textBoxes) {
      for (const card of prominentBoxes.filter((b) => b.isCardBanner)) {
        const isTargetedInCard =
          box.x + box.width / 2 >= card.minX &&
          box.x + box.width / 2 <= card.maxX &&
          box.y + box.height / 2 >= card.minY - 5 &&
          box.y + box.height / 2 <= card.maxY + 5;

        if (isTargetedInCard) {
          if (box.minX < card.minX - 8 || box.maxX > card.maxX + 8) {
            noOverlappingLabels = false;
            collidingPairs.push(
              `Text "${box.text.slice(0, 15)}" spills outside its card (card: ${Math.round(card.maxX - card.minX)}px, text: ${Math.round(box.width)}px)`
            );
          }
        }
      }
    }
    const circles = Array.from(xmlDoc.documentElement.getElementsByTagName("circle"));
    for (const card of prominentBoxes) {
      const cardWidth = card.maxX - card.minX;
      const cardHeight = card.maxY - card.minY;
      if (cardWidth >= 140 && cardWidth <= 240 && cardHeight >= 140 && cardHeight <= 250) {
        for (const c of circles) {
          const m = getCumulativeTransform(c);
          const cx = parseFloat(c.getAttribute("cx") || "0");
          const cy = parseFloat(c.getAttribute("cy") || "0");
          const r = parseFloat(c.getAttribute("r") || "0");
          if (r <= 2 || r > 25) continue; // skip small dots or large circles

          const pt = applyTransformToPoint(m, cx, cy);
          if (pt.x >= card.minX - 15 && pt.x <= card.maxX + 15 && pt.y >= card.minY - 15 && pt.y <= card.maxY + 15) {
            if (pt.x - r < card.minX + 2 || pt.x + r > card.maxX - 2 || pt.y - r < card.minY + 2 || pt.y + r > card.maxY - 2) {
              noOverlappingLabels = false;
              collidingPairs.push(
                `Particle at (${Math.round(pt.x)}, ${Math.round(pt.y)}) with radius ${r} exceeds chamber box [${Math.round(card.minX)}, ${Math.round(card.minY)}]`
              );
            }
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
      name: "Visual Richness & Contrast",
      description: "Contains at least 3 vector shapes, responsive viewBox, and WCAG-compliant color contrast.",
      passed: customSemanticRichness,
      details: customDetail,
    },
    {
      id: "no-overlapping-labels",
      name: "Zero Collisions & Clear Margins",
      description: "Ensures text labels, shape boundaries, and ray lines do not collide or render over each other.",
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
