import fs from "fs";
import path from "path";

/**
 * Configuration options for the SOP crawler
 */
export interface SopCrawlerOptions {
  /** Keywords to search for in file names (case-insensitive) */
  keywords?: Array<string>;
  /** Maximum depth to recurse into subdirectories (default: no limit) */
  maxDepth?: number;
  /** Whether to include directories in results (default: false) */
  includeDirectories?: boolean;
  /** File extensions to include (default: all files) */
  fileExtensions?: Array<string>;
}

/**
 * Represents a found SOP file with metadata
 */
export interface SopFile {
  /** The full path to the file */
  path: string;
  /** The filename without directory path */
  filename: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Which keywords matched in the filename */
  matchedKeywords: Array<string>;
  /** File extension (if applicable) */
  extension?: string;
}

/**
 * Results from the SOP crawler
 */
export interface SopCrawlerResult {
  /** Array of found SOP files */
  files: Array<SopFile>;
  /** Total number of files scanned */
  totalScanned: number;
  /** Number of directories scanned */
  directoriesScanned: number;
  /** Any errors encountered during scanning */
  errors: Array<string>;
}

/**
 * Default keywords for SOP and administrative files
 */
const DEFAULT_KEYWORDS = ["sop", "process", "admin", "meta"];

/**
 * Crawls through a repository directory to find Standard Operating Procedures (SOPs),
 * processes, administrative, and meta data files.
 * 
 * @param rootPath The path to start crawling from
 * @param options Configuration options for the crawler
 * @returns Promise resolving to crawler results
 */
export async function crawlForSopFiles(
  rootPath: string,
  options: SopCrawlerOptions = {},
): Promise<SopCrawlerResult> {
  const {
    keywords = DEFAULT_KEYWORDS,
    maxDepth = Infinity,
    includeDirectories = false,
    fileExtensions,
  } = options;

  const result: SopCrawlerResult = {
    files: [],
    totalScanned: 0,
    directoriesScanned: 0,
    errors: [],
  };

  // Normalize keywords to lowercase for case-insensitive matching
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  /**
   * Recursively scans a directory for SOP files
   */
  async function scanDirectory(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    try {
      const items = await fs.promises.readdir(dirPath);
      result.directoriesScanned++;

      // Process all items in parallel for better performance
      const itemProcessingPromises = items.map(async (item) => {
        const fullPath = path.join(dirPath, item);
        
        try {
          const stats = await fs.promises.stat(fullPath);
          result.totalScanned++;

          if (stats.isDirectory()) {
            // Check if directory name matches keywords (if includeDirectories is true)
            if (includeDirectories) {
              const matchedKeywords = findMatchingKeywords(item, normalizedKeywords);
              if (matchedKeywords.length > 0) {
                result.files.push({
                  path: fullPath,
                  filename: item,
                  isDirectory: true,
                  matchedKeywords,
                });
              }
            }
            
            // Recursively scan subdirectory
            await scanDirectory(fullPath, depth + 1);
          } else if (stats.isFile()) {
            // Check if file name matches keywords
            const matchedKeywords = findMatchingKeywords(item, normalizedKeywords);
            if (matchedKeywords.length > 0) {
              // Check file extension filter if provided
              const extension = path.extname(item);
              if (!fileExtensions || fileExtensions.includes(extension)) {
                result.files.push({
                  path: fullPath,
                  filename: item,
                  isDirectory: false,
                  matchedKeywords,
                  extension: extension || undefined,
                });
              }
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

      // Wait for all item processing to complete
      await Promise.all(itemProcessingPromises);
    } catch (error) {
      result.errors.push(`Error reading directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    // Verify root path exists and is accessible
    const rootStats = await fs.promises.stat(rootPath);
    if (!rootStats.isDirectory()) {
      throw new Error(`Root path ${rootPath} is not a directory`);
    }

    await scanDirectory(rootPath);
  } catch (error) {
    result.errors.push(`Error accessing root path ${rootPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Finds keywords that match in a filename (case-insensitive)
 */
function findMatchingKeywords(filename: string, keywords: Array<string>): Array<string> {
  const lowerFilename = filename.toLowerCase();
  return keywords.filter((keyword) => lowerFilename.includes(keyword));
}

/**
 * Synchronous version of the SOP crawler for simpler use cases
 * 
 * @param rootPath The path to start crawling from
 * @param options Configuration options for the crawler
 * @returns Crawler results
 */
export function crawlForSopFilesSync(
  rootPath: string,
  options: SopCrawlerOptions = {},
): SopCrawlerResult {
  const {
    keywords = DEFAULT_KEYWORDS,
    maxDepth = Infinity,
    includeDirectories = false,
    fileExtensions,
  } = options;

  const result: SopCrawlerResult = {
    files: [],
    totalScanned: 0,
    directoriesScanned: 0,
    errors: [],
  };

  // Normalize keywords to lowercase for case-insensitive matching
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  /**
   * Recursively scans a directory for SOP files (sync version)
   */
  function scanDirectorySync(dirPath: string, depth: number = 0): void {
    if (depth > maxDepth) {
      return;
    }

    try {
      const items = fs.readdirSync(dirPath);
      result.directoriesScanned++;

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        try {
          const stats = fs.statSync(fullPath);
          result.totalScanned++;

          if (stats.isDirectory()) {
            // Check if directory name matches keywords (if includeDirectories is true)
            if (includeDirectories) {
              const matchedKeywords = findMatchingKeywords(item, normalizedKeywords);
              if (matchedKeywords.length > 0) {
                result.files.push({
                  path: fullPath,
                  filename: item,
                  isDirectory: true,
                  matchedKeywords,
                });
              }
            }
            
            // Recursively scan subdirectory
            scanDirectorySync(fullPath, depth + 1);
          } else if (stats.isFile()) {
            // Check if file name matches keywords
            const matchedKeywords = findMatchingKeywords(item, normalizedKeywords);
            if (matchedKeywords.length > 0) {
              // Check file extension filter if provided
              const extension = path.extname(item);
              if (!fileExtensions || fileExtensions.includes(extension)) {
                result.files.push({
                  path: fullPath,
                  filename: item,
                  isDirectory: false,
                  matchedKeywords,
                  extension: extension || undefined,
                });
              }
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      result.errors.push(`Error reading directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    // Verify root path exists and is accessible
    const rootStats = fs.statSync(rootPath);
    if (!rootStats.isDirectory()) {
      throw new Error(`Root path ${rootPath} is not a directory`);
    }

    scanDirectorySync(rootPath);
  } catch (error) {
    result.errors.push(`Error accessing root path ${rootPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}