const UNSUPPORTED_COLOR_PATTERN = /lab\(|oklch\(|color\(/i

const SKIP_INLINE_PROPERTIES = new Set([
  "transition",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transition-delay",
  "animation",
  "animation-name",
  "animation-duration",
  "content",
])

function needsColorResolution(value: string): boolean {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") {
    return false
  }
  return UNSUPPORTED_COLOR_PATTERN.test(value)
}

/**
 * Resolve modern CSS colors (oklch/lab) to rgb() via the browser's style engine.
 */
export function resolveColorToRgb(
  doc: Document,
  property: string,
  value: string
): string {
  if (!needsColorResolution(value)) {
    return value
  }

  const probe = doc.createElement("div")
  probe.style.setProperty("display", "none")
  probe.style.setProperty(property, value)
  doc.body.appendChild(probe)
  const resolved =
    doc.defaultView?.getComputedStyle(probe).getPropertyValue(property) ?? "#000000"
  doc.body.removeChild(probe)

  if (needsColorResolution(resolved)) {
    return property.includes("background") ? "#ffffff" : "#000000"
  }
  return resolved || "#000000"
}

/** Remove stylesheets that contain oklch/lab — html2canvas cannot parse them. */
export function stripUnsupportedStylesheets(doc: Document): void {
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove())
  doc.querySelectorAll("style").forEach((el) => {
    if (el.getAttribute("data-pdf-export") !== "true") {
      el.remove()
    }
  })
}

export function injectPdfSafeBaseStyles(doc: Document, isDark: boolean): void {
  const style = doc.createElement("style")
  style.setAttribute("data-pdf-export", "true")
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: ${isDark ? "#0a0a0a" : "#ffffff"};
      color: ${isDark ? "#fafafa" : "#0a0a0a"};
      font-family: system-ui, -apple-system, sans-serif;
    }
  `
  doc.head.appendChild(style)
}

function sanitizeStyleValue(
  doc: Document,
  property: string,
  value: string
): string {
  if (!value) return value
  if (needsColorResolution(value)) {
    return resolveColorToRgb(doc, property, value)
  }
  return value
}

/**
 * Copy live computed styles onto the clone as inline rgb-safe values.
 * Must run after stylesheets are stripped from the clone.
 */
export function inlineComputedStylesRecursive(
  source: Element,
  clone: Element,
  doc: Document
): void {
  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    const computed = window.getComputedStyle(source)

    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      if (SKIP_INLINE_PROPERTIES.has(prop)) continue

      let value = computed.getPropertyValue(prop)
      if (!value || (value === "none" && prop !== "display")) continue

      value = sanitizeStyleValue(doc, prop, value)
      ;(clone as HTMLElement).style.setProperty(prop, value)
    }
  }

  if (clone instanceof SVGElement && source instanceof SVGElement) {
    for (const attr of ["fill", "stroke"]) {
      const attrValue = source.getAttribute(attr) ?? computedSvgAttr(source, attr)
      if (attrValue && attrValue !== "none") {
        const safe = sanitizeStyleValue(doc, attr, attrValue)
        clone.setAttribute(attr, safe)
      }
    }
  }

  const sourceChildren = Array.from(source.children)
  const cloneChildren = Array.from(clone.children)
  for (let i = 0; i < sourceChildren.length; i++) {
    const cloneChild = cloneChildren[i]
    if (cloneChild) {
      inlineComputedStylesRecursive(sourceChildren[i], cloneChild, doc)
    }
  }
}

function computedSvgAttr(el: SVGElement, attr: string): string | null {
  const style = window.getComputedStyle(el)
  const value = style.getPropertyValue(attr)
  return value || null
}

export function prepareCloneForPdfCapture(
  sourceRoot: HTMLElement,
  clonedDoc: Document,
  targetId: string,
  isDark: boolean
): void {
  stripUnsupportedStylesheets(clonedDoc)
  injectPdfSafeBaseStyles(clonedDoc, isDark)

  const clonedRoot = clonedDoc.getElementById(targetId)
  if (!clonedRoot) return

  inlineComputedStylesRecursive(sourceRoot, clonedRoot, clonedDoc)
}

export function getPdfBackgroundColor(isDark: boolean): string {
  return isDark ? "#0a0a0a" : "#ffffff"
}
