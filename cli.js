#!/usr/bin/env node

const path = require("path");

// Set root before anything else
const root = path.resolve(__dirname);
process.env.DEVOS_ROOT = root;

const DEVOS = require("./agent/config");
const log = require("./agent/logger").get();

const commands = {
  run: {
    description: "Run the DevOS agent pipeline with a task",
    handler: (args) => {
      const task = args.join(" ") || "analyze project";
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(` \x1b[1mTask:\x1b[0m ${task}`);
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");

      const pipeline = require("./agent/pipeline/index");

      const stages = ["Planning", "Executing", "Validating", "Completed"];
      for (const s of stages) console.log(`   \x1b[33m◐\x1b[0m ${s}...`);
      console.log("");

      const result = pipeline.run(task);

      console.log("");
      if (result) {
        console.log("   \x1b[32m✓\x1b[0m Planning    \x1b[32mdone\x1b[0m");
        console.log("   \x1b[32m✓\x1b[0m Executing   \x1b[32mdone\x1b[0m");
        console.log("   \x1b[32m✓\x1b[0m Validating  \x1b[32mdone\x1b[0m");
        console.log("   \x1b[32m✓\x1b[0m Completed   \x1b[32mdone\x1b[0m");
      } else {
        console.log("   \x1b[31m✗\x1b[0m Pipeline    \x1b[31mfailed\x1b[0m");
      }
      console.log("");
    }
  },
  doctor: {
    description: "Run environment health checks",
    handler: () => {
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(" \x1b[1mRunning environment health checks...\x1b[0m");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log("");

      const result = require("./agent/tools").run("doctor");

      if (result && result.checks) {
        for (const c of result.checks) {
          if (c.status === "ok") {
            console.log(`   \x1b[32m✓\x1b[0m ${c.name}: \x1b[36m${c.version}\x1b[0m`);
          } else {
            console.log(`   \x1b[31m✗\x1b[0m ${c.name}: \x1b[31mmissing\x1b[0m`);
          }
        }
      }

      console.log("");
      console.log(` \x1b[1mResult:\x1b[0m ${result && result.ok ? "\x1b[32m✓ All checks passed\x1b[0m" : "\x1b[31m✗ Some checks failed\x1b[0m"}`);
      console.log("");
    }
  },
  validate: {
    description: "Run all validators on the current workspace",
    handler: () => {
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(" \x1b[1mValidating workspace...\x1b[0m");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");

      const names = ["syntax", "git", "node", "lint"];
      console.log("");
      for (const n of names) console.log(`   \x1b[33m◐\x1b[0m ${n}`);
      console.log("");

      const report = require("./agent/validator/index").validate({ modifiedFiles: [] });

      console.log(` \x1b[1mValidation summary:\x1b[0m`);
      console.log(`   Passed:  \x1b[32m${report.summary.passed}\x1b[0m`);
      console.log(`   Failed:  \x1b[31m${report.summary.failed}\x1b[0m`);
      console.log(`   Skipped: \x1b[33m${report.summary.skipped}\x1b[0m`);
      console.log("");
    }
  },
  rollback: {
    description: "Roll back the workspace to the last clean state",
    handler: () => {
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(" \x1b[1mRolling back workspace...\x1b[0m");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log("   \x1b[33m◐\x1b[0m git reset --hard");
      console.log("   \x1b[33m◐\x1b[0m git clean -fd");

      try {
        require("./agent/workspace").rollback();
        console.log("");
        console.log("   \x1b[32m✓\x1b[0m git reset --hard \x1b[32mdone\x1b[0m");
        console.log("   \x1b[32m✓\x1b[0m git clean -fd   \x1b[32mdone\x1b[0m");
        console.log("");
        console.log(" \x1b[32m✓ Workspace rolled back to last clean state\x1b[0m");
      } catch (e) {
        console.log("");
        console.log("   \x1b[31m✗\x1b[0m Rollback failed: \x1b[31m" + e.message + "\x1b[0m");
      }
      console.log("");
    }
  },
  config: {
    description: "Show the current DevOS configuration",
    handler: () => {
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(" \x1b[1mDevOS Configuration\x1b[0m");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(JSON.stringify(DEVOS.config, null, 2));
      console.log("");
    }
  },
  help: {
    description: "Show this help message",
    handler: () => {
      console.log("");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log(" \x1b[1mDevOS CLI Commands\x1b[0m");
      console.log("\x1b[36m═══════════════════════════════════════════\x1b[0m");
      console.log("");
      for (const [name, { description }] of Object.entries(commands)) {
        console.log(`   \x1b[36mnode cli.js\x1b[0m \x1b[1m${name.padEnd(10)}\x1b[0m - ${description}`);
      }
      console.log("");
    }
  }
};

function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || !commands[command]) {
    commands.help.handler();
    return;
  }

  try {
    commands[command].handler(args);
  } catch (e) {
    log.error(`Command failed: ${e.message}`, "CLI");
    process.exit(1);
  }
}

main();
