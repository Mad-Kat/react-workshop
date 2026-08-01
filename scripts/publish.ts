#!/usr/bin/env node
/**
 * Publish workshop material from `dev` to the participant branch `main`.
 *
 *   node scripts/publish.ts 02            release the exercise (start of session)
 *   node scripts/publish.ts 02 --reveal   release guide.md + solution (after it)
 *   node scripts/publish.ts 02 --push     ... and push to origin
 *
 * `main` has its own history and only ever contains released material.
 * Nothing is pushed unless you pass --push.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SRC = "dev";
const WORKTREE = ".publish-main";

/** Run git and return stdout, trimmed. Throws if git exits non-zero. */
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** Raw bytes of a file as it exists on the source branch, no trailing-newline fixups. */
function gitShow(path: string): Buffer {
  return execFileSync("git", ["show", `${SRC}:${path}`], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function existsOnSrc(path: string): boolean {
  try {
    git(["cat-file", "-e", `${SRC}:${path}`]);
    return true;
  } catch {
    return false;
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

process.chdir(git(["rev-parse", "--show-toplevel"]));

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const [exercise, ...flags] = process.argv.slice(2);

if (!exercise || !/^\d{2}$/.test(exercise)) {
  fail("usage: node scripts/publish.ts NN [--reveal] [--push]   (NN = 01..12)");
}

for (const flag of flags) {
  if (flag !== "--reveal" && flag !== "--push") fail(`unknown flag: ${flag}`);
}

const reveal = flags.includes("--reveal");
const push = flags.includes("--push");

const dir = git(["ls-tree", "-d", "--name-only", SRC, "exercises/"])
  .split("\n")
  .find((path) => path.startsWith(`exercises/${exercise}-`));

if (!dir) fail(`no exercise directory for '${exercise}' on ${SRC}`);

// ---------------------------------------------------------------------------
// What to copy
// ---------------------------------------------------------------------------

/** Exercise name from the curriculum table in the README, e.g. "State Shape & Derived State". */
function exerciseTitle(): string | undefined {
  for (const line of git(["show", `${SRC}:README.md`]).split("\n")) {
    const cells = line.split("|");
    if (cells[1]?.trim() === exercise) return cells[2]?.trim();
  }
  return undefined;
}

const files: string[] = [];
let message: string;

if (reveal) {
  files.push(`${dir}/guide.md`, `${dir}/solution.tsx`, `src/wrappers/${exercise}-solution.tsx`);
  message = `Exercise ${exercise}: guide + solution`;
} else {
  // Everything in the exercise directory except the solution and the guide
  // (so exercise.tsx, plus support files like 04's api.ts).
  for (const path of git(["ls-tree", "-r", "--name-only", SRC, `${dir}/`]).split("\n")) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (name !== "solution.tsx" && name !== "guide.md") files.push(path);
  }
  files.push(`src/wrappers/${exercise}.tsx`);

  const title = exerciseTitle();
  message = `Exercise ${exercise}${title ? `: ${title}` : ""}`;
}

for (const file of files) {
  if (!existsOnSrc(file)) fail(`missing on ${SRC}: ${file}`);
}

// Scaffolding fixes made on dev should reach participants too.
files.push(
  "src/App.tsx",
  "src/main.tsx",
  "index.html",
  ".devcontainer.json",
  "package.json",
  "package-lock.json",
);

// ---------------------------------------------------------------------------
// Commit onto main, via a worktree so you never leave dev
// ---------------------------------------------------------------------------

git(["worktree", "add", "-f", WORKTREE, "main"]);

try {
  for (const file of files) {
    const target = join(WORKTREE, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, gitShow(file));
  }

  // Instructor-only tooling stays on dev. oxfmt ships native binaries that
  // StackBlitz's WebContainers can't execute anyway, and participants never
  // format the exercises — so strip it from what they install.
  const manifestPath = join(WORKTREE, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  delete manifest.devDependencies?.oxfmt;
  delete manifest.devDependencies?.["@types/node"];
  delete manifest.scripts?.format;
  delete manifest.scripts?.["format:check"];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (!git(["-C", WORKTREE, "status", "--porcelain"])) {
    console.log("nothing to publish — main already has this.");
  } else {
    git(["-C", WORKTREE, "add", "-A"]);
    console.log(git(["-C", WORKTREE, "status", "--short"]));
    git(["-C", WORKTREE, "commit", "-q", "-m", message]);
    console.log(`\ncommitted on main: ${message}`);

    if (push) {
      console.log(git(["-C", WORKTREE, "push", "origin", "main"]));
    } else {
      console.log("review with:  git log -p main -1");
      console.log("then push:    git push origin main");
    }
  }
} finally {
  git(["worktree", "remove", "--force", WORKTREE]);
}
