const form =
    document.getElementById("farmForm");

const cropInput =
    document.getElementById("crop");

const questionInput =
    document.getElementById("question");

const hero =
    document.querySelector(".hero");

const selectedCrop =
    document.getElementById("selectedCrop");

const cropPreviewIcon =
    document.querySelector(
        ".crop-preview-icon"
    );

const imageAttribution =
    document.getElementById(
        "imageAttribution"
    );

const loadingPanel =
    document.getElementById(
        "loadingPanel"
    );

const result =
    document.getElementById("result");

const aiResponse =
    document.getElementById(
        "aiResponse"
    );

const submitBtn =
    document.getElementById(
        "submitBtn"
    );

const toast =
    document.getElementById("toast");


let cropImageTimer = null;


/* =========================================
   CROP THEME
========================================= */

const cropThemes = {

    tomato: {
        primary: "#c62828",
        dark: "#8e1d1d",
        light: "#fff0f0",
        accent: "#ef5350",
        emoji: "🍅"
    },

    wheat: {
        primary: "#b87900",
        dark: "#805200",
        light: "#fff8df",
        accent: "#f1bf42",
        emoji: "🌾"
    },

    maize: {
        primary: "#c28b00",
        dark: "#8a6200",
        light: "#fff8dd",
        accent: "#ffd34e",
        emoji: "🌽"
    },

    corn: {
        primary: "#c28b00",
        dark: "#8a6200",
        light: "#fff8dd",
        accent: "#ffd34e",
        emoji: "🌽"
    },

    onion: {
        primary: "#7e3f98",
        dark: "#59266d",
        light: "#f8effc",
        accent: "#bb7ed6",
        emoji: "🧅"
    },

    potato: {
        primary: "#8b5a2b",
        dark: "#5e3a1a",
        light: "#faf1e8",
        accent: "#c58a55",
        emoji: "🥔"
    },

    sugarcane: {
        primary: "#27834a",
        dark: "#155d31",
        light: "#e9f8ed",
        accent: "#7acb78",
        emoji: "🌱"
    },

    cotton: {
        primary: "#4d8a83",
        dark: "#2d5d58",
        light: "#edf8f7",
        accent: "#94cfc6",
        emoji: "☁️"
    },

    grape: {
        primary: "#6c3c85",
        dark: "#452458",
        light: "#f5eef9",
        accent: "#a975c3",
        emoji: "🍇"
    },

    grapes: {
        primary: "#6c3c85",
        dark: "#452458",
        light: "#f5eef9",
        accent: "#a975c3",
        emoji: "🍇"
    },

    rice: {
        primary: "#4d8b31",
        dark: "#2f5f1b",
        light: "#eef8e9",
        accent: "#9acb69",
        emoji: "🌾"
    },

    soybean: {
        primary: "#6b7d32",
        dark: "#4b5920",
        light: "#f4f8e8",
        accent: "#a5b86b",
        emoji: "🫘"
    }

};


function getCropTheme(crop) {

    const text =
        crop.toLowerCase().trim();

    for (
        const key in cropThemes
    ) {

        if (
            text.includes(key)
        ) {

            return cropThemes[key];

        }

    }

    return {

        primary: "#2e7d32",

        dark: "#176b2b",

        light: "#e8f5e9",

        accent: "#8bc34a",

        emoji: "🌱"

    };

}


function applyCropTheme(crop) {

    const theme =
        getCropTheme(crop);

    const root =
        document.documentElement;

    root.style.setProperty(
        "--primary",
        theme.primary
    );

    root.style.setProperty(
        "--primary-dark",
        theme.dark
    );

    root.style.setProperty(
        "--primary-light",
        theme.light
    );

    root.style.setProperty(
        "--accent",
        theme.accent
    );

    cropPreviewIcon.textContent =
        theme.emoji;

}


const cropQuestionTemplates = {

    tomato: [
        "Why are my tomato leaves curling?",
        "How can I prevent tomato diseases?",
        "Why are my tomato fruits cracking?",
        "How can I improve tomato yield?"
    ],

    sugarcane: [
        "Why are my sugarcane leaves turning yellow?",
        "What causes black spots on sugarcane?",
        "How can I improve sugarcane yield?",
        "How much irrigation does sugarcane need?"
    ],

    wheat: [
        "Why are my wheat leaves turning yellow?",
        "How can I improve wheat yield?",
        "How can I prevent wheat diseases?",
        "What irrigation is needed for wheat?"
    ],

    default: [
        "Why are my leaves turning yellow?",
        "How much water does my crop need?",
        "How can I improve crop yield?",
        "How can I prevent crop diseases?"
    ]

};


