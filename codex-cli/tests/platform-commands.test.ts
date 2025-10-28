import { afterEach, describe, expect, it, vi } from "vitest";

import { adaptCommandForPlatform } from "../src/utils/agent/platform-commands.js";

describe("adaptCommandForPlatform on Windows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not paginate when adapting 'ls -l'", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    const adapted = adaptCommandForPlatform(["ls", "-l"]);

    expect(adapted[0]).toBe("dir");
    expect(adapted).not.toContain("/p");
    expect(adapted).toContain("/n");
  });
});
