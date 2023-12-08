import { TextDocument, workspace } from "vscode";
import { FileStats } from "../fileStats";
import { generateFileData } from "../util";

export function handleDocumentOpen(document: TextDocument, fileStats: FileStats) {
  if (document.uri.path.endsWith(".git")) return;
  const isSameProject = document.uri.path
    .split("/")
    .includes(workspace.name || "");

  fileStats.addIfNotExists(document.uri.path, isSameProject);
  fileStats.startInterval(document.uri.path);
  fileStats.updateLastOpened(document.uri.path);
}
