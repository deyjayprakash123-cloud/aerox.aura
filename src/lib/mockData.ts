// @ts-nocheck

export interface DataNode {
  id: string;
  label: string;
  path: string;        // full path in repo
  extension: string;   // file extension
  x: number;
  y: number;
  z: number;
  value: number;       // raw file size (bytes)
  complexity: number;  // derived
  healthScalar: number; // 0–1
  isDebt: boolean;
  folder_depth: number;
  lines_of_code: number; // estimated
}

export interface TemporalData {
  timestamp: string;
  repoName: string;
  nodes: DataNode[];
  systemHealth: number;
  totalFiles: number;
  totalSize: number; // bytes
}

// ─────────────────────────────────────────────────────────────────
// File extension → language weight (higher = more complex)
// ─────────────────────────────────────────────────────────────────
const LANG_WEIGHT: Record<string, number> = {
  ts: 1.4, tsx: 1.5, js: 1.2, jsx: 1.3,
  py: 1.3, rs: 1.6, go: 1.3, cpp: 1.8,
  c: 1.7, java: 1.5, kt: 1.4, swift: 1.4,
  cs: 1.5, rb: 1.1, php: 1.1, vue: 1.3,
  svelte: 1.3, sql: 1.0, sh: 0.9,
  // Config / data files — low complexity
  json: 0.5, yaml: 0.5, yml: 0.5, toml: 0.5,
  md: 0.3, txt: 0.2, env: 0.3,
  // Binary / assets — filter these out
  png: 0, jpg: 0, jpeg: 0, gif: 0, svg: 0,
  ico: 0, woff: 0, woff2: 0, ttf: 0, eot: 0,
  mp4: 0, mp3: 0, webp: 0, pdf: 0,
  zip: 0, tar: 0, gz: 0, bz2: 0, xz: 0, rar: 0,
  // Compiled / generated / binary runtime files
  wasm: 0, bin: 0, exe: 0, dll: 0, so: 0, dylib: 0,
  pyc: 0, pyd: 0, class: 0, o: 0, a: 0, lib: 0,
  // Lockfiles / generated maps (large but not code to inspect)
  lock: 0, map: 0,
  // Misc
  bak: 0, log: 0, cache: 0, tmp: 0,
};

function isBinaryOrAsset(ext: string): boolean {
  return ext in LANG_WEIGHT && LANG_WEIGHT[ext] === 0;
}

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// ─────────────────────────────────────────────────────────────────
// Health scalar — the real logic
// Inputs: file size (bytes), depth, language weight
// Returns 0–1 (0 = critical debt, 1 = perfect)
// ─────────────────────────────────────────────────────────────────
function computeHealth(sizeBytes: number, depth: number, langWeight: number): number {
  // LOC estimate: ~50 bytes per line average for code
  const loc = Math.max(1, Math.round(sizeBytes / 50));

  // Size penalty: files over 300 LOC start losing health
  // files over 1000 LOC are debt territory
  const sizePenalty = loc < 100  ? 0
                    : loc < 300  ? (loc - 100) / 200 * 0.2
                    : loc < 600  ? 0.2 + (loc - 300) / 300 * 0.3
                    : loc < 1000 ? 0.5 + (loc - 600) / 400 * 0.3
                    :              0.8 + Math.min(0.2, (loc - 1000) / 2000 * 0.2);

  // Depth penalty: deeply nested files suggest bad architecture
  const depthPenalty = depth <= 2 ? 0
                     : depth <= 4 ? (depth - 2) * 0.05
                     : depth <= 6 ? 0.1 + (depth - 4) * 0.08
                     :              0.26 + (depth - 6) * 0.05;

  // Lang complexity multiplier: C++ code is harder than JSON
  const langMultiplier = langWeight > 0 ? Math.min(1, (langWeight - 0.2) / 1.6) : 0;
  const complexityBoost = langMultiplier * 0.15;

  const totalPenalty = Math.min(0.95, sizePenalty + depthPenalty + complexityBoost);
  return Math.max(0.05, 1 - totalPenalty);
}

// ─────────────────────────────────────────────────────────────────
// Layout: spiral layout so nodes fill 3D space nicely
// ─────────────────────────────────────────────────────────────────
function spiralPosition(i: number, total: number): { x: number; z: number } {
  // Golden angle spiral — evenly distributes points
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = i * goldenAngle;
  // Radius grows with i, creating rings
  const minR = 8, maxR = 65;
  const r = minR + (maxR - minR) * Math.sqrt(i / Math.max(total - 1, 1));
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
  };
}

