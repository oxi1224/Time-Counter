import * as vscode from "vscode";
import fs from "fs/promises";
import {
  FileMap,
  generateFileData,
  FileStats as FileStatsType,
} from "./util";

export class FileStats {
  public sessionMap: FileMap;
  public fileMap: FileMap;
  public storagePath: string;
  public jsonStoragePath: string;

  constructor(storagePath: string) {
    this.sessionMap = new Map();
    this.fileMap = new Map();
    this.storagePath = storagePath;
    this.jsonStoragePath = storagePath + "/time-counter.json";
  }

  async init() {
    try {
      await fs.readFile(this.jsonStoragePath);
    } catch {
      try {
        await fs.mkdir(this.storagePath);
      } catch {}
      await fs.writeFile(this.jsonStoragePath, "{}");
    }

    const prevData = await fs
      .readFile(this.jsonStoragePath)
      .then((str) => JSON.parse(str.toString()));

    Object.entries(prevData || {}).forEach(([key, val]) => {
      const obj: FileStatsType = val as any;
      this.fileMap.set(key, generateFileData(obj));
    });

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const document = activeEditor.document;
      if (document.uri.path.endsWith(".git")) return;
      const isSameProject = document.uri.path
        .split("/")
        .includes(vscode.workspace.name || "");

      this.addIfNotExists(document.uri.path, isSameProject);
      this.startInterval(document.uri.path);
    }
  }

  addIfNotExists(key: string, isSameProject: boolean) {
    const generatedData = generateFileData({
      project: isSameProject ? vscode.workspace.name : undefined,
    });

    if (!this.fileMap.has(key)) {
      this.fileMap.set(key, generatedData);
    }

    if (!this.sessionMap.has(key)) {
      this.sessionMap.set(key, generatedData);
    }
  }

  updateStats(key: string, data: { newLineCount: number, keystrokeCount: number }) {
    const fileStats = this.fileMap.get(key)!;
    fileStats.addedLines += Math.max(0, data.newLineCount - fileStats.lineCount);
    fileStats.removedLines += Math.max(0, fileStats.lineCount - data.newLineCount);
    fileStats.keystrokes += data.keystrokeCount;
    fileStats.lineCount = data.newLineCount;
    fileStats.updateLastUpdated();

    const sessionStats = this.sessionMap.get(key)!;
    sessionStats.addedLines += Math.max(0, data.newLineCount - sessionStats.lineCount);
    sessionStats.removedLines += Math.max(0, sessionStats.lineCount - data.newLineCount);
    sessionStats.keystrokes += data.keystrokeCount;
    sessionStats.lineCount = data.newLineCount;
    sessionStats.updateLastUpdated();

    this.fileMap.set(key, fileStats);
    this.sessionMap.set(key, sessionStats);
  }

  updateFileName(oldUri: string, newUri: string) {
    [this.fileMap, this.sessionMap].forEach(map => {
      const fileData = map.get(oldUri)!;
      map.delete(oldUri);
      map.set(newUri, fileData);
    });
  }

  startInterval(key: string) {
    this.fileMap.get(key)?.startInterval();
    this.sessionMap.get(key)?.startInterval();
  }

  stopInterval(key: string) {
    this.fileMap.get(key)?.stopInterval();
    this.sessionMap.get(key)?.stopInterval();
  }

  updateLastOpened(key: string) {
    this.fileMap.get(key)?.updateLastOpened();
    this.sessionMap.get(key)?.updateLastOpened();
  }

  async saveToDisk() {
    const fileDataObject = Object.fromEntries(this.fileMap);
    const data = Object.fromEntries(
      Object.entries(fileDataObject).map(([k, v]) => {
        const {
          startInterval,
          stopInterval,
          interval,
          idleTime,
          lastUpdated,
          intervalRunning,
          ..._data
        } = v;
        return [k, _data];
      })
    );
    await fs.writeFile(this.jsonStoragePath, JSON.stringify(data));
    console.log("writing");
  }
}
