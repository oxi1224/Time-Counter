import { FileRenameEvent } from "vscode";
import { FileStats } from "../fileStats";

export function handleDocumentRename(event: FileRenameEvent, fileStats: FileStats) {
  for (const file of event.files) {
    if (file.oldUri.path.endsWith('.git')) continue;
    fileStats.addIfNotExists(file.oldUri.path, true);
    fileStats.updateFileName(file.oldUri.path, file.newUri.path);
  }
}