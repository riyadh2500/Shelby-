/**
 * AptosWalletContext.js
 *
 * Zero-dependency Petra wallet integration.
 * Calls window.aptos.connect() directly inside onClick — no adapters,
 * no async wrappers before the call — preserving the browser user-gesture
 * so Petra's popup fires every time.
 *
 * getPetraProvider() polls window.aptos on mount only (never before connect).
 */

import React, {
  createContext, useContext,
  useState, useEffect, useCallback, useRef,
} from "react";

// ── Payment constants ─────────────────────────────────────────────────────────
export const PRICE_PER_KB  = 0.0001;
export const OCTAS_PER_APT = 100_000_000;

export function calcCostAPT(bytes = 0) {
  return parseFloat(((bytes / 1024) * PRICE_PER_KB).toFixed(8));
}
export function calcCostOctas(bytes = 0) {
  return Math.ceil((bytes / 1024) * PRICE_PER_KB * OCTAS_PER_APT);
}
export function formatAPT(apt = 0) {
  if (apt === 0)    return "0 APT";
  if (apt < 0.0001) return "< 0.0001 APT";
  return `${apt.toFixed(4)} APT`;
}

export const SHELBY_TREASURY =
  "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a";

function shortAddr(addr = "") {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── getPetraProvider — polls window.aptos up to 5 seconds ────────────────────
// Used on mount only. Never called before connect().
export function getPetraProvider(maxWaitMs = 5000, intervalMs = 100) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.aptos) return resolve(window.aptos);
    const start = Date.now();
    const id = setInterval(() => {
      if (window.aptos) { clearInterval(id); resolve(window.aptos); }
      else if (Date.now() - start >= maxWaitMs) { clearInterval(id); resolve(null); }
    }, intervalMs);
  });
}

// ── Context ───────────────────────────────────────────────────────────────────
const AptosWalletContext = createContext(null);

export const AptosWalletProvider = ({ children }) => {
  const [connected,    setConnected]    = useState(false);
  const [address,      setAddress]      = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [petraReady,   setPetraReady]   = useState(false);
  const [error,        setError]        = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // ── Poll for Petra on mount ───────────────────────────────────────────────
  useEffect(() => {
    getPetraProvider(5000, 100).then((p) => {
      if (!mounted.current) return;
      setPetraReady(!!p);
      if (!p) return;

      // Auto-restore session if already connected
      p.isConnected().then((yes) => {
        if (!yes || !mounted.current) return;
        p.account().then((acct) => {
          const addr = acct?.address;
          if (addr && mounted.current) {
            setAddress(addr);
            setConnected(true);
          }
        }).catch(() => {});
      }).catch(() => {});
    });
  }, []);

  // ── Account change listener ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.aptos?.onAccountChange) return;
    const handler = (newAcct) => {
      if (!mounted.current) return;
      if (newAcct?.address) {
        setAddress(newAcct.address);
        setConnected(true);
      } else {
        setAddress(null);
        setConnected(false);
      }
    };
    try {
      window.aptos.onAccountChange(handler);
    } catch {}
    return () => {
      try { window.aptos?.onAccountChange?.(null); } catch {}
    };
  }, [petraReady]);

  // ── connect — called directly from onClick, no await before this ──────────
  // This is the function bound to the button. When the button's onClick fires,
  // this runs synchronously first — calling window.aptos.connect() while the
  // browser user-gesture is still active, so Petra's popup is allowed.
  const connect = useCallback(() => {
    setError(null);
    const aptos = window.aptos;
    if (!aptos) {
      setError("Petra not found. Install from petra.app and refresh.");
      return;
    }

    setIsLoading(true);

    // connect() returns a Promise — we handle it async but the CALL is sync
    aptos.connect()
      .then((resp) => {
        if (!mounted.current) return;
        const addr = resp?.address ?? resp?.publicKey ?? null;
        if (!addr) throw new Error("No address returned.");
        setAddress(addr);
        setConnected(true);
        setError(null);
      })
      .catch((e) => {
        if (!mounted.current) return;
        const msg = String(e?.message ?? e);
        const silent = ["cancel", "reject", "user rejected", "4001", "deprecated", "petraapi"];
        if (!silent.some((w) => msg.toLowerCase().includes(w))) {
          setError(msg);
        }
      })
      .finally(() => {
        if (mounted.current) setIsLoading(false);
      });
  }, []);

  // ── disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    try { window.aptos?.disconnect?.(); } catch {}
    if (mounted.current) {
      setConnected(false);
      setAddress(null);
      setError(null);
    }
  }, []);

  // ── signAndSubmitTransaction ──────────────────────────────────────────────
  const signAndSubmitTransaction = useCallback(async (payload) => {
    const aptos = window.aptos;
    if (!aptos || !connected) throw new Error("Wallet not connected.");
    const result = await aptos.signAndSubmitTransaction(payload);
    const hash = result?.hash ?? result?.data?.hash;
    if (!hash) throw new Error("No transaction hash returned.");
    return { hash };
  }, [connected]);

  // ── payForStorage ─────────────────────────────────────────────────────────
  const payForStorage = useCallback(async (totalBytes) => {
    const costOctas = calcCostOctas(totalBytes);
    const costAPT   = calcCostAPT(totalBytes);
    if (costOctas === 0) throw new Error("File size too small.");
    const { hash } = await signAndSubmitTransaction({
      type:           "entry_function_payload",
      function:       "0x1::aptos_account::transfer",
      type_arguments: [],
      arguments:      [SHELBY_TREASURY, costOctas.toString()],
    });
    return { hash, costAPT, costOctas };
  }, [signAndSubmitTransaction]);

  return (
    <AptosWalletContext.Provider value={{
      connected,
      address,
      shortAddress:             address ? shortAddr(address) : null,
      walletName:               connected ? "Petra" : null,
      isLoading,
      petraReady,
      error,
      connect,
      disconnect,
      signAndSubmitTransaction,
      payForStorage,
      calcCostAPT,
      calcCostOctas,
      formatAPT,
      PRICE_PER_KB,
      SHELBY_TREASURY,
    }}>
      {children}
    </AptosWalletContext.Provider>
  );
};

export const useAptosWallet = () => {
  const ctx = useContext(AptosWalletContext);
  if (!ctx) throw new Error("useAptosWallet must be inside <AptosWalletProvider>");
  return ctx;
};

export default AptosWalletContext;
