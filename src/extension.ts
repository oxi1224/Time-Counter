import * as vscode from "vscode";
import fs from "fs/promises";
import { getHtml } from "./util";
import {
  handleDocumentChange,
  handleDocumentClose,
  handleDocumentOpen,
  handleDocumentRename,
} from "./handlers";
import { FileStats } from "./fileStats";

export async function activate(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri.path.replace("/", "");
  console.log("Time-meter running.");

  const fileStats = new FileStats(storagePath);
  await fileStats.init();

  vscode.workspace.onDidOpenTextDocument((event) =>
    handleDocumentOpen(event, fileStats)
  );
  vscode.workspace.onDidCloseTextDocument((event) =>
    handleDocumentClose(event, fileStats)
  );
  vscode.workspace.onDidChangeTextDocument((event) =>
    handleDocumentChange(event, fileStats)
  );
  vscode.workspace.onDidRenameFiles((event) =>
    handleDocumentRename(event, fileStats)
  );

  setInterval(async () => {
    await fileStats.saveToDisk();
  }, 20_000);

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
        .readFile(storagePath + "/time-counter.json")
        .then((str) => JSON.parse(str.toString()));
      const sessionJsonData = Object.fromEntries(
        [...fileStats.sessionMap.entries()].map(([k, v]) => {
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

      panel.webview.html = getHtml(
        jsonData,
        sessionJsonData,
        vscode.workspace.name || "undefined"
      );
    }
  );
  context.subscriptions.push(command);
}

export function deactivate() {
  // Clean up and perform any necessary tasks when the extension is deactivated
}
