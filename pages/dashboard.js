import React, { useState } from "react";
import Head from "next/head";
import { DashboardProvider, useDashboard } from "../context/DashboardContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import DashNav         from "../components/dashboard/DashNav";
import StorageOverview from "../components/dashboard/StorageOverview";
import StorageChart    from "../components/dashboard/StorageChart";
import FileManager     from "../components/dashboard/FileManager";
import SPHealth        from "../components/dashboard/SPHealth";
import UploadModal     from "../components/dashboard/UploadModal";
import AuthButton      from "../components/dashboard/AuthButton";
import styles from "./dashboard.module.css";

const DashboardLayout = () => {
  const { activeView, setActiveView, showUploadModal, setShowUploadModal } = useDashboard();
  const { connected, displayName, email } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openUpload  = () => { if (connected) setShowUploadModal(true); };
  const closeUpload = () => setShowUploadModal(false);

  return (
    <>
      <Head>
        <title>Shelby Storage Dashboard</title>
        <meta name="description" content="Decentralized file storage dashboard — manage blobs, track storage usage, and monitor provider health on the Shelby Network." />
        <link rel="icon" type="image/svg+xml" href="/shelby-favicon.svg" />
      </Head>

      <div className={styles.shell}>
        <DashNav onUploadClick={openUpload} />

        {mobileNavOpen && (
          <div className={styles.mobileOverlay} onClick={() => setMobileNavOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className={styles.mobileNavWrap}>
              <DashNav onUploadClick={() => { openUpload(); setMobileNavOpen(false); }} />
            </div>
          </div>
        )}

        <div className={styles.main}>
          {/* Top bar */}
          <header className={styles.topbar}>
            <button className={styles.menuBtn} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              ☰
            </button>
            <div className={styles.topbarLeft}>
              <h1 className={styles.topbarTitle}>
                {activeView === "overview"  && "Dashboard"}
                {activeView === "files"     && "File Manager"}
                {activeView === "providers" && "Storage Providers"}
              </h1>
              <span className={styles.topbarSub}>Shelby Network · shelbynet</span>
            </div>
            <div className={styles.topbarRight}>
              <nav className={styles.viewTabs} aria-label="Dashboard views">
                {[
                  { key: "overview",  label: "Overview"  },
                  { key: "files",     label: "Files"     },
                  { key: "providers", label: "Providers" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`${styles.viewTab} ${activeView === key ? styles.viewTabActive : ""}`}
                    onClick={() => setActiveView(key)}
                    aria-current={activeView === key ? "page" : undefined}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Google sign-in button in topbar */}
              <div className={styles.topbarWallet}>
                <AuthButton />
              </div>

              {/* Upload button */}
              <button
                className={`${styles.uploadTopBtn} ${!connected ? styles.uploadTopDisabled : ""}`}
                onClick={openUpload}
                title={connected ? "Upload files" : "Sign in with Google to upload"}
                aria-label="Upload files"
              >
                {connected ? "↑ Upload" : "🔒 Upload"}
              </button>
            </div>
          </header>

          {/* Content */}
          <div className={styles.content}>
            {activeView === "overview" && (
              <>
                <StorageOverview onUploadClick={openUpload} />
                <div className={styles.divider} />
                <StorageChart />
                <div className={styles.divider} />
                <div className={styles.overviewBottom}>
                  <FileManager onUploadClick={openUpload} />
                </div>
              </>
            )}
            {activeView === "files"     && <FileManager onUploadClick={openUpload} />}
            {activeView === "providers" && <SPHealth />}
          </div>

          {/* Footer */}
          <footer className={styles.footerStrip}>
            <span>Shelby Network · shelbynet · Clay Codes (10+6 erasure) · 16 Storage Providers</span>
            <div className={styles.footerLinks}>
              <a href="https://docs.shelby.xyz" target="_blank" rel="noopener noreferrer">Docs</a>
              <a href="https://explorer.shelby.xyz/shelbynet" target="_blank" rel="noopener noreferrer">Explorer</a>
              <a href="https://github.com/shelby/feedback/issues/new/choose" target="_blank" rel="noopener noreferrer">Feedback</a>
              <span className={styles.footerDivider}>·</span>
              <span className={styles.footerBuiltBy}>Built by</span>
              <a href="https://x.com/riyadhisla58886" target="_blank" rel="noopener noreferrer" className={styles.footerBuilderLink}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.footerXIcon}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @riyadhisla58886
              </a>
            </div>
          </footer>
        </div>
      </div>

      {showUploadModal && <UploadModal onClose={closeUpload} />}
    </>
  );
};

const DashboardPage = () => (
  <AuthProvider>
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  </AuthProvider>
);

export default DashboardPage;
