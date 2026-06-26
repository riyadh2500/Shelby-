/**
 * AuthContext.js
 *
 * Uses @aptos-labs/wallet-adapter-react v4.1.5
 * Follows the official docs pattern:
 *
 *   import { useWallet } from "@aptos-labs/wallet-adapter-react";
 *   const { account, connected, wallet, wallets } = useWallet();
 *
 * WalletProvider wraps the app with AptosWalletAdapterProvider.
 * WalletInner reads from useWallet() and exposes a clean useAuth() hook.
 *
 * Payment: 0.00003 APT per KB of file size
 */

import React, {
  createContext, useContext,
  useState, useEffect, useRef,
} from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletProvider } from "./WalletProvider";

// ── Payment constants ─────────────────────────────────────────────────────────
export const APT_PER_KB    = 0.00003;
export const OCTAS_PER_APT = 100_000_000;

export function calcCostAPT(bytes = 0) {
  return parseFloat(((bytes / 1024) * APT_PER_KB).toFixed(8));
}
export function calcCostOctas(bytes = 0) {
  return Math.ceil((bytes / 1024) * APT_PER_KB * OCTAS_PER_APT);
}
export function formatAPT(apt = 0) {
  if (apt === 0)      return "0 APT";
  if (apt < 0.000001) return "< 0.000001 APT";
  return `${apt.toFixed(6)} APT`;
}

export const SHELBY_TREASURY =
  "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a";

export const PRICE_PER_KB = APT_PER_KB;

function shortAddr(addr = "") {
  const s = String(addr ?? "");
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Inner — uses official useWallet() hook ────────────────────────────────────
const WalletInner = ({ children }) => {
  // Import fields / functions from the adapter (official docs pattern)
  const {
    account,
    connected,
    wallet,
    wallets,
    notDetectedWallets,
    disconnect: adapterDisconnect,
    signAndSubmitTransaction,
  } = useWallet();

  // Local disconnect override so UI hides files instantly
  const [disconnected, setDisconnected] = useState(false);

  // When adapter confirms connection, clear local override
  useEffect(() => {
    if (connected) setDisconnected(false);
  }, [connected]);

  const isConnected = connected && !disconnected;

  // account.address is an AccountAddress object in v4 — toString() it
  const addressStr = account?.address?.toString() ?? null;
  const walletName = wallet?.name ?? null;

  const handleDisconnect = () => {
    setDisconnected(true);
    try { adapterDisconnect(); } catch {}
  };

  // Pay 0.00003 APT per KB using v4 payload format
  const payForUpload = async (totalBytes) => {
    if (!isConnected || !addressStr) throw new Error("Wallet not connected.");
    const totalOctas = calcCostOctas(totalBytes);
    const totalAPT   = calcCostAPT(totalBytes);
    if (totalOctas === 0) throw new Error("File size too small.");

    const response = await signAndSubmitTransaction({
      data: {
        function:          "0x1::aptos_account::transfer",
        typeArguments:     [],
        functionArguments: [SHELBY_TREASURY, totalOctas],
      },
    });

    const hash = response?.hash;
    if (!hash) throw new Error("No transaction hash returned.");
    return { hash, totalOctas, totalAPT };
  };

  return (
    <AuthContext.Provider value={{
      connected:    isConnected,
      address:      addressStr,
      shortAddress: addressStr ? shortAddr(addressStr) : null,
      walletName,
      wallets:      wallets ?? [],
      notDetectedWallets: notDetectedWallets ?? [],
      isLoading:    false,
      error:        null,
      // Actions — connect is handled by WalletItem.ConnectButton in UI
      disconnect:   handleDisconnect,
      signOut:      handleDisconnect,
      payForUpload,
      signAndSubmitTransaction,
      // Payment helpers
      APT_PER_KB,
      OCTAS_PER_APT,
      SHELBY_TREASURY,
      calcCostAPT,
      calcCostOctas,
      formatAPT,
      PRICE_PER_KB: APT_PER_KB,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Public provider ───────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => (
  <WalletProvider>
    <WalletInner>{children}</WalletInner>
  </WalletProvider>
);

// ── Hooks ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
};

export const useAptosWallet      = useAuth;
export const AptosWalletProvider = AuthProvider;

export default AuthContext;
