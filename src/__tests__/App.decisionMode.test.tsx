// src/__tests__/App.decisionMode.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

// Mock hooks
vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('../hooks/useBackForwardCache');
vi.mock('../hooks/useOfferUrlSync');

describe('App decision mode integration', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === 'doordash-decider:v1:profile') {
          return JSON.stringify({ driverName: 'Test', vehicleType: 'car', decisionMode: 'heuristic' });
        }
        if (key === 'doordash-decider:v1:settings') {
          return JSON.stringify({});
        }
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
    
    // Mock URL
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/', hash: '' },
      writable: true,
    });
  });

  it('persists decision mode changes across tabs', async () => {
    render(<App />);
    
    // Switch to Profile tab
    const profileTab = screen.getByText('Profile');
    fireEvent.click(profileTab);
    
    // Change decision mode
    const select = screen.getByLabelText('Decision mode');
    fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    
    // Switch back to Decider tab
    const deciderTab = screen.getByText('Decider');
    fireEvent.click(deciderTab);
    
    // Check that the badge shows Hybrid ML
    await waitFor(() => {
      expect(screen.getByText('Hybrid ML')).toBeInTheDocument();
    });
    
    // Switch to Profile tab again
    fireEvent.click(profileTab);
    
    // Verify the selection is still hybrid_ml
    await waitFor(() => {
      expect(screen.getByLabelText('Decision mode')).toHaveValue('hybrid_ml');
    });
  });

  it('maintains decision mode after browser refresh simulation', () => {
    // This test simulates persistence by checking localStorage
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    
    render(<App />);
    
    // Switch to Profile tab
    const profileTab = screen.getByText('Profile');
    fireEvent.click(profileTab);
    
    // Change decision mode
    const select = screen.getByLabelText('Decision mode');
    fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    
    // Check that profile was saved to localStorage
    expect(setItemSpy).toHaveBeenCalledWith(
      'doordash-decider:v1:profile',
      expect.stringContaining('"decisionMode":"hybrid_ml"')
    );
  });

  it('shows correct decision explanation based on mode', () => {
    render(<App />);
    
    // Should show decision explanation in the UI
    expect(screen.getAllByText(/ACCEPT because net/)).not.toHaveLength(0);
    
    // Switch to Profile tab and change to hybrid_ml
    const profileTab = screen.getByText('Profile');
    fireEvent.click(profileTab);
    
    const select = screen.getByLabelText('Decision mode');
    fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    
    // Switch back to Decider tab
    const deciderTab = screen.getByText('Decider');
    fireEvent.click(deciderTab);
    
    // Decision explanation should still be visible
    expect(screen.getAllByText(/ACCEPT because net/)).not.toHaveLength(0);
  });
});
