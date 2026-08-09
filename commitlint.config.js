/**
 * Commit message rules, enforced by the commit-msg hook (see lefthook.yml).
 *
 * The format these rules describe:
 *
 *   <type>(<scope>): FARM-n <subject>
 *   feat(mobile): FARM-12 add produce listing form
 *
 * Prose explanation for humans lives in CLAUDE.md. This file is the machine version of it —
 * if the two ever disagree, fix both.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],

  // Teach the parser that "FARM-12" is an issue reference, so references-empty can see it.
  parserPreset: {
    parserOpts: {
      issuePrefixes: ["FARM-"]
    }
  },

  rules: {
    // Conventional Commits, lowercase. Deliberately narrow: a long list of types is a list
    // nobody reads, and four people picking different words for the same thing is the failure
    // this prevents.
    "type-enum": [2, "always", ["feat", "fix", "chore", "refactor", "docs", "test", "ci"]],

    // The workspace the change belongs to. Optional — repo-wide changes have no scope.
    "scope-enum": [2, "always", ["mobile", "api", "shared", "repo"]],

    // Every commit must reference a Jira issue.
    //
    // Level 1 (warning), not 2 (error), until the Jira project exists — see SETUP-4. A commit
    // cannot cite FARM-1 before FARM-1 has been created, and a rule that blocks every commit on
    // day one gets disabled by the first person it inconveniences. Raise to 2 once the board is
    // live; that is the point at which a missing key actually costs traceability.
    "references-empty": [1, "never"],

    // Off, deliberately. config-conventional rejects an upper-case subject — but our format puts
    // the Jira key first, so *every* subject starts with "FARM-n" and trips it. The rule and the
    // convention cannot both hold; the convention is the one that earns marks.
    "subject-case": [0],

    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100]
  }
};
