import '@testing-library/jest-dom';
import { createElement } from 'react';

// Mock Web3Auth hooks
vi.mock('@web3auth/modal/react', () => ({
  useWeb3AuthConnect: vi.fn(() => ({
    connect: vi.fn(),
    isConnected: false,
    connectorName: 'Web3Auth',
    loading: false,
    error: null,
  })),
  useWeb3AuthDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
    loading: false,
    error: null,
  })),
  useWeb3AuthUser: vi.fn(() => ({
    userInfo: null,
  })),
}));

// Mock wagmi hooks and exports
vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAccount: vi.fn(() => ({
      address: null,
    })),
    useChainId: vi.fn(() => 420420422),
    useBalance: vi.fn(() => ({
      data: null,
    })),
    useSendTransaction: vi.fn(() => ({
      data: null,
      error: null,
      isPending: false,
      sendTransaction: vi.fn(),
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      isLoading: false,
      isSuccess: false,
    })),
    usePublicClient: vi.fn(() => null),
  };
});

// Mock generated contract addresses
vi.mock('../generated', () => ({
  myTokenModuleMyTokenAddress: {
    420420422: '0x1234567890123456789012345678901234567890',
  },
}));

// Mock components to avoid complex integration testing
vi.mock('../components/sendTransaction', () => ({
  SendTransaction: () => createElement('div', { 'data-testid': 'send-transaction' }, 'Send Transaction Component'),
}));

vi.mock('../components/getBalance', () => ({
  Balance: () => createElement('div', { 'data-testid': 'balance' }, 'Balance Component'),
}));

vi.mock('../components/switchNetwork', () => ({
  SwitchChain: () => createElement('div', { 'data-testid': 'switch-chain' }, 'Switch Chain Component'),
}));

vi.mock('../components/exportPrivateKey', () => ({
  ExportPrivateKey: () => createElement('div', { 'data-testid': 'export-private-key' }, 'Export Private Key Component'),
}));

vi.mock('../components/ContractData', () => ({
  ContractData: () => createElement('div', { 'data-testid': 'contract-data' }, 'Contract Data Component'),
}));