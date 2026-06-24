import React from "react";
import { useShelby } from "../context/Ethere";
import styles from "./NetworkStats.module.css";

const StatCard = ({ label, value, sub, accent, loading }) => (
  <div className={`${styles.card} ${accent ? styles.cardAccent : ""}`}>
    <span className={styles.label}>{label}</span>
    {loading ? (
      <span className={styles.skeleton} aria-label="Loading" />
    ) : (
      <span className={styles.value}>{value ?? "—"}</span>
    )}
    {sub && <span className={styles.sub}>{sub}</span>}
  </div>
);

const NetworkStats = () => {
  const { ledger, blockHeight, tps, blobEvents, transactions, loading, lastUpdated, timeAgo, network } = useShelby();

  const epoch        = ledger ? parseInt(ledger.epoch, 10).toLocaleString() : null;
  const ledgerVer    = ledger ? parseInt(ledger.ledger_version, 10).toLocaleString() : null;
  const txCount      = transactions.length > 0 ? `${transactions.length} recent` : null;
  const successRate  = transactions.length > 0
    ? `${((transactions.filter(t => t.success).length / transactions.length) * 100).toFixed(0)}%`
    : null;
  const blobCount    = blobEvents.filter(e => e.event === "Blob Committed").length || null;

  // Shelbynet has fixed known capacity
  const capacity     = network === "shelbynet" ? "~10 TiB" : "TBD";
  const providers    = network === "shelbynet" ? "16" : "TBD";

  const updatedStr = lastUpdated ? timeAgo(lastUpdated) : null;

  return (
    <section className={styles.section} id="stats" aria-label="Network statistics">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.liveIndicator} aria-label="Live" title="Auto-refreshes every 30s" />
          <h2 className={styles.title}>Network Stats</h2>
          <span className={styles.networkBadge}>{network}</span>
        </div>
        {updatedStr && (
          <span className={styles.updated}>Updated {updatedStr}</span>
        )}
      </div>

      <div className={styles.grid}>
        <StatCard
          label="Block Height"
          value={blockHeight ? blockHeight.toLocaleString() : null}
          sub="Latest confirmed block"
          accent
          loading={loading}
        />
        <StatCard
          label="Epoch"
          value={epoch}
          sub="Current consensus epoch"
          loading={loading}
        />
        <StatCard
          label="Ledger Version"
          value={ledgerVer}
          sub="Cumulative transaction count"
          loading={loading}
        />
        <StatCard
          label="TPS"
          value={tps ? `${tps} tx/s` : "Calculating…"}
          sub="Estimated from version delta"
          accent={!!tps}
          loading={loading && !tps}
        />
        <StatCard
          label="Recent Txs"
          value={txCount}
          sub={`Success rate: ${successRate ?? "—"}`}
          loading={loading}
        />
        <StatCard
          label="Blob Events"
          value={blobCount ? `${blobCount} committed` : "0"}
          sub="From last 20 contract txs"
          loading={loading}
        />
        <StatCard
          label="Storage Providers"
          value={providers}
          sub={`${capacity} total capacity`}
          loading={false}
        />
        <StatCard
          label="Erasure Scheme"
          value="Clay Codes"
          sub="10 data + 6 parity chunks"
          loading={false}
        />
      </div>
    </section>
  );
};

export default NetworkStats;
