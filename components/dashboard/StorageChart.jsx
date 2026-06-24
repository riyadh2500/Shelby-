import React, { useState } from "react";
import { useDashboard } from "../../context/DashboardContext";
import styles from "./StorageChart.module.css";

// ── SVG Donut ring ─────────────────────────────────────────────────────────────
const RADIUS = 72;
const STROKE = 14;
const CIRC   = 2 * Math.PI * RADIUS;
const CX = 90, CY = 90;

const DonutChart = ({ slices, totalBytes, formatBytes }) => {
  const [hovered, setHovered] = useState(null);

  let offset = 0;
  const segments = slices.map((s) => {
    const pct  = totalBytes > 0 ? s.bytes / totalBytes : 0;
    const dash = pct * CIRC;
    const seg  = { ...s, pct, dashArr: `${dash} ${CIRC - dash}`, dashOff: -offset };
    offset += dash;
    return seg;
  });

  const hov = hovered != null ? segments.find((s) => s.type === hovered) : null;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 180 180" className={styles.donutSvg} aria-label="Storage breakdown donut chart">
        {/* Track */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        {/* Segments */}
        {segments.map((s) => (
          <circle
            key={s.type}
            cx={CX} cy={CY} r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={hovered === s.type ? STROKE + 4 : STROKE}
            strokeDasharray={s.dashArr}
            strokeDashoffset={s.dashOff}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px`, transition: "stroke-width 0.2s" }}
            onMouseEnter={() => setHovered(s.type)}
            onMouseLeave={() => setHovered(null)}
            role="img"
            aria-label={`${s.label}: ${formatBytes(s.bytes)}`}
          />
        ))}
        {/* Centre label */}
        <text x={CX} y={CY - 8} textAnchor="middle" className={styles.donutVal}>
          {hov ? formatBytes(hov.bytes) : formatBytes(totalBytes)}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" className={styles.donutSub}>
          {hov ? hov.label : "Total Used"}
        </text>
      </svg>

      {/* Legend */}
      <ul className={styles.legend} aria-label="File type legend">
        {segments.map((s) => (
          <li
            key={s.type}
            className={`${styles.legendItem} ${hovered === s.type ? styles.legendHov : ""}`}
            onMouseEnter={() => setHovered(s.type)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendCount}>{s.count} files</span>
            <span className={styles.legendBytes}>{formatBytes(s.bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Bar chart (daily activity) ─────────────────────────────────────────────────
const BarChart = ({ days, formatBytes }) => {
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const [hovered, setHovered] = useState(null);

  return (
    <div className={styles.barChartWrap} aria-label="Daily upload activity chart">
      <p className={styles.barChartTitle}>Daily Upload Activity</p>
      <div className={styles.bars}>
        {days.map((d, i) => {
          const pct = (d.count / maxCount) * 100;
          return (
            <div
              key={i}
              className={styles.barCol}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i && (
                <div className={styles.barTooltip}>
                  <span>{d.label}</span>
                  <span>{d.count} files</span>
                  <span>{formatBytes(d.bytes)}</span>
                </div>
              )}
              <div className={styles.barOuter}>
                <div
                  className={styles.barInner}
                  style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%` }}
                  aria-label={`${d.label}: ${d.count} uploads`}
                />
              </div>
              <span className={styles.barLabel}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const StorageChart = () => {
  const { typeBreakdown, usedBytes, dailyActivity, formatBytes } = useDashboard();

  return (
    <section className={styles.section} aria-label="Storage charts">
      <h2 className={styles.sectionTitle}>Storage Breakdown</h2>
      <div className={styles.chartRow}>
        <div className={styles.panel}>
          <p className={styles.panelTitle}>By File Type</p>
          {typeBreakdown.length === 0 ? (
            <p className={styles.empty}>No files stored yet.</p>
          ) : (
            <DonutChart slices={typeBreakdown} totalBytes={usedBytes} formatBytes={formatBytes} />
          )}
        </div>
        <div className={styles.panel}>
          <BarChart days={dailyActivity} formatBytes={formatBytes} />
        </div>
      </div>
    </section>
  );
};

export default StorageChart;
