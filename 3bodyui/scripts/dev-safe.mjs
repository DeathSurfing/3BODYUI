import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

function checkLocalServer(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        method: "GET",
        timeout: 1200,
      },
      (res) => {
        // Consume response and decide quickly.
        res.resume();
        resolve(Boolean(res.statusCode));
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const port = Number(process.env.PORT ?? "3000");

  const alreadyRunning = await checkLocalServer(port);
  if (alreadyRunning) {
    console.log(
      `Dev server already running on http://localhost:${port}. Reusing existing instance.`
    );
    process.exit(0);
  }

  const lockPath = path.join(process.cwd(), "dist", "dev", "lock");
  if (existsSync(lockPath)) {
    rmSync(lockPath, { force: true });
    console.log(`Removed stale lock: ${lockPath}`);
  }

  const nextBin = path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );

  const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

void main();
