import { TextDocument } from "vscode";
import { FileStats } from "../fileStats";

export function handleDocumentClose(document: TextDocument, fileStats: FileStats) {
  if (document.uri.path.endsWith(".git")) return;
  fileStats.stopInterval(document.uri.path);
}
