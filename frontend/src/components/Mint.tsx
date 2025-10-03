import { myTokenModuleMyTokenAbi } from "../generated";
import {
  useWriteContract,
  useAccount,
  usePublicClient,
  useChainId,
} from "wagmi";
import { passetHub, kusamaAssetHub, westend } from "../wagmi-config";

import { useState, useEffect } from "react";

export function Mint(params: {
  contractAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  isOwner: boolean;
  decimals: number;
  symbol: string;
}) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [amount, setAmount] = useState(0);
  const [address, setAddress] = useState<`0x${string}`>(
    userAddress || "0x932217f9faf715808c1f76eA9EeAb7026806C963"
  );
  const [showHashButton, setShowHashButton] = useState(false);

  useEffect(() => {
    if (userAddress) {
      setAddress(userAddress);
    }
  }, [userAddress]);

  const { writeContract, status, data, error } = useWriteContract();

  // Handle delay for showing transaction hash button
  useEffect(() => {
    if (status === "success" && data) {
      setShowHashButton(false);
      const timer = setTimeout(() => {
        setShowHashButton(true);
      }, 5000); // 1 second delay

      return () => clearTimeout(timer);
    } else {
      setShowHashButton(false);
    }
  }, [status, data]);

  // Get network-specific information including block explorer
  const getNetworkInfo = (chainId: number) => {
    switch (chainId) {
      case passetHub.id:
        return {
          explorer: "https://blockscout-passet-hub.parity-testnet.parity.io",
        };
      case kusamaAssetHub.id:
        return {
          explorer:
            "https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io",
        };
      case westend.id:
        return {
          explorer: "https://blockscout-asset-hub.parity-chains-scw.parity.io",
        };
      case 1: // Ethereum mainnet
        return {
          explorer: "https://etherscan.io",
        };
      default:
        return {
          explorer: "",
        };
    }
  };

  const networkInfo = getNetworkInfo(chainId);

  // Format transaction hash for display (first 5 chars only)
  const formatTxHash = (hash: string) => {
    return hash.slice(0, 5);
  };

  return (
    <div
      className="border rounded-md my-5 mx-2 p-4 w-fit inline-block"
      style={{
        backgroundColor: "var(--bg-light)",
        borderColor: "var(--border-color)",
        boxShadow: "var(--shadow-sm)",
        minWidth: "320px",
      }}
    >
      <h3
        className="px-2 block mb-4 font-bold text-lg"
        style={{ color: "var(--text-color)" }}
      >
        Mint {params.symbol}s
      </h3>
      <div className="text-right my-2">
        <label htmlFor="address" className="px-2 block mb-2 inline-block">
          Address
        </label>
        <input
          id="address"
          value={address}
          placeholder="0x..."
          onChange={(e) => setAddress(e.target.value as `0x${string}`)}
          disabled={status === "pending"}
          className="
            border rounded-md padding-1 pl-2 h-10 w-400
            focus:ring-2 focus:ring-inset focus:ring-indigo-600
          "
        />
      </div>
      <div className="text-right my-2">
        <label htmlFor="amount" className="px-2 block mb-2 inline-block">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="0"
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={status === "pending"}
          className="
            border rounded-md padding-1 pl-2 h-10 w-400
            focus:ring-2 focus:ring-inset focus:ring-indigo-600
          "
        />
      </div>

      <button
        onClick={async () => {
          if (!userAddress) return;
          try {
            const value = BigInt(amount) * 10n ** BigInt(params.decimals);
            // Precompute fee and limits to avoid wallet estimation issues
            const [gasPrice, nonce, gas] = await Promise.all([
              publicClient?.getGasPrice().catch(() => undefined),
              publicClient
                ?.getTransactionCount({ address: userAddress })
                .catch(() => undefined),
              publicClient
                ?.estimateGas({
                  account: userAddress,
                  to: params.contractAddress,
                  data: await (async () => {
                    // Encode calldata for the mint(address,uint256)
                    const selector = "0x40c10f19";
                    const pad = (s: string) =>
                      s.replace(/^0x/, "").padStart(64, "0");
                    const calldata =
                      selector + pad(address) + pad(value.toString(16));
                    return calldata as `0x${string}`;
                  })(),
                })
                .catch(() => undefined),
            ]);

            writeContract({
              chainId,
              address: params.contractAddress,
              abi: myTokenModuleMyTokenAbi,
              functionName: "mint",
              args: [address, value],
              // Hint wagmi/viem for legacy by setting gasPrice
              ...(gasPrice ? { gasPrice, type: "legacy" as const } : {}),
              ...(gas ? { gas } : {}),
              ...(nonce !== undefined ? { nonce } : {}),
              account: userAddress,
            });
          } catch (e) {
            console.error(e);
          }
        }}
        disabled={status === "pending" || amount <= 0}
        style={{
          margin: "0 12px",
          height: "40px",
          padding: "0 16px",
          backgroundColor: status === "pending" ? "#ccc" : "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor:
            status === "pending" || amount <= 0 ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "500",
          opacity: status === "pending" || amount <= 0 ? 0.6 : 1,
        }}
      >
        Mint{" "}
        {status === "pending"
          ? "⏳"
          : status === "success"
          ? "✅"
          : status === "error"
          ? "❌"
          : ""}
      </button>

      {status === "error" && error && (
        <div
          style={{
            color: "red",
            fontSize: "14px",
            marginTop: "8px",
            padding: "8px",
          }}
        >
          Error: {error.message}
        </div>
      )}

      {status === "success" && data && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px",
            backgroundColor: "#f0f8ff",
            borderRadius: "8px",
            border: "1px solid #b3d9ff",
          }}
        >
          <div
            style={{
              color: "green",
              fontSize: "14px",
              marginBottom: "8px",
              fontWeight: "500",
            }}
          >
            ✅ Transaction successful!
          </div>
          {showHashButton ? (
            networkInfo.explorer ? (
              <button
                onClick={() =>
                  window.open(
                    `${networkInfo.explorer}/tx/${data}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "500",
                }}
              >
                View {formatTxHash(data)} ↗
              </button>
            ) : (
              <code
                style={{
                  fontSize: "12px",
                  wordBreak: "break-all",
                  color: "#666",
                }}
              >
                {formatTxHash(data)}
              </code>
            )
          ) : (
            <div
              style={{ color: "#666", fontSize: "13px", fontStyle: "italic" }}
            >
              Loading explorer link...
            </div>
          )}
        </div>
      )}

      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "13px",
          marginTop: "10px",
          padding: "8px 12px",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderRadius: "6px",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          fontWeight: "400",
          lineHeight: "1.4",
        }}
      >
        💡 This is a test token - anyone can mint for free!
      </div>
    </div>
  );
}
