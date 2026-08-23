import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readmePath = path.join(root, "README.md");
const startMarker = "<!-- repository-tree:start -->";
const endMarker = "<!-- repository-tree:end -->";
const ignored = new Set([
  ".git",
  ".env",
  ".mypy_cache",
  ".next",
  ".pnpm-store",
  ".pytest_cache",
  ".ruff_cache",
  ".turbo",
  ".uv-cache",
  ".venv",
  "__pycache__",
  "node_modules",
]);
const maxDepth = 3;

async function buildTree(directory, prefix = "", depth = 0) {
  if (depth >= maxDepth) return [];
  const names = (await readdir(directory))
    .filter((name) => !ignored.has(name) && !name.endsWith(".tsbuildinfo"))
    .sort();
  const entries = await Promise.all(
    names.map(async (name) => ({ name, directory: (await stat(path.join(directory, name))).isDirectory() })),
  );
  entries.sort(
    (left, right) => Number(right.directory) - Number(left.directory) || left.name.localeCompare(right.name),
  );

  const lines = [];
  for (const [index, entry] of entries.entries()) {
    const last = index === entries.length - 1;
    lines.push(`${prefix}${last ? "└──" : "├──"} ${entry.name}${entry.directory ? "/" : ""}`);
    if (entry.directory) {
      const childPrefix = `${prefix}${last ? "    " : "│   "}`;
      lines.push(...(await buildTree(path.join(directory, entry.name), childPrefix, depth + 1)));
    }
  }
  return lines;
}

const readme = await readFile(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) {
  throw new Error("README repository-tree markers are missing");
}

const tree = ["feed.io/", ...(await buildTree(root))].join("\n");
const block = `${startMarker}\n\`\`\`text\n${tree}\n\`\`\`\n${endMarker}`;
const updated = `${readme.slice(0, start)}${block}${readme.slice(end + endMarker.length)}`;
await writeFile(readmePath, updated);
console.log("README repository tree updated from the filesystem");
