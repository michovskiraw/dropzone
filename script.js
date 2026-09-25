const fileInput = document.querySelector("#fileInput");
const dropArea = document.querySelector("#dropArea");
const pickBtn = document.querySelector("#pickBtn");
const clearBtn = document.querySelector("#clearBtn");
const fileGrid = document.querySelector("#fileGrid");
const template = document.querySelector("#fileTemplate");
const modal = document.querySelector("#previewModal");
const previewContent = document.querySelector("#previewContent");
const previewTitle = document.querySelector("#previewTitle");

let files = [];
let activeFilter = "all";

pickBtn.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("keydown", e => {
  if(e.key === "Enter" || e.key === " ") fileInput.click();
});
fileInput.addEventListener("change", e => addFiles([...e.target.files]));

["dragenter","dragover"].forEach(type => dropArea.addEventListener(type, e => {
  e.preventDefault(); dropArea.classList.add("dragover");
}));
["dragleave","drop"].forEach(type => dropArea.addEventListener(type, e => {
  e.preventDefault(); dropArea.classList.remove("dragover");
}));
dropArea.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));

clearBtn.addEventListener("click", () => {
  files.forEach(x => x.url && URL.revokeObjectURL(x.url));
  files = [];
  fileInput.value = "";
  render();
});

document.querySelector("#closePreview").addEventListener("click", () => modal.close());

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderFiles();
  });
});

function addFiles(incoming){
  incoming.forEach(file => {
    const id = crypto.randomUUID();
    files.push({
      id,
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      category: categoryFor(file)
    });
  });
  render();
}

function render(){
  updateStats();
  renderFiles();
}

function updateStats(){
  document.querySelector("#fileCount").textContent = files.length;
  document.querySelector("#totalSize").textContent = formatBytes(files.reduce((s,x)=>s+x.file.size,0));
  document.querySelector("#imageCount").textContent = files.filter(x=>x.category==="image").length;
  document.querySelector("#otherCount").textContent = files.filter(x=>x.category!=="image").length;
}

function renderFiles(){
  fileGrid.innerHTML = "";
  const visible = files.filter(x => activeFilter === "all" || x.category === activeFilter);

  if(!visible.length){
    fileGrid.innerHTML = '<div class="empty">No files in this view yet.</div>';
    return;
  }

  visible.forEach(item => {
    const node = template.content.cloneNode(true);
    const preview = node.querySelector(".preview");
    const name = node.querySelector(".file-name");
    const meta = node.querySelector(".file-meta");

    if(item.category === "image" && item.url){
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      preview.appendChild(img);
    } else {
      const type = document.createElement("div");
      type.className = "file-type";
      type.textContent = iconFor(item);
      preview.appendChild(type);
    }

    name.textContent = item.file.name;
    meta.textContent = `${labelFor(item)} · ${formatBytes(item.file.size)}`;

    node.querySelector(".preview-btn").addEventListener("click", () => openPreview(item));
    node.querySelector(".remove-btn").addEventListener("click", () => removeFile(item.id));
    fileGrid.appendChild(node);
  });
}

function removeFile(id){
  const item = files.find(x=>x.id===id);
  if(item?.url) URL.revokeObjectURL(item.url);
  files = files.filter(x=>x.id!==id);
  render();
}

async function openPreview(item){
  previewTitle.textContent = item.file.name;
  previewContent.innerHTML = "";

  if(item.category === "image" && item.url){
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.file.name;
    previewContent.appendChild(img);
  } else if(isTextLike(item.file)){
    const pre = document.createElement("pre");
    try{
      const text = await item.file.text();
      pre.textContent = text.slice(0, 12000) || "(empty file)";
    }catch{
      pre.textContent = "Could not read this file.";
    }
    previewContent.appendChild(pre);
  } else {
    const box = document.createElement("div");
    box.className = "generic";
    box.innerHTML = `<strong>${escapeHtml(item.file.name)}</strong><br><br>${escapeHtml(item.file.type || "Unknown type")}<br>${formatBytes(item.file.size)}`;
    previewContent.appendChild(box);
  }

  modal.showModal();
}

function categoryFor(file){
  if(file.type.startsWith("image/")) return "image";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if(["txt","md","pdf","doc","docx","csv","json","html","css","js"].includes(ext)) return "document";
  return "other";
}

function labelFor(item){
  return item.category === "image" ? "Image" : item.category === "document" ? "Document" : "File";
}

function iconFor(item){
  if(item.category === "document") return "▤";
  if(item.file.type.startsWith("audio/")) return "♫";
  if(item.file.type.startsWith("video/")) return "▶";
  return "◇";
}

function isTextLike(file){
  return file.type.startsWith("text/") || /\.(md|txt|json|csv|html|css|js)$/i.test(file.name);
}

function formatBytes(bytes){
  if(!bytes) return "0 B";
  const units = ["B","KB","MB","GB"];
  const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length-1);
  return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}

render();
