import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DecisionIntelligencePanel from '../DecisionIntelligencePanel';

describe('DecisionIntelligencePanel', () => {
  it('renders risk and opportunity highlights', () => {
    render(
      <DecisionIntelligencePanel
        riskLevel="médio"
        opportunityValue={85000}
        nextAction="Revisar documentos pendentes"
      />,
    );

    expect(screen.getByText(/oportunidade tributária/i)).toBeInTheDocument();
    expect(screen.getByText(/risco de conformidade/i)).toBeInTheDocument();
    expect(screen.getByText('Revisar documentos pendentes')).toBeInTheDocument();
  });
});
