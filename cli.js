#!/usr/bin/env node

const path = require("path");

const root = path.resolve(__dirname);
process.env.DEVOS_ROOT = root;

require("./agent/config");
require("./agent/cli/index").run(process.argv.slice(2));
