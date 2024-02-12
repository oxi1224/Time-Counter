interface FileStats {
  sessionTime: number;
  keystrokes: number;
  addedLines: number;
  removedLines: number;
  project: string | undefined;
  lineCount: number;
}

export function getHtml(
  data: { [key: string]: FileStats },
  sessionData: { [key: string]: FileStats },
  curProj: string
) {
  return `
  <!DOCTYPE html>
<html>
  <body>
    <div class="button-wrapper">
      <div>
        <button id="show-project">Show current project</button>
      </div>
      <div>
        <button id="show-all">Show all</button>
      </div>
      <div>
        <button id="show-session">Show session</button>
      </div>
    </div>

    <style>
      body {
        padding: 0.5rem;
        margin: 0;
        font-family: Consolas, monospace;
      }

      .button-wrapper {
        width: 100%;
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      button {
        all: unset;
        background-color: #0e639c;
        color: white;
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-radius: 0.2rem;
      }
      button:hover {
        filter: brightness(110%);
      }

      .field-wrapper {
        background: #1a1b26;
        padding: 0.5rem;
        margin: 0.5rem 0;
        color: white;
      }

      .field {
        background: #1a1b26;
        color: #9aa5ce;
        font-size: 15px;
      }

      .field-title {
        cursor: pointer;
      }

      .field-title:hover {
        filter: brightness(150%);
      }

      .field-caret {
        margin-left: 5px;
        display: inline-block;
        font-family: monospace;
        font-weight: bold;
        transform: rotate(90deg);
        color: white;
      }

      .field-caret.rotate {
        transform: rotate(270deg);
      }

      .field-content {
        display: none;
      }

      .key {
        color: #9ece6a;
      }

      .value {
        color: #ff9e64;
      }

      .field-content.open {
        display: block;
      }

      .field {
        position: relative;
      }

      .field-content {
        white-space: pre;
        padding-left: 10px;
      }
    </style>

    <script>
      const CUR_PROJECT = "${curProj}";
      const STAT_KEYS = [
        "totalSeconds",
        "totalHours",
        "totalMinutes",
        "addedLines",
        "keystrokes",
        "removedLines",
        "lineCount",
        "lastOpened",
      ];

      function setNestedPropertyValue(obj, keys, value) {
        let currentObj = obj;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (!currentObj[key]) {
            currentObj[key] = {};
          }

          if (i === keys.length - 1) {
            currentObj[key] = value;
          } else {
            currentObj = currentObj[key];
          }
        }
      }

      function round(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
      }
      (async () => {
        const data = ${JSON.stringify(data)};
        const sessionData = ${JSON.stringify(sessionData)};

        function groupByProject(data) {
          const grouped = {};
          Object.entries(data).forEach(([k, v]) => {
            const { project, ...data } = v;
            if (!project) {
              if (!grouped.undefined) {
                grouped.undefined = {};
              }
              grouped.undefined[k.replace("/", "")] = data;
            } else {
              if (!grouped[project]) {
                grouped[project] = {};
              }
              grouped[project][k.replace("/", "")] = data;
            }
          });

          const structured = {};
          Object.entries(grouped).forEach(([project, files]) => {
            if (Object.keys(files).length === 0) return;
            if (!structured[project]) {
              structured[project] = {};
              structured[project].totalSeconds = 0;
              structured[project].totalMinutes = 0;
              structured[project].totalHours = 0;
            }
            const projectData = files;
            const splitPath = Object.keys(projectData)[0].split("/");
            const projectPathIndex = splitPath.findIndex(
              (str) => str === project
            );
            const basePath = splitPath.slice(0, projectPathIndex + 1).join("/");

            Object.entries(projectData).forEach(([k, v]) => {
              if (project === "undefined") {
                v.lastOpened = new Date(v.lastOpened).toLocaleDateString();
                const minutes = round(v.sessionTime / 60);
                const hours = round(minutes / 60);
                v.totalSeconds = v.sessionTime;
                v.totalMinutes = minutes;
                v.totalHours = hours;
                delete v.sessionTime;
                structured.undefined[k] = v;
                return;
              }
              const fileData = v;
              const paths = k
                .replace(basePath, "")
                .split("/")
                .filter((str) => str !== "");
              if (paths.length > 1) {
                paths[paths.length - 1] = "/" + paths[paths.length - 1];
              }
              paths[0] = "/" + paths[0];

              fileData.lastOpened = new Date(
                fileData.lastOpened
              ).toLocaleDateString();
              const minutes = round(fileData.sessionTime / 60);
              const hours = round(minutes / 60);
              fileData.totalSeconds = fileData.sessionTime;
              fileData.totalMinutes = minutes;
              fileData.totalHours = hours;
              structured[project].totalSeconds += fileData.totalSeconds;
              structured[project].totalMinutes += fileData.totalMinutes;
              structured[project].totalHours += fileData.totalHours;
              structured[project].totalSeconds = round(
                structured[project].totalSeconds
              );
              structured[project].totalMinutes = round(
                structured[project].totalMinutes
              );
              structured[project].totalHours = round(
                structured[project].totalHours
              );
              delete fileData.sessionTime;
              setNestedPropertyValue(
                structured,
                [project, basePath].concat(paths),
                fileData
              );
            });

            const projectPath = files[0];
          });
          return structured;
        }
        const structuredData = groupByProject(data);
        const structuredSessionData = groupByProject(sessionData);
        const allButton = document.getElementById("show-all");
        const projectButton = document.getElementById("show-project");
        const sessionButton = document.getElementById("show-session");

        allButton.addEventListener("click", () =>
          showAllProjects(structuredData)
        );
        projectButton.addEventListener("click", () =>
          showCurProject(structuredData[CUR_PROJECT])
        );
        sessionButton.addEventListener("click", () =>
          showCurSession(structuredSessionData)
        );
        showCurSession(structuredSessionData);
      })();

      function treeify(data) {
        const paths = Object.keys(data).filter(
          (key) => !STAT_KEYS.includes(key)
        );
        const wrapperDiv = document.createElement("div");
        wrapperDiv.classList.add("field");
        for (let i in paths) {
          const fieldValueDiv = document.createElement("div");
          fieldValueDiv.classList.add("field-value");
          const path = paths[i];
          const titleDiv = document.createElement("div");
          titleDiv.textContent = path;
          titleDiv.classList.add("field-title");
          const caretDiv = document.createElement("div");
          caretDiv.classList.add("field-caret");
          caretDiv.textContent = ">";
          titleDiv.appendChild(caretDiv);
          fieldValueDiv.appendChild(titleDiv);
          const contentDiv = document.createElement("div");
          contentDiv.classList.add("field-content");
          titleDiv.addEventListener("click", () => {
            contentDiv.classList.toggle("open");
            caretDiv.classList.toggle("rotate");
          });

          const hasSubfolders =
            Object.keys(data[path]).filter((key) => !STAT_KEYS.includes(key))
              .length > 0;
          if (hasSubfolders) {
            contentDiv.appendChild(treeify(data[path]));
          } else {
            Object.entries(data[path]).forEach(([k, v]) => {
              const span = document.createElement("span");
              span.innerHTML = \`<span class="key">\${k}</span>: <span class="value">\${v}</span></br>\`;
              contentDiv.appendChild(span);
            });
          }
          fieldValueDiv.appendChild(contentDiv);
          wrapperDiv.appendChild(fieldValueDiv);
        }
        return wrapperDiv;
      }

      function showCurProject(data) {
        [...document.querySelectorAll(".field-wrapper")].forEach((n) =>
          n.remove()
        );
        const wrapperElm = document.createElement("div");
        wrapperElm.classList.add("field-wrapper");
        const projNameSpan = document.createElement("span");
        projNameSpan.innerHTML = \`<span class="key">projectName</span> = <span class="value">\${CUR_PROJECT.toLocaleUpperCase()}</span>\`;
        wrapperElm.appendChild(projNameSpan);
        wrapperElm.innerHTML += \`
          </br><span class="key">totalSeconds</span>: <span class="value">\${data.totalSeconds}</span></br>
          <span class="key">totalMinutes</span>: <span class="value">\${data.totalMinutes}</span></br>
          <span class="key">totalHours</span>: <span class="value">\${data.totalHours}</span></br>
        \`;
        wrapperElm.appendChild(treeify(data));
        document.body.appendChild(wrapperElm);
      }

      function showCurSession(data) {
        [...document.querySelectorAll(".field-wrapper")].forEach((n) =>
          n.remove()
        );
        Object.entries(data).forEach(([project, fileData]) => {
          const wrapperElm = document.createElement("div");
          wrapperElm.classList.add("field-wrapper");
          const projNameSpan = document.createElement("span");
          projNameSpan.innerHTML = \`<span class="key">projectName</span> = <span class="value">CURRENT SESSION - \${project.toLocaleUpperCase()}</span>\`;
          wrapperElm.appendChild(projNameSpan);
          wrapperElm.innerHTML += \`
            </br><span class="key">totalSeconds</span>: <span class="value">\${fileData.totalSeconds}</span></br>
            <span class="key">totalMinutes</span>: <span class="value">\${fileData.totalMinutes}</span></br>
            <span class="key">totalHours</span>: <span class="value">\${fileData.totalHours}</span></br>
          \`;
          wrapperElm.appendChild(treeify(fileData));
          
          document.body.appendChild(wrapperElm);
        });
      }

      function showAllProjects(data) {
        [...document.querySelectorAll(".field-wrapper")].forEach((n) =>
          n.remove()
        );
        Object.entries(data).forEach(([project, fileData]) => {
          const wrapperElm = document.createElement("div");
          wrapperElm.classList.add("field-wrapper");
          const projNameSpan = document.createElement("span");
          projNameSpan.innerHTML = \`<span class="key">projectName</span> = <span class="value">\${project.toLocaleUpperCase()}</span>\`;
          wrapperElm.appendChild(projNameSpan);
          wrapperElm.innerHTML += \`
            <br><span class="key">totalSeconds</span>: <span class="value">\${fileData.totalSeconds}</span></br>
            <span class="key">totalMinutes</span>: <span class="value">\${fileData.totalMinutes}</span></br>
            <span class="key">totalHours</span>: <span class="value">\${fileData.totalHours}</span></br>
          \`;
          wrapperElm.appendChild(treeify(fileData));
          document.body.appendChild(wrapperElm);
        });
      }
    </script>
  </body>
</html>
  `;
}
