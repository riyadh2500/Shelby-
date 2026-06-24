import React, { useState } from "react";
import { useDashboard } from "../../context/DashboardContext";
import styles from "./SPHealth.module.css";

const STATUS_ICON  = { healthy: "●", degraded: "◐", offline: "○" };
const STATUS_LABEL = { healthy: "Healthy", degraded: "Degraded", offline: "Offline" };

const SPCard = ({ sp, formatBytes }) => {
  const usedPct = (sp.used / sp.capacity) * 100;

  return (
    <div className={`${styles.card} ${styles[`card_${sp.status}`]}`} aria-label={`${sp.name} — ${STATUS_LABEL[sp.status]}`}>
      {/* Top row */}
      <div className={styles.cardTop}>
        <span className={`${styles.statusDot} ${styles[`dot_${sp.status}`]}`} aria-hidden="true">
          {STATUS_ICON[sp.status]}
        </span>
        <span className={styles.spName}>{sp.name}</span>
        <span className={`${styles.statusLabel} ${styles[`label_${sp.status}`]}`}>
          {STATUS_LABEL[sp.status]}
        </span>
      </div>

      {/* Region */}
      <p className={styles.region} title="AWS region equivalent">{sp.region}</p>

      {/* Capacity bar */}
      <div className={styles.capacityRow}>
        <span className={styles.capLabel}>Capacity</span>
        <span className={styles.capVal}>{usedPct.toFixed(1)}%</span>
      </div>
      <div className={styles.barTrack} aria-label={`${usedPct.toFixed(1)}% capacity used`}>
        <div
          className={`${styles.barFill} ${usedPct > 80 ? styles.barWarn : ""}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <p className={styles.capDetail}>
        {formatBytes(sp.used)} / {formatBytes(sp.capacity)}
      </p>

      {/* Ping + chunks */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ping</span>
          <span className={`${styles.metricVal} ${sp.ping < 20 ? styles.pingGood : sp.ping < 50 ? styles.pingMid : styles.pingBad}`}>
            {sp.status === "offline" ? "—" : `${sp.ping}ms`}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Chunks</span>
          <span className={styles.metricVal}>{sp.chunks.toLocaleString()}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Uptime</span>
          <span className={styles.metricVal}>{sp.status === "offline" ? "—" : `${sp.uptime}%`}</span>
        </div>
      </div>
    </div>
  );
};

const SPHealth = () => {
  const { sps, formatBytes } = useDashboard();
  const [filter, setFilter] = useState("all");

  const counts = {
    healthy:  sps.filter(s => s.status === "healthy").length,
    degraded: sps.filter(s => s.status === "degraded").length,
    offline:  sps.filter(s => s.status === "offline").length,
  };

  const displayed = filter === "all" ? sps : sps.filter(s => s.status === filter);

  const totalUsed = sps.reduce((a, s) => a + s.used, 0);
  const totalCap  = sps.reduce((a, s) => a + s.capacity, 0);
  const networkPct = (totalUsed / totalCap) * 100;

  return (
    <section className={styles.section} id="providers" aria-label="Storage provider health">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Storage Providers</h2>
          <p className={styles.sub}>16 nodes · Clay Code erasure coding · Private fiber backbone</p>
        </div>
      </div>

      {/* Network summary bar */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.sumLabel}>Network Capacity Used</span>
          <div className={styles.sumBarTrack}>
            <div className={styles.sumBarFill} style={{ width: `${networkPct}%` }} />
          </div>
          <span className={styles.sumVal}>{formatBytes(totalUsed)} / {formatBytes(totalCap)} ({networkPct.toFixed(1)}%)</span>
        </div>

        <div className={styles.summaryStats}>
          {[
            { label: "Healthy",  val: counts.healthy,  color: "var(--green)" },
            { label: "Degraded", val: counts.degraded, color: "var(--yellow)" },
            { label: "Offline",  val: counts.offline,  color: "var(--red)" },
          ].map(({ label, val, color }) => (
            <div key={label} className={styles.summaryStat}>
              <span className={styles.sumDot} style={{ background: color }} />
              <span className={styles.sumStatVal} style={{ color }}>{val}</span>
              <span className={styles.sumStatLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs} role="group" aria-label="Filter by status">
        {[
          { key: "all",      label: `All (${sps.length})` },
          { key: "healthy",  label: `Healthy (${counts.healthy})` },
          { key: "degraded", label: `Degraded (${counts.degraded})` },
          { key: "offline",  label: `Offline (${counts.offline})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${filter === key ? styles.tabActive : ""}`}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SP grid */}
      <div className={styles.grid} role="list">
        {displayed.map((sp) => (
          <div key={sp.id} role="listitem">
            <SPCard sp={sp} formatBytes={formatBytes} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default SPHealth;
