"use strict";

/* =========================================
   SmartFarm AI - frontend
   (translations live in i18n.js)
========================================= */

const $ = id => document.getElementById(id);

const form = $("farmForm");
const cropInput = $("crop");
const questionInput = $("question");
const hero = document.querySelector(".hero");
const cropPreviewIcon = document.querySelector(".crop-preview-icon");
const loadingPanel = $("loadingPanel");
const result = $("result");
const aiResponse = $("aiResponse");
const submitBtn = $("submitBtn");
const langSelect = $("langSelect");

const STORE = { lang: "smartFarmLang", history: "smartFarmHistory" };
const HISTORY_LIMIT = 6;

let lang = "en";        // current interface language
let adviceLang = "en";  // language the advice on screen was written in (used for voice)
let busy = false;
let lastInsights = null;
let cropImageTimer = null;
let imageRequest = null;


/* =========================================
   HELPERS
========================================= */

const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function t(key, vars) {

    let text = I18N[lang]?.[key] ?? I18N.en[key] ?? key;

    for (const name in vars || {}) {
        text = text.replaceAll(`{${name}}`, vars[name]);
    }

    return text;
}

let toastTimer;

function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
};


/* =========================================
   CROPS
   icon | english | hi | mr | gu | ta | te | extra search words
   (used for the crop icon, the Unsplash image and
   for writing quick questions in the user's language)
========================================= */

const CROPS = `
🍅|tomato|टमाटर|टोमॅटो|ટામેટા|தக்காளி|టమాటా|टोमाटो|టమోటా
🌾|wheat|गेहूं|गहू|ઘઉં|கோதுமை|గోధుమ|गेहूँ
🌽|maize|मक्का|मका|મકાઈ|மக்காச்சோளம்|మొక్కజొన్న|corn
🧅|onion|प्याज|कांदा|ડુંગળી|வெங்காயம்|ఉల్లిపాయ
🥔|potato|आलू|बटाटा|બટાકા|உருளைக்கிழங்கு|బంగాళాదుంప
🌱|sugarcane|गन्ना|ऊस|શેરડી|கரும்பு|చెరకు
☁️|cotton|कपास|कापूस|કપાસ|பருத்தி|పత్తి
🍇|grape|अंगूर|द्राक्ष|દ્રાક્ષ|திராட்சை|ద్రాక్ష
🌾|rice|धान|भात|ડાંગર|நெல்|వరి|चावल|तांदूळ|ચોખા|அரிசி|బియ్యం|paddy
🫘|soybean|सोयाबीन|सोयाबीन|સોયાબીન|சோயாபீன்ஸ்|సోయాబీన్
🍌|banana|केला|केळी|કેળા|வாழை|అరటి
🥭|mango|आम|आंबा|કેરી|மாம்பழம்|మామిడి
🍎|apple|सेब|सफरचंद|સફરજન|ஆப்பிள்|ఆపిల్
🍊|orange|संतरा|संत्रे|નારંગી|ஆரஞ்சு|నారింజ|संत्रा
🍋|lemon|नींबू|लिंबू|લીંબુ|எலுமிச்சை|నిమ్మ
🍉|watermelon|तरबूज|कलिंगड|તડબૂચ|தர்பூசணி|పుచ్చకాయ
🥭|papaya|पपीता|पपई|પપૈયા|பப்பாளி|బొప్పాయి
🌶️|chilli|मिर्च|मिरची|મરચાં|மிளகாய்|మిరప|chili
🍆|brinjal|बैंगन|वांगी|રીંગણ|கத்தரிக்காய்|వంకాయ|eggplant
🥕|carrot|गाजर|गाजर|ગાજર|கேரட்|క్యారెట్
🥬|cabbage|पत्ता गोभी|कोबी|કોબી|முட்டைக்கோஸ்|క్యాబేజీ
🥬|spinach|पालक|पालक|પાલક|பசலைக்கீரை|పాలకూర
🥜|groundnut|मूंगफली|भुईमूग|મગફળી|நிலக்கடலை|వేరుశనగ|peanut|शेंगदाणा
🫛|peas|मटर|वाटाणा|વટાણા|பட்டாணி|బఠాణీ|pea
🫘|gram|चना|हरभरा|ચણા|கொண்டைக்கடலை|శనగ|chickpea
🫘|lentil|मसूर|मसूर|મસૂર
🫘|beans|सेम|घेवडा|||| bean
🍃|tea|चाय|चहा||தேயிலை|తేయాకు
☕|coffee|कॉफी|कॉफी|કૉફી|காபி|కాఫీ
🥥|coconut|नारियल|नारळ|નાળિયેર|தேங்காய்|కొబ్బరి
🌿|turmeric|हल्दी|हळद|હળદર|மஞ்சள்|పసుపు
🫚|ginger|अदरक|आले|આદુ|இஞ்சி|అల్లం
🧄|garlic|लहसुन|लसूण|લસણ|பூண்டு|వెల్లుల్లి
`.trim().split("\n").map(row => {

    const [icon, en, hi, mr, gu, ta, te, ...extra] = row.split("|").map(s => s.trim());

    return {
        icon,
        en,
        names: { en, hi, mr, gu, ta, te },
        keys: [en, hi, mr, gu, ta, te, ...extra].filter(Boolean).map(s => s.toLowerCase())
    };
});

