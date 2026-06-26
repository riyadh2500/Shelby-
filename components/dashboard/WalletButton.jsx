import React, { useState, useRef, useEffect } from "react";
import { useAptosWallet } from "../../context/AptosWalletContext";
import styles from "./WalletButton.module.css";

const WalletButton = ({ collapsed = false }) => {
  const {
    connect, disconnect,
    connected, isLoading, petraReady,
    walletName, shortAddress, address, error,
  } = useAptosWallet();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleDisconnect = () => { disconnect(); setShowMenu(false); };
  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address);
    setShowMenu(false);
  };

  // ── Connected ─────────────────────────────────────────────────────────────
  if (connected && address) {
    return (
      <div className={styles.wrap} ref={menuRef}>
        <button
          className={`${styles.connectedBtn} ${collapsed ? styles.collapsed : ""}`}
          onClick={() => setShowMenu((v) => !v)}
          aria-label="Wallet menu"
        >
          <span className={styles.dot} />
          {!collapsed && (
            <>
              <span className={styles.walletName}>{walletName ?? "Petra"}</span>
              <span className={styles.addr}>{shortAddress}</span>
              <span className={styles.chevron}>{showMenu ? "▴" : "▾"}</span>
            </>
          )}
        </button>

        {showMenu && (
          <div className={styles.dropdown} role="menu">
            <div className={styles.dropHeader}>
              <span className={styles.dropWalletName}>{walletName ?? "Petra"}</span>
              <span className={styles.dropAddr}>{shortAddress}</span>
            </div>
            <div className={styles.dropDivider} />
            <button className={styles.dropItem} onClick={copyAddress}>
              <span>📋</span> Copy address
            </button>
            <a
              className={styles.dropItem}
              href={`https://explorer.aptoslabs.com/account/${address}?network=testnet`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setShowMenu(false)}
            >
              <span>↗</span> View on Explorer
            </a>
            <div className={styles.dropDivider} />
            <button className={`${styles.dropItem} ${styles.dropDisconnect}`} onClick={handleDisconnect}>
              <span>⏻</span> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <button className={`${styles.connectBtn} ${collapsed ? styles.collapsed : ""}`} disabled>
          <span className={styles.spinner} />
          {!collapsed && <span>Connecting…</span>}
        </button>
      </div>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      {error && !collapsed && (
        <p className={styles.connectError} role="alert">{error}</p>
      )}
      {/* onClick calls connect() synchronously — required for Petra popup */}
      <button
        className={`${styles.connectBtn} ${collapsed ? styles.collapsed : ""}`}
        onClick={connect}
        aria-label="Connect Petra wallet"
      >
        <span className={styles.walletIcon}>⬡</span>
        {!collapsed && <span>Connect Wallet</span>}
      </button>
      {!collapsed && !petraReady && (
        <p className={styles.connectHint}>
          <a href="https://petra.app" target="_blank" rel="noopener noreferrer">
            Install Petra ↗
          </a>
        </p>
      )}
    </div>
  );
};

export default WalletButton;
