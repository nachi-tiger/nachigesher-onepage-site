/* One-page editable website
   - Toggle edit mode
   - Edit text inline (contenteditable)
   - Replace images by clicking (in edit mode)
   - Persist content to LocalStorage
   - Export / import JSON so you can move changes to another computer
*/

const STORAGE_KEY = "gesher_onepage_v1";

// Change this passcode if you want a small speed-bump.
// NOTE: This is NOT real security; anyone can see the code if they want.
const EDIT_PASSCODE = "king";

const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

const state = {
  editMode: false,
  content: {
    texts: {},
    images: {}
  }
};

function getDefaultContent(){
  // We use the current DOM as default values so the page works even if JS is disabled.
  const texts = {};
  qsa("[data-edit]").forEach(el => {
    const key = el.getAttribute("data-edit");
    texts[key] = el.innerHTML;
  });

  const images = {};
  qsa("[data-img]").forEach(img => {
    const key = img.getAttribute("data-img");
    images[key] = img.getAttribute("src");
  });

  return { texts, images };
}

function loadContent(){
  const defaults = getDefaultContent();
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaults;
    const parsed = JSON.parse(raw);

    // merge defaults with saved (so new keys don't break)
    return {
      texts: { ...defaults.texts, ...(parsed.texts || {}) },
      images: { ...defaults.images, ...(parsed.images || {}) }
    };
  }catch(e){
    console.warn("Failed to load content:", e);
    return defaults;
  }
}

function applyContent(content){
  // texts
  qsa("[data-edit]").forEach(el => {
    const key = el.getAttribute("data-edit");
    if(content.texts && key in content.texts){
      el.innerHTML = content.texts[key];
    }
  });

  // images
  qsa("[data-img]").forEach(img => {
    const key = img.getAttribute("data-img");
    if(content.images && key in content.images){
      img.setAttribute("src", content.images[key]);
    }
  });
}

function saveContent(){
  // collect from DOM
  const texts = {};
  qsa("[data-edit]").forEach(el => {
    const key = el.getAttribute("data-edit");
    texts[key] = el.innerHTML;
  });

  const images = {};
  qsa("[data-img]").forEach(img => {
    const key = img.getAttribute("data-img");
    images[key] = img.getAttribute("src");
  });

  const payload = { texts, images, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  toast("נשמר ✅");
}

function resetContent(){
  localStorage.removeItem(STORAGE_KEY);
  applyContent(getDefaultContent());
  toast("אופס—איפסתי. הכל חזר לברירת מחדל 🧼");
}

function enableEditMode(){
  document.body.classList.add("edit-mode");
  state.editMode = true;
  qs("#editPanel").hidden = false;

  qsa("[data-edit]").forEach(el => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("role", "textbox");
    el.setAttribute("aria-label", "שדה ניתן לעריכה");
  });

  qsa(".hint").forEach(h => h.style.opacity = "1");
}

function disableEditMode(){
  document.body.classList.remove("edit-mode");
  state.editMode = false;
  qs("#editPanel").hidden = true;

  qsa("[data-edit]").forEach(el => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
  });

  qsa(".hint").forEach(h => h.style.opacity = "");
}

function askPasscode(){
  const input = prompt("סיסמת עריכה? (ברירת מחדל: king)");
  return input && input.trim() === EDIT_PASSCODE;
}

function exportContent(){
  const raw = localStorage.getItem(STORAGE_KEY);
  const payload = raw ? raw : JSON.stringify({ ...getDefaultContent(), exportedAt: new Date().toISOString() }, null, 2);
  downloadText(payload, "gesher-content.json");
  toast("ייצוא בוצע 📦");
}

function importContent(){
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "application/json";
  picker.onchange = async () => {
    const file = picker.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      // basic validation
      if(!parsed.texts || !parsed.images) throw new Error("Invalid file structure");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      applyContent(loadContent());
      toast("ייבוא בוצע ✅");
    }catch(e){
      alert("לא הצלחתי לייבא. ודא שזה הקובץ שייצאת מהאתר.\n\n" + e.message);
    }
  };
  picker.click();
}

function downloadText(text, filename){
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let imgTargetKey = null;

function handleImageClick(e){
  if(!state.editMode) return;
  const img = e.currentTarget;
  imgTargetKey = img.getAttribute("data-img");
  qs("#imgPicker").click();
}

async function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.top = "16px";
  el.style.insetInline = "16px";
  el.style.zIndex = "80";
  el.style.padding = "12px 14px";
  el.style.borderRadius = "14px";
  el.style.border = "1px solid rgba(255,255,255,0.14)";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.backdropFilter = "blur(12px)";
  el.style.color = "rgba(255,255,255,0.92)";
  el.style.boxShadow = "0 16px 45px rgba(0,0,0,0.45)";
  el.style.maxWidth = "680px";
  el.style.margin = "0 auto";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function initMailForm(){
  const form = qs("#mailForm");
  const email = qs('[data-edit="email"]')?.textContent?.trim() || "nachimehl@gmail.com";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get("name") || "";
    const org = fd.get("org") || "";
    const date = fd.get("date") || "";
    const msg = fd.get("msg") || "";

    const subject = encodeURIComponent('תיאום הרצאה: "גשר בין עולמות"');
    const body = encodeURIComponent(
`היי נחי,
שמי: ${name}
ארגון/מסגרת: ${org}
תאריך משוער: ${date}

הודעה:
${msg}

תודה,
${name}`);

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  });
}

function initYear(){
  const y = new Date().getFullYear();
  qs("#year").textContent = String(y);
}

function initEditing(){
  qs("#editToggle").addEventListener("click", () => {
    if(!state.editMode){
      if(!askPasscode()){
        toast("סיסמה שגויה 🥲");
        return;
      }
      enableEditMode();
      toast("עריכה ON ✍️");
    }else{
      disableEditMode();
      toast("עריכה OFF");
    }
  });

  qs("#saveBtn").addEventListener("click", saveContent);
  qs("#resetBtn").addEventListener("click", resetContent);
  qs("#exportBtn").addEventListener("click", exportContent);
  qs("#importBtn").addEventListener("click", importContent);

  qsa("[data-img]").forEach(img => {
    img.addEventListener("click", handleImageClick);
  });

  const picker = qs("#imgPicker");
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if(!file || !imgTargetKey) return;

    // Mild safety: avoid huge images stored in LocalStorage
    const maxMB = 2.0;
    if(file.size > maxMB * 1024 * 1024){
      alert(`התמונה גדולה מדי (${(file.size/1024/1024).toFixed(1)}MB).\nמומלץ עד ~${maxMB}MB כדי שהאתר לא יהיה כבד.`);
      picker.value = "";
      return;
    }

    try{
      const dataUrl = await fileToDataURL(file);
      // apply immediately
      const img = qs(`[data-img="${imgTargetKey}"]`);
      if(img) img.setAttribute("src", dataUrl);
      toast("תמונה עודכנה 🖼️");
    }catch(e){
      alert("לא הצלחתי לקרוא את התמונה: " + e.message);
    }finally{
      picker.value = "";
      imgTargetKey = null;
    }
  });
}

// boot
(function(){
  const content = loadContent();
  state.content = content;
  applyContent(content);
  initYear();
  initMailForm();
  initEditing();
})();
