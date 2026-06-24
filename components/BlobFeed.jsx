import React, { useState } from "react";
import { useShelby } from "../context/Ethere";
import styles from "./BlobFeed.module.css";

const EVENT_COLORS = {
  "Blob Committed":      "pink",
  "Blob Deleted":        "red",
  "Audit Passed":        "green",
  "SP Staked":           "blue",
  "Reward Released":     "yellow",
  "Payment":             "yellow",
  "Contract Interaction":"muted",
};

const EventBadge = ({ event }) => {
  const color = EVENT_COLORS[event] || "muted";
  return <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>{event}</span>;
};

const StatusDot = ({ success }) => (
  <span
    className={`${styles.dot} ${success ? styles.dotGreen : styles.dotRed}`}
    title={success ? "Success" : "Failed"}
    aria-label={success ? "Success" : "Failed"}
  />
);

const BlobFeed = () => {
  const { blobEvents, transactions, loading, cfg, timeAgo, network } = useShelby();
  const [tab, setTab] = useState("events"); // "events" | "txs"
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const explorerTxUrl = (hash) =>
    `https://explorer.aptoslabs.com/txn/${hash}?network=${network === "shelbynet" ? "custom&customNetworkUrl=https://api.shelbynet.shelby.xyz/v1" : "testnet"}`;

  return (
    <section className={styles.section} id="blobs" aria-label="Blob feed">
      <div className={styles.header}>
        <h2 className={styles.title}>On-Chain Activity</h2>
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === "events"}
            className={`${styles.tab} ${tab === "events" ? styles.tabActive : ""}`}
            onClick={() => setTab("events")}
          >
            Blob Events
            <span className={styles.tabCount}>{blobEvents.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "txs"}
            className={`${styles.tab} ${tab === "txs" ? styles.tabActive : ""}`}
            onClick={() => setTab("txs")}
          >
            Transactions
            <span className={styles.tabCount}>{transactions.length}</span>
          </button>
        </div>
      </div>

      {loading && blobEvents.length === 0 ? (
        <div className={styles.loadingRows}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <span className={styles.skeletonPill} />
              <span className={styles.skeletonLine} style={{ width: "30%" }} />
              <span className={styles.skeletonLine} style={{ width: "18%" }} />
              <span className={styles.skeletonLine} style={{ width: "12%" }} />
            </div>
          ))}
        </div>
      ) : tab === "events" ? (
        <div className={styles.tableWrap} role="region" aria-label="Blob events table">
          {blobEvents.length === 0 ? (
            <div className={styles.empty}>
              <span>No blob events found for the last 20 contract transactions.</span>
              <span className={styles.emptySub}>Try switching to shelbynet or check back after the next poll.</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Account</th>
                  <th>Tx Hash</th>
                  <th>Version</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {blobEvents.map((ev) => (
                  <tr key={ev.id} className={styles.row}>
                    <td><EventBadge event={ev.event} /></td>
                    <td>
                      <span
                        className={styles.addr}
                        title={ev.fullAccount}
                        onClick={() => copyToClipboard(ev.fullAccount, ev.id + "acc")}
                      >
                        {ev.account}
                        {copied === ev.id + "acc" ? (
                          <span className={styles.copyTick}>✓</span>
                        ) : (
                          <span className={styles.copyIcon}>⎘</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <a
                        href={explorerTxUrl(ev.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.hashLink}
                        title={ev.hash}
                      >
                        {ev.hash ? `${ev.hash.slice(0, 8)}…${ev.hash.slice(-4)}` : "—"}
                        <span className={styles.extIcon}>↗</span>
                      </a>
                    </td>
                    <td className={styles.mono}>{ev.version ? parseInt(ev.version).toLocaleString() : "—"}</td>
                    <td className={styles.time}>{ev.timestamp ? timeAgo(ev.timestamp * 1000) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap} role="region" aria-label="Transactions table">
          {transactions.length === 0 ? (
            <div className={styles.empty}>
              <span>No transactions fetched yet.</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Function</th>
                  <th>Sender</th>
                  <th>Tx Hash</th>
                  <th>Gas</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.hash} className={styles.row}>
                    <td><StatusDot success={tx.success} /></td>
                    <td><span className={styles.fnName}>{tx.type}</span></td>
                    <td>
                      <span
                        className={styles.addr}
                        title={tx.fullSender}
                        onClick={() => copyToClipboard(tx.fullSender, tx.hash + "s")}
                      >
                        {tx.sender}
                        {copied === tx.hash + "s" ? (
                          <span className={styles.copyTick}>✓</span>
                        ) : (
                          <span className={styles.copyIcon}>⎘</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <a
                        href={explorerTxUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.hashLink}
                        title={tx.hash}
                      >
                        {tx.hash ? `${tx.hash.slice(0, 8)}…${tx.hash.slice(-4)}` : "—"}
                        <span className={styles.extIcon}>↗</span>
                      </a>
                    </td>
                    <td className={styles.mono}>{tx.gasUsed ? parseInt(tx.gasUsed).toLocaleString() : "—"}</td>
                    <td className={styles.time}>{tx.timestamp ? timeAgo(tx.timestamp * 1000) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <span>Showing last 20 contract interactions on</span>
        <a href={cfg.explorerBase} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          {cfg.aptosFullNode}
        </a>
      </div>
    </section>
  );
};

export default BlobFeed;
