import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PassThrough } from "stream";
import { EventEmitter } from "events";
vi.mock("child_process", async () => {
  const actual = await vi.importActual("child_process");
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

import * as childProcess from "child_process";
import { exec as rawExec } from "../src/utils/agent/sandbox/raw-exec.js";
import { adaptCommandForPlatform } from "../src/utils/agent/platform-commands.js";
import type { AppConfig } from "../src/utils/config.js";

describe("Windows command adaptation", () => {
  let platformSpy: ReturnType<typeof vi.spyOn>;
  const spawnMock = vi.mocked(childProcess.spawn);

  const config: AppConfig = {
    model: "test-model",
    instructions: "test-instructions",
  };

  beforeEach(() => {
    platformSpy = vi
      .spyOn(process, "platform", "get")
      .mockReturnValue("win32" as NodeJS.Platform);
    spawnMock.mockReset();
  });

  afterEach(() => {
    platformSpy.mockRestore();
  });

  it("adapts touch to a node wrapper that succeeds", async () => {
    spawnMock.mockImplementation((command, args) => {
      expect(command).toBe(process.execPath);
      expect(args[0]).toBe("-e");
      expect(args[1]).toContain("fs.openSync");
      expect(args.slice(2)).toEqual(["example.txt"]);
      return createChildProcess();
    });

    const result = await rawExec(["touch", "example.txt"], {}, config);

    expect(result.exitCode).toBe(0);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("routes rm through cmd.exe", async () => {
    const cmdPath = process.env["comspec"] || "cmd.exe";
    spawnMock.mockImplementation((command, args) => {
      expect(command).toBe(cmdPath);
      expect(args).toEqual(["/c", "del", "file.txt"]);
      return createChildProcess();
    });

    const result = await rawExec(["rm", "file.txt"], {}, config);

    expect(result.exitCode).toBe(0);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("provides shell metadata without duplicate logging", () => {
    const adaptation = adaptCommandForPlatform(["touch", "a.txt"], {
      log: false,
    });
    expect(adaptation.command[0]).toBe(process.execPath);
    expect(adaptation.requiresShell).toBe(false);
  });
});

function createChildProcess(): childProcess.ChildProcess {
  const child = new EventEmitter() as childProcess.ChildProcess;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  Object.defineProperty(child, "pid", { value: 1234 });
  Object.defineProperty(child, "killed", { value: false, writable: true });
  child.kill = vi.fn();

  queueMicrotask(() => {
    child.emit("exit", 0, null);
  });

  return child;
}
