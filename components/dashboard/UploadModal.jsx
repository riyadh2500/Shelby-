import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDashboard, getFileType, FILE_TYPES } from "../../context/DashboardContext";
import styles from "./UploadModal.module.css";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB soft limit (UI only)

const FILE_ICONS = {
  image:    "🖼️",
  video:    "🎬",
  audio:    "🎵",
  document: "📄",
  code:     "💻",
  archive:  "🗜️",
  other:    "📎",
};

const formatBytes = (b) => {
  if (!b) return "0 B";
  const u = ["B","KB","MB","GB"]; const i = Math.floor(Math.log(b)/Math.log(1024));
  return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`;
};

const UploadModal = ({ onClose }) => {
  const { simulateUpload, setShowUploadModal } = useDashboard();
  const [dragging,   setDragging]   = useState(false);
  const [staged,     setStaged]     = useState([]);  // files ready to upload
  const [error,      setError]      = useState(null);
  const dropRef  = useRef(null);
  const inputRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const addFiles = useCallback((fileList) => {
    setError(null);
    const valid = [];
    Array.from(fileList).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" exceeds 2 GB limit and was skipped.`);
      } else {
        valid.push({
          file: f,
          id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: f.name,
          size: f.size,
          type: getFileType(f.name),
        });
      }
    });
    if (valid.length > 0) {
      setStaged((prev) => {
        // Deduplicate by name, then keep insertion order
        const existingNames = new Set(prev.map((s) => s.name));
        const deduped = valid.filter((v) => !existingNames.has(v.name));
        return [...prev, ...deduped];
      });
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };

  const onInputChange = (e) => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeStaged = (id) => setStaged((prev) => prev.filter((f) => f.id !== id));

  const handleUpload = () => {
    if (staged.length === 0) return;
    simulateUpload(staged.map((s) => s.file));
    setShowUploadModal(false);
    onClose();
  };

  const totalSize = staged.reduce((a, f) => a + f.size, 0);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Upload files" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Upload to Shelby Network</h2>
            <p className={styles.modalSub}>Files are erasure-coded and distributed across 16 storage providers</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          className={`${styles.dropZone} ${dragging ? styles.dragging : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="Drop files here or click to browse"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className={styles.hiddenInput}
            onChange={onInputChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          <span className={styles.dropIcon}>{dragging ? "📂" : "☁️"}</span>
          <p className={styles.dropMain}>
            {dragging ? "Drop files to upload" : "Drag & drop files here"}
          </p>
          <p className={styles.dropSub}>or <span className={styles.browseLink}>browse files</span> · Max 2 GB per file</p>
          <div className={styles.typeHints}>
            {Object.entries(FILE_ICONS).map(([type, icon]) => (
              <span key={type} className={styles.typeHint} title={FILE_TYPES[type]?.label}>
                {icon} <span>{FILE_TYPES[type]?.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={styles.errorBanner} role="alert">
            ⚠ {error}
            <button className={styles.dismissErr} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Staged files */}
        {staged.length > 0 && (
          <div className={styles.stagedList} aria-label="Files staged for upload">
            <div className={styles.stagedHeader}>
              <span>{staged.length} file{staged.length > 1 ? "s" : ""} · {formatBytes(totalSize)} total</span>
              <button className={styles.clearAll} onClick={() => setStaged([])}>Clear all</button>
            </div>
            <ul className={styles.fileList}>
              {staged.map((f) => (
                <li key={f.id} className={styles.fileRow}>
                  <span className={styles.fileIcon}>{FILE_ICONS[f.type]}</span>
                  <div className={styles.fileMeta}>
                    <span className={styles.fileName}>{f.name}</span>
                    <span className={styles.fileSize}>{formatBytes(f.size)}</span>
                  </div>
                  <span
                    className={styles.fileType}
                    style={{ color: FILE_TYPES[f.type]?.color }}
                  >
                    {FILE_TYPES[f.type]?.label}
                  </span>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeStaged(f.id)}
                    aria-label={`Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload info chips */}
        <div className={styles.infoRow}>
          {["Clay Code erasure coding", "16 Storage Providers", "On-chain commitment", "Aptos settlement"].map((t) => (
            <span key={t} className={styles.infoChip}>{t}</span>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={staged.length === 0}
            aria-disabled={staged.length === 0}
          >
            Upload {staged.length > 0 ? `${staged.length} file${staged.length > 1 ? "s" : ""}` : "Files"}
            {staged.length > 0 && <span className={styles.uploadSize}>{formatBytes(totalSize)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
