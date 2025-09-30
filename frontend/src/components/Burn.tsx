import { fakeUsdtModuleFakeUsdtAbi } from "../generated";
import {
  useWriteContract,
  useAccount,
  usePublicClient,
  useChainId,
} from "wagmi";
import { passetHub, kusamaAssetHub, westend } from "../wagmi-config";

import { useState, useEffect } from "react";

export function Burn(params: {
  contractAddress: `0x${string}`;
  decimals: number;
  symbol: string;
  userBalance: bigint;
}) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [amount, setAmount] = useState(0);
  const [showHashButton, setShowHashButton] = useState(false);

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

  const formatBalance = (balance: bigint): string => {
    const divisor = 10n ** BigInt(params.decimals);
    return (Number(balance) / Number(divisor)).toFixed(params.decimals);
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
        Burn {params.symbol}s
      </h3>

      <div
        className="px-2 mb-4 text-sm"
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--bg-color)",
          borderRadius: "6px",
          border: "1px solid var(--border-color)",
        }}
      >
        Your balance:{" "}
        <span
          className="font-semibold"
          style={{ color: "var(--primary-color)" }}
        >
          {formatBalance(params.userBalance)} {params.symbol}
        </span>
      </div>

      <div className="text-right my-2">
        <label htmlFor="burnAmount" className="px-2 block mb-2 inline-block">
          Amount to Burn
        </label>
        <input
          id="burnAmount"
          type="number"
          placeholder="0"
          max={formatBalance(params.userBalance)}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={status === "pending"}
          className="
            border rounded-md padding-1 pl-2 h-10 w-400
            focus:ring-2 focus:ring-inset focus:ring-red-600
          "
        />
      </div>

      <button
        onClick={async () => {
          if (!userAddress) return;
          try {
            const value = BigInt(amount) * 10n ** BigInt(params.decimals);

            // Check if user has enough balance
            if (value > params.userBalance) {
              alert("Cannot burn more than your balance!");
              return;
            }

            // Precompute gas parameters
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
                    // Encode calldata for burn(uint256)
                    const selector = "0x42966c68";
                    const pad = (s: string) =>
                      s.replace(/^0x/, "").padStart(64, "0");
                    const calldata = selector + pad(value.toString(16));
                    return calldata as `0x${string}`;
                  })(),
                })
                .catch(() => undefined),
            ]);

            writeContract({
              chainId,
              address: params.contractAddress,
              abi: fakeUsdtModuleFakeUsdtAbi,
              functionName: "burn",
              args: [value],
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
        disabled={
          status === "pending" || amount <= 0 || params.userBalance === 0n
        }
        style={{
          margin: "0 12px",
          height: "40px",
          padding: "0 16px",
          backgroundColor:
            status === "pending" || amount <= 0 || params.userBalance === 0n
              ? "#ccc"
              : "#ff6b35",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor:
            status === "pending" || amount <= 0 || params.userBalance === 0n
              ? "not-allowed"
              : "pointer",
          fontSize: "14px",
          fontWeight: "500",
          opacity:
            status === "pending" || amount <= 0 || params.userBalance === 0n
              ? 0.6
              : 1,
        }}
      >
        Burn{" "}
        {status === "pending"
          ? "⏳"
          : status === "success"
          ? "✅"
          : status === "error"
          ? "❌"
          : "🔥"}
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
            backgroundColor: "#fff5f0",
            borderRadius: "8px",
            border: "1px solid #ffb394",
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
            ✅ Burn successful!
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
                  backgroundColor: "#ff6b35",
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
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderRadius: "6px",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          fontWeight: "400",
          lineHeight: "1.4",
        }}
      >
        🔥 You can only burn your own tokens
      </div>
    </div>
  );
}
