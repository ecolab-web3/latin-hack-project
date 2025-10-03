import "./App.css";
import {
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
  useWeb3Auth,
} from "@web3auth/modal/react";
import { useAccount, useChainId } from "wagmi";
import { SendTransaction } from "./components/sendTransaction";
import { Balance } from "./components/getBalance";
import { SwitchChain } from "./components/switchNetwork";
import { ExportPrivateKey } from "./components/exportPrivateKey";
import { ContractData } from "./components/ContractData";
import { myTokenModuleMyTokenAddress } from "./generated";
import { passetHub, kusamaAssetHub, westend } from "./wagmi-config";
import { useState, useEffect } from "react";

function App() {
  const {
    connect,
    isConnected,
    connectorName,
    loading: connectLoading,
    error: connectError,
  } = useWeb3AuthConnect();
  const {
    disconnect,
    loading: disconnectLoading,
    error: disconnectError,
  } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { web3Auth } = useWeb3Auth();
  const { address } = useAccount();
  const chainId = useChainId();

  // Provider readiness states
  const [providerReady, setProviderReady] = useState(false);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState(false);

  // Track Web3Auth provider initialization
  useEffect(() => {
    const checkProviderStatus = () => {
      if (web3Auth) {
        try {
          // Check if Web3Auth is properly initialized and ready for login
          // Web3Auth is ready if status is 'ready'
          const isInitialized = web3Auth.status === "ready";
          const isNotConnecting = !connectLoading;
          const canLogin = isInitialized && isNotConnecting;

          setProviderReady(canLogin);
          setProviderLoading(web3Auth.status !== "ready");

          // console.log('Web3Auth status:', web3Auth.status, 'connectLoading:', connectLoading, 'canLogin:', canLogin);

          // If ready, clear the interval
          if (canLogin) {
            return true; // Signal to stop interval
          }
        } catch (error) {
          console.error("Error checking Web3Auth status:", error);
          setProviderReady(false);
          setProviderLoading(true);
        }
      } else {
        // Still loading if web3Auth instance not available
        setProviderReady(false);
        setProviderLoading(true);
      }
      return false; // Continue interval
    };

    // Check immediately
    if (checkProviderStatus()) {
      return; // Already ready, no need for interval
    }

    // Set up interval to continuously check until ready
    const interval = setInterval(() => {
      if (checkProviderStatus()) {
        clearInterval(interval);
      }
    }, 200); // Check more frequently

    // Cleanup interval after 30 seconds max
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn("Web3Auth initialization timeout");
      setProviderLoading(false);
      setProviderError(true);
      setProviderReady(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [web3Auth, connectLoading]);


  const contractAddress =
    myTokenModuleMyTokenAddress[
      passetHub.id as keyof typeof myTokenModuleMyTokenAddress
    ];

  // Faucet URLs for different networks
  const getFaucetUrl = (chainId: number, address: string) => {
    const faucetUrls = {
      [passetHub.id]: `https://faucet.polkadot.io/?parachain=1111&address=${address}`,
      [kusamaAssetHub.id]: `https://faucet.polkadot.io/?parachain=1000&address=${address}`,
      [westend.id]: `https://faucet.polkadot.io/?parachain=1000&address=${address}`,
    };
    return faucetUrls[chainId as keyof typeof faucetUrls];
  };

  const handleFaucetClick = () => {
    if (!address) return;

    const faucetUrl = getFaucetUrl(chainId, address);
    if (faucetUrl) {
      window.open(faucetUrl, "_blank", "noopener,noreferrer");
      uiConsole(`Opening faucet for ${address} on chain ${chainId}`);
    } else {
      uiConsole(`No faucet available for chain ${chainId}`);
    }
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
      console.log(...args);
    }
  }

  const loggedInView = (
    <div className="grid">
      <div className="showcase-message">
        <h3>
          🎯 Interact directly with Polkadot Asset Hub - no MetaMask required!
        </h3>
        <p>
          You're connected via Web3Auth. A secure key pair was generated from
          your social login choice, enabling blockchain interactions without
          browser wallet extensions.
        </p>
      </div>

      <h2>Connected to {connectorName}</h2>
      <div>{address}</div>
      <div className="flex-container">
        <div>
          <button onClick={() => uiConsole(userInfo)} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={handleFaucetClick} className="card faucet-button">
            Get Test Tokens
          </button>
        </div>
        <div>
          <button onClick={() => disconnect()} className="card">
            Log Out
          </button>
          {disconnectLoading && <div className="loading">Disconnecting...</div>}
          {disconnectError && (
            <div className="error">{disconnectError.message}</div>
          )}
        </div>
      </div>

      <div className="showcase-message">
        <h3>💰 Check Your Balance</h3>
        <p>View your current token balances on the connected network.</p>
      </div>
      <Balance />

      {/* <div className="showcase-message">
        <h3>🔄 Send Transactions</h3>
        <p>Transfer tokens directly through Asset Hub without additional wallet prompts.</p>
      </div>
      <SendTransaction /> */}

      {contractAddress && (
        <>
          <div className="showcase-message">
            <h3>📋 Smart Contract Interactions</h3>
            <p>
              Interact with deployed contracts on Asset Hub - read balances,
              approve tokens, and execute transactions.
            </p>
          </div>
          <div className="contract-section">
            <h3>FakeUSDT Contract Interactions</h3>
            <ContractData
              contractAddress={contractAddress}
              userAddresses={address ? [address] : undefined}
            />
          </div>
        </>
      )}

      <div className="showcase-message">
        <h3>🌐 Network Switching</h3>
        <p>Switch between different Polkadot networks seamlessly.</p>
      </div>
      <SwitchChain />

      <div className="showcase-message">
        <h3>🔑 Private Key Access</h3>
        <p>
          Export your private key for advanced use cases while maintaining
          security.
        </p>
      </div>
      <ExportPrivateKey />

      {!contractAddress && (
        <div className="contract-section">
          <h3>Contract Not Available</h3>
          <p>
            Please deploy the FakeUSDT contract and update the address in
            generated.ts
          </p>
        </div>
      )}
    </div>
  );

  const unloggedInView = (
    <div className="grid">
      <div className="educational-message">
        <h2>
          👋 Connect with your social accounts to explore Web3 without wallet
          extensions!
        </h2>
        <p>
          See what's possible with Asset Hub interactions - no MetaMask or
          browser wallet required. Just use your existing social logins to get
          started.
        </p>
      </div>

      {/* Provider initialization status */}
      {providerLoading && (
        <div className="loading">Initializing Web3Auth provider...</div>
      )}

      {/* Login button - only show when provider is ready */}
      {!providerLoading && providerReady && (
        <button
          onClick={() => {
            // Since the button only appears when ready, we should always be able to connect
            if (web3Auth && web3Auth.status === "ready" && !connectLoading && !isConnected) {
              connect();
            }
          }}
          className="card"
          disabled={!providerReady || connectLoading || isConnected}
        >
          Login
        </button>
      )}

      {/* Provider failed to initialize */}
      {!providerLoading && !providerReady && providerError && !connectLoading && (
        <div className="error">
          Web3Auth provider failed to initialize after 30 seconds. Please check
          your internet connection and reload the page.
        </div>
      )}

      {/* Provider ready but can't connect (network issues) */}
      {!providerLoading && !providerReady && !providerError && !connectLoading && (
        <div className="error">
          Web3Auth provider is not ready for login. Please wait or reload the
          page.
        </div>
      )}

      {connectLoading && <div className="loading">Connecting...</div>}
      {connectError && <div className="error">{connectError.message}</div>}
    </div>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a
          target="_blank"
          href="https://web3auth.io/docs/sdk/pnp/web/modal"
          rel="noreferrer"
        >
          Web3Auth{" "}
        </a>
        & React Modal Quick Start by WEB3DEV
      </h1>

      {isConnected ? loggedInView : unloggedInView}
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/w3b3d3v/web3auth-examples/tree/web3dev-version/quick-starts/react-quick-start"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
