import type { AppConfig } from "../src/utils/config.js";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rawExecMock = vi.fn(async () => ({
  stdout: "",
  stderr: "",
  exitCode: 0,
}));

vi.mock("../src/utils/agent/sandbox/raw-exec.js", () => ({
  exec: rawExecMock,
}));

describe("Windows command adaptation", () => {
  let platformSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    rawExecMock.mockClear();
  });

  afterEach(() => {
    platformSpy?.mockRestore();
    platformSpy = undefined;
  });

  async function importExecModule() {
    vi.resetModules();
    platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    const execModule = await import("../src/utils/agent/exec.js");
    const { SandboxType } = await import(
      "../src/utils/agent/sandbox/interface.js"
    );

    return { execModule, SandboxType };
  }

  it("routes ls through the Windows shell", async () => {
    const { execModule, SandboxType } = await importExecModule();

    await execModule.exec(
      {
        cmd: ["ls"],
        workdir: undefined,
        timeoutInMillis: undefined,
        additionalWritableRoots: [],
      },
      SandboxType.NONE,
      {} as AppConfig,
    );

    expect(rawExecMock).toHaveBeenCalledTimes(1);
    const call = rawExecMock.mock.calls[0];
    const options = call[1];
    const adaptation = call[4];

    expect(options.shell).toBe(true);
    expect(adaptation?.command[0]).toBe("dir");
    expect(adaptation?.requiresShell).toBe(true);
  });

  it("routes touch through the Windows shell", async () => {
    const { execModule, SandboxType } = await importExecModule();

    await execModule.exec(
      {
        cmd: ["touch", "example.txt"],
        workdir: undefined,
        timeoutInMillis: undefined,
        additionalWritableRoots: [],
      },
      SandboxType.NONE,
      {} as AppConfig,
    );

    expect(rawExecMock).toHaveBeenCalledTimes(1);
    const call = rawExecMock.mock.calls[0];
    const options = call[1];
    const adaptation = call[4];

    expect(options.shell).toBe(true);
    expect(adaptation?.command[0]).toBe("echo.>");
    expect(adaptation?.requiresShell).toBe(true);
  });
});
