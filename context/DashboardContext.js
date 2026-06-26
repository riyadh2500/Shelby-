import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from "react";

const DashboardContext = createContext(null);

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_CAPACITY_BYTES = 10 * 1024 * 1024 * 1024 * 1024; // 10 TiB
const SP_COUNT = 16;
const SP_CAPACITY_BYTES = 1 * 1024 * 1024 * 1024 * 1024; // 1 TiB each
const STORAGE_KEY = "shelby_dashboard_files_v2"; // v2 = cleared seed data
const UPLOAD_STEPS = [
  "Encoding with Clay Codes…",
  "Splitting into chunksets…",
  "Uploading to Storage Providers…",
  "Verifying parity chunks…",
  "Registering commitment on Aptos…",
  "Confirmed ✓",
];

const REGIONS = [
  "us-east-1", "us-west-2", "eu-central-1", "ap-southeast-1",
  "us-east-1", "us-west-2", "eu-west-1",    "ap-northeast-1",
  "us-east-2", "sa-east-1", "eu-central-1", "ap-south-1",
  "us-west-1", "ca-central-1","eu-north-1", "ap-east-1",
];

// ── File type helpers ──────────────────────────────────────────────────────────
export const FILE_TYPES = {
  image:    { label: "Image",    ext: ["jpg","jpeg","png","gif","webp","svg","bmp"], color: "#FF77C9" },
  video:    { label: "Video",    ext: ["mp4","mov","avi","mkv","webm"],              color: "#60a5fa" },
  audio:    { label: "Audio",    ext: ["mp3","wav","flac","aac","ogg"],              color: "#a78bfa" },
  document: { label: "Document", ext: ["pdf","doc","docx","txt","md","csv","xlsx"], color: "#facc15" },
  code:     { label: "Code",     ext: ["js","ts","jsx","tsx","py","sol","json","yaml","toml"], color: "#4ade80" },
  archive:  { label: "Archive",  ext: ["zip","tar","gz","rar","7z"],                color: "#fb923c" },
  other:    { label: "Other",    ext: [],                                            color: "#888888" },
};

export function getFileType(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  for (const [key, info] of Object.entries(FILE_TYPES)) {
    if (info.ext.includes(ext)) return key;
  }
  return "other";
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── No seed files — dashboard starts empty ────────────────────────────────────
function generateSeedFiles() {
  return [];
}

// ── Generate SP node data ──────────────────────────────────────────────────────
function generateSPs() {
  return Array.from({ length: SP_COUNT }, (_, i) => ({
    id:       `sp-${i + 1}`,
    name:     `SP-${String(i + 1).padStart(2, "0")}`,
    region:   REGIONS[i],
    status:   i < 14 ? "healthy" : i === 14 ? "degraded" : "offline",
    ping:     Math.floor(Math.random() * 60) + 8,
    used:     Math.floor(Math.random() * SP_CAPACITY_BYTES * 0.8),
    capacity: SP_CAPACITY_BYTES,
    chunks:   Math.floor(Math.random() * 120_000) + 40_000,
    uptime:   (99 + Math.random() * 0.9).toFixed(2),
  }));
}

// ── Build daily activity data (last 7 days) ────────────────────────────────────
function buildDailyActivity(files) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date:  d.toDateString(),
      count: 0,
      bytes: 0,
    };
  });
  files.forEach((f) => {
    const fd = new Date(f.uploadedAt).toDateString();
    const slot = days.find((d) => d.date === fd);
    if (slot) { slot.count++; slot.bytes += f.size; }
  });
  return days;
}

// ── Payment history key ───────────────────────────────────────────────────────
const PAYMENT_KEY = "shelby_payment_history";