function updateQuickQuestions(crop) {

    const container =
        document.getElementById(
            "quickQuestions"
        );

    const cropName =
        crop.toLowerCase().trim();

    let questions =
        cropQuestionTemplates.default;

    for (
        const key in cropQuestionTemplates
    ) {

        if (
            cropName.includes(key)
        ) {

            questions =
                cropQuestionTemplates[key];

            break;

        }

    }

    container.innerHTML =
        questions.map(
            question => `
                <button
                    type="button"
                    class="quick-question"
                >
                    ${question}
                </button>
            `
        ).join("");

}


function loadCropImage(crop) {

    if (
        !crop ||
        crop.length < 2
    ) {

        return;

    }


    fetch(
        `/api/crop-image?crop=${encodeURIComponent(crop)}`
    )

        .then(
            response => response.json()
        )

        .then(
            data => {

                if (!data.image) {

                    return;

                }


                hero.style.backgroundImage =
                    `url("${data.image}")`;

                hero.classList.add(
                    "has-image"
                );


                if (
                    data.photographer &&
                    data.profile &&
                    data.unsplash
                ) {

                    imageAttribution.innerHTML =

                        `Photo by ` +

                        `<a href="${data.profile}" ` +
                        `target="_blank" ` +
                        `rel="noopener noreferrer">` +

                        `${data.photographer}` +

                        `</a> on ` +

                        `<a href="${data.unsplash}" ` +
                        `target="_blank" ` +
                        `rel="noopener noreferrer">` +

                        `Unsplash` +

                        `</a>`;

                }

            }

        )

        .catch(
            error => {

                console.log(
                    "Image loading error:",
                    error
                );

            }
        );

}


/* =========================================
   CROP INPUT EVENT
========================================= */

cropInput.addEventListener(
    "input",
    function () {

        const crop =
            this.value.trim();

        selectedCrop.textContent =
            crop
                ? crop
                : "Your crop will appear here";


        applyCropTheme(crop);

        updateQuickQuestions(crop);


        clearTimeout(
            cropImageTimer
        );


        if (
            crop.length >= 3
        ) {

            cropImageTimer =
                setTimeout(
                    function () {

                        loadCropImage(crop);

                    },
                    700
                );

        }

    }
);


/* =========================================
   QUICK QUESTION BUTTONS
========================================= */

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target.classList.contains(
                "quick-question"
            )
        ) {

            questionInput.value =
                event.target.textContent.trim();

            questionInput.focus();

        }

    }
);


/* =========================================
   SIMPLE MARKDOWN TO HTML
========================================= */

function formatAdvice(text) {

    let advice =
        String(text || "");

    advice =
        advice
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");


    advice =
        advice.replace(
            /^\*\*(.*?)\*\*$/gm,
            "<h3>$1</h3>"
        );


    advice =
        advice.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    advice =
        advice.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );


    const lines =
        advice.split("\n");

    let html = "";
    let inList = false;


    for (let line of lines) {

        const bullet =
            line.match(
                /^\s*[-*]\s+(.*)$/
            );

        const numbered =
            line.match(
                /^\s*\d+\.\s+(.*)$/
            );


        if (
            bullet ||
            numbered
        ) {

            if (!inList) {

                html += "<ul>";

                inList = true;

            }

            html +=
                `<li>${(bullet || numbered)[1]}</li>`;

        }

        else {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (
                line.trim()
            ) {

                if (
                    line.startsWith("<h3>")
                ) {

                    html += line;

                }

                else {

                    html +=
                        `<p>${line}</p>`;

                }

            }

        }

    }


    if (inList) {

        html += "</ul>";

    }


    return html;

}


/* =========================================
   FORM SUBMISSION
========================================= */

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const farmerName =
            document
                .getElementById("farmerName")
                .value.trim();

        const location =
            document
                .getElementById("location")
                .value.trim();

        const crop =
            cropInput.value.trim();

        const soil =
            document
                .getElementById("soil")
                .value;

        const season =
            document
                .getElementById("season")
                .value;

        const question =
            questionInput.value.trim();


        result.classList.remove(
            "show"
        );

        loadingPanel.classList.add(
            "show"
        );


        submitBtn.disabled = true;

        submitBtn.innerHTML =
            "<span>🌱 Analysing...</span><span>⌛</span>";


        try {

            const response =
                await fetch(
                    "/api/advice",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                farmerName,

                                location,

                                crop,

                                soil,

                                season,

                                question

                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "AI service error"
                );

            }


            aiResponse.innerHTML =
                formatAdvice(
                    data.advice
                );


            /* UPDATE INSIGHTS */

            document
                .getElementById(
                    "insightCrop"
                )
                .textContent =
                    crop || "-";


            document
                .getElementById(
                    "insightSoil"
                )
                .textContent =
                    soil || "-";


            document
                .getElementById(
                    "insightSeason"
                )
                .textContent =
                    season || "-";


            document
                .getElementById(
                    "insightLocation"
                )
                .textContent =
                    location || "-";


            loadingPanel.classList.remove(
                "show"
            );

            result.classList.add(
                "show"
            );


            saveToHistory({

                crop,

                question,

                advice: data.advice,

                date:
                    new Date().toLocaleString()

            });


            result.scrollIntoView({

                behavior: "smooth",

                block: "start"

            });


            showToast(
                "🌱 SmartFarm AI advice is ready!"
            );

        }

        catch (error) {

            loadingPanel.classList.remove(
                "show"
            );


            showToast(
                "❌ " + error.message
            );


            console.error(error);

        }

        finally {

            submitBtn.disabled = false;

            submitBtn.innerHTML =
                "<span>🤖 Get AI Advice</span><span>→</span>";

        }

    }
);


