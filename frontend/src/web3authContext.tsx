// IMP START - Quick Start
import { WEB3AUTH_NETWORK, CHAIN_NAMESPACES } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";
// IMP END - Quick Start
import { passetHub, kusamaAssetHub, westend } from "./wagmi-config";

// IMP START - Dashboard Registration
const clientId =
  // This is a test-only key Provided by KitDot, get one from https://dashboard.web3auth.io
  import.meta.env.VITE_WEB3AUTH_CLIENT_ID ||
  "BJDsmOCjEJNO46dyNiB5ErcH-mVgMoi22VvKUHufsu3cCAne66z542DJVMMbf9rs4wUwsirOiO1RCWtswZnfXYg";
// IMP END - Dashboard Registration

// Convert wagmi chain configs to Web3Auth format - SINGLE SOURCE OF TRUTH
const createWeb3AuthChainConfig = (chain: any) => ({
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: `0x${chain.id.toString(16)}`,
  rpcTarget: chain.rpcUrls.default.http[0],
  displayName: chain.name,
  blockExplorerUrl: chain.blockExplorers.default.url,
  ticker: chain.nativeCurrency.symbol,
  tickerName: chain.nativeCurrency.name,
  decimals: chain.nativeCurrency.decimals,
  logo: "https://polkadot.network/assets/img/logos/polkadot-logo.svg",
});

// IMP START - Config
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    // Use wagmi chains as source to generate Web3Auth conf
  },
};
// IMP END - Config

export default web3AuthContextConfig;
