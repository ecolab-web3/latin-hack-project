import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useChainId } from "wagmi";
import { passetHub, kusamaAssetHub, westend } from "../wagmi-config";

export function Balance() {
  const { address } = useAccount();
  const chainId = useChainId();

  const { data, isLoading, error } = useBalance({ address });
  // console.log("user data: ", data);

  // Get decimals from wagmi config for proper Asset Hub decimals
  const getNetworkInfo = (chainId: number) => {
    switch (chainId) {
      case passetHub.id:
        return {
          decimals: passetHub.nativeCurrency.decimals, // 10
          symbol: passetHub.nativeCurrency.symbol, // PAS
          name: passetHub.name
        };
      case kusamaAssetHub.id:
        return {
          decimals: kusamaAssetHub.nativeCurrency.decimals, // 12
          symbol: kusamaAssetHub.nativeCurrency.symbol, // KSM
          name: kusamaAssetHub.name
        };
      case westend.id:
        return {
          decimals: westend.nativeCurrency.decimals, // 12
          symbol: westend.nativeCurrency.symbol, // WND
          name: westend.name
        };
      case 1: // Ethereum mainnet
        return {
          decimals: 18,
          symbol: "ETH",
          name: "Ethereum Mainnet"
        };
      default:
        return {
          decimals: 18,
          symbol: "ETH",
          name: "Unknown Network"
        };
    }
  };

  const networkInfo = getNetworkInfo(chainId);
  const networkDecimals = data?.decimals ?? networkInfo.decimals;

  return (
    <div data-testid="balance">
      <h2>Balance</h2>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
        Network: {networkInfo.name} | Currency: {networkInfo.symbol} | Decimals: {networkDecimals}
      </p>
      <div>
        {data?.value !== undefined &&
          `${formatUnits(data.value, networkDecimals)} ${data.symbol || networkInfo.symbol}`}{" "}
        {isLoading && "Loading..."} {error && "Error: " + error.message}
      </div>
    </div>
  );
}
