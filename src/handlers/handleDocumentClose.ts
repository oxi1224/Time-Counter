import { TextDocument } from "vscode";
import { FileStats } from "../fileStats";

export function handleDocumentClose(document: TextDocument, fileStats: FileStats) {
  if (document.uri.path.endsWith(".git")) return;

  const splitPath = document.uri.path.split('/');
  splitPath[1] = splitPath[1]?.toLowerCase();
  const path = splitPath.join('/');

  fileStats.stopInterval(path);
}
