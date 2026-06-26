/**
 * WalletProvider.jsx
 * Initialized exactly per official docs:
 * https://aptos.dev/build/sdks/wallet-adapter/dapp
 *
 * - autoConnect: true   (auto-reconnects the most recently connected wallet)
 * - dappConfig.network: Network.TESTNET
 * - onError: logs errors
 * - optInWallets: ["Petra"]  — only show Petra
 */

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

export const WalletProvider = ({ children }) => {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosApiKeys: {
          testnet: process.env.NEXT_PUBLIC_APTOS_API_KEY_TESTNET,
        },
      }}
      onError={(error) => {
        console.log("[WalletAdapter] error", error);
      }}
      optInWallets={["Petra"]}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};

export default WalletProvider;
