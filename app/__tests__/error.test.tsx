import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from '../error';

describe('GlobalError', () => {
  it('renders a friendly recovery message and triggers reset', () => {
    const reset = vi.fn();

    render(<GlobalError error={new Error('Falha inesperada')} reset={reset} />);

    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(reset).toHaveBeenCalled();
  });
});