/* =========================================
   TEXT TO SPEECH
========================================= */

function getAdviceText() {

    return aiResponse.innerText.trim();

}


document
    .getElementById("speakBtn")
    .addEventListener(
        "click",
        function () {

            const text =
                getAdviceText();

            if (!text) {

                showToast(
                    "Please get AI advice first."
                );

                return;

            }


            window.speechSynthesis.cancel();


            const speech =
                new SpeechSynthesisUtterance(
                    text
                );

            speech.lang = "en-IN";

            speech.rate = 0.9;

            speech.pitch = 1;


            window.speechSynthesis.speak(
                speech
            );

        }
    );


document
    .getElementById("pauseBtn")
    .addEventListener(
        "click",
        function () {

            window.speechSynthesis.pause();

        }
    );


document
    .getElementById("resumeBtn")
    .addEventListener(
        "click",
        function () {

            window.speechSynthesis.resume();

        }
    );


document
    .getElementById("stopBtn")
    .addEventListener(
        "click",
        function () {

            window.speechSynthesis.cancel();

        }
    );


/* =========================================
   COPY ADVICE
========================================= */

document
    .getElementById("copyBtn")
    .addEventListener(
        "click",
        async function () {

            const text =
                getAdviceText();

            if (!text) {

                showToast(
                    "No advice to copy."
                );

                return;

            }


            try {

                await navigator.clipboard.writeText(
                    text
                );

                showToast(
                    "📋 Advice copied!"
                );

            }

            catch {

                showToast(
                    "Unable to copy advice."
                );

            }

        }
    );


/* =========================================
   DOWNLOAD ADVICE
========================================= */

document
    .getElementById("downloadBtn")
    .addEventListener(
        "click",
        function () {

            const text =
                getAdviceText();

            if (!text) {

                showToast(
                    "No advice to download."
                );

                return;

            }


            const crop =
                cropInput.value.trim() ||
                "crop";


            const content =

                "SMARTFARM AI ADVICE\n\n" +

                `Crop: ${crop}\n` +

                `Location: ${
                    document
                        .getElementById("location")
                        .value
                }\n\n` +

                text;


            const blob =
                new Blob(
                    [content],
                    {
                        type:
                            "text/plain"
                    }
                );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            link.href = url;

            link.download =
                `SmartFarm-${crop}-Advice.txt`;


            link.click();


            URL.revokeObjectURL(url);


            showToast(
                "📄 Advice downloaded!"
            );

        }
    );


/* =========================================
   HISTORY
========================================= */

function getHistory() {

    try {

        return JSON.parse(

            localStorage.getItem(
                "smartFarmHistory"
            )

        ) || [];

    }

    catch {

        return [];

    }

}


function saveToHistory(item) {

    const history =
        getHistory();


    history.unshift(item);


    const limitedHistory =
        history.slice(0, 6);


    localStorage.setItem(

        "smartFarmHistory",

        JSON.stringify(
            limitedHistory
        )

    );


    renderHistory();

}


function renderHistory() {

    const history =
        getHistory();


    const container =
        document.getElementById(
            "historyList"
        );


    if (
        history.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-history">

                🌱

                <p>
                    No farming questions yet.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        history.map(
            (item, index) => `

                <div class="history-item">

                    <div>

                        <h3>
                            🌱 ${escapeHtml(item.crop)}
                        </h3>

                        <p>
                            ${escapeHtml(item.question)}
                        </p>

                        <p>
                            ${escapeHtml(item.date)}
                        </p>

                    </div>

                    <button
                        type="button"
                        data-history="${index}"
                    >
                        View Advice
                    </button>

                </div>

            `
        ).join("");

}


document.addEventListener(
    "click",
    function (event) {

        const index =
            event.target.dataset.history;


        if (
            index === undefined
        ) {

            return;

        }


        const history =
            getHistory();

        const item =
            history[index];


        if (!item) {

            return;

        }


        aiResponse.innerHTML =
            formatAdvice(
                item.advice
            );


        result.classList.add(
            "show"
        );


        result.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }
);


document
    .getElementById("clearHistory")
    .addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "smartFarmHistory"
            );

            renderHistory();

            showToast(
                "History cleared."
            );

        }
    );


function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =========================================
   INITIALIZE
========================================= */

renderHistory();