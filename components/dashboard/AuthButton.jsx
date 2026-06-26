/**
 * AuthButton.jsx
 *
 * Uses WalletItem + WalletItem.ConnectButton — the official adapter pattern
 * for triggering the wallet popup. Direct connect() calls are void and
 * unreliable; WalletItem.ConnectButton handles the full flow internally.
 */

import React, { useState, useRef, useEffect } from "react";
import { useWallet, WalletItem } from "@aptos-labs/wallet-adapter-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./AuthButton.module.css";

const AuthButton = ({ collapsed = false }) => {
  const {
    disconnect,
    connected,
    walletName, shortAddress, address,
  } = useAuth();

  // Get wallets directly from adapter for WalletItem
  const { wallets = [], notDetectedWallets = [] } = useWallet();
  const allWallets = [...wallets, ...notDetectedWallets];

  const [showMenu,   setShowMenu]   = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close picker when wallet connects
  useEffect(() => {
    if (connected) { setShowPicker(false); setShowMenu(false); }
  }, [connected]);

  const handleDisconnect = () => { disconnect(); setShowMenu(false); };
  const copyAddress      = () => {
    if (address) navigator.clipboard.writeText(address);
    setShowMenu(false);
  };

  // ── Connected ─────────────────────────────────────────────────────────────
  if (connected && address) {
    return (
      <div className={styles.wrap} ref={wrapRef}>
        <button
          className={`${styles.signedBtn} ${collapsed ? styles.collapsed : ""}`}
          onClick={() => setShowMenu((v) => !v)}
          aria-label="Wallet menu"
          aria-expanded={showMenu}
        >
          <span className={styles.dot} />
          {!collapsed && (
            <>
              <span className={styles.userName}>{walletName ?? "Petra"}</span>
              <span className={styles.addr}>{shortAddress}</span>
              <span className={styles.chevron}>▾</span>
            </>
          )}
        </button>

        {showMenu && (
          <div className={styles.dropdown} role="menu">
            <div className={styles.dropHeader}>
              <span className={styles.dropName}>{walletName ?? "Petra"}</span>
              <span className={styles.dropEmail}>{shortAddress}</span>
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
            <button
              className={`${styles.dropItem} ${styles.dropSignOut}`}
              onClick={handleDisconnect}
            >
              <span>⏻</span> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Primary connect button — opens wallet picker */}
      <button
        className={`${styles.signInBtn} ${collapsed ? styles.collapsed : ""}`}
        onClick={() => setShowPicker((v) => !v)}
        aria-label="Connect wallet"
        aria-expanded={showPicker}
      >
        <span className={styles.walletIcon}>⬡</span>
        {!collapsed && <span>Connect Wallet</span>}
      </button>

      {!collapsed && !showPicker && (
        <p className={styles.authHint}>Connect wallet to upload files</p>
      )}

      {/* Wallet picker — official WalletItem.ConnectButton triggers popup */}
      {showPicker && (
        <div className={styles.pickerDropdown}>
          <p className={styles.pickerTitle}>Select wallet</p>
          {allWallets.length === 0 ? (
            <div className={styles.noWallet}>
              <p>No wallets detected.</p>
              <a
                href="https://petra.app"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.getWallet}
              >
                Install Petra ↗
              </a>
            </div>
          ) : (
            allWallets.map((w) => (
              <WalletItem
                key={w.name}
                wallet={w}
                onConnect={() => setShowPicker(false)}
                className={styles.walletRow}
              >
                <div className={styles.walletRowInner}>
                  <WalletItem.Icon className={styles.walletIcon2} />
                  <WalletItem.Name className={styles.walletName2} />
                </div>
                <WalletItem.ConnectButton className={styles.walletConnectBtn}>
                  Connect
                </WalletItem.ConnectButton>
              </WalletItem>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AuthButton;
