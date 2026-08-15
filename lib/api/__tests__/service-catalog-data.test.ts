import { describe, expect, it } from 'vitest';

import { BCOST_SERVICE_CATALOG } from '../service-catalog-data';

describe('BCOST_SERVICE_CATALOG frontend fallback', () => {
  it('mantem ids de macro e microservicos unicos', () => {
    const macroIds = BCOST_SERVICE_CATALOG.map((macro) => macro.id);
    const microIds = BCOST_SERVICE_CATALOG.flatMap((macro) =>
      macro.microServices.map((micro) => micro.id),
    );

    expect(new Set(macroIds).size).toBe(macroIds.length);
    expect(new Set(microIds).size).toBe(microIds.length);
  });

  it('mantem fontes oficiais rastreaveis para servicos regulados', () => {
    const regulatedServices = BCOST_SERVICE_CATALOG.flatMap((macro) => macro.microServices).filter(
      (micro) => (micro.complianceTags?.length ?? 0) > 0,
    );

    expect(regulatedServices.length).toBeGreaterThan(0);

    for (const micro of regulatedServices) {
      expect(micro.officialSources?.length).toBeGreaterThan(0);
      expect(micro.officialSources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            url: expect.stringMatching(/^https:\/\/.+/),
          }),
        ]),
      );
    }
  });

  it('nao expõe nomes de concorrentes no catalogo operacional', () => {
    const text = JSON.stringify(BCOST_SERVICE_CATALOG).toLowerCase();

    expect(text).not.toContain('contabilizei');
    expect(text).not.toContain('dominio');
    expect(text).not.toContain('alterdata');
    expect(text).not.toContain('conta azul');
  });
});
