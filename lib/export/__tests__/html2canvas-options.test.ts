import { describe, expect, it } from 'vitest';
import { buildDashboardPdfCanvasOptions } from '../html2canvas-options';

describe('buildDashboardPdfCanvasOptions', () => {
  it('sanitizes unsupported modern CSS color functions in cloned documents', () => {
    document.body.innerHTML = `
      <style>
        #dashboard-content .modern-token {
          color: oklch(95% 0.02 240);
          border-color: lab(40% 0 0);
        }
      </style>
      <div id="dashboard-content">
        <section
          id="card"
          style="
            color: lab(90% 0 0);
            background: linear-gradient(90deg, oklch(60% 0.1 240), #020408);
            box-shadow: 0 0 12px color(display-p3 1 1 1);
          "
        >
          <svg id="icon"><path id="path" style="fill: oklch(70% 0.2 140); stroke: lab(60% 0 0);" /></svg>
          <span class="modern-token">Dossiê executivo</span>
          Conteúdo fiscal
        </section>
      </div>
    `;

    const options = buildDashboardPdfCanvasOptions('#020408');

    options.onclone(document);

    const card = document.getElementById('card');
    const path = document.getElementById('path');

    expect(card).toBeInstanceOf(HTMLElement);
    expect(path).toBeInstanceOf(SVGElement);
    expect(document.querySelector('style')?.textContent).not.toMatch(
      /\b(?:lab|lch|oklab|oklch|color)\(/i,
    );
    expect(card?.getAttribute('style')).not.toMatch(/\b(?:lab|lch|oklab|oklch|color)\(/i);
    expect(path?.getAttribute('style')).not.toMatch(/\b(?:lab|lch|oklab|oklch|color)\(/i);
  });
});