// ── Provider ───────────────────────────────────────────────────────────────────
export const DashboardProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [sps,   setSps]   = useState([]);
  const [uploadQueue,      setUploadQueue]      = useState([]);
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [activeView,       setActiveView]       = useState("overview");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [typeFilter,       setTypeFilter]       = useState("all");
  const [sortBy,           setSortBy]           = useState("uploadedAt");
  const [sortDir,          setSortDir]          = useState("desc");
  const [paymentHistory,   setPaymentHistory]   = useState([]); // ← payment log
  const spPingRef = useRef(null);

  // ── Hydrate from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
    if (stored && stored.length > 0) {
      const migrated = stored.map((f) => ({
        ...f,
        objectUrl: f.objectUrl || null,
        shareUrl:  f.shareUrl?.startsWith("https://api.shelbynet")
          ? `shelby://shelbynet/0xf3a9c12b/${encodeURIComponent(f.name)}`
          : (f.shareUrl || `shelby://shelbynet/0xf3a9c12b/${encodeURIComponent(f.name)}`),
      }));
      setFiles(migrated);
    } else {
      setFiles(generateSeedFiles());
    }
    // Hydrate payment history
    try {
      const ph = JSON.parse(localStorage.getItem(PAYMENT_KEY));
      if (Array.isArray(ph)) setPaymentHistory(ph);
    } catch {}
    setSps(generateSPs());
  }, []);

  // ── Persist files to localStorage ───────────────────────────────────────────
  useEffect(() => {
    if (files.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch {}
    }
  }, [files]);

  // ── Simulate SP ping fluctuation ────────────────────────────────────────────
  useEffect(() => {
    spPingRef.current = setInterval(() => {
      setSps((prev) =>
        prev.map((sp) =>
          sp.status === "offline"
            ? sp
            : { ...sp, ping: Math.max(5, sp.ping + Math.floor(Math.random() * 11) - 5) }
        )
      );
    }, 8_000);
    return () => clearInterval(spPingRef.current);
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const usedBytes    = files.reduce((acc, f) => acc + f.size, 0);
  const usedPct      = Math.min((usedBytes / TOTAL_CAPACITY_BYTES) * 100, 100);
  const totalFiles   = files.length;
  const typeBreakdown = Object.keys(FILE_TYPES).map((key) => {
    const subset = files.filter((f) => f.type === key);
    return {
      type:  key,
      label: FILE_TYPES[key].label,
      color: FILE_TYPES[key].color,
      count: subset.length,
      bytes: subset.reduce((a, f) => a + f.size, 0),
    };
  }).filter((t) => t.count > 0);

  const dailyActivity = buildDailyActivity(files);

  // ── Filtered / sorted file list ──────────────────────────────────────────────
  const filteredFiles = files
    .filter((f) => {
      const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType   = typeFilter === "all" || f.type === typeFilter;
      return matchSearch && matchType;
    })
    .slice() // never mutate the original array
    .sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];
      // Normalise strings for case-insensitive sort
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      // Handle nulls / undefined
      if (av == null) return 1;
      if (bv == null) return -1;
      const primary = av < bv ? -1 : av > bv ? 1 : 0;
      if (primary !== 0) return sortDir === "asc" ? primary : -primary;
      // Stable tiebreak: always sort by uploadedAt desc so rows don't jump
      return b.uploadedAt - a.uploadedAt;
    });

  // ── Upload simulation — guarded, called only when wallet is connected ─────
  const simulateUpload = useCallback((fileList, walletAddress) => {
    if (!walletAddress) {
      console.warn("simulateUpload blocked: no wallet connected");
      return;
    }
    // Keep a ref to the real File objects so we can create object URLs after upload
    const fileObjects = Array.from(fileList);

    const newItems = fileObjects.map((f) => ({
      id:       `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:     f.name,
      size:     f.size || Math.floor(Math.random() * 50_000_000) + 100_000,
      type:     getFileType(f.name),
      status:   "uploading",
      progress: 0,
      step:     UPLOAD_STEPS[0],
      stepIdx:  0,
      _file:    f, // real File reference, not stored in localStorage
    }));

    setUploadQueue((q) => [...q, ...newItems]);

    newItems.forEach((item) => {
      let stepIdx = 0;
      const advance = () => {
        stepIdx++;
        if (stepIdx >= UPLOAD_STEPS.length) {
          // Create a local object URL so the file can be previewed in-browser
          const objectUrl = item._file ? URL.createObjectURL(item._file) : null;

          const finalFile = {
            id:        item.id,
            name:      item.name,
            size:      item.size,
            type:      item.type,
            status:    "stored",
            spCount:   SP_COUNT,
            blobPath:  `${walletAddress?.slice(0,10) ?? "0xf3a9…c12b"}/${item.name}`,
            uploadedAt: Date.now(),
            txHash:    `0x${Math.random().toString(16).slice(2, 18)}`,
            owner:     walletAddress ?? null,
            objectUrl,
            shareUrl:  `shelby://shelbynet/${walletAddress ?? "0xf3a9c12b"}/${encodeURIComponent(item.name)}`,
          };
          setFiles((prev) => [finalFile, ...prev]);
          setUploadQueue((q) => q.filter((u) => u.id !== item.id));
          return;
        }
        setUploadQueue((q) =>
          q.map((u) =>
            u.id === item.id
              ? { ...u, stepIdx, step: UPLOAD_STEPS[stepIdx], progress: Math.round((stepIdx / (UPLOAD_STEPS.length - 1)) * 100) }
              : u
          )
        );
        setTimeout(advance, 900 + Math.random() * 600);
      };
      setTimeout(advance, 600);
    });
  }, []);

  // ── Record a completed payment ───────────────────────────────────────────────
  const recordPayment = useCallback((entry) => {
    // entry: { txHash, costAPT, costOctas, fileCount, totalBytes, owner, paidAt }
    setPaymentHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50); // keep last 50
      try { localStorage.setItem(PAYMENT_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // ── Delete file ──────────────────────────────────────────────────────────────
  const deleteFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── Toggle sort — fixed: update both sortBy and sortDir atomically ───────────
  const toggleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        // Same column — flip direction
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return field;
      }
      // New column — always start descending
      setSortDir("desc");
      return field;
    });
  }, []);

  return (
    <DashboardContext.Provider value={{
      files, filteredFiles, sps,
      uploadQueue, showUploadModal, setShowUploadModal,
      activeView, setActiveView,
      searchQuery, setSearchQuery,
      typeFilter, setTypeFilter,
      sortBy, sortDir, toggleSort,
      simulateUpload, deleteFile,
      paymentHistory, recordPayment,
      // derived
      usedBytes, usedPct, totalFiles,
      typeBreakdown, dailyActivity,
      totalCapacity: TOTAL_CAPACITY_BYTES,
      // helpers
      formatBytes, timeAgo,
      UPLOAD_STEPS, FILE_TYPES,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be inside <DashboardProvider>");
  return ctx;
};

export default DashboardContext;
