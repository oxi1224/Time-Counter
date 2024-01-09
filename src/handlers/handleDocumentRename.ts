import { FileRenameEvent } from "vscode";
import { FileStats } from "../fileStats";

export function handleDocumentRename(event: FileRenameEvent, fileStats: FileStats) {
  for (const file of event.files) {
    if (file.oldUri.path.endsWith('.git')) continue;

    const splitOldPath = file.oldUri.path.split('/');
    splitOldPath[1] = splitOldPath[1].toLowerCase();
    const oldPath = splitOldPath.join('/');

    const splitNewPath = file.newUri.path.split('/');
    splitNewPath[1] = splitNewPath[1].toLowerCase();
    const newPath = splitNewPath.join('/');

    fileStats.addIfNotExists(oldPath, true, 0);
    fileStats.updateFileName(oldPath, newPath);
  }
}