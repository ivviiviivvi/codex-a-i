/**
 * Utility functions for handling platform-specific commands
 */

import { log } from "../logger/log.js";

export interface AdaptedCommand {
  command: Array<string>;
  requiresShell: boolean;
}

export interface AdaptCommandOptions {
  log?: boolean;
}

/**
 * Map of Unix commands to their Windows equivalents
 */
const COMMAND_MAP: Record<string, string> = {
  ls: "dir",
  grep: "findstr",
  cat: "type",
  rm: "del",
  cp: "copy",
  mv: "move",
  touch: "touch",
  mkdir: "md",
};

/**
 * Map of common Unix command options to their Windows equivalents
 */
const OPTION_MAP: Record<string, Record<string, string>> = {
  ls: {
    "-l": "/p",
    "-a": "/a",
    "-R": "/s",
  },
  grep: {
    "-i": "/i",
    "-r": "/s",
  },
};

/**
 * Adapts a command for the current platform.
 * On Windows, this will translate Unix commands to their Windows equivalents.
 * On Unix-like systems, this will return the original command.
 *
 * @param command The command array to adapt
 * @returns The adapted command array
 */
export function adaptCommandForPlatform(
  command: Array<string>,
  options?: AdaptCommandOptions,
): AdaptedCommand {
  // If not on Windows, return the original command
  if (process.platform !== "win32") {
    return { command, requiresShell: false };
  }

  // Nothing to adapt if the command is empty
  if (command.length === 0) {
    return { command, requiresShell: false };
  }

  const cmd = command[0];

  // If cmd is undefined or the command doesn't need adaptation, return it as is
  if (!cmd || !COMMAND_MAP[cmd]) {
    return { command, requiresShell: false };
  }

  if (options?.log !== false) {
    log(`Adapting command '${cmd}' for Windows platform`);
  }

  // Create a new command array with the adapted command
  const adapted = adaptWindowsCommand(cmd, command.slice(1));

  if (options?.log !== false) {
    log(`Adapted command: ${adapted.command.join(" ")}`);
  }

  return adapted;
}

function adaptWindowsCommand(
  commandName: string,
  args: Array<string>,
): AdaptedCommand {
  const cmdExe = process.env["comspec"] || "cmd.exe";

  switch (commandName) {
    case "ls":
    case "cat":
    case "rm":
    case "cp":
    case "mv":
    case "mkdir": {
      const mapped = mapOptions(commandName, args);
      const windowsCommand = COMMAND_MAP[commandName]!;
      return {
        command: [cmdExe, "/c", windowsCommand, ...mapped],
        requiresShell: false,
      };
    }
    case "grep": {
      const mapped = mapOptions(commandName, args);
      return {
        command: ["findstr", ...mapped],
        requiresShell: false,
      };
    }
    case "touch": {
      return {
        command: [process.execPath, "-e", createTouchScript(), ...args],
        requiresShell: false,
      };
    }
    default: {
      return { command: [commandName, ...args], requiresShell: false };
    }
  }
}

function mapOptions(commandName: string, args: Array<string>): Array<string> {
  const optionsForCmd = OPTION_MAP[commandName];
  if (!optionsForCmd) {
    return args;
  }

  return args.map((arg) => optionsForCmd[arg] ?? arg);
}

function createTouchScript(): string {
  return `
const fs = require("fs");
const args = process.argv.slice(3);
const now = new Date();
let exitCode = 0;
for (const file of args) {
  try {
    const fd = fs.openSync(file, "a");
    fs.closeSync(fd);
    fs.utimesSync(file, now, now);
  } catch (error) {
    exitCode = 1;
    const message = error && typeof error === "object" && "message" in error
      ? error.message
      : String(error);
    console.error(message);
  }
}
process.exit(exitCode);
`.trim();
}
