import { describe, expect, test, vi } from "vitest";

import { adaptCommandForPlatform } from "../src/utils/agent/platform-commands";

describe("adaptCommandForPlatform", () => {
  test("ls -l does not pause for input on Windows", () => {
    const platformSpy = vi
      .spyOn(process, "platform", "get")
      .mockReturnValue("win32");

    try {
      const adapted = adaptCommandForPlatform(["ls", "-l"]);
      expect(adapted).toEqual(["dir", "/q"]);
      expect(adapted).not.toContain("/p");
    } finally {
      platformSpy.mockRestore();
    }
  });
});
