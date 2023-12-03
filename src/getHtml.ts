interface FileStats {
  sessionTime: number;
  keystrokes: number;
  addedLines: number;
  removedLines: number;
  project: string | undefined;
  lineCount: number;
}

export function getHtml(data: {[key: string]: FileStats}, curProj: string) {
  return `
  <!DOCTYPE html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://cdnjs.cloudflare.com;">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
    <script>hljs.highlightAll()</script>
  </head>
  <html>
    <body>
      <div class="button-wrapper">
        <div>
          <button id="show-project">Show current project</button>
        </div>
        <div>
          <button id="show-all">Show all</button>
        </div>
      </div>
  
      <style>
        body {
          padding: 0.5rem;
          margin: 0;
        }
        .button-wrapper {
          width: 100%;
          display: flex;
          gap: 0.5rem;
        }
        button {
          all: unset;
          background-color: #0e639c;
          color: white;
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-family: Arial, Helvetica, sans-serif;
          border-radius: 0.2rem;
        }
        button:hover {
          filter: brightness(110%);
        }
      </style>
  
      <script>
      const CUR_PROJECT = "${curProj}";

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
              const basePath = splitPath
                .slice(0, projectPathIndex + 1)
                .join("/");

              Object.entries(projectData).forEach(([k, v]) => {
                if (project === "undefined") {
                  v.lastOpened = new Date(
                    v.lastOpened
                  ).toLocaleDateString();
                  const minutes = round(v.sessionTime / 60);
                  const hours = round(minutes / 60);
                  v.totalSeconds = v.sessionTime
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
                fileData.totalSeconds = fileData.sessionTime
                fileData.totalMinutes = minutes;
                fileData.totalHours = hours;
                structured[project].totalSeconds += fileData.totalSeconds;
                structured[project].totalMinutes += fileData.totalMinutes;
                structured[project].totalHours += fileData.totalHours;
                structured[project].totalSeconds = round(structured[project].totalSeconds);
                structured[project].totalMinutes = round(structured[project].totalMinutes);
                structured[project].totalHours = round(structured[project].totalHours);
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

          const allButton = document.getElementById("show-all");
          const projectButton = document.getElementById("show-project");

          allButton.addEventListener("click", () =>
            showAllProjects(structuredData)
          );
          projectButton.addEventListener("click", () =>
            showCurProject(structuredData)
          );

          showCurProject(structuredData);
        }
      )();

      function showCurProject(data) {
        [...document.querySelectorAll(".code-pre")].forEach((n) => n.remove());

        const projData = data[CUR_PROJECT];
        const preElm = document.createElement("pre");
        preElm.classList.add("code-pre");
        const codeElm = document.createElement("code");
        codeElm.classList.add("code-elm");
        codeElm.textContent = \`const projectName = "\${CUR_PROJECT.toLocaleUpperCase()}";\n\`;
        codeElm.textContent += JSON.stringify(projData, null, 2);
        preElm.appendChild(codeElm);
        document.body.appendChild(preElm);
        hljs.highlightAll();
      }

      function showAllProjects(data) {
        [...document.querySelectorAll(".code-pre")].forEach((n) => n.remove());
        Object.entries(data).forEach(([project, fileData]) => {
          const preElm = document.createElement("pre");
          preElm.classList.add("code-pre");
          const codeElm = document.createElement("code");
          codeElm.classList.add("code-elm");
          codeElm.textContent = \`const projectName = "\${project.toLocaleUpperCase()}";\n\`;
          codeElm.textContent += JSON.stringify(fileData, null, 2);
          preElm.appendChild(codeElm);
          document.body.appendChild(preElm);
        });
        hljs.highlightAll();
      }
    </script>
    </body>
  </html>  
  `;
}
