const patch = require("../patch");

function run(step, context) {
  const result = patch.runChecks();
  return result;
}

module.exports = { run };
