import { render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import App from './App';

vi.mock('devextreme-aspnet-data-nojquery', () => ({
  createStore: () => [],
}));

describe('App', () => {
  it('renders the orders grid', async () => {
    const { container } = render(<App />);

    expect(container.querySelector('.dx-datagrid')).toBeInTheDocument();
    expect(await screen.findByText('Order ID')).toBeInTheDocument();
    expect(screen.getByText('Ship Name')).toBeInTheDocument();
  });

  it('renders the undo options with a default limit of 50', () => {
    render(<App />);

    expect(screen.getByLabelText('Maximum undo steps')).toHaveValue('50');
    expect(screen.getByLabelText('Undo edit types')).toBeInTheDocument();
  });

  it('disables undo when there are no changes', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Undo the last change' }))
      .toHaveAttribute('aria-disabled', 'true');
  });
});