// ─────────────────────────────────────────────────────────────────
// Parse GitHub tree → DataNode[]
// ─────────────────────────────────────────────────────────────────
export function parseGitHubTree(tree: any[], repoName = 'repo'): DataNode[] {
  // Filter: only code files (blobs), skip binaries/assets
  const codeFiles = tree.filter(item => {
    if (item.type !== 'blob') return false;
    const ext = getExtension(item.path.split('/').pop() || '');
    return !isBinaryOrAsset(ext);
  });

  // Sort by size desc so largest files get rendered first (more impactful)
  codeFiles.sort((a, b) => (b.size || 0) - (a.size || 0));

  // Cap at 150 most significant files
  const files = codeFiles.slice(0, 150);
  const total = files.length;

  return files.map((item, i) => {
    const pathParts = item.path.split('/');
    const filename = pathParts[pathParts.length - 1];
    const ext = getExtension(filename);
    const depth = pathParts.length; // 1 = root, 2 = one folder deep, etc.
    const sizeBytes = item.size || 0;
    const loc = Math.max(1, Math.round(sizeBytes / 50));
    const langWeight = LANG_WEIGHT[ext] ?? 1.0;
    const health = computeHealth(sizeBytes, depth, langWeight);
    const complexity = (1 - health) * 10 * langWeight;
    const pos = spiralPosition(i, total);

    return {
      id: item.sha || `node-${i}`,
      label: filename,
      path: item.path,
      extension: ext,
      x: pos.x,
      y: 0,
      z: pos.z,
      value: sizeBytes,
      complexity: parseFloat(complexity.toFixed(2)),
      healthScalar: parseFloat(health.toFixed(3)),
      isDebt: health < 0.35,
      folder_depth: depth,
      lines_of_code: loc,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Parse uploaded JSON → DataNode[]
// ─────────────────────────────────────────────────────────────────
export function parseJsonUpload(raw: any): DataNode[] {
  const arr = Array.isArray(raw) ? raw : (raw.nodes || raw.files || raw.data || []);
  const total = Math.min(arr.length, 150);

  return arr.slice(0, 150).map((item: any, i: number) => {
    const rawHealth = item.health ?? item.healthScalar ?? item.health_score;
    const health = rawHealth != null
      ? Math.max(0, Math.min(1, Number(rawHealth)))
      : computeHealth(item.size ?? item.lines_of_code * 50 ?? 5000, item.depth ?? item.folder_depth ?? 3, 1.0);

    const pos = spiralPosition(i, total);
    const ext = getExtension(item.name || item.label || item.file || '');
    const loc = item.lines_of_code ?? item.loc ?? (item.size ? Math.round(item.size / 50) : 200);

    return {
      id: String(item.id || `node-${i}`),
      label: item.label || item.name || item.file || `node_${i}`,
      path: item.path || item.label || `node_${i}`,
      extension: ext,
      x: item.x ?? pos.x,
      y: 0,
      z: item.z ?? pos.z,
      value: item.value ?? item.size ?? loc * 50,
      complexity: parseFloat((item.complexity ?? (1 - health) * 10).toFixed(2)),
      healthScalar: parseFloat(health.toFixed(3)),
      isDebt: health < 0.35,
      folder_depth: item.folder_depth ?? item.depth ?? 3,
      lines_of_code: loc,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Mock data (procedural, seeded)
// ─────────────────────────────────────────────────────────────────
const seededRng = (seed: number) => {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
};

const MOCK_FILES = [
  'main.py','index.ts','app.tsx','utils.js','api.go','router.rs','schema.sql',
  'config.yaml','parser.cpp','handler.java','service.kt','types.d.ts',
  'middleware.ts','auth.py','db.ts','store.ts','reducer.ts','worker.js',
  'pipeline.py','engine.rs','helpers.ts','models.py','resolvers.ts',
  'queries.sql','hooks.ts','context.tsx','layout.tsx','page.tsx',
];

export function generateData(nodeCount = 120, historySteps = 8): TemporalData[] {
  return Array.from({ length: historySteps }, (_, step) => {
    const rng = seededRng(step * 9973 + 31337);
    const total = nodeCount;
    const nodes: DataNode[] = Array.from({ length: nodeCount }, (__, i) => {
      const depth = Math.floor(rng() * 6) + 1;
      const sizeBytes = Math.floor(rng() * 80000) + 500;
      const loc = Math.round(sizeBytes / 50);
      const ext = MOCK_FILES[i % MOCK_FILES.length].split('.').pop() || 'ts';
      const langWeight = LANG_WEIGHT[ext] ?? 1.0;
      const rawHealth = Math.max(0, Math.min(1, computeHealth(sizeBytes, depth, langWeight)));
      // Slightly improve health over time (refactoring effect)
      const health = Math.min(1, rawHealth + step * 0.01);
      const pos = spiralPosition(i, total);

      return {
        id: `node-${step}-${i}`,
        label: MOCK_FILES[i % MOCK_FILES.length],
        path: `src/module_${Math.floor(i / 8)}/${MOCK_FILES[i % MOCK_FILES.length]}`,
        extension: ext,
        x: pos.x,
        y: 0,
        z: pos.z,
        value: sizeBytes,
        complexity: parseFloat(((1 - health) * 10 * langWeight).toFixed(2)),
        healthScalar: parseFloat(health.toFixed(3)),
        isDebt: health < 0.35,
        folder_depth: depth,
        lines_of_code: loc,
      };
    });

    const health = nodes.reduce((a, n) => a + n.healthScalar, 0) / nodes.length;
    const date = new Date(Date.now() - (historySteps - step) * 7 * 24 * 3600 * 1000);
    return {
      timestamp: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      repoName: 'aerox.demo',
      nodes,
      systemHealth: parseFloat(health.toFixed(3)),
      totalFiles: nodeCount,
      totalSize: nodes.reduce((a, n) => a + n.value, 0),
    };
  });
}
