(() => {
  const starterFiles = {
    "index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Kairo Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="card">
    <p class="eyebrow">BUILT WITH KAIRO</p>
    <h1>Hello, world.</h1>
    <p>Your project starts here. Edit this file and press Preview.</p>
    <button id="hello">Click me</button>
  </main>
  <script src="app.js"><\/script>
</body>
</html>`,
    "styles.css": `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #111318;
  color: #f3f3f5;
  font-family: system-ui, sans-serif;
}
.card {
  max-width: 560px;
  margin: 24px;
  padding: 42px;
  border: 1px solid #343844;
  border-radius: 20px;
  background: #1b1e26;
}
.eyebrow { color: #f28a45; letter-spacing: .15em; font-size: 12px; }
h1 { font-size: clamp(2rem, 7vw, 4rem); margin: 12px 0; }
p { color: #b6bcc9; line-height: 1.7; }
button { padding: 10px 16px; border: 0; border-radius: 8px; background: #f28a45; color: #21150f; font-weight: 700; cursor: pointer; }`,
    "app.js": `const button = document.querySelector("#hello");
if (button) {
  button.addEventListener("click", () => {
    button.textContent = "It works!";
  });
}`
  };

  const icons = { "html": "fa-brands fa-html5 html", "css": "fa-brands fa-css3-alt css", "js": "fa-brands fa-js js", "json": "fa-solid fa-brackets-curly json", "md": "fa-brands fa-markdown", "py": "fa-brands fa-python js" };
  const $ = id => document.getElementById(id);
  let files = loadFiles();
  let activeFile = files["index.html"] ? "index.html" : Object.keys(files)[0];
  let editor = null;
  let toastTimer;
  const monacoReady = typeof require === "function";

  function loadFiles() {
    try {
      const saved = localStorage.getItem("kairo-ide-files-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length) return parsed;
      }
    } catch (_) {}
    return { ...starterFiles };
  }
  function saveFiles() {
    try { localStorage.setItem("kairo-ide-files-v1", JSON.stringify(files)); $("saveState").textContent = "Saved locally"; }
    catch (_) { $("saveState").textContent = "Storage full"; }
  }
  function languageFor(name) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    return ({html:"html",css:"css",js:"javascript",json:"json",md:"markdown",py:"python",ts:"typescript",txt:"plaintext",xml:"xml",yml:"yaml",yaml:"yaml"})[ext] || "plaintext";
  }
  function iconFor(name) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    const parts = (icons[ext] || "fa-regular fa-file").split(" ");
    return { cls: parts.slice(0,2).join(" "), color: parts[2] || "" };
  }
  function currentValue() {
    if (editor) return editor.getValue();
    return $("plainEditor").value;
  }
  function setCurrentValue(value) {
    if (editor) editor.setValue(value);
    else $("plainEditor").value = value;
  }
  function syncActive() {
    if (activeFile && files[activeFile] !== undefined) files[activeFile] = currentValue();
    saveFiles();
  }
  function renderTree() {
    const tree = $("fileTree");
    tree.innerHTML = "";
    Object.keys(files).sort().forEach(name => {
      const item = document.createElement("div");
      item.className = "file-item" + (name === activeFile ? " active" : "");
      const icon = iconFor(name);
      const i = document.createElement("i");
      i.className = icon.cls + (icon.color ? " " + icon.color : "");
      const label = document.createElement("span");
      label.textContent = name;
      item.append(i, label);
      item.title = name;
      item.addEventListener("click", () => openFile(name));
      tree.appendChild(item);
    });
  }
  function renderTab() {
    const tab = $("tabs");
    tab.innerHTML = "";
    const el = document.createElement("div");
    el.className = "tab active";
    const icon = iconFor(activeFile);
    const i = document.createElement("i");
    i.className = icon.cls + (icon.color ? " " + icon.color : "");
    const name = document.createElement("span");
    name.textContent = activeFile;
    el.append(i, name);
    tab.appendChild(el);
    $("breadcrumb").textContent = "my-project / " + activeFile;
    $("languageStatus").textContent = languageFor(activeFile).toUpperCase();
  }
  function openFile(name) {
    syncActive();
    if (!(name in files)) return;
    activeFile = name;
    setCurrentValue(files[name]);
    renderTree(); renderTab();
    if (editor) editor.setModelLanguage(editor.getModel(), languageFor(name));
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
  }
  function initEditor() {
    if (monacoReady) {
      require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs" } });
      require(["vs/editor/editor.main"], () => {
        $("fallbackEditor").hidden = true;
        editor = monaco.editor.create($("editor"), {
          value: files[activeFile] || "",
          language: languageFor(activeFile),
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
          scrollBeyondLastLine: false,
          roundedSelection: false,
          padding: { top: 14 },
          lineNumbersMinChars: 3
        });
        editor.onDidChangeModelContent(() => {
          files[activeFile] = editor.getValue();
          $("saveState").textContent = "Unsaved changes";
          saveFiles();
        });
        editor.onDidChangeCursorPosition(e => $("cursorStatus").textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`);
      }, () => fallback());
    } else fallback();
  }
  function fallback() {
    $("editor").hidden = true;
    $("fallbackEditor").hidden = false;
    $("plainEditor").value = files[activeFile] || "";
    $("plainEditor").addEventListener("input", () => {
      files[activeFile] = currentValue(); $("saveState").textContent = "Unsaved changes"; saveFiles();
    });
    toast("Monaco did not load; using basic editor");
  }
  function newFile() {
    const name = prompt("New file name (example: script.js):");
    if (!name) return;
    if (!/^[\w.-]+$/.test(name) || name === "." || name === "..") return toast("Use a simple file name without folders");
    if (name in files) return toast("That file already exists");
    syncActive(); files[name] = ""; activeFile = name; saveFiles(); renderTree(); renderTab();
    if (editor) { editor.setValue(""); editor.setModelLanguage(editor.getModel(), languageFor(name)); }
    else $("plainEditor").value = "";
  }
  function resetFiles() {
    if (!confirm("Reset the browser workspace to the starter files? This replaces the saved browser copy.")) return;
    files = { ...starterFiles }; activeFile = "index.html"; saveFiles(); renderTree(); renderTab();
    if (editor) { editor.setValue(files[activeFile]); editor.setModelLanguage(editor.getModel(), "html"); }
    else $("plainEditor").value = files[activeFile];
    toast("Starter files restored");
  }
  function exportFiles() {
    syncActive();
    const blob = new Blob([JSON.stringify({ name: "my-project", files }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "kairo-project.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Project backup downloaded as JSON");
  }
  function preview() {
    syncActive();
    const html = files["index.html"];
    if (!html) return toast("Add an index.html file first");
    let result = html;
    const css = files["styles.css"];
    const js = files["app.js"];
    if (css) result = result.replace(/<link[^>]+href=["']styles\.css["'][^>]*>/i, `<style>${css.replace(/<\/style/gi,"<\\/style")}</style>`);
    if (js) result = result.replace(/<script[^>]+src=["']app\.js["'][^>]*><\/script>/i, `<script>${js.replace(/<\/script/gi,"<\\/script")}<\/script>`);
    $("previewFrame").srcdoc = result;
    $("previewDock").hidden = false;
  }
  function addMessage(role, text) {
    const welcome = document.querySelector(".welcome-card");
    if (welcome) welcome.remove();
    const msg = document.createElement("div");
    msg.className = "message " + role;
    const title = document.createElement("span"); title.className = "role"; title.textContent = role === "user" ? "You" : "Kairo";
    const body = document.createElement("div"); body.textContent = text;
    msg.append(title, body); $("chatMessages").appendChild(msg); $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
    return msg;
  }
  async function sendChat(text) {
    syncActive();
    addMessage("user", text);
    const reply = addMessage("assistant", "Thinking…");
    const content = `You are Kairo, a helpful coding assistant. Explain clearly and be careful with changes. The user is editing ${activeFile}.\n\nCurrent file (${activeFile}):\n${currentValue().slice(0,12000)}\n\nUser request:\n${text}`;
    try {
      const ws = new WebSocket("wss://multiple-interracial-sing-attachment.trycloudflare.com");
      const answer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("AI request timed out"));
        }, 200000);

        ws.onopen = () => ws.send(JSON.stringify({
          messages: [{ role: "user", content }]
        }));

        ws.onmessage = event => {
          const data = JSON.parse(event.data);
          if (data.error) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(data.error));
          } else if (data.content !== undefined) {
            clearTimeout(timeout);
            ws.close();
            resolve(data.content);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };
        ws.onclose = () => {
          clearTimeout(timeout);
        };
      });
      reply.lastChild.textContent = answer || "(No response returned)";
    } catch (err) {
      reply.lastChild.textContent = "Kairo connection failed: " + err.message;
    }
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  }

  $("newFileBtn").addEventListener("click", newFile);
  $("resetBtn").addEventListener("click", resetFiles);
  $("exportBtn").addEventListener("click", exportFiles);
  $("previewBtn").addEventListener("click", preview);
  $("closePreview").addEventListener("click", () => $("previewDock").hidden = true);
  $("toggleAi").addEventListener("click", () => $("aiPanel").hidden = !$("aiPanel").hidden);
  $("closeAi").addEventListener("click", () => $("aiPanel").hidden = true);
  $("aboutBtn").addEventListener("click", () => alert("Kairo IDE starter\\nLocal browser workspace + optional local Ollama chat.\\nNo shell execution is enabled."));
  $("chatForm").addEventListener("submit", e => {
    e.preventDefault();
    const text = $("chatInput").value.trim();
    if (!text) return;
    $("chatInput").value = ""; sendChat(text);
  });
  $("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("chatForm").requestSubmit(); }
  });

  renderTree(); renderTab(); initEditor();
})();
