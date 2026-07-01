import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScenarioComparisonCard from '../ScenarioComparisonCard';

describe('ScenarioComparisonCard', () => {
  it('renders base and optimized scenarios', () => {
    render(<ScenarioComparisonCard baseScenario={100000} optimizedScenario={140000} />);

    expect(screen.getByText(/cenários comparativos/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 100.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 140.000,00')).toBeInTheDocument();
  });
});
