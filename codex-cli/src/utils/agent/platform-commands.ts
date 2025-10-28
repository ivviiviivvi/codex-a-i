/**
 * Utility functions for handling platform-specific commands
 */

import { log } from "../logger/log.js";

/**
 * Map of Unix commands to their Windows equivalents
 */
interface CommandMapEntry {
  replacement: string;
  requiresShell?: boolean;
}

const COMMAND_MAP: Record<string, CommandMapEntry> = {
  ls: { replacement: "dir", requiresShell: true },
  grep: { replacement: "findstr" },
  cat: { replacement: "type", requiresShell: true },
  rm: { replacement: "del", requiresShell: true },
  cp: { replacement: "copy", requiresShell: true },
  mv: { replacement: "move", requiresShell: true },
  touch: { replacement: "echo.>", requiresShell: true },
  mkdir: { replacement: "md", requiresShell: true },
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
export interface PlatformCommandAdaptation {
  command: Array<string>;
  requiresShell: boolean;
}

export function adaptCommandForPlatform(
  command: Array<string>,
): PlatformCommandAdaptation {
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

  log(`Adapting command '${cmd}' for Windows platform`);

  // Create a new command array with the adapted command
  const adaptedCommand = [...command];
  const { replacement, requiresShell = false } = COMMAND_MAP[cmd];
  adaptedCommand[0] = replacement;

  // Adapt options if needed
  const optionsForCmd = OPTION_MAP[cmd];
  if (optionsForCmd) {
    for (let i = 1; i < adaptedCommand.length; i++) {
      const option = adaptedCommand[i];
      if (option && optionsForCmd[option]) {
        adaptedCommand[i] = optionsForCmd[option];
      }
    }
  }

  log(`Adapted command: ${adaptedCommand.join(" ")}`);

  return { command: adaptedCommand, requiresShell };
}
