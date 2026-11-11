const DEVOS = require("../config");

function rankFile(file) {
  const name = file.toLowerCase();

  let score = 0;

  if (name.includes("index")) score += 10;
  if (name.endsWith(".ts")) score += 8;
  if (name.endsWith(".js")) score += 6;
  if (name.endsWith(".json")) score += 4;
  if (name.endsWith(".ps1")) score += 3;

  if (name === "/package.json") score += 12;
  if (name === "/readme.md") score += 8;
  if (name.includes("tsconfig") || name.includes("jsconfig")) score += 7;
  if (name.includes("vite.config") || name.includes("next.config")) score += 7;
  if (name.includes(".eslint") || name.includes("eslintrc")) score += 6;
  if (name.includes("docker") || name.includes("dockerfile")) score += 6;
  if (name.includes(".github") || name.includes("gitlab-ci") || name.includes("workflows")) score += 5;
  if (name.includes(".prettier") || name.includes("stylelint")) score += 4;

  return score;
}

module.exports = { rankFile };
