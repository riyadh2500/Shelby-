import React, { useState } from "react";
import { useDashboard, FILE_TYPES } from "../../context/DashboardContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./FileManager.module.css";

const FILE_ICONS = {
  image: "🖼️", video: "🎬", audio: "🎵",
  document: "📄", code: "💻", archive: "🗜️", other: "📎",
};

// File types that can be previewed natively in-browser
const PREVIEWABLE = ["image", "video", "audio"];

const StatusBadge = ({ status }) => (
  <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
    {status === "stored" ? "✓ Stored" : status === "uploading" ? "⟳ Uploading" : status}
  </span>
);

// Moved outside component so it never re-creates on render
const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span className={styles.sortNeutral}>↕</span>;
  return <span className={styles.sortActive}>{sortDir === "asc" ? "↑" : "↓"}</span>;
};

const Col = ({ field, label, onSort, sortBy, sortDir }) => (
  <th
    className={styles.th}
    onClick={() => onSort(field)}
    role="columnheader"
    aria-sort={sortBy === field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    style={{ cursor: "pointer", userSelect: "none" }}
  >
    {label} <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
  </th>
);

// ── Inline file preview renderer ──────────────────────────────────────────────
const FilePreview = ({ file }) => {
  if (!file.objectUrl) {
    return (
      <div className={styles.previewPlaceholder}>
        <span className={styles.previewIcon}>{FILE_ICONS[file.type]}</span>
        <p className={styles.previewNote}>
          {file.id.startsWith("seed-")
            ? "Demo file — no local preview available"
            : "Preview not available for this file type"}
        </p>
      </div>
    );
  }

  if (file.type === "image") {
    return (
      <img
        src={file.objectUrl}
        alt={file.name}
        className={styles.previewImg}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }

  if (file.type === "video") {
    return (
      <video
        src={file.objectUrl}
        controls
        className={styles.previewVideo}
        aria-label={`Video preview: ${file.name}`}
      />
    );
  }

  if (file.type === "audio") {
    return (
      <div className={styles.previewAudioWrap}>
        <span className={styles.previewIcon}>🎵</span>
        <audio
          src={file.objectUrl}
          controls
          className={styles.previewAudio}
          aria-label={`Audio preview: ${file.name}`}
        />
      </div>
    );
  }

  // All other types with an objectUrl — offer a download
  return (
    <div className={styles.previewPlaceholder}>
      <span className={styles.previewIcon}>{FILE_ICONS[file.type]}</span>
      <p className={styles.previewNote}>No in-browser preview for this file type.</p>
      <a
        href={file.objectUrl}
        download={file.name}
        className={styles.previewDownload}
      >
        ⬇ Download {file.name}
      </a>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const FileManager = ({ onUploadClick }) => {
  const {
    filteredFiles, files,
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    sortBy, sortDir, toggleSort,
    deleteFile, formatBytes, timeAgo,
  } = useDashboard();

  const { connected } = useAuth();

  const [copiedId,      setCopiedId]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewFile,   setPreviewFile]   = useState(null);

  // ── Wallet gate — hide files when not connected ───────────────────────────
  if (!connected) {
    return (
      <section className={styles.section} id="files" aria-label="File manager">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>File Manager</h2>
            <p className={styles.sub}>Connect your wallet to view and manage your files</p>
          </div>
        </div>
        <div className={styles.walletGateBox}>
          <span className={styles.walletGateIcon}>🔒</span>
          <p className={styles.walletGateText}>Connect your Petra wallet to view your files</p>
          <button className={styles.walletGateBtn} onClick={onUploadClick}>
            ⬡ Connect Wallet
          </button>
        </div>
      </section>
    );
  }

  const copyBlobPath = (f) => {
    const text = f.blobPath || f.name;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleDelete = (id) => {
    deleteFile(id);
    setConfirmDelete(null);
    if (previewFile?.id === id) setPreviewFile(null);
  };

  // Shorthand so JSX stays clean
  const colProps = { onSort: toggleSort, sortBy, sortDir };

  return (
    <section className={styles.section} id="files" aria-label="File manager">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>File Manager</h2>
          <p className={styles.sub}>{files.length} total files · {filteredFiles.length} shown</p>
        </div>
        <button className={styles.uploadBtn} onClick={onUploadClick}>↑ Upload</button>
      </div>

      {/* Search + filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search files…"
            className={styles.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search files"
          />
          {searchQuery && (
            <button className={styles.clearSearch} onClick={() => setSearchQuery("")} aria-label="Clear">✕</button>
          )}
        </div>
        <div className={styles.filters} role="group" aria-label="Filter by type">
          <button
            className={`${styles.filterBtn} ${typeFilter === "all" ? styles.filterActive : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            All <span className={styles.filterCount}>{files.length}</span>
          </button>
          {Object.entries(FILE_TYPES).map(([key, info]) => {
            const count = files.filter((f) => f.type === key).length;
            if (!count) return null;
            return (
              <button
                key={key}
                className={`${styles.filterBtn} ${typeFilter === key ? styles.filterActive : ""}`}
                onClick={() => setTypeFilter(key)}
                style={typeFilter === key ? { borderColor: info.color, color: info.color } : {}}
              >
                {FILE_ICONS[key]} {info.label}
                <span className={styles.filterCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap} role="region" aria-label="Files table">
        {filteredFiles.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <span>No files match your search.</span>
            <button className={styles.emptyReset} onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 32 }} />
                <Col field="name"       label="Name"     {...colProps} />
                <Col field="size"       label="Size"     {...colProps} />
                <Col field="type"       label="Type"     {...colProps} />
                <Col field="spCount"    label="SPs"      {...colProps} />
                <th className={styles.th}>Blob Path</th>
                <th className={styles.th}>Status</th>
                <Col field="uploadedAt" label="Uploaded" {...colProps} />
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((f) => (
                <tr
                  key={f.id}
                  className={`${styles.row} ${previewFile?.id === f.id ? styles.rowActive : ""}`}
                  onClick={() => setPreviewFile(f)}
                  style={{ cursor: "pointer" }}
                >
                  <td className={styles.td}><span className={styles.fileIcon}>{FILE_ICONS[f.type]}</span></td>
                  <td className={styles.td}><span className={styles.fileName} title={f.name}>{f.name}</span></td>
                  <td className={`${styles.td} ${styles.mono}`}>{formatBytes(f.size)}</td>
                  <td className={styles.td}>
                    <span className={styles.typeTag} style={{ color: FILE_TYPES[f.type]?.color, borderColor: `${FILE_TYPES[f.type]?.color}40` }}>
                      {FILE_TYPES[f.type]?.label}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.center}`}>
                    <span className={styles.spCount} title={`Stored on ${f.spCount} nodes`}>{f.spCount}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.blobPath} ${styles.mono}`} title={f.blobPath}>{f.blobPath}</span>
                  </td>
                  <td className={styles.td}><StatusBadge status={f.status} /></td>
                  <td className={`${styles.td} ${styles.timeCell}`}>{timeAgo(f.uploadedAt)}</td>
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actions}>
                      {/* Copy blob path */}
                      <button
                        className={styles.actionBtn}
                        onClick={() => copyBlobPath(f)}
                        title="Copy blob path"
                        aria-label="Copy blob path"
                      >
                        {copiedId === f.id ? "✓" : "🔗"}
                      </button>

                      {/* Preview / download — only if local objectUrl exists */}
                      {f.objectUrl ? (
                        PREVIEWABLE.includes(f.type) ? (
                          <button
                            className={styles.actionBtn}
                            onClick={() => setPreviewFile(f)}
                            title="Preview file"
                            aria-label="Preview file"
                          >
                            👁
                          </button>
                        ) : (
                          <a
                            href={f.objectUrl}
                            download={f.name}
                            className={styles.actionBtn}
                            title="Download file"
                            aria-label="Download file"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ⬇
                          </a>
                        )
                      ) : (
                        <span className={`${styles.actionBtn} ${styles.actionDisabled}`} title="No local file — demo data">
                          ↗
                        </span>
                      )}

                      {/* Delete */}
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => setConfirmDelete(f.id)}
                        title="Delete file"
                        aria-label="Delete file"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── File detail / preview panel ── */}
      {previewFile && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="File details"
          onClick={() => setPreviewFile(null)}
        >
          <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <span className={styles.detailIcon}>{FILE_ICONS[previewFile.type]}</span>
              <div className={styles.detailHeaderText}>
                <p className={styles.detailName}>{previewFile.name}</p>
                <p className={styles.detailMeta}>
                  {FILE_TYPES[previewFile.type]?.label} · {formatBytes(previewFile.size)}
                  {previewFile.objectUrl && <span className={styles.localBadge}>Local Preview</span>}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setPreviewFile(null)} aria-label="Close">✕</button>
            </div>

            {/* Preview area */}
            <div className={styles.previewArea}>
              <FilePreview file={previewFile} />
            </div>

            {/* Metadata rows */}
            <div className={styles.detailRows}>
              {[
                ["Blob Path",  previewFile.blobPath],
                ["Size",       formatBytes(previewFile.size)],
                ["Type",       FILE_TYPES[previewFile.type]?.label],
                ["Status",     previewFile.status],
                ["SPs",        `${previewFile.spCount} of 16 nodes`],
                ["Tx Hash",    previewFile.txHash],
                ["Uploaded",   new Date(previewFile.uploadedAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className={styles.detailRow}>
                  <span className={styles.detailKey}>{k}</span>
                  <span className={`${styles.detailVal} ${styles.mono}`}>{v}</span>
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className={styles.detailActions}>
              <button className={styles.detailCopy} onClick={() => copyBlobPath(previewFile)}>
                {copiedId === previewFile.id ? "✓ Copied!" : "🔗 Copy Blob Path"}
              </button>
              {previewFile.objectUrl ? (
                <a
                  href={previewFile.objectUrl}
                  download={previewFile.name}
                  className={styles.detailOpen}
                >
                  ⬇ Download File
                </a>
              ) : (
                <span className={styles.detailOpenDisabled}>
                  No local file (demo data)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm dialog ── */}
      {confirmDelete && (
        <div className={styles.dialogOverlay} role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className={styles.dialog}>
            <p className={styles.dialogTitle}>Delete file?</p>
            <p className={styles.dialogSub}>
              "{files.find((f) => f.id === confirmDelete)?.name}" will be removed from your dashboard.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.dialogConfirm} onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FileManager;
