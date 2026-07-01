import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ExecutiveCommandCenter from '../ExecutiveCommandCenter';

describe('ExecutiveCommandCenter', () => {
  it('renders the executive summary and recommended actions', () => {
    render(
      <ExecutiveCommandCenter
        companyName="Acme Ltda"
        netSavings={128000}
        taxSavingsRate={18.4}
        anexo="III"
        activeAlerts={2}
      />,
    );

    expect(screen.getByText(/centro de comando/i)).toBeInTheDocument();
    expect(screen.getByText(/ações recomendadas/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 128.000,00')).toBeInTheDocument();
  });
});
