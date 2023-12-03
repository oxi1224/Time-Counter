import * as vscode from "vscode";
import fs from "fs/promises";
import { getHtml } from "./getHtml";

interface FileStats {
  sessionTime: number;
  keystrokes: number;
  addedLines: number;
  removedLines: number;
  project: string | undefined;
  lineCount: number;
}

interface FileData extends FileStats {
  sessionTime: number;
  keystrokes: number;
  addedLines: number;
  removedLines: number;
  project: string | undefined;
  lineCount: number;
  idleTime: number;
  startInterval: () => void;
  stopInterval: () => void;
  updateLastOpened: () => void;
  updateLastUpdated: () => void;
  interval?: NodeJS.Timeout;
  lastUpdated: number;
  lastOpened: number;
  intervalRunning: boolean;
}

function generateFileData(obj?: {
  [key in keyof FileStats]?: FileStats[key];
}): FileData {
  return {
    addedLines: obj?.addedLines ?? 0,
    keystrokes: obj?.keystrokes ?? 0,
    removedLines: obj?.removedLines ?? 0,
    sessionTime: obj?.sessionTime ?? 0,
    project: obj?.project,
    lineCount: obj?.lineCount ?? 0,
    idleTime: 0,
    lastUpdated: new Date().getTime() - 30_000, // start paused until update triggered
    lastOpened: new Date().getTime(),
    intervalRunning: false,
    startInterval: function () {
      this.intervalRunning = true;
      this.interval = setInterval(
        (() => {
          this.sessionTime += 1;
          if (new Date().getTime() - this.lastUpdated >= 30_000) {
            this.stopInterval();
          }
        }).bind(this),
        1000
      );
    },
    stopInterval: function () {
      this.intervalRunning = false;
      clearInterval(this.interval);
    },
    updateLastOpened: function () {
      this.lastOpened = new Date().getTime();
    },
    updateLastUpdated: function () {
      if (this.intervalRunning) {
        this.stopInterval();
      }
      this.lastUpdated = new Date().getTime();
      this.startInterval();
    },
  };
}

export async function activate(context: vscode.ExtensionContext) {
  const storagePath =
    context.globalStorageUri.path.replace("/", "") + "/time-counter.json";

  try {
    await fs.readFile(storagePath);
  } catch {
    try {
      await fs.mkdir(context.globalStorageUri.path.replace("/", ""));
    } catch {}
    await fs.writeFile(storagePath, "{}");
  }
  console.log("Time-meter running.");

  const prevData = await fs
    .readFile(storagePath)
    .then((str) => JSON.parse(str.toString()));

  const fileMap = new Map<string, FileData>();

  Object.entries(prevData || {}).forEach(([key, val]) => {
    const obj: FileStats = val as any;
    fileMap.set(key, generateFileData(obj));
  });

  vscode.workspace.onDidOpenTextDocument((event) => {
    if (event.uri.path.endsWith('.git')) return;
    const isSameProject = event.uri.path
      .split("/")
      .includes(vscode.workspace.name || "");

    if (!fileMap.has(event.uri.path)) {
      fileMap.set(
        event.uri.path,
        generateFileData({
          project: isSameProject ? vscode.workspace.name : undefined,
        })
      );
    }
    const fileData = fileMap.get(event.uri.path)!;
    fileData.startInterval();
    fileData.updateLastOpened();
  });

  vscode.workspace.onDidCloseTextDocument((event) => {
    if (event.uri.path.endsWith('.git')) return;
    const fileData = fileMap.get(event.uri.path)!;
    fileData.stopInterval();
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    const document = event.document;
    if (document.uri.path.endsWith('.git')) return;
    const isSameProject = document.uri.path
      .split("/")
      .includes(vscode.workspace.name || "");
    if (!fileMap.has(document.uri.path)) {
      fileMap.set(
        document.uri.path,
        generateFileData({
          project: isSameProject ? vscode.workspace.name : undefined,
        })
      );
    }
    const fileData = fileMap.get(document.uri.path)!;
    fileData.updateLastUpdated();

    fileData.lineCount = document.lineCount;
    fileData.addedLines += Math.max(0, document.lineCount - fileData.lineCount);
    // prettier-ignore
    fileData.removedLines += Math.max(0, fileData.lineCount - document.lineCount);

    for (const change of event.contentChanges) {
      fileData.keystrokes += Math.min(1, change.text.length);
    }

    fileMap.set(document.uri.path, fileData);
  });

  vscode.workspace.onDidRenameFiles((event) => {
    for (const file of event.files) {
      if (file.oldUri.path.endsWith('.git')) continue;
      if (!fileMap.has(file.oldUri.path)) continue;
      const fileData = fileMap.get(file.oldUri.path)!;
      fileMap.delete(file.oldUri.path);
      fileMap.set(file.newUri.path, fileData);
    }
  });

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const document = activeEditor.document;
    if (document.uri.path.endsWith('.git')) return;
    const isSameProject = document.uri.path
      .split("/")
      .includes(vscode.workspace.name || "");
    if (!fileMap.has(document.uri.path)) {
      fileMap.set(
        document.uri.path,
        generateFileData({
          project: isSameProject ? vscode.workspace.name : undefined,
        })
      );
    }
    const fileData = fileMap.get(document.uri.path)!;
    fileData.startInterval();
  }

  setInterval(async () => {
    const fileDataObject = Object.fromEntries(fileMap);
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
        const split = k.split("/");
        return [k, _data];
      })
    );
    await fs.writeFile(storagePath, JSON.stringify(data));
    console.log("writing");
  }, 30_000);

  const command = vscode.commands.registerCommand(
    "time-counter.showStats",
    async () => {
      const panel = vscode.window.createWebviewPanel(
        "time-counter-show",
        "Time Counter",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      const jsonData = await fs
        .readFile(storagePath)
        .then((str) => JSON.parse(str.toString()));

      panel.webview.html = getHtml(
        jsonData,
        vscode.workspace.name || "undefined"
      );
    }
  );
  context.subscriptions.push(command);
}

export function deactivate() {
  // Clean up and perform any necessary tasks when the extension is deactivated
}
