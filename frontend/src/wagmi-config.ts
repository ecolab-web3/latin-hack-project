import { http, createConfig } from "wagmi";
import { type Chain } from "viem";
import { mainnet } from "wagmi/chains";

export const passetHub = {
  id: 420420422,
  name: "Passet Hub",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 10,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-passet-hub.parity-testnet.parity.io",
    },
  },
} as const satisfies Chain;

export const kusamaAssetHub = {
  id: 420420418,
  name: "Kusama Asset Hub",
  nativeCurrency: {
    name: "Kusama",
    symbol: "KSM",
    decimals: 12,
  },
  rpcUrls: {
    default: {
      http: ["https://kusama-asset-hub-eth-rpc.polkadot.io/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/",
    },
  },
} as const satisfies Chain;

export const westend = {
  id: 420420421,
  name: "Westend Network",
  nativeCurrency: {
    name: "Westend",
    symbol: "WND",
    decimals: 12,
  },
  rpcUrls: {
    default: {
      http: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-asset-hub.parity-chains-scw.parity.io",
    },
  },
} as const satisfies Chain;

export const wagmiConfig = createConfig({
  chains: [passetHub, mainnet, kusamaAssetHub, westend],
  transports: {
    [passetHub.id]: http(passetHub.rpcUrls.default.http[0]),
    [mainnet.id]: http(),
    [kusamaAssetHub.id]: http(kusamaAssetHub.rpcUrls.default.http[0]),
    [westend.id]: http(westend.rpcUrls.default.http[0]),
  },
});