function findCrop(text) {

    const value = String(text || "").toLowerCase().trim();

    if (!value) return null;

    const tokens = value.split(/[\s,.;:/()\-]+/);

    return CROPS.find(crop =>
        crop.keys.some(key =>
            key.includes(" ")
                ? value.includes(key)
                : tokens.some(token => key.length >= 3 ? token.startsWith(key) : token === key)
        )
    ) || null;
}

const getCropIcon = crop => findCrop(crop)?.icon || "🌱";


/* =========================================
   LANGUAGE
========================================= */

function applyLanguage(code) {

    lang = LANGUAGES[code] ? code : "en";

    localStorage.setItem(STORE.lang, lang);

    document.documentElement.lang = lang;
    document.title = t("title");
    langSelect.value = lang;

    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });

    renderSubmitButton();
    renderSelectedCrop();
    renderQuickQuestions();
    renderInsights();
    renderHistory();
}

function detectLanguage() {

    const saved = localStorage.getItem(STORE.lang);

    if (LANGUAGES[saved]) return saved;

    for (const code of navigator.languages || [navigator.language]) {
        const short = String(code).slice(0, 2).toLowerCase();
        if (LANGUAGES[short]) return short;
    }

    return "en";
}

langSelect.innerHTML = Object.entries(LANGUAGES)
    .map(([code, info]) => `<option value="${code}">${info.native}</option>`)
    .join("");

langSelect.addEventListener("change", () => {
    window.speechSynthesis?.cancel();
    applyLanguage(langSelect.value);
});


/* =========================================
   CROP PREVIEW, QUICK QUESTIONS, IMAGE
========================================= */

function renderSelectedCrop() {

    const crop = cropInput.value.trim();

    $("selectedCrop").textContent = crop || t("cropHint");
    cropPreviewIcon.textContent = getCropIcon(crop);
}

function renderQuickQuestions() {

    const crop = cropInput.value.trim();
    const localName = crop ? (findCrop(crop)?.names[lang] || crop) : "";
    const prefix = crop ? "q" : "qg";

    $("quickQuestions").innerHTML = [1, 2, 3, 4]
        .map(n => `<button type="button" class="quick-question">${escapeHtml(t(prefix + n, { crop: localName }))}</button>`)
        .join("");
}

