'use strict';

const UNSUPPORTED_COLOR_FUNCTION = /\b(?:lab|lch|oklab|oklch|color)\(/i;

const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
] as const;

type ColorProperty = (typeof COLOR_PROPERTIES)[number];

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

function normalizeShadow(value: string): string {
  return UNSUPPORTED_COLOR_FUNCTION.test(value) ? 'none' : value;
}

function isStyledElement(element: Element): element is HTMLElement {
  return 'style' in element;
}

function sanitizeElementColors(element: HTMLElement, view: Window): void {
  const computed = view.getComputedStyle(element);

  COLOR_PROPERTIES.forEach((property: ColorProperty) => {
    const fallback = property === 'backgroundColor' ? 'transparent' : '#e5edf7';
    element.style[property] = normalizeCssColor(computed[property], fallback);
  });

  element.style.boxShadow = normalizeShadow(computed.boxShadow);
  element.style.textShadow = normalizeShadow(computed.textShadow);
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

      [root, ...Array.from(root.querySelectorAll('*'))].forEach((element) => {
        if (isStyledElement(element)) {
          sanitizeElementColors(element, view);
        }
      });
    },
  };
}
