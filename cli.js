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
      require("./agent/pipeline/index").run(task);
    }
  },
  doctor: {
    description: "Run environment health checks",
    handler: () => {
      require("./agent/tools").run("doctor");
    }
  },
  validate: {
    description: "Run all validators on the current workspace",
    handler: () => {
      const report = require("./agent/validator/index").validate({ modifiedFiles: [] });
      log.info(`Validation finished: ${report.summary.passed} passed, ${report.summary.failed} failed`, "CLI");
    }
  },
  rollback: {
    description: "Roll back the workspace to the last clean state",
    handler: () => {
      require("./agent/workspace").rollback();
      log.info("Workspace rolled back", "CLI");
    }
  },
  config: {
    description: "Show the current DevOS configuration",
    handler: () => {
      console.log(JSON.stringify(DEVOS.config, null, 2));
    }
  },
  help: {
    description: "Show this help message",
    handler: () => {
      log.info("DevOS CLI Commands:", "CLI");
      for (const [name, { description }] of Object.entries(commands)) {
        console.log(`  devos ${name.padEnd(10)} - ${description}`);
      }
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
