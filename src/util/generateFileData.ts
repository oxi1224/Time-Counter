export interface FileStats {
  sessionTime: number;
  keystrokes: number;
  addedLines: number;
  removedLines: number;
  project: string | undefined;
  lineCount: number;
}

export interface FileData extends FileStats {
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

export type FileMap = Map<string, FileData>;

export function generateFileData(obj?: {
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