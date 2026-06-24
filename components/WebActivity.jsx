import React, { useState } from "react";
import { useShelby } from "../context/Ethere";
import styles from "./WebActivity.module.css";

const TAG_COLORS = {
  Official:  "pink",
  Technical: "blue",
  Analysis:  "yellow",
  Research:  "purple",
  News:      "green",
  Guide:     "muted",
};

const TagBadge = ({ tag }) => {
  const color = TAG_COLORS[tag] || "muted";
  return <span className={`${styles.tag} ${styles[`tag_${color}`]}`}>{tag}</span>;
};

const SOURCES = ["All", "Official", "Technical", "Analysis", "Research", "News", "Guide"];

const WebActivity = () => {
  const { webActivity } = useShelby();
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);

  const filtered = filter === "All"
    ? webActivity
    : webActivity.filter((item) => item.tag === filter);

  const formatDate = (ts) => {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <section className={styles.section} id="web" aria-label="Web activity about Shelby">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Web Activity</h2>
          <span className={styles.count}>{filtered.length} articles</span>
        </div>
        <p className={styles.sub}>
          Latest coverage, research, and announcements about Shelby across the web.
        </p>
      </div>

      {/* Filter pills */}
      <div className={styles.filters} role="group" aria-label="Filter by tag">
        {SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ""}`}
            aria-pressed={filter === s}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className={styles.grid}>
        {filtered.map((item) => (
          <article
            key={item.id}
            className={`${styles.card} ${expanded === item.id ? styles.cardExpanded : ""}`}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardMeta}>
                <TagBadge tag={item.tag} />
                <span className={styles.source}>{item.source}</span>
                <span className={styles.dot}>·</span>
                <time className={styles.date} dateTime={new Date(item.publishedAt).toISOString()}>
                  {formatDate(item.publishedAt)}
                </time>
              </div>

              <h3 className={styles.cardTitle}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                >
                  {item.title}
                  <span className={styles.extArrow}>↗</span>
                </a>
              </h3>

              <p
                className={`${styles.summary} ${expanded === item.id ? styles.summaryExpanded : ""}`}
              >
                {item.summary}
              </p>
            </div>

            <div className={styles.cardFooter}>
              <button
                className={styles.expandBtn}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                aria-expanded={expanded === item.id}
              >
                {expanded === item.id ? "Show less ↑" : "Read more ↓"}
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.readLink}
              >
                Open article ↗
              </a>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>No articles found for "{filter}".</div>
      )}

      {/* Footer note */}
      <div className={styles.footerNote}>
        <span>Follow</span>
        <a href="https://x.com/shelbyserves" target="_blank" rel="noopener noreferrer">@shelbyserves</a>
        <span>on X for real-time updates ·</span>
        <a href="https://discord.gg/shelbyserves" target="_blank" rel="noopener noreferrer">Join Discord</a>
        <span>· </span>
        <a href="https://github.com/shelby/feedback/issues/new/choose" target="_blank" rel="noopener noreferrer">Submit Feedback</a>
      </div>
    </section>
  );
};

export default WebActivity;
