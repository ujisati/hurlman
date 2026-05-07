import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogMode } from '../types.js';
import { bold, cyan, green, yellow, red, dim, supportsColor } from './colors.js';

interface HurlReportEntry {
  index: number;
  request: {
    method: string;
    url: string;
    headers: { name: string; value: string }[];
  };
  response: {
    status: number;
    url: string;
    headers: { name: string; value: string }[];
  };
  asserts: {
    success: boolean;
    message: string;
    line: number;
  }[];
}

interface HurlReportFile {
  running: {
    success: boolean;
    filename: string;
    entries: HurlReportEntry[];
  }[];
}

export function formatOutput(
  reportPath: string,
  storeDir: string,
  logMode: LogMode,
): void {
  // TODO: implement log formatting
  // - Parse report.json (one or more "running" blocks, each with "entries")
  // - For each entry: print METHOD URL → STATUS with color coding
  // - quiet: just the status line
  // - default: status line + pretty-printed response body
  // - full: status line + response body + request/response headers
  // - Failed asserts always printed in red after their entry
}
