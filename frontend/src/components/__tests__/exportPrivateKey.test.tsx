import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Override the global mock for this specific test file
vi.mock('../exportPrivateKey', async () => {
  const actual = await vi.importActual('../exportPrivateKey');
  return actual;
});

// Mock the hooks and dependencies
vi.mock('@web3auth/modal/react', () => ({
  useWeb3Auth: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useChainId: vi.fn(),
}));

// Import the actual component and mocked modules
import { ExportPrivateKey } from '../exportPrivateKey';
import { useWeb3Auth } from '@web3auth/modal/react';
import { useChainId } from 'wagmi';

describe('ExportPrivateKey', () => {
  const mockWeb3Auth = {
    provider: {
      request: vi.fn(),
    },
  };

  let alertSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock window.alert and window.confirm
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Mock console.log to prevent noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Setup default mocks
    (useWeb3Auth as ReturnType<typeof vi.fn>).mockReturnValue({
      web3Auth: mockWeb3Auth,
    });

    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1); // Ethereum Mainnet
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders component with export button', () => {
    render(<ExportPrivateKey />);

    expect(screen.getByRole('heading', { name: 'Export Private Key' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Private Key' })).toBeInTheDocument();
    expect(screen.getByText(/Network: Ethereum Mainnet/)).toBeInTheDocument();
  });

  it('displays loading state when exporting', async () => {
    // Mock a delayed response
    mockWeb3Auth.provider.request.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('0x1234567890abcdef'), 100))
    );

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export Private Key' })).toBeInTheDocument();
    });
  });

  it('displays educational content first, then private key on successful export', async () => {
    const mockPrivateKey = '0x1234567890abcdef';
    mockWeb3Auth.provider.request.mockResolvedValue(mockPrivateKey);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2); // Educational message + private key confirmation
    });

    // Verify first confirm shows educational content (without private key)
    const educationalMessage = confirmSpy.mock.calls[0][0];
    expect(educationalMessage).toContain('Web3Auth Advantage');
    expect(educationalMessage).toContain('MultiPartyComputation (MPC)');
    expect(educationalMessage).toContain('Unlike MetaMask');
    expect(educationalMessage).toContain('No MetaMask needed');
    expect(educationalMessage).toContain('https://web3auth.io/docs/features/mpc');
    expect(educationalMessage).toContain('Click OK to view your private key');
    expect(educationalMessage).not.toContain(mockPrivateKey); // Should NOT contain private key yet

    // Verify second confirm shows private key
    const privateKeyMessage = confirmSpy.mock.calls[1][0];
    expect(privateKeyMessage).toContain(mockPrivateKey);
    expect(privateKeyMessage).toContain('Your Private Key');
    expect(privateKeyMessage).toContain('Click OK to copy to clipboard');

    // Verify copy success alert
    expect(alertSpy).toHaveBeenCalledWith('✅ Private key copied to clipboard!');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPrivateKey);
  });

  it('stops flow when user cancels educational step', async () => {
    const mockPrivateKey = '0x1234567890abcdef';
    mockWeb3Auth.provider.request.mockResolvedValue(mockPrivateKey);

    // Mock user cancelling the educational step
    confirmSpy.mockReturnValue(false);

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1); // Only educational message
    });

    // Should not show private key or copy functionality
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('stops flow when user cancels private key copy step', async () => {
    const mockPrivateKey = '0x1234567890abcdef';
    mockWeb3Auth.provider.request.mockResolvedValue(mockPrivateKey);

    // Mock user confirming educational step but cancelling copy step
    confirmSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2); // Educational + private key confirmation
    });

    // Should not copy to clipboard
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('handles clipboard copy failure gracefully', async () => {
    const mockPrivateKey = '0x1234567890abcdef';
    mockWeb3Auth.provider.request.mockResolvedValue(mockPrivateKey);

    // Mock clipboard API failure
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard access denied')),
      },
    });

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2);
    });

    // Should show fallback message with private key for manual copy
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('❌ Failed to copy automatically. Please copy manually:')
    );
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining(mockPrivateKey)
    );
  });

  it('uses correct private key method for Ethereum mainnet', async () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    mockWeb3Auth.provider.request.mockResolvedValue('0x1234567890abcdef');

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWeb3Auth.provider.request).toHaveBeenCalledWith({
        method: 'eth_private_key'
      });
    });
  });

  it('uses correct private key method for Polkadot-based networks', async () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(420420422); // Passet Hub
    mockWeb3Auth.provider.request.mockResolvedValue('0x1234567890abcdef');

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWeb3Auth.provider.request).toHaveBeenCalledWith({
        method: 'private_key'
      });
    });
  });

  it('displays network information correctly', () => {
    // Test Kusama Asset Hub
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(420420418);
    const { rerender } = render(<ExportPrivateKey />);
    expect(screen.getByText(/Network: Kusama Asset Hub/)).toBeInTheDocument();
    expect(screen.getByText(/Type: Polkadot-based/)).toBeInTheDocument();

    // Test Westend
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(420420421);
    rerender(<ExportPrivateKey />);
    expect(screen.getByText(/Network: Westend Network/)).toBeInTheDocument();

    // Test Ethereum
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    rerender(<ExportPrivateKey />);
    expect(screen.getByText(/Network: Ethereum Mainnet/)).toBeInTheDocument();
    expect(screen.getByText(/Type: EVM/)).toBeInTheDocument();
  });

  it('disables button when Web3Auth provider is not available', async () => {
    (useWeb3Auth as ReturnType<typeof vi.fn>).mockReturnValue({
      web3Auth: { provider: null },
    });

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    expect(button).toBeDisabled();

    // Verify no alert is triggered on disabled button
    fireEvent.click(button);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('handles private key retrieval failure', async () => {
    mockWeb3Auth.provider.request.mockResolvedValue(null);

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Failed to retrieve private key/)).toBeInTheDocument();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('handles Web3Auth provider errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockWeb3Auth.provider.request.mockRejectedValue(new Error(errorMessage));

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('displays security warning message', () => {
    render(<ExportPrivateKey />);

    expect(screen.getByText(/Never share your private key with anyone/)).toBeInTheDocument();
    expect(screen.getByText(/Store it securely/)).toBeInTheDocument();
  });

  it('educational and private key messages are mobile-friendly', async () => {
    const mockPrivateKey = '0x1234567890abcdef';
    mockWeb3Auth.provider.request.mockResolvedValue(mockPrivateKey);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<ExportPrivateKey />);

    const button = screen.getByRole('button', { name: 'Export Private Key' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2);
    });

    // Verify educational message format
    const educationalMessage = confirmSpy.mock.calls[0][0];
    expect(educationalMessage).toMatch(/💡 Web3Auth Advantage:.+No MetaMask needed ✨\n\nLearn more about MPC:/s);
    expect(educationalMessage).toContain('Click OK to view your private key');

    // Verify private key message format
    const privateKeyMessage = confirmSpy.mock.calls[1][0];
    expect(privateKeyMessage).toMatch(/🔐 Your Private Key:\n\n.+\n\nClick OK to copy to clipboard/s);
    expect(privateKeyMessage).toContain(mockPrivateKey);
  });
});