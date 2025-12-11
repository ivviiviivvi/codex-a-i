import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  crawlForSopFiles,
  crawlForSopFilesSync,
  type SopCrawlerOptions,
} from "../src/utils/sop-crawler";

vi.mock("fs");

describe("SOP Crawler", () => {
  const mockFs = fs as unknown as {
    promises: {
      readdir: ReturnType<typeof vi.fn>;
      stat: ReturnType<typeof vi.fn>;
    };
    readdirSync: ReturnType<typeof vi.fn>;
    statSync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("crawlForSopFiles (async)", () => {
    it("should find files with default SOP keywords", async () => {
      // Mock file system structure
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root directory
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // sop-guide.md
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // process-doc.txt
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // readme.md

      mockFs.promises.readdir = vi.fn().mockResolvedValue([
        "sop-guide.md",
        "process-doc.txt", 
        "readme.md"
      ]);

      const result = await crawlForSopFiles("/test/path");

      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toMatchObject({
        filename: "sop-guide.md",
        path: path.join("/test/path", "sop-guide.md"),
        isDirectory: false,
        matchedKeywords: ["sop"],
        extension: ".md",
      });
      expect(result.files[1]).toMatchObject({
        filename: "process-doc.txt",
        path: path.join("/test/path", "process-doc.txt"),
        isDirectory: false,
        matchedKeywords: ["process"],
        extension: ".txt",
      });
      expect(result.totalScanned).toBe(3);
      expect(result.directoriesScanned).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle custom keywords", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root directory
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // custom-file.txt
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // other-file.txt

      mockFs.promises.readdir = vi.fn().mockResolvedValue([
        "custom-file.txt",
        "other-file.txt"
      ]);

      const options: SopCrawlerOptions = {
        keywords: ["custom"],
      };

      const result = await crawlForSopFiles("/test/path", options);

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        filename: "custom-file.txt",
        matchedKeywords: ["custom"],
      });
    });

    it("should respect maxDepth limitation", async () => {
      // Mock nested directory structure
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => true }) // level1 dir
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // sop1.md (depth 1)
        .mockResolvedValueOnce({ isDirectory: () => true }) // level2 dir
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // sop2.md (depth 2)

      mockFs.promises.readdir = vi.fn()
        .mockResolvedValueOnce(["level1"]) // root
        .mockResolvedValueOnce(["sop1.md", "level2"]) // level1
        .mockResolvedValueOnce(["sop2.md"]); // level2

      const options: SopCrawlerOptions = {
        maxDepth: 1,
      };

      const result = await crawlForSopFiles("/test/path", options);

      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.filename).toBe("sop1.md");
      expect(result.directoriesScanned).toBe(2); // root + level1
    });

    it("should include directories when requested", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => true }) // sop-directory
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // file.txt

      mockFs.promises.readdir = vi.fn()
        .mockResolvedValueOnce(["sop-directory"]) // root
        .mockResolvedValueOnce(["file.txt"]); // sop-directory

      const options: SopCrawlerOptions = {
        includeDirectories: true,
      };

      const result = await crawlForSopFiles("/test/path", options);

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        filename: "sop-directory",
        isDirectory: true,
        matchedKeywords: ["sop"],
      });
    });

    it("should filter by file extensions", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // sop.md
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // sop.txt

      mockFs.promises.readdir = vi.fn().mockResolvedValue([
        "sop.md",
        "sop.txt"
      ]);

      const options: SopCrawlerOptions = {
        fileExtensions: [".md"],
      };

      const result = await crawlForSopFiles("/test/path", options);

      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.filename).toBe("sop.md");
    });

    it("should handle case-insensitive keyword matching", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }) // SOP-Guide.MD
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // Process-Doc.TXT

      mockFs.promises.readdir = vi.fn().mockResolvedValue([
        "SOP-Guide.MD",
        "Process-Doc.TXT"
      ]);

      const result = await crawlForSopFiles("/test/path");

      expect(result.files).toHaveLength(2);
      expect(result.files[0]!.matchedKeywords).toContain("sop");
      expect(result.files[1]!.matchedKeywords).toContain("process");
    });

    it("should handle errors gracefully", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockRejectedValueOnce(new Error("Permission denied")); // file access error

      mockFs.promises.readdir = vi.fn()
        .mockResolvedValueOnce(["sop.md"])
        .mockRejectedValueOnce(new Error("Directory read error"));

      const result = await crawlForSopFiles("/test/path");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Permission denied");
    });

    it("should handle non-existent root path", async () => {
      mockFs.promises.stat = vi.fn()
        .mockRejectedValue(new Error("ENOENT: no such file or directory"));

      const result = await crawlForSopFiles("/nonexistent/path");

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Error accessing root path");
    });

    it("should handle root path that is not a directory", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValue({ isDirectory: () => false });

      const result = await crawlForSopFiles("/test/file.txt");

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("is not a directory");
    });
  });

  describe("crawlForSopFilesSync (sync)", () => {
    it("should work synchronously with same results", () => {
      // Mock file system structure
      mockFs.statSync = vi.fn()
        .mockReturnValueOnce({ isDirectory: () => true }) // root directory
        .mockReturnValueOnce({ isDirectory: () => false, isFile: () => true }) // sop-guide.md
        .mockReturnValueOnce({ isDirectory: () => false, isFile: () => true }); // admin-doc.txt

      mockFs.readdirSync = vi.fn().mockReturnValue([
        "sop-guide.md",
        "admin-doc.txt"
      ]);

      const result = crawlForSopFilesSync("/test/path");

      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toMatchObject({
        filename: "sop-guide.md",
        path: path.join("/test/path", "sop-guide.md"),
        isDirectory: false,
        matchedKeywords: ["sop"],
        extension: ".md",
      });
      expect(result.files[1]).toMatchObject({
        filename: "admin-doc.txt",
        path: path.join("/test/path", "admin-doc.txt"),
        isDirectory: false,
        matchedKeywords: ["admin"],
        extension: ".txt",
      });
    });

    it("should handle sync errors gracefully", () => {
      mockFs.statSync = vi.fn()
        .mockReturnValueOnce({ isDirectory: () => true }) // root
        .mockImplementationOnce(() => {
          throw new Error("Permission denied");
        });

      mockFs.readdirSync = vi.fn().mockReturnValue(["sop.md"]);

      const result = crawlForSopFilesSync("/test/path");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Permission denied");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty directories", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValue({ isDirectory: () => true });

      mockFs.promises.readdir = vi.fn().mockResolvedValue([]);

      const result = await crawlForSopFiles("/empty/path");

      expect(result.files).toHaveLength(0);
      expect(result.directoriesScanned).toBe(1);
      expect(result.totalScanned).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle files without extensions", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // sop-file

      mockFs.promises.readdir = vi.fn().mockResolvedValue(["sop-file"]);

      const result = await crawlForSopFiles("/test/path");

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        filename: "sop-file",
        extension: undefined,
      });
    });

    it("should match multiple keywords in single filename", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // sop-admin-process.md

      mockFs.promises.readdir = vi.fn().mockResolvedValue(["sop-admin-process.md"]);

      const result = await crawlForSopFiles("/test/path");

      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.matchedKeywords).toEqual(
        expect.arrayContaining(["sop", "admin", "process"])
      );
      expect(result.files[0]!.matchedKeywords).toHaveLength(3);
    });

    it("should handle special characters in filenames", async () => {
      mockFs.promises.stat = vi.fn()
        .mockResolvedValueOnce({ isDirectory: () => true }) // root
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true }); // sop-file@#$.md

      mockFs.promises.readdir = vi.fn().mockResolvedValue(["sop-file@#$.md"]);

      const result = await crawlForSopFiles("/test/path");

      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.filename).toBe("sop-file@#$.md");
      expect(result.files[0]!.matchedKeywords).toContain("sop");
    });
  });
});