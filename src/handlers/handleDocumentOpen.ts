import { TextDocument, workspace } from "vscode";
import { FileStats } from "../fileStats";
import { generateFileData } from "../util";

export function handleDocumentOpen(document: TextDocument, fileStats: FileStats) {
  if (document.uri.path.endsWith(".git")) return;
  const isSameProject = document.uri.path
    .split("/")
    .includes(workspace.name || "");

  const splitPath = document.uri.path.split('/');
  splitPath[1] = splitPath[1]?.toLowerCase();
  const path = splitPath.join('/');

  fileStats.addIfNotExists(path, isSameProject, document.lineCount);
  fileStats.updateLastOpened(path);
}
