const out = require("../output");
const github = require("../../github/index");

async function handler(args) {
  const sub = args[0];

  if (sub === "review") {
    const prNum = parseInt(args[1], 10);
    if (!prNum) {
      out.error("Usage: node cli.js pr review <pr-number>");
      return;
    }
    const repo = github.getRepoFromGit();
    if (!repo) {
      out.error("Not in a GitHub repository");
      return;
    }
    out.banner(`Reviewing PR #${prNum}`);
    const review = await github.reviewPR(repo.owner, repo.repo, prNum);
    if (!review) {
      out.error("Failed to fetch PR");
      return;
    }
    out.status("ok", "ok", review.title);
    out.status("info", "ok", `Author: ${review.author}`);
    out.status("info", "ok", `Changes: ${review.changes.files} files, ${review.changes.additions}+ ${review.changes.deletions}-`);
    out.status("info", "ok", `Score: ${(review.score * 100).toFixed(0)}%`);
    if (review.issues.length > 0) {
      for (const issue of review.issues) out.warn(issue);
    }
    out.status("info", "ok", `URL: ${review.url}`);
    out.divider();
    out.info(`Files changed (${review.files.length}):`);
    for (const f of review.files.slice(0, 20)) {
      out.status(f.status === "added" ? "ok" : "info", f.status === "added" ? "ok" : "info", `${f.filename} (${f.additions}+ / ${f.deletions}-)`);
    }
    out.info(`Reviews (${review.reviews.length}):`);
    for (const r of review.reviews.slice(0, 10)) {
      out.status(r.state === "APPROVED" ? "ok" : "info", r.state === "APPROVED" ? "ok" : "info", `${r.author}: ${r.state}`);
    }
    return;
  }

  if (sub === "create") {
    const title = args.slice(1).join(" ");
    if (!title) {
      out.error("Usage: node cli.js pr create <title>");
      return;
    }
    const repo = github.getRepoFromGit();
    if (!repo) {
      out.error("Not in a GitHub repository");
      return;
    }
    const head = args.find(a => a.startsWith("--head="))?.replace("--head=", "") || "HEAD";
    const base = args.find(a => a.startsWith("--base="))?.replace("--base=", "") || "main";
    out.banner("Creating Pull Request");
    out.status("running", "running", `Title: ${title}`);
    out.status("running", "running", `Head: ${head} → Base: ${base}`);
    const result = await github.createPR(repo.owner, repo.repo, title, "", head, base);
    if (result.error) {
      out.error(`Failed: ${result.message}`);
      return;
    }
    out.success(`PR #${result.number} created`);
    out.status("info", "ok", `URL: ${result.url}`);
    return;
  }

  out.error("Unknown subcommand. Available: review, create");
}

module.exports = { handler, description: "GitHub PR operations (review, create)" };
