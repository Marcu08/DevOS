const fs = require("fs");
const path = require("path");

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "backup",
  "logs",
  "sandbox",
  "coverage",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "venv",
  ".venv",
  "__pycache__",
  ".next",
  ".cache",
  ".turbo",
  ".parcel-cache",
];

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tif", ".tiff",
  ".pdf", ".zip", ".gz", ".tgz", ".tar", ".7z", ".rar", ".bz2", ".xz",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".class", ".jar", ".war", ".wasm",
  ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".wav", ".flac", ".ogg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".db", ".sqlite", ".sqlite3", ".mdb",
]);

function toRelative(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function normalizeRelativePath(value) {
  return String(value).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isExcludedPath(relativePath, extraExcludes = [], options = {}) {
  const normalized = normalizeRelativePath(relativePath);
  const segments = normalized.split("/").filter(Boolean);
  const extra = (Array.isArray(extraExcludes) ? extraExcludes : [extraExcludes])
    .map((value) => normalizeRelativePath(value))
    .filter(Boolean);
  const rawPathExcludes = Array.isArray(options.excludePaths) ? options.excludePaths : [];
  const excludePaths = [
    ...rawPathExcludes.map((value) => normalizeRelativePath(value)),
    ...extra.filter((value) => value.includes("/")),
  ].filter(Boolean);
  const excluded = new Set([...DEFAULT_EXCLUDES, ...extra.filter((value) => !value.includes("/"))]);

  for (const excludePath of excludePaths) {
    const excludeSegments = excludePath.split("/").filter(Boolean);
    if (excludeSegments.length === 0) continue;
    if (excludeSegments.length > segments.length) continue;
    if (excludeSegments.every((segment, index) => segments[index] === segment)) return true;
  }

  for (const segment of segments) {
    if (excluded.has(segment)) return true;
    if (!options.includeEnv && (segment === ".env" || segment.startsWith(".env."))) return true;
  }

  return false;
}

function isBinaryBuffer(buffer) {
  return buffer.subarray(0, 8192).indexOf(0) !== -1;
}

function sameFileIdentity(before, after) {
  if (Number.isFinite(before.dev) && Number.isFinite(after.dev) && before.dev !== after.dev) return false;
  if (
    Number.isFinite(before.ino) &&
    Number.isFinite(after.ino) &&
    before.ino !== 0 &&
    after.ino !== 0 &&
    before.ino !== after.ino
  ) {
    return false;
  }

  return before.size === after.size && before.mtimeMs === after.mtimeMs;
}

function sameDirectoryIdentity(before, after) {
  if (!before.isDirectory() || !after.isDirectory()) return false;
  if (Number.isFinite(before.dev) && Number.isFinite(after.dev) && before.dev !== after.dev) return false;
  if (
    Number.isFinite(before.ino) &&
    Number.isFinite(after.ino) &&
    before.ino !== 0 &&
    after.ino !== 0 &&
    before.ino !== after.ino
  ) {
    return false;
  }
  if (before.birthtimeMs > 0 && after.birthtimeMs > 0 && before.birthtimeMs !== after.birthtimeMs) {
    return false;
  }

  return true;
}

function normalizeBuffer(buffer, maxFileSizeBytes) {
  if (typeof buffer === "string") buffer = Buffer.from(buffer, "utf-8");
  if (!Buffer.isBuffer(buffer)) {
    return { error: "readFile did not return a Buffer or string" };
  }

  if (buffer.length > maxFileSizeBytes) {
    return { skipped: true, reason: `too-large (${buffer.length} bytes)` };
  }

  if (isBinaryBuffer(buffer)) {
    return { skipped: true, reason: "binary-content" };
  }

  return { content: buffer.toString("utf-8"), skipped: false };
}

function readBounded(descriptor, maxFileSizeBytes) {
  const limit = maxFileSizeBytes + 1;
  const chunks = [];
  let total = 0;

  while (total < limit) {
    const chunkSize = Math.min(64 * 1024, limit - total);
    const chunk = Buffer.allocUnsafe(chunkSize);
    const bytesRead = fs.readSync(descriptor, chunk, 0, chunkSize, total);

    if (bytesRead === 0) break;

    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
  }

  return {
    buffer: Buffer.concat(chunks, total),
    bytesRead: total,
    overflow: total > maxFileSizeBytes,
  };
}

function collectSourceFiles(root, options = {}) {
  const maxFiles = Number.isFinite(options.maxFiles) && options.maxFiles > 0 ? options.maxFiles : 2000;
  const extraExcludes = Array.isArray(options.exclude) ? options.exclude : [];
  const excludePaths = Array.isArray(options.excludePaths) ? options.excludePaths : [];
  const includeEnv = options.includeEnv === true;
  const rootResolved = path.resolve(root);

  let rootStat;
  try {
    rootStat = fs.lstatSync(rootResolved);
  } catch (error) {
    return {
      ok: false,
      error: `Workspace path is not accessible: ${root}`,
      files: [],
      skipped: [],
      errors: [{ file: "", error: "path is not accessible" }],
      root: rootResolved,
      truncated: false,
    };
  }

  if (rootStat.isSymbolicLink()) {
    // Policy: the scan root itself must not be a symlink. Ancestor components are
    // resolved by the OS; symlinks discovered during traversal are never followed.
    return {
      ok: false,
      error: `Workspace path is a symlink and is not followed: ${root}`,
      files: [],
      skipped: [],
      errors: [{ file: "", error: "symlink root" }],
      root: rootResolved,
      truncated: false,
    };
  }

  if (!rootStat.isDirectory()) {
    return {
      ok: false,
      error: `Workspace path is not a directory: ${root}`,
      files: [],
      skipped: [],
      errors: [{ file: "", error: "not a directory" }],
      root: rootResolved,
      truncated: false,
    };
  }

  const files = [];
  const skipped = [];
  const errors = [];
  let truncated = false;

  function walk(directory, expectedIdentity) {
    // Portable Node has no dirfd-based readdir API. This lstat/readdir/lstat
    // sequence narrows the directory-symlink TOCTOU window but cannot fully
    // eliminate a parent-directory swap after validation and before child path
    // resolution. Directory symlinks discovered at any validation point are
    // skipped; identity changes during readdir are reported as scan errors.
    const relativeDirectory = toRelative(rootResolved, directory) || ".";
    let before;
    try {
      before = fs.lstatSync(directory);
    } catch (error) {
      errors.push({ file: relativeDirectory, error: "directory could not be inspected" });
      return;
    }

    if (before.isSymbolicLink()) {
      skipped.push({ file: relativeDirectory, reason: "symlink" });
      return;
    }

    if (!before.isDirectory()) {
      errors.push({ file: relativeDirectory, error: "not a directory" });
      return;
    }

    if (expectedIdentity && !sameDirectoryIdentity(expectedIdentity, before)) {
      errors.push({ file: relativeDirectory, error: "directory changed during security scan" });
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      errors.push({ file: relativeDirectory, error: "directory could not be read" });
      return;
    }

    let after;
    try {
      after = fs.lstatSync(directory);
    } catch (error) {
      errors.push({ file: relativeDirectory, error: "directory could not be inspected" });
      return;
    }

    if (after.isSymbolicLink() || !after.isDirectory() || !sameDirectoryIdentity(before, after)) {
      errors.push({ file: relativeDirectory, error: "directory changed during security scan" });
      return;
    }

    for (const entry of entries) {
      if (truncated) return;

      const fullPath = path.join(directory, entry.name);
      const relativePath = toRelative(rootResolved, fullPath);

      if (isExcludedPath(relativePath, extraExcludes, { includeEnv, excludePaths })) continue;

      let entryStat;
      try {
        entryStat = fs.lstatSync(fullPath);
      } catch (error) {
        errors.push({ file: relativePath, error: "entry could not be inspected" });
        continue;
      }

      if (entryStat.isSymbolicLink()) {
        skipped.push({ file: relativePath, reason: "symlink" });
        continue;
      }

      if (entryStat.isDirectory()) {
        walk(fullPath, entryStat);
        continue;
      }

      if (!entryStat.isFile()) {
        skipped.push({ file: relativePath, reason: "not-a-file" });
        continue;
      }

      if (files.length >= maxFiles) {
        truncated = true;
        errors.push({ file: "", error: `File limit reached (${maxFiles}); scan is incomplete` });
        return;
      }

      files.push(fullPath);
    }
  }

  walk(rootResolved, rootStat);

  return {
    ok: errors.length === 0,
    error: errors.length > 0 ? `Security scan could not complete: ${errors[0].error}` : null,
    files,
    skipped,
    errors,
    root: rootResolved,
    truncated,
  };
}

function readSourceFile(filePath, options = {}) {
  const maxFileSizeBytes = Number.isFinite(options.maxFileSizeBytes) && options.maxFileSizeBytes > 0
    ? options.maxFileSizeBytes
    : 1024 * 1024;
  const readFile = options.readFile;
  const extension = path.extname(filePath).toLowerCase();

  if (BINARY_EXTENSIONS.has(extension)) {
    return { skipped: true, reason: "binary-extension" };
  }

  let before;
  try {
    before = fs.lstatSync(filePath);
  } catch (error) {
    return { error: "file could not be inspected" };
  }

  if (before.isSymbolicLink()) {
    return { skipped: true, reason: "symlink" };
  }

  if (!before.isFile()) {
    return { error: "not a regular file" };
  }

  if (before.size > maxFileSizeBytes) {
    return { skipped: true, reason: `too-large (${before.size} bytes)` };
  }

  // Test-only injectable reader. Production scans use the safe-open path
  // below, which pins the opened inode instead of resolving the path again.
  if (readFile) {
    try {
      return normalizeBuffer(readFile(filePath), maxFileSizeBytes);
    } catch (error) {
      return { error: "file could not be read" };
    }
  }

  let descriptor;
  try {
    // O_NOFOLLOW prevents the open from resolving a symlink on POSIX. Windows
    // does not expose O_NOFOLLOW, so the lstat/fstat identity check below is the
    // portable fallback; a same-size/same-mtime swap remains theoretically
    // possible on filesystems without stable inode numbers.
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | noFollow);

    // Test-only hook placed after the real descriptor is opened. It lets tests
    // grow or mutate the file between the pre-open check and the bounded read.
    if (typeof options.onDescriptorOpened === "function") {
      options.onDescriptorOpened(descriptor, filePath);
    }

    const afterOpen = fs.fstatSync(descriptor);
    if (!afterOpen.isFile()) {
      return { error: "opened path is not a regular file" };
    }
    if (afterOpen.size > maxFileSizeBytes) {
      return { skipped: true, reason: `too-large (${afterOpen.size} bytes)` };
    }
    if (!sameFileIdentity(before, afterOpen)) {
      return { error: "file changed during security scan" };
    }

    // Test-only hook after the descriptor and initial identity have been
    // validated, immediately before the bounded read.
    if (typeof options.beforeRead === "function") {
      options.beforeRead(descriptor, filePath);
    }

    const bounded = readBounded(descriptor, maxFileSizeBytes);
    if (bounded.overflow) {
      return {
        skipped: true,
        reason: `too-large (>${maxFileSizeBytes} bytes)`,
        bytesRead: bounded.bytesRead,
      };
    }

    const afterRead = fs.fstatSync(descriptor);
    if (!sameFileIdentity(before, afterRead)) {
      return { error: "file changed during security scan" };
    }

    return normalizeBuffer(bounded.buffer, maxFileSizeBytes);
  } catch (error) {
    if (error.code === "ELOOP") {
      return { error: "refusing to follow a symlink during security scan" };
    }
    return { error: "file could not be read" };
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
  }
}

module.exports = {
  BINARY_EXTENSIONS,
  DEFAULT_EXCLUDES,
  collectSourceFiles,
  isBinaryBuffer,
  isExcludedPath,
  normalizeRelativePath,
  readBounded,
  readSourceFile,
  toRelative,
};
