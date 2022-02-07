const fs = require("fs");

const dependencies = JSON.parse(
  fs.readFileSync("./package-lock.json", { encoding: "utf-8" })
).dependencies;

const libs = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("-"))
  .map((lib) => `${lib}@${dependencies[lib].version}`);

const suppliedArgs = process.argv.slice(2).filter((arg) => arg.startsWith("-"));
const args = suppliedArgs.length
  ? suppliedArgs
  : ["--no-package-lock", "--no-save"];

const cp = require("child_process");
const commandLine = `npm install ${args.join(" ")} ${libs.join(" ")}`;
console.log(">", commandLine);
cp.execSync(commandLine, { stdio: "inherit" });
