#!/usr/bin/env node
/**
 * commit-msg hook body: lint the message git just wrote, via commitlint.
 *
 * Why a script rather than `npx commitlint --edit {1}` straight in lefthook.yml: git hands the
 * hook the path to COMMIT_EDITMSG, and from a git worktree that is an absolute path. This
 * checkout lives under `D:\Amzal Projects\`, and the space split the path into two arguments
 * however it was quoted, so no commit could be made from a worktree. Asking git for the path
 * here, and calling commitlint's entry point with an argument *array*, means no shell ever
 * re-parses it.
 */
const { execFileSync } = require("node:child_process");

const messageFile = execFileSync("git", ["rev-parse", "--git-path", "COMMIT_EDITMSG"], {
  encoding: "utf8"
}).trim();

const commitlint = require.resolve("@commitlint/cli/cli.js");

try {
  execFileSync(process.execPath, [commitlint, "--edit", messageFile, "--color"], {
    stdio: "inherit"
  });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
