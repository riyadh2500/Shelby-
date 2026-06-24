import React from "react";
import Head from "next/head";
import { ShelbyProvider, useShelby } from "../context/Ethere";
import NavBar from "../components/NavBar";
import NetworkStats from "../components/NetworkStats";
import BlobFeed from "../components/BlobFeed";
import WebActivity from "../components/WebActivity";
import Footer from "../components/Footer";
import styles from "./index.module.css";

// ── Inner page — consumes context ──────────────────────────────────────────────
const TrackerPage = () => {
  const { network, setNetwork, error, loading, refresh, lastUpdated, timeAgo } = useShelby();

  return (
    <>
      <Head>
        <title>Shelby Network Tracker</title>
        <meta name="description" content="Live network activity tracker for the Shelby decentralized hot storage protocol — blob events, on-chain stats, and web coverage." />
        <link rel="icon" type="image/svg+xml" href="/shelby-favicon.svg" />
      </Head>

      <NavBar network={network} onNetworkChange={setNetwork} />

      <div className={styles.page}>
        {/* ── Hero ── */}
        <section className={styles.hero} aria-label="Page header">
          <div className={styles.heroPink} aria-hidden="true" />
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              <span className={styles.liveDot} />
              Live Network Tracker
            </div>
            <h1 className={styles.heroTitle}>
              Shelby Protocol <span className={styles.heroAccent}>Activity</span>
            </h1>
            <p className={styles.heroSub}>
              Real-time on-chain stats, blob events, and the latest web coverage
              for the Shelby decentralized hot storage network.
            </p>
            <div className={styles.heroBtns}>
              <a href="/dashboard" className={styles.btnPrimary}>
                Open Storage Dashboard →
              </a>
              <a
                href="https://developers.shelby.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnOutline}
              >
                Join Waitlist ↗
              </a>
              <a
                href="https://docs.shelby.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnOutline}
              >
                Read Docs
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className={styles.quickLinks} aria-label="Quick links">
            {[
              { label: "Docs",       href: "https://docs.shelby.xyz" },
              { label: "Explorer",   href: "https://explorer.shelby.xyz/shelbynet" },
              { label: "GitHub",     href: "https://github.com/shelby" },
              { label: "Discord",    href: "https://discord.gg/shelbyserves" },
              { label: "X / Twitter",href: "https://x.com/shelbyserves" },
              { label: "White Paper",href: "https://arxiv.org/html/2506.19233v1" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={styles.quickLink}>
                {label} ↗
              </a>
            ))}
          </div>
        </section>

        {/* ── Error banner ── */}
        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠ {error}</span>
            <button onClick={refresh} className={styles.retryBtn}>Retry</button>
          </div>
        )}

        {/* ── Main content ── */}
        <div className={styles.content}>
          <NetworkStats />

          <div className={styles.divider} />

          <BlobFeed />

          <div className={styles.divider} />

          <WebActivity />
        </div>
      </div>

      <Footer />
    </>
  );
};

// ── Root — wraps with provider ─────────────────────────────────────────────────
const Home = () => (
  <ShelbyProvider>
    <TrackerPage />
  </ShelbyProvider>
);

export default Home;
