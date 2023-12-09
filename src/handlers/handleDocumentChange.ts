import { workspace, TextDocumentChangeEvent } from "vscode";
import { FileStats } from "../fileStats";

export function handleDocumentChange(event: TextDocumentChangeEvent, fileStats: FileStats) {
  const document = event.document;
  if (document.uri.path.endsWith(".git")) return;
  const isSameProject = document.uri.path
    .split("/")
    .includes(workspace.name || "");

  const splitPath = document.uri.path.split('/');
  splitPath[1] = splitPath[1].toLowerCase();
  const path = splitPath.join('/');

  fileStats.addIfNotExists(path, isSameProject);
  
  const updateData = {
    newLineCount: document.lineCount,
    keystrokeCount: 0
  };
  for (const change of event.contentChanges) {
    updateData.keystrokeCount += Math.min(1, change.text.length);
  }

  fileStats.updateStats(path, updateData);
}
