// src/components/__tests__/ProfileTab.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DecisionMode, VehicleType } from '../../lib/profile';
import { ProfileTab } from '../ProfileTab';

describe('ProfileTab decision mode', () => {
  const defaultProps = {
    driverId: 'driver-1',
    setDriverId: vi.fn(),
    driverName: 'Test Driver',
    setDriverName: vi.fn(),
    vehicleType: 'car' as VehicleType,
    setVehicleType: vi.fn(),
    preferredZones: [],
    setPreferredZones: vi.fn(),
    preferredTimeBuckets: [],
    setPreferredTimeBuckets: vi.fn(),
    targetRatePerHour: 25,
    setTargetRatePerHour: vi.fn(),
    costPerMile: 0.5,
    setCostPerMile: vi.fn(),
    earnedSoFar: 0,
    setEarnedSoFar: vi.fn(),
    decisionMode: 'heuristic' as DecisionMode,
    setDecisionMode: vi.fn(),
    onSyncProfile: vi.fn(),
    isSyncingProfile: false,
    syncStatus: 'idle' as const,
    syncMessage: null,
  };

  it('renders decision mode selector with heuristic selected by default', () => {
    render(<ProfileTab {...defaultProps} />);
    
    const select = screen.getByLabelText('Decision mode');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('heuristic');
  });

  it('renders both heuristic and hybrid_ml options', () => {
    render(<ProfileTab {...defaultProps} />);
    
    const options = screen.getAllByRole('option');
    const optionValues = options.map(option => option.getAttribute('value'));
    
    expect(optionValues).toContain('heuristic');
    expect(optionValues).toContain('hybrid_ml');
    expect(screen.getByText('Heuristic only')).toBeInTheDocument();
    expect(screen.getByText('Hybrid ML (when available)')).toBeInTheDocument();
  });

  it('calls setDecisionMode when selecting hybrid_ml', () => {
    const mockSetDecisionMode = vi.fn();
    render(<ProfileTab {...defaultProps} setDecisionMode={mockSetDecisionMode} />);
    
    const select = screen.getByLabelText('Decision mode');
    fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    
    expect(mockSetDecisionMode).toHaveBeenCalledWith('hybrid_ml');
    expect(mockSetDecisionMode).toHaveBeenCalledTimes(1);
  });

  it('calls setDecisionMode when selecting heuristic', () => {
    const mockSetDecisionMode = vi.fn();
    const props = { ...defaultProps, decisionMode: 'hybrid_ml' as DecisionMode };
    render(<ProfileTab {...props} setDecisionMode={mockSetDecisionMode} />);
    
    const select = screen.getByLabelText('Decision mode');
    fireEvent.change(select, { target: { value: 'heuristic' } });
    
    expect(mockSetDecisionMode).toHaveBeenCalledWith('heuristic');
  });

  it('displays the correct decision mode hint', () => {
    render(<ProfileTab {...defaultProps} />);
    
    expect(screen.getByText('Hybrid ML uses a model when online and falls back to heuristics otherwise.')).toBeInTheDocument();
  });

  it('parses comma-separated preferred zones', () => {
    const mockSetPreferredZones = vi.fn();
    render(<ProfileTab {...defaultProps} setPreferredZones={mockSetPreferredZones} />);

    const input = screen.getByLabelText('Preferred zones');
    fireEvent.change(input, { target: { value: 'Downtown, Airport' } });

    expect(mockSetPreferredZones).toHaveBeenCalledWith(['Downtown', 'Airport']);
  });

  it('invokes sync handler when clicking sync button', () => {
    const onSyncProfile = vi.fn();
    render(<ProfileTab {...defaultProps} onSyncProfile={onSyncProfile} />);

    fireEvent.click(screen.getByText('Sync profile to backend'));
    expect(onSyncProfile).toHaveBeenCalledTimes(1);
  });
});
