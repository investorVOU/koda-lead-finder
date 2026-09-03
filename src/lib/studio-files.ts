export type StudioFile = {
  path: string;
  content: string;
  language?: string;
};

export type StudioFileMap = Record<string, string>;

const MAX_FILES = 100;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_PROJECT_BYTES = 2 * 1024 * 1024;

export function inferFileLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  return (
    {
      html: "html",
      htm: "html",
      css: "css",
      js: "javascript",
      mjs: "javascript",
      ts: "typescript",
      tsx: "typescript",
      jsx: "javascript",
      json: "json",
      md: "markdown",
      txt: "plaintext",
      svg: "xml",
    }[extension ?? ""] ?? "plaintext"
  );
}

export function isSafeStudioPath(path: string): boolean {
  if (!path || path.length > 240 || path.includes("\0") || path.includes("\\")) return false;
  if (path.startsWith("/") || /^[A-Za-z]:\//.test(path)) return false;
  const parts = path.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

export function normalizeStudioFiles(input: unknown): StudioFile[] {
  const legacyMap = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  const candidates: unknown[] = Array.isArray(input)
    ? input
    : Array.isArray((input as { files?: unknown[] } | null)?.files)
      ? (input as { files: unknown[] }).files
      : legacyMap
        ? Object.entries(legacyMap).map(([path, content]) => ({ path, content }))
        : [];

  if (candidates.length > MAX_FILES) throw new Error("A Studio project can contain at most 100 files.");

  let totalBytes = 0;
  const seen = new Set<string>();
  const files = candidates.map((candidate) => {
    if (!candidate || typeof candidate !== "object") throw new Error("Invalid project file.");
    const { path, content, language } = candidate as Partial<StudioFile>;
    if (typeof path !== "string" || !isSafeStudioPath(path)) throw new Error(`Unsafe file path: ${String(path)}`);
    if (typeof content !== "string") throw new Error(`Invalid content for ${path}.`);
    if (seen.has(path)) throw new Error(`Duplicate file path: ${path}.`);
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_FILE_BYTES) throw new Error(`${path} is too large.`);
    totalBytes += bytes;
    seen.add(path);
    return { path, content, language: typeof language === "string" ? language : inferFileLanguage(path) };
  });

  if (totalBytes > MAX_PROJECT_BYTES) throw new Error("Project files are too large.");
  return files;
}

export function parseStudioFiles(filesJson: string | null | undefined): StudioFile[] {
  if (!filesJson) return [];
  try {
    return normalizeStudioFiles(JSON.parse(filesJson));
  } catch {
    return [];
  }
}

export function serializeStudioFiles(files: StudioFile[]): string {
  return JSON.stringify({ version: 1, files: normalizeStudioFiles(files) });
}

export function toStudioFileMap(files: StudioFile[]): StudioFileMap {
  return Object.fromEntries(files.map((file) => [file.path, file.content]));
}

export function fromStudioFileMap(files: StudioFileMap): StudioFile[] {
  return normalizeStudioFiles(files);
}

export type StudioFileChange = {
  path: string;
  action: "create" | "update" | "delete";
  content?: string;
  language?: string;
};

export function applyStudioFileChanges(current: StudioFile[], changes: StudioFileChange[]): StudioFile[] {
  const next = new Map(current.map((file) => [file.path, file]));
  for (const change of changes) {
    if (!isSafeStudioPath(change.path)) throw new Error(`Unsafe file path: ${change.path}`);
    if (change.action === "delete") {
      next.delete(change.path);
      continue;
    }
    if (typeof change.content !== "string") throw new Error(`Missing content for ${change.path}.`);
    next.set(change.path, {
      path: change.path,
      content: change.content,
      language: change.language ?? inferFileLanguage(change.path),
    });
  }
  return normalizeStudioFiles([...next.values()]);
}
