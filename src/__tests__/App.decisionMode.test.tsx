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

// Mock the ProfileTab component to ensure it renders correctly
vi.mock('../components/ProfileTab', () => ({
  ProfileTab: ({ decisionMode, setDecisionMode }: any) => (
    <div data-testid="profile-tab">
      <label htmlFor="decision-mode-select">Decision mode</label>
      <select
        id="decision-mode-select"
        data-testid="decision-mode-select"
        value={decisionMode}
        onChange={(e) => setDecisionMode(e.target.value)}
      >
        <option value="heuristic">Heuristic</option>
        <option value="hybrid_ml">Hybrid ML</option>
      </select>
    </div>
  ),
}));

describe('App decision mode integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === 'doordash-decider:v1:profile') {
          return JSON.stringify({ 
            driverName: 'Test', 
            vehicleType: 'car', 
            decisionMode: 'heuristic',
            targetRatePerHour: 25,
            costPerMile: 0.4
          });
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
    
    // Wait for ProfileTab to render
    await waitFor(() => {
      expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    });
    
    // Change decision mode
    const select = screen.getByTestId('decision-mode-select');
    fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    
    // Switch back to Decider tab
    const deciderTab = screen.getByText('Decider');
    fireEvent.click(deciderTab);
    
    // Check that the badge shows Hybrid ML
    await waitFor(() => {
      expect(screen.getByText('Hybrid ML')).toBeInTheDocument();
    });
  });

  it('maintains decision mode after browser refresh simulation', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    
    render(<App />);
    
    // Switch to Profile tab
    const profileTab = screen.getByText('Profile');
    fireEvent.click(profileTab);
    
    // Wait for and change decision mode
    waitFor(() => {
      const select = screen.getByTestId('decision-mode-select');
      fireEvent.change(select, { target: { value: 'hybrid_ml' } });
    });
    
    // Check that profile was saved to localStorage
    expect(setItemSpy).toHaveBeenCalledWith(
      'doordash-decider:v1:profile',
      expect.stringContaining('"decisionMode":"hybrid_ml"')
    );
  });

  it('shows correct decision explanation based on mode', async () => {
    render(<App />);
    
    // Fill in some offer data to trigger decision
    await waitFor(() => {
      const payoutInput = screen.getByLabelText(/Offer payout/i);
      fireEvent.change(payoutInput, { target: { value: '30' } });
    });
    
    // Should show decision explanation in the UI
    await waitFor(() => {
      const explanations = screen.getAllByText(/ACCEPT|REJECT/);
      expect(explanations.length).toBeGreaterThan(0);
    });
  });
});