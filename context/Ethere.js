import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const ShelbyContext = createContext(null);

// ── Network configs ────────────────────────────────────────────────────────────
const NETWORKS = {
  shelbynet: {
    aptosFullNode: "https://api.shelbynet.shelby.xyz/v1",
    shelbyRpc:     "https://api.shelbynet.shelby.xyz/shelby",
    indexer:       "https://api.shelbynet.shelby.xyz/v1/graphql",
    faucet:        "https://faucet.shelbynet.shelby.xyz",
    explorerBase:  "https://explorer.shelby.xyz/shelbynet",
    contractAddr:  "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
  },
  testnet: {
    aptosFullNode: "https://api.testnet.aptoslabs.com/v1",
    shelbyRpc:     "https://api.testnet.shelby.xyz/shelby",
    indexer:       "https://api.testnet.aptoslabs.com/v1/graphql",
    faucet:        null,
    explorerBase:  "https://explorer.shelby.xyz/testnet",
    contractAddr:  "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
  },
};

const REFRESH_INTERVAL = 30_000; // 30 seconds

// ── Helpers ────────────────────────────────────────────────────────────────────
function shortAddr(addr = "") {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Static web activity seeds (supplemented by live search via API route) ─────
const STATIC_WEB_ITEMS = [
  {
    id: "w1",
    source: "Aptos Foundation",
    title: "Shelby: A New Era of Value Creation for Web3",
    url: "https://aptosfoundation.org/currents/shelby-a-new-era-of-value-creation-for-web3",
    summary: "Aptos Foundation announces Shelby — the first decentralized hot storage network built for real-time data at cloud-grade performance.",
    publishedAt: new Date("2025-06-25").getTime(),
    tag: "Official",
  },
  {
    id: "w2",
    source: "Jump Crypto",
    title: "Decentralized Storage Designed to Serve",
    url: "https://jumpcrypto.com/resources/shelby-decentralized-storage-designed-to-serve",
    summary: "Jump Crypto's technical deep-dive on Shelby's architecture: private fiber backbone, erasure coding, auditing protocol, and cost modeling.",
    publishedAt: new Date("2025-06-20").getTime(),
    tag: "Technical",
  },
  {
    id: "w3",
    source: "Coin Bureau",
    title: "What Is Shelby: Inside Aptos and Jump Crypto's Vision",
    url: "https://coinbureau.com/analysis/what-is-shelby-crypto",
    summary: "Detailed breakdown of Shelby's decentralized hot storage model, its competitive position vs IPFS/Filecoin, and the paid-to-read incentive design.",
    publishedAt: new Date("2025-07-04").getTime(),
    tag: "Analysis",
  },
  {
    id: "w4",
    source: "arXiv",
    title: "Shelby: Decentralized Storage Designed to Serve (White Paper)",
    url: "https://arxiv.org/html/2506.19233v1",
    summary: "Academic white paper covering Shelby's Clay Code erasure scheme, hybrid auditing protocol with formal incentive-compatibility proofs.",
    publishedAt: new Date("2025-05-08").getTime(),
    tag: "Research",
  },
  {
    id: "w5",
    source: "Blockworks",
    title: "Aptos Labs & Jump Crypto Unveil Shelby High-Performance Storage",
    url: "https://blockworks.co/news/aptos-labs-jump-crypto-unveil-shelby",
    summary: "News coverage of the Shelby launch: global mesh of fiber-connected nodes, streaming video, AI pipelines, and DePIN use cases.",
    publishedAt: new Date("2025-06-24").getTime(),
    tag: "News",
  },
  {
    id: "w6",
    source: "arXiv",
    title: "Proving Incentive Compatibility in a Decentralized Storage Network",
    url: "https://arxiv.org/abs/2510.11866",
    summary: "Game-theoretic analysis (a16z crypto + Aptos Labs) proving Shelby's peer audit + on-chain verification combo yields incentive compatibility.",
    publishedAt: new Date("2025-10-15").getTime(),
    tag: "Research",
  },
  {
    id: "w7",
    source: "BlockEden",
    title: "The Verifiable Hot Storage Network That Could Reshape AI Data Infrastructure",
    url: "https://blockeden.xyz/blog/2026/03/15/aptos-jump-crypto-shelby-verifiable-global-object-storage-ai-depin/",
    summary: "Analysis of Shelby as the world's first verifiable global object storage network optimised for AI read workloads, with early-access testnet live.",
    publishedAt: new Date("2026-03-15").getTime(),
    tag: "Analysis",
  },
  {
    id: "w8",
    source: "Backpack Exchange",
    title: "What Is Shelby Protocol? Aptos' Hot Storage for Real-Time Web3",
    url: "https://learn.backpack.exchange/articles/what-is-shelby-aptos-new-hot-storage-protocol-for-real-time-web3-data",
    summary: "Explainer on Shelby combining Web2 cloud speed with Web3 ownership — programmable, multi-chain starting with Aptos.",
    publishedAt: new Date("2026-04-27").getTime(),
    tag: "Guide",
  },
];

// ── Context Provider ───────────────────────────────────────────────────────────
export const ShelbyProvider = ({ children }) => {
  const [network, setNetwork] = useState("shelbynet");
  const [ledger, setLedger] = useState(null);
  const [blockHeight, setBlockHeight] = useState(null);
  const [tps, setTps] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [blobEvents, setBlobEvents] = useState([]);
  const [webActivity] = useState(
    [...STATIC_WEB_ITEMS].sort((a, b) => b.publishedAt - a.publishedAt)
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const prevTxCount = useRef(null);
  const prevTimestamp = useRef(null);

  const cfg = NETWORKS[network];

  // ── Fetch ledger info (block height, epoch, TPS) ────────────────────────────
  const fetchLedger = useCallback(async () => {
    try {
      const { data } = await axios.get(`${cfg.aptosFullNode}/`, { timeout: 8000 });
      setLedger(data);
      setBlockHeight(parseInt(data.block_height, 10));

      // Estimate TPS from cumulative tx count delta
      const nowCount = parseInt(data.ledger_version, 10);
      const nowTime  = parseInt(data.ledger_timestamp, 10) / 1000; // µs → ms
      if (prevTxCount.current !== null && prevTimestamp.current !== null) {
        const deltaCount = nowCount - prevTxCount.current;
        const deltaSec   = (nowTime - prevTimestamp.current) / 1000;
        if (deltaSec > 0) setTps((deltaCount / deltaSec).toFixed(1));
      }
      prevTxCount.current  = nowCount;
      prevTimestamp.current = nowTime;
      return data;
    } catch (e) {
      console.warn("fetchLedger error:", e.message);
      return null;
    }
  }, [cfg]);

  // ── Fetch recent account transactions on the Shelby contract ───────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${cfg.aptosFullNode}/accounts/${cfg.contractAddr}/transactions?limit=20`,
        { timeout: 8000 }
      );
      const mapped = data.map((tx) => ({
        hash:      tx.hash,
        sender:    shortAddr(tx.sender),
        fullSender: tx.sender,
        type:      tx.payload?.function?.split("::").pop() || tx.type || "unknown",
        success:   tx.success,
        gasUsed:   tx.gas_used,
        seqNum:    tx.sequence_number,
        timestamp: Math.floor(parseInt(tx.timestamp || Date.now() * 1000, 10) / 1000),
        version:   tx.version,
      }));
      setTransactions(mapped);
      // Derive blob events from contract calls
      const blobs = mapped
        .filter((tx) => tx.success)
        .map((tx, i) => ({
          id:        `${tx.hash}-${i}`,
          event:     mapTxToEvent(tx.type),
          account:   tx.sender,
          fullAccount: tx.fullSender,
          hash:      tx.hash,
          timestamp: tx.timestamp,
          version:   tx.version,
        }));
      setBlobEvents(blobs);
    } catch (e) {
      console.warn("fetchTransactions error:", e.message);
    }
  }, [cfg]);

  // ── Map contract function names to human-readable event labels ──────────────
  function mapTxToEvent(fnName = "") {
    const name = fnName.toLowerCase();
    if (name.includes("register") || name.includes("commit")) return "Blob Committed";
    if (name.includes("delete") || name.includes("remove"))   return "Blob Deleted";
    if (name.includes("audit"))                               return "Audit Passed";
    if (name.includes("stake"))                               return "SP Staked";
    if (name.includes("reward"))                              return "Reward Released";
    if (name.includes("pay") || name.includes("fund"))        return "Payment";
    return "Contract Interaction";
  }

  // ── Master refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchLedger(), fetchTransactions()]);
      setLastUpdated(Date.now());
    } catch (e) {
      setError("Failed to fetch network data. Retrying…");
    } finally {
      setLoading(false);
    }
  }, [fetchLedger, fetchTransactions]);

  // Initial load + polling
  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <ShelbyContext.Provider
      value={{
        network,
        setNetwork,
        cfg,
        ledger,
        blockHeight,
        tps,
        transactions,
        blobEvents,
        webActivity,
        loading,
        lastUpdated,
        error,
        refresh,
        // utils exposed to components
        formatBytes,
        timeAgo,
        shortAddr,
        NETWORKS,
      }}
    >
      {children}
    </ShelbyContext.Provider>
  );
};

export const useShelby = () => {
  const ctx = useContext(ShelbyContext);
  if (!ctx) throw new Error("useShelby must be used inside <ShelbyProvider>");
  return ctx;
};

export default ShelbyContext;