async function loadCropImage(crop) {

    imageRequest?.abort();
    imageRequest = new AbortController();

    const name = findCrop(crop)?.en || crop; // English name gives better photo results

    try {

        const response = await fetch(`/api/crop-image?crop=${encodeURIComponent(name)}`, { signal: imageRequest.signal });

        if (!response.ok) return;

        const data = await response.json();

        if (!data.image) return;

        hero.style.backgroundImage = `url("${data.image}")`;
        hero.classList.add("has-image");

        if (data.photographer && data.profile && data.unsplash) {

            const link = (href, label) =>
                `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;

            $("imageAttribution").innerHTML =
                `Photo by ${link(data.profile, data.photographer)} on ${link(data.unsplash, "Unsplash")}`;
        }

    } catch (error) {
        if (error.name !== "AbortError") console.log("Image loading error:", error);
    }
}

cropInput.addEventListener("input", () => {

    const crop = cropInput.value.trim();

    renderSelectedCrop();
    renderQuickQuestions();

    clearTimeout(cropImageTimer);

    if (crop.length >= 3) {
        cropImageTimer = setTimeout(() => loadCropImage(crop), 700);
    }
});

$("quickQuestions").addEventListener("click", event => {

    const button = event.target.closest(".quick-question");

    if (!button) return;

    questionInput.value = button.textContent.trim();
    questionInput.focus();
});


/* =========================================
   ADVICE FORMATTING (safe markdown -> HTML)
========================================= */

function formatAdvice(text) {

    const inline = value =>
        escapeHtml(value)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(?!\s)([^*]+?)\*/g, "<em>$1</em>");

    let html = "";
    let inList = false;

    const closeList = () => {
        if (inList) { html += "</ul>"; inList = false; }
    };

    for (const raw of String(text || "").split("\n")) {

        const line = raw.trim();

        if (!line) { closeList(); continue; }

        const heading = line.match(/^#{1,6}\s+(.+)$/) || line.match(/^\*\*([^*]+?)\*\*:?$/);
        const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);

        if (heading) {
            closeList();
            html += `<h3>${inline(heading[1].replace(/\*\*/g, ""))}</h3>`;
        } else if (item) {
            if (!inList) { html += "<ul>"; inList = true; }
            html += `<li>${inline(item[1])}</li>`;
        } else {
            closeList();
            html += `<p>${inline(line)}</p>`;
        }
    }

    closeList();

    return html;
}


/* =========================================
   RESULT PANEL
========================================= */

function renderSubmitButton() {

    submitBtn.innerHTML = busy
        ? `<span>🌱 ${t("submitBusy")}</span><span>⌛</span>`
        : `<span>🤖 ${t("submit")}</span><span>→</span>`;
}

function renderInsights() {

    if (!lastInsights) return;

    const { crop, soil, season, location } = lastInsights;

    $("insightCropIcon").textContent = getCropIcon(crop);
    $("insightCrop").textContent = crop || "-";
    $("insightSoil").textContent = soil ? t("soil" + soil) : "-";
    $("insightSeason").textContent = season ? t("season" + season) : "-";
    $("insightLocation").textContent = location || "-";
}

function showAdvice(item) {

    adviceLang = item.lang || "en";
    lastInsights = { crop: item.crop, soil: item.soil, season: item.season, location: item.location };

    aiResponse.innerHTML = formatAdvice(item.advice);
    renderInsights();

    loadingPanel.classList.remove("show");
    result.classList.add("show");
    result.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* =========================================
   FORM SUBMISSION
========================================= */

function setBusy(value) {

    busy = value;
    submitBtn.disabled = value;
    renderSubmitButton();
}

form.addEventListener("submit", async event => {

    event.preventDefault();

    const payload = {
        farmerName: $("farmerName").value.trim(),
        location: $("location").value.trim(),
        crop: cropInput.value.trim(),
        soil: $("soil").value,
        season: $("season").value,
        question: questionInput.value.trim(),
        language: lang
    };

    result.classList.remove("show");
    loadingPanel.classList.add("show");
    setBusy(true);

    try {

        const response = await fetch("/api/advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(70000)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.error || t("tError"));

        const item = {
            crop: payload.crop,
            soil: payload.soil,
            season: payload.season,
            location: payload.location,
            question: payload.question,
            advice: data.advice,
            lang,
            ts: Date.now()
        };

        showAdvice(item);
        saveToHistory(item);
        showToast("🌱 " + t("tReady"));

    } catch (error) {

        loadingPanel.classList.remove("show");
        showToast("❌ " + (error.name === "TimeoutError" ? t("tError") : error.message));
        console.error(error);

    } finally {
        setBusy(false);
    }
});


/* =========================================
   TEXT TO SPEECH (reads in the advice's language)
========================================= */

const adviceText = () => aiResponse.innerText.trim();

/* Long utterances stop early in Chrome, so speak in short chunks */
function splitForSpeech(text, max = 180) {

    const sentences = text.match(/[^.!?।\n]+[.!?।]?/g) || [text];
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {

        if (current && (current + sentence).length > max) {
            chunks.push(current.trim());
            current = "";
        }

        current += sentence + " ";
    }

    if (current.trim()) chunks.push(current.trim());

    return chunks;
}

$("speakBtn").addEventListener("click", () => {

    const text = adviceText();

    if (!text) return showToast(t("tNeedAdvice"));

    if (!("speechSynthesis" in window)) return showToast(t("tNoVoice"));

    const speechLang = LANGUAGES[adviceLang].speech;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.replace("_", "-").toLowerCase().startsWith(adviceLang));

    if (voices.length && !voice) return showToast(t("tNoVoice"));

    speechSynthesis.cancel();

    for (const chunk of splitForSpeech(text)) {

        const speech = new SpeechSynthesisUtterance(chunk);

        speech.lang = speechLang;
        speech.rate = 0.9;

        if (voice) speech.voice = voice;

        speechSynthesis.speak(speech);
    }
});

$("pauseBtn").addEventListener("click", () => window.speechSynthesis?.pause());
$("resumeBtn").addEventListener("click", () => window.speechSynthesis?.resume());
$("stopBtn").addEventListener("click", () => window.speechSynthesis?.cancel());


/* =========================================
   COPY & DOWNLOAD
========================================= */

$("copyBtn").addEventListener("click", async () => {

    const text = adviceText();

    if (!text) return showToast(t("tNoCopy"));

    try {
        await navigator.clipboard.writeText(text);
        showToast("📋 " + t("tCopied"));
    } catch {
        showToast(t("tCopyFail"));
    }
});

$("downloadBtn").addEventListener("click", () => {

    const text = adviceText();

    if (!text) return showToast(t("tNoDownload"));

    const crop = lastInsights?.crop || cropInput.value.trim() || "crop";
    const location = lastInsights?.location || "";

    const content = `${t("dlTitle")}\n\n${t("iCrop")}: ${crop}\n${t("iLoc")}: ${location}\n\n${text}`;

    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `SmartFarm-${crop.replace(/[\\/:*?"<>|\s]+/g, "-")}-Advice.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast("📄 " + t("tDownloaded"));
});


/* =========================================
   HISTORY
========================================= */

const getHistory = () => readJson(STORE.history, []);

function saveToHistory(item) {

    try {
        localStorage.setItem(STORE.history, JSON.stringify([item, ...getHistory()].slice(0, HISTORY_LIMIT)));
    } catch (error) {
        console.warn("Could not save history:", error);
    }

    renderHistory();
}

function renderHistory() {

    const history = getHistory();
    const container = $("historyList");

    if (!history.length) {
        container.innerHTML = `<div class="empty-history">🌱<p>${escapeHtml(t("histEmpty"))}</p></div>`;
        return;
    }

    const locale = LANGUAGES[lang].speech;

    container.innerHTML = history.map((item, index) => {

        // older saved items used a ready-made date string
        const date = item.ts ? new Date(item.ts).toLocaleString(locale) : item.date;

        return `
            <div class="history-item">
                <div>
                    <h3>${getCropIcon(item.crop)} ${escapeHtml(item.crop)}</h3>
                    <p>${escapeHtml(item.question)}</p>
                    <p>${escapeHtml(date)}</p>
                </div>
                <button type="button" data-history="${index}">${escapeHtml(t("viewAdvice"))}</button>
            </div>`;
    }).join("");
}

$("historyList").addEventListener("click", event => {

    const button = event.target.closest("[data-history]");
    const item = button && getHistory()[button.dataset.history];

    if (item) showAdvice(item);
});

$("clearHistory").addEventListener("click", () => {

    localStorage.removeItem(STORE.history);
    renderHistory();
    showToast(t("tCleared"));
});


/* =========================================
   INITIALIZE
========================================= */

window.speechSynthesis?.getVoices(); // warm up the voice list

applyLanguage(detectLanguage());
