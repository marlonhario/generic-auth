import { runCli } from "./cli/run-cli";

process.exitCode = await runCli(process.argv.slice(2));
