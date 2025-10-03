import { useState } from "react";
import { useWeb3Auth } from "@web3auth/modal/react";
import { useChainId } from "wagmi";

export function ExportPrivateKey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { web3Auth } = useWeb3Auth();
  const chainId = useChainId();

  // Get network-specific information for private key export method
  const getPrivateKeyMethod = () => {
    switch (chainId) {
      case 420420422: // Passet Hub (Polkadot-based)
      case 420420418: // Kusama Asset Hub
      case 420420421: // Westend
        return "private_key"; // Non-EVM chains
      case 1: // Ethereum Mainnet
      default:
        return "eth_private_key"; // Ethereum/EVM chains
    }
  };

  const getNetworkInfo = () => {
    switch (chainId) {
      case 420420422:
        return { name: 'Passet Hub', type: 'Polkadot-based' };
      case 420420418:
        return { name: 'Kusama Asset Hub', type: 'Polkadot-based' };
      case 420420421:
        return { name: 'Westend Network', type: 'Polkadot-based' };
      case 1:
        return { name: 'Ethereum Mainnet', type: 'EVM' };
      default:
        return { name: 'Unknown Network', type: 'EVM' };
    }
  };

  const networkInfo = getNetworkInfo();

  const exportPrivateKey = async () => {
    if (!web3Auth?.provider) {
      setError("Web3Auth provider not available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const method = getPrivateKeyMethod();
      console.log(`Requesting private key using method: ${method}`);

      const privateKeyHex = await web3Auth.provider.request({
        method: method
      });

      if (privateKeyHex) {
        // First, show educational message about MPC vs MetaMask
        const educationalMessage = `💡 Web3Auth Advantage: Unlike MetaMask which stores your key locally, Web3Auth uses MultiPartyComputation (MPC) technology. Your key is never fully assembled in one place - providing superior security without browser extensions!

No MetaMask needed ✨

Learn more about MPC: https://web3auth.io/docs/features/mpc

Click OK to view your private key.`;

        const userConfirmed = window.confirm(educationalMessage);

        if (userConfirmed) {
          // Then show the private key with copy option
          const privateKeyMessage = `🔐 Your Private Key:

${privateKeyHex}

Click OK to copy to clipboard, or Cancel to close without copying.`;

          const shouldCopy = window.confirm(privateKeyMessage);

          if (shouldCopy) {
            try {
              await navigator.clipboard.writeText(privateKeyHex as string);
              window.alert('✅ Private key copied to clipboard!');
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
              window.alert(`❌ Failed to copy automatically. Please copy manually:

${privateKeyHex}`);
            }
          }
        }
      } else {
        setError("Failed to retrieve private key");
      }
    } catch (err: any) {
      console.error("Private key export error:", err);
      setError(err.message || "Failed to export private key");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div data-testid="export-private-key">
      <h2>Export Private Key</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px' }}>
        Network: {networkInfo.name} | Type: {networkInfo.type}
      </p>
      <p style={{ fontSize: '12px', color: '#ff6b35', marginBottom: '15px' }}>
        ⚠️ <strong>Warning:</strong> Never share your private key with anyone. Store it securely and only use it when necessary.
      </p>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={exportPrivateKey}
          disabled={loading || !web3Auth?.provider}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? 'var(--text-muted)' : '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Exporting...' : 'Export Private Key'}
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#3d1a1a',
          borderRadius: 'var(--radius)',
          color: '#ff6b6b',
          fontSize: '14px',
          border: '1px solid #722020'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}