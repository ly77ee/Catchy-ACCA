import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgress } from '../components/common/CircularProgress';
import { Badge } from '../components/common/Badge';

describe('Common UI Components', () => {
  it('renders CircularProgress with correct percentage and aria attributes', () => {
    render(<CircularProgress percentage={75} size={80} subLabel="Completed" />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('clamps CircularProgress within 0 and 100', () => {
    const { unmount } = render(<CircularProgress percentage={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    unmount();

    render(<CircularProgress percentage={-20} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders Badge with correct status label and styling', () => {
    const { rerender } = render(<Badge status="passed" />);
    expect(screen.getByText('Passed')).toBeInTheDocument();

    rerender(<Badge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    rerender(<Badge status="doubt" />);
    expect(screen.getByText('Doubt')).toBeInTheDocument();

    rerender(<Badge status="exempt" />);
    expect(screen.getByText('Exempt')).toBeInTheDocument();
  });
});
