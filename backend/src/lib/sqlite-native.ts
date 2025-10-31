import fs from "node:fs";
import path from "node:path";

let prepared = false;
const processWithPkg = process as NodeJS.Process & { pkg?: unknown };

const getArchBindingDir = () => `node-v${process.versions.modules}-${process.platform}-${process.arch}`;

const resolveSourceBinding = () => {
  const sqlitePkgPath = require.resolve("sqlite3/package.json");
  const sqliteRoot = path.dirname(sqlitePkgPath);
  const archDir = getArchBindingDir();

  const bindingBase = path.join(sqliteRoot, "lib", "binding");
  if (fs.existsSync(bindingBase)) {
    const explicitArchPath = path.join(bindingBase, archDir, "node_sqlite3.node");
    if (fs.existsSync(explicitArchPath)) {
      return { source: explicitArchPath, archDir };
    }

    const entries = fs.readdirSync(bindingBase);
    for (const entry of entries) {
      const candidate = path.join(bindingBase, entry, "node_sqlite3.node");
      if (fs.existsSync(candidate)) {
        return { source: candidate, archDir: entry };
      }
    }
  }

  const fallback = path.join(sqliteRoot, "build", "Release", "node_sqlite3.node");
  if (fs.existsSync(fallback)) {
    return { source: fallback, archDir };
  }

  throw new Error(
    `SQLite native binding not found at expected paths under ${sqliteRoot}. Make sure pkg assets include the sqlite3 binary.`,
  );
};

const ensureBindingFile = () => {
  const { source, archDir } = resolveSourceBinding();
  const execDir = path.dirname(process.execPath);
  const targetDir = path.join(execDir, "sqlite3", archDir);
  const target = path.join(targetDir, "node_sqlite3.node");

  if (!fs.existsSync(target)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(source, target);
  }

  process.env.NODE_SQLITE3_BINARY_DIR = targetDir;
  return target;
};

export function prepareSqliteNativeBinding() {
  if (!processWithPkg.pkg || prepared) {
    return;
  }

  ensureBindingFile();
  prepared = true;
}
