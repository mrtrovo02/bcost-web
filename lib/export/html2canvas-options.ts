'use strict';

const UNSUPPORTED_COLOR_FUNCTION = /\b(?:lab|lch|oklab|oklch|color)\(/i;

const COLOR_PROPERTIES = [
  'color',
  'accentColor',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'caretColor',
  'columnRuleColor',
  'outlineColor',
  'textDecorationColor',
] as const;

type ColorProperty = (typeof COLOR_PROPERTIES)[number];

const DECORATIVE_BACKGROUND_PROPERTIES = [
  'background',
  'backgroundImage',
] as const;

export type BcostHtml2CanvasOptions = {
  scale: number;
  useCORS: boolean;
  backgroundColor: string;
  onclone: (clonedDocument: Document) => void;
};

function normalizeCssColor(value: string, fallback: string): string {
  if (!value || value === 'transparent') return value;
  return UNSUPPORTED_COLOR_FUNCTION.test(value) ? fallback : value;
}

function replaceUnsupportedColorFunctions(value: string, fallback: string): string {
  if (!UNSUPPORTED_COLOR_FUNCTION.test(value)) return value;

  return value.replace(/\b(?:lab|lch|oklab|oklch|color)\([^;{}]*\)/gi, fallback);
}

function normalizeShadow(value: string): string {
  return UNSUPPORTED_COLOR_FUNCTION.test(value) ? 'none' : value;
}

function isStyledElement(element: Element): element is HTMLElement {
  return 'style' in element;
}

function sanitizeElementColors(element: HTMLElement, view: Window): void {
  const computed = view.getComputedStyle(element);
  const inlineStyle = element.getAttribute('style');

  if (inlineStyle) {
    element.setAttribute('style', replaceUnsupportedColorFunctions(inlineStyle, '#e5edf7'));
  }

  COLOR_PROPERTIES.forEach((property: ColorProperty) => {
    const fallback = property === 'backgroundColor' ? 'transparent' : '#e5edf7';
    element.style[property] = normalizeCssColor(computed[property], fallback);
  });

  DECORATIVE_BACKGROUND_PROPERTIES.forEach((property) => {
    const value = computed[property];
    element.style[property] = UNSUPPORTED_COLOR_FUNCTION.test(value)
      ? element.style.backgroundColor || 'transparent'
      : value;
  });

  element.style.boxShadow = normalizeShadow(computed.boxShadow);
  element.style.textShadow = normalizeShadow(computed.textShadow);
}

function sanitizeSvgColors(element: SVGElement, view: Window): void {
  const computed = view.getComputedStyle(element);
  const inlineStyle = element.getAttribute('style');

  if (inlineStyle) {
    element.setAttribute('style', replaceUnsupportedColorFunctions(inlineStyle, 'currentColor'));
  }

  const fill = normalizeCssColor(computed.fill, 'currentColor');
  const stroke = normalizeCssColor(computed.stroke, 'currentColor');

  element.style.fill = fill;
  element.style.stroke = stroke;
}

function sanitizeStyleSheets(clonedDocument: Document): void {
  clonedDocument.querySelectorAll('style').forEach((styleElement) => {
    const rawCss = styleElement.textContent;

    if (!rawCss || !UNSUPPORTED_COLOR_FUNCTION.test(rawCss)) return;

    styleElement.textContent = replaceUnsupportedColorFunctions(rawCss, '#e5edf7');
  });
}

export function buildDashboardPdfCanvasOptions(
  backgroundColor = '#020408',
  rootId = 'dashboard-content',
): BcostHtml2CanvasOptions {
  return {
    scale: 2,
    useCORS: true,
    backgroundColor,
    onclone: (clonedDocument: Document) => {
      const view = clonedDocument.defaultView;
      const root = clonedDocument.getElementById(rootId);

      if (!view || !root) return;

      sanitizeStyleSheets(clonedDocument);

      [root, ...Array.from(root.querySelectorAll('*'))].forEach((element) => {
        if (isStyledElement(element)) {
          sanitizeElementColors(element, view);
        }

        if (element instanceof view.SVGElement) {
          sanitizeSvgColors(element, view);
        }
      });
    },
  };
}
