import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from '@web3auth/modal/react';
import { useAccount, useChainId } from 'wagmi';
import App from '../App';

// Mock window.open
Object.assign(window, { open: vi.fn() });

// Mock setTimeout for provider initialization
vi.stubGlobal('setTimeout', (callback: () => void, delay: number) => {
  // Immediately call callback in tests
  callback();
  return 1;
});

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Not logged in state', () => {
    beforeEach(() => {
      vi.mocked(useWeb3AuthConnect).mockReturnValue({
        connect: vi.fn(),
        isConnected: false,
        connectorName: 'Web3Auth',
        loading: false,
        error: null,
      });
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
      } as any);
    });

    it('displays educational messaging when not logged in', async () => {
      render(<App />);

      expect(screen.getByText(/Connect with your social accounts to explore Web3 without wallet extensions/)).toBeInTheDocument();
      expect(screen.getByText(/no MetaMask or browser wallet required/)).toBeInTheDocument();

      // Wait for provider to initialize and login button to appear
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
        },
        { timeout: 100 } // Short timeout for tests
      );
    });

    it('shows "no wallet extension needed" messaging', () => {
      render(<App />);

      expect(screen.getByText(/no MetaMask or browser wallet required/)).toBeInTheDocument();
    });

    it('shows provider loading state before login button', () => {
      // Mock setTimeout to not execute immediately
      vi.stubGlobal('setTimeout', vi.fn());

      render(<App />);

      // Should show loading message initially
      expect(screen.getByText(/Initializing Web3Auth provider/)).toBeInTheDocument();

      // Login button should not be present during loading
      expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
    });
  });

  describe('Logged in state', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      vi.mocked(useWeb3AuthConnect).mockReturnValue({
        connect: vi.fn(),
        isConnected: true,
        connectorName: 'Web3Auth',
        loading: false,
        error: null,
      });
      vi.mocked(useAccount).mockReturnValue({
        address: mockAddress,
      } as any);
      vi.mocked(useWeb3AuthDisconnect).mockReturnValue({
        disconnect: vi.fn(),
        loading: false,
        error: null,
      });
      vi.mocked(useWeb3AuthUser).mockReturnValue({
        userInfo: { name: 'Test User' },
      } as any);
      vi.mocked(useChainId).mockReturnValue(420420422);
    });

    it('displays showcase messages when logged in', () => {
      render(<App />);

      expect(screen.getByText(/Interact directly with Polkadot Asset Hub - no MetaMask required/)).toBeInTheDocument();
      expect(screen.getByText(/Check Your Balance/)).toBeInTheDocument();
      // Send Transactions section is commented out in the component
      // expect(screen.getByText(/Send Transactions/)).toBeInTheDocument();
      expect(screen.getByText(/Smart Contract Interactions/)).toBeInTheDocument();
      expect(screen.getByText(/Network Switching/)).toBeInTheDocument();
      expect(screen.getByText(/Private Key Access/)).toBeInTheDocument();
    });

    it('displays faucet button when logged in', () => {
      render(<App />);

      expect(screen.getByRole('button', { name: /get test tokens/i })).toBeInTheDocument();
    });

    it('opens faucet URL when faucet button is clicked', () => {
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(<App />);

      const faucetButton = screen.getByRole('button', { name: /get test tokens/i });
      fireEvent.click(faucetButton);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('faucet.polkadot.io/?parachain=1111'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('renders all functionality sections with showcase messages', () => {
      render(<App />);

      // Check that all sections are present
      expect(screen.getByTestId('balance')).toBeInTheDocument();
      // Send transaction is commented out in the component
      // expect(screen.getByTestId('send-transaction')).toBeInTheDocument();
      expect(screen.getByTestId('contract-data')).toBeInTheDocument();
      expect(screen.getByTestId('switch-chain')).toBeInTheDocument();
      expect(screen.getByTestId('export-private-key')).toBeInTheDocument();
    });
  });

  describe('Mobile responsiveness', () => {
    beforeEach(() => {
      vi.mocked(useWeb3AuthConnect).mockReturnValue({
        connect: vi.fn(),
        isConnected: false,
        connectorName: 'Web3Auth',
        loading: false,
        error: null,
      });
    });

    it('renders educational message with mobile-friendly styling', () => {
      render(<App />);

      const educationalMessage = screen.getByText(/Connect with your social accounts to explore Web3 without wallet extensions/);
      expect(educationalMessage.closest('.educational-message')).toBeInTheDocument();
    });

    it('renders login button with touch-friendly size', async () => {
      render(<App />);

      // Wait for provider to initialize and login button to appear
      await waitFor(
        () => {
          const loginButton = screen.getByRole('button', { name: /login/i });
          expect(loginButton).toHaveClass('card');
        },
        { timeout: 100 } // Short timeout for tests
      );
    });
  });

  describe('Faucet functionality', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    it('generates correct faucet URL for different chains', () => {
      const mockOpen = vi.fn();
      window.open = mockOpen;

      vi.mocked(useWeb3AuthConnect).mockReturnValue({
        connect: vi.fn(),
        isConnected: true,
        connectorName: 'Web3Auth',
        loading: false,
        error: null,
      });
      vi.mocked(useAccount).mockReturnValue({
        address: mockAddress,
      } as any);
      vi.mocked(useChainId).mockReturnValue(420420418); // Kusama Asset Hub

      render(<App />);

      const faucetButton = screen.getByRole('button', { name: /get test tokens/i });
      fireEvent.click(faucetButton);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('faucet.polkadot.io/?parachain=1000'),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });
});