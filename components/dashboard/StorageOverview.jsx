import React, { useEffect, useRef } from "react";
import { useDashboard } from "../../context/DashboardContext";
import styles from "./StorageOverview.module.css";

const StatCard = ({ label, value, sub, icon, accent, barPct, barColor }) => (
  <div className={`${styles.card} ${accent ? styles.accent : ""}`}>
    <div className={styles.cardTop}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <div className={styles.cardText}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </div>
    </div>
    {barPct !== undefined && (
      <div className={styles.barTrack} aria-label={`${Math.round(barPct)}% used`}>
        <div
          className={styles.barFill}
          style={{ width: `${Math.min(barPct, 100)}%`, background: barColor || "var(--pink)" }}
        />
      </div>
    )}
  </div>
);

const StorageOverview = ({ onUploadClick }) => {
  const {
    totalFiles, usedBytes, usedPct,
    totalCapacity, uploadQueue, sps,
    formatBytes,
  } = useDashboard();

  const freeBytes   = totalCapacity - usedBytes;
  const healthySps  = sps.filter((s) => s.status === "healthy").length;
  const activePct   = (healthySps / sps.length) * 100;

  const prevUsed = useRef(usedBytes);
  useEffect(() => { prevUsed.current = usedBytes; }, [usedBytes]);

  return (
    <section className={styles.section} aria-label="Storage overview">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Storage Overview</h2>
          <p className={styles.sub}>Your decentralized file storage on Shelby Network</p>
        </div>
        <button className={styles.uploadBtn} onClick={onUploadClick} aria-label="Upload files">
          <span className={styles.uploadIcon}>↑</span>
          Upload Files
          {uploadQueue.length > 0 && (
            <span className={styles.queueBadge}>{uploadQueue.length}</span>
          )}
        </button>
      </div>

      <div className={styles.grid}>
        <StatCard
          icon="📁"
          label="Total Files"
          value={totalFiles.toLocaleString()}
          sub={`${uploadQueue.length > 0 ? `${uploadQueue.length} uploading…` : "All stored"}`}
          accent
        />
        <StatCard
          icon="🗄️"
          label="Used Storage"
          value={formatBytes(usedBytes)}
          sub={`${usedPct.toFixed(2)}% of ${formatBytes(totalCapacity)}`}
          barPct={usedPct}
          barColor="var(--pink)"
        />
        <StatCard
          icon="✨"
          label="Available"
          value={formatBytes(freeBytes)}
          sub={`${(100 - usedPct).toFixed(2)}% free`}
          barPct={100 - usedPct}
          barColor="var(--green)"
        />
        <StatCard
          icon="🖥️"
          label="Storage Providers"
          value={`${healthySps} / ${sps.length}`}
          sub={`${sps.filter(s => s.status === "degraded").length} degraded · ${sps.filter(s => s.status === "offline").length} offline`}
          barPct={activePct}
          barColor="var(--blue)"
        />
      </div>

      {/* Upload queue progress */}
      {uploadQueue.length > 0 && (
        <div className={styles.queue} aria-live="polite" aria-label="Upload queue">
          <p className={styles.queueTitle}>
            <span className={styles.queueDot} />
            Uploading {uploadQueue.length} file{uploadQueue.length > 1 ? "s" : ""}…
          </p>
          {uploadQueue.map((u) => (
            <div key={u.id} className={styles.queueItem}>
              <div className={styles.queueMeta}>
                <span className={styles.queueName}>{u.name}</span>
                <span className={styles.queueStep}>{u.step}</span>
                <span className={styles.queuePct}>{u.progress}%</span>
              </div>
              <div className={styles.queueTrack}>
                <div
                  className={styles.queueBar}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StorageOverview;
