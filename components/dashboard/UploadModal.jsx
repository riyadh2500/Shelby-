/**
 * UploadModal.jsx
 * Petra wallet gate → pick files → pay 0.01 APT per file → upload → receipt
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDashboard, getFileType, FILE_TYPES } from "../../context/DashboardContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./UploadModal.module.css";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

const FILE_ICONS = {
  image: "🖼️", video: "🎬", audio: "🎵",
  document: "📄", code: "💻", archive: "🗜️", other: "📎",
};

function fmtBytes(b) {
  if (!b) return "0 B";
  const u = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024,i)).toFixed(1)} ${u[i]}`;
}

function shortAddr(a = "") {
  return a.length < 12 ? a : `${a.slice(0,6)}…${a.slice(-4)}`;
}

const UploadModal = ({ onClose }) => {
  const { simulateUpload, setShowUploadModal, recordPayment } = useDashboard();
  const {
    connected, address, walletName, connect, isLoading: walletLoading,
    payForUpload, APT_PER_FILE, SHELBY_TREASURY,
  } = useAuth();

  const [staged,   setStaged]   = useState([]);
  const [dragging, setDragging] = useState(false);
  const [fileErr,  setFileErr]  = useState(null);
  const [screen,   setScreen]   = useState("stage"); // stage|paying|uploading|receipt
  const [payErr,   setPayErr]   = useState(null);
  const [receipt,  setReceipt]  = useState(null);

  const dropRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const addFiles = useCallback((list) => {
    setFileErr(null);
    const valid = [];
    Array.from(list).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) { setFileErr(`"${f.name}" exceeds 2 GB.`); return; }
      valid.push({ file: f, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: f.name, size: f.size, type: getFileType(f.name) });
    });
    if (valid.length) {
      setStaged((p) => { const n = new Set(p.map((x) => x.name)); return [...p, ...valid.filter((v) => !n.has(v.name))]; });
    }
  }, []);

  const onDrop     = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const onInput    = (e) => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ""; };

  const totalBytes    = staged.reduce((a,f) => a + f.size, 0);
  const totalAPT      = APT_PER_FILE * staged.length;
  const totalOctas    = Math.round(APT_PER_FILE * 100_000_000 * staged.length);

  const handlePay = async () => {
    setPayErr(null);
    setScreen("paying");
    try {
      const { hash, totalAPT: paid } = await payForUpload(staged.length);
      recordPayment({ txHash: hash, costAPT: paid, costOctas: totalOctas, fileCount: staged.length, totalBytes, owner: address, paidAt: Date.now() });
      setReceipt({ hash, totalAPT: paid, paidAt: Date.now() });
      setScreen("uploading");
      simulateUpload(staged.map((s) => s.file), address);
      setTimeout(() => setScreen("receipt"), 3200);
    } catch (e) {
      const msg = e?.message ?? String(e);
      setPayErr(msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel") ? "Transaction cancelled." : `Payment failed: ${msg}`);
      setScreen("stage");
    }
  };

  const handleFinish = () => { setShowUploadModal(false); onClose(); };

  // ── SCREEN: Wallet gate ───────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div><h2 className={styles.modalTitle}>Upload to Shelby Network</h2>
              <p className={styles.modalSub}>Connect your Aptos wallet to upload · 0.01 APT per file</p></div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.walletGate}>
            <span className={styles.gateIcon}>⬡</span>
            <h3 className={styles.gateTitle}>Wallet Required</h3>
            <p className={styles.gateSub}>
              Connect your Petra wallet to upload files.<br />
              Each file costs <strong>0.01 APT</strong> (Aptos testnet).
            </p>
            <button
              className={styles.aptosConnectBtn}
              onClick={connect}
              disabled={walletLoading}
            >
              {walletLoading
                ? <><span className={styles.btnSpinner} /> Connecting…</>
                : <>⬡ Connect Petra Wallet</>
              }
            </button>
            <a href="https://petra.app" target="_blank" rel="noopener noreferrer" className={styles.installLink}>
              Don't have Petra? Install it ↗
            </a>
            <button className={styles.gateDismiss} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Paying ────────────────────────────────────────────────────────
  if (screen === "paying") {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <div className={styles.payingScreen}>
            <div className={styles.payingSpinner} />
            <h3 className={styles.payingTitle}>Approve in Petra…</h3>
            <p className={styles.payingSub}>Approve the payment of <strong>{totalAPT.toFixed(2)} APT</strong> in your Petra wallet.</p>
            <div className={styles.payingDetail}><span>Files:</span><span>{staged.length}</span></div>
            <div className={styles.payingDetail}><span>Rate:</span><span>0.01 APT / file</span></div>
            <div className={styles.payingDetail}><span>Total:</span><span className={styles.payingAmt}>{totalAPT.toFixed(2)} APT</span></div>
            <p className={styles.payingHint}>Do not close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Uploading ─────────────────────────────────────────────────────
  if (screen === "uploading") {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <div className={styles.payingScreen}>
            <div className={styles.uploadingSpinner} />
            <h3 className={styles.payingTitle}>Payment confirmed!</h3>
            <p className={styles.payingSub}>Distributing {staged.length} file{staged.length > 1 ? "s" : ""} across 16 storage providers…</p>
            {receipt && (
              <div className={styles.miniReceipt}>
                <span>Tx: </span>
                <a href={`https://explorer.aptoslabs.com/txn/${receipt.hash}?network=testnet`} target="_blank" rel="noopener noreferrer" className={styles.miniReceiptHash}>
                  {receipt.hash.slice(0,10)}…{receipt.hash.slice(-6)} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Receipt ───────────────────────────────────────────────────────
  if (screen === "receipt" && receipt) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Upload Complete 🎉</h2>
            <p className={styles.modalSub}>Payment processed · Files stored on Shelby Network</p>
          </div>
          <div className={styles.receiptCard}>
            <div className={styles.receiptTick}>✓</div>
            <p className={styles.receiptHeading}>Payment Receipt</p>
            {[
              ["Status",      "Confirmed"],
              ["Amount paid", `${receipt.totalAPT.toFixed(2)} APT`],
              ["Rate",        "0.01 APT per file"],
              ["Files",       `${staged.length} (${fmtBytes(totalBytes)})`],
              ["Wallet",      shortAddr(address)],
              ["Paid at",     new Date(receipt.paidAt).toLocaleString()],
            ].map(([k,v]) => (
              <div key={k} className={styles.receiptRow}>
                <span className={styles.receiptKey}>{k}</span>
                <span className={styles.receiptVal}>{v}</span>
              </div>
            ))}
            <div className={styles.receiptRow}>
              <span className={styles.receiptKey}>Tx Hash</span>
              <a href={`https://explorer.aptoslabs.com/txn/${receipt.hash}?network=testnet`} target="_blank" rel="noopener noreferrer" className={styles.receiptHash}>
                {receipt.hash.slice(0,14)}…{receipt.hash.slice(-8)} ↗
              </a>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.uploadBtn} onClick={handleFinish}>Done → Go to Files</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Stage ─────────────────────────────────────────────────────────
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Upload to Shelby Network</h2>
            <p className={styles.modalSub}>16 storage providers · <strong>0.01 APT per file</strong></p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Wallet bar */}
        <div className={styles.walletBar}>
          <span className={styles.walletDot} />
          <span className={styles.walletBarText}>
            {walletName ?? "Petra"} · <span className={styles.walletBarAddr}>{shortAddr(address)}</span>
          </span>
          <span className={styles.walletBarRate}>0.01 APT / file</span>
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          className={`${styles.dropZone} ${dragging ? styles.dragging : ""}`}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple className={styles.hiddenInput} onChange={onInput} tabIndex={-1} aria-hidden="true" />
          <span className={styles.dropIcon}>{dragging ? "📂" : "☁️"}</span>
          <p className={styles.dropMain}>{dragging ? "Drop to add" : "Drag & drop files here"}</p>
          <p className={styles.dropSub}>or <span className={styles.browseLink}>browse</span> · Max 2 GB per file</p>
          <div className={styles.typeHints}>
            {Object.entries(FILE_ICONS).map(([t, icon]) => (
              <span key={t} className={styles.typeHint}>{icon} {FILE_TYPES[t]?.label}</span>
            ))}
          </div>
        </div>

        {fileErr && (
          <div className={styles.errorBanner} role="alert">⚠ {fileErr}
            <button className={styles.dismissErr} onClick={() => setFileErr(null)}>✕</button>
          </div>
        )}

        {/* Staged files */}
        {staged.length > 0 && (
          <div className={styles.stagedList}>
            <div className={styles.stagedHeader}>
              <span>{staged.length} file{staged.length > 1 ? "s" : ""} · {fmtBytes(totalBytes)}</span>
              <button className={styles.clearAll} onClick={() => setStaged([])}>Clear all</button>
            </div>
            <ul className={styles.fileList}>
              {staged.map((f) => (
                <li key={f.id} className={styles.fileRow}>
                  <span className={styles.fileIcon}>{FILE_ICONS[f.type]}</span>
                  <div className={styles.fileMeta}>
                    <span className={styles.fileName}>{f.name}</span>
                    <span className={styles.fileSize}>{fmtBytes(f.size)}</span>
                  </div>
                  <span className={styles.fileCostPill}>0.01 APT</span>
                  <button className={styles.removeBtn} onClick={() => setStaged((p) => p.filter((x) => x.id !== f.id))}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost summary */}
        {staged.length > 0 && (
          <div className={styles.costSummary}>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Files</span>
              <span className={styles.costVal}>{staged.length}</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Rate</span>
              <span className={styles.costVal}>0.01 APT × {staged.length}</span>
            </div>
            <div className={`${styles.costRow} ${styles.costTotal}`}>
              <span className={styles.costLabel}>Total payment</span>
              <span className={styles.costValBig}>{totalAPT.toFixed(2)} APT</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Recipient</span>
              <span className={styles.costVal} style={{fontFamily:"var(--mono)", fontSize:"0.7rem"}}>{SHELBY_TREASURY.slice(0,12)}…</span>
            </div>
          </div>
        )}

        {payErr && (
          <div className={styles.errorBanner} role="alert">⚠ {payErr}
            <button className={styles.dismissErr} onClick={() => setPayErr(null)}>✕</button>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={!staged.length}
          >
            Pay {staged.length > 0 ? `${totalAPT.toFixed(2)} APT` : ""} &amp; Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
