require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

app.set("trust proxy", 1); // correct client IP behind Render / proxies
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: IS_PROD ? "1h" : 0 }));

/* =========================================
   CONFIG
   To add a language: add it here, in
   public/i18n.js (LANGUAGES + I18N block).
========================================= */

const LANGUAGES = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    gu: "Gujarati",
    ta: "Tamil",
    te: "Telugu"
};

const GROQ_URL = "https://api.groq.com/openai/v1";

// Small model is fine for English; bigger models write Indian languages better.
const MODELS_EN = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const MODELS_INDIC = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"];

const LIMITS = { farmerName: 60, location: 100, crop: 60, soil: 30, season: 30, question: 600 };

console.log(process.env.GROQ_API_KEY ? "✓ Groq API key loaded" : "✗ GROQ_API_KEY missing");
console.log(process.env.UNSPLASH_ACCESS_KEY ? "✓ Unsplash key loaded" : "⚠ Unsplash key missing - fallback image will be used");


/* =========================================
   HELPERS
========================================= */

const httpError = (status, message) => Object.assign(new Error(message), { status });

const groqHeaders = () => ({ Authorization: `Bearer ${process.env.GROQ_API_KEY}` });

async function fetchJson(url, options = {}, timeoutMs = 30000) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    return { response, data };
}

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

/* Model list is cached for 1 hour instead of being fetched on every request */
let modelCache = { ids: null, at: 0 };

async function getAvailableModels() {

    if (modelCache.ids && Date.now() - modelCache.at < 3600_000) {
        return modelCache.ids;
    }

    const { response, data } = await fetchJson(`${GROQ_URL}/models`, { headers: groqHeaders() }, 15000);

    if (!response.ok) {
        throw httpError(response.status, data.error?.message || "Unable to access AI models.");
    }

    modelCache = { ids: data.data.map(model => model.id), at: Date.now() };

    return modelCache.ids;
}

/* Tiny in-memory rate limiter (protects your Groq key) */
const hits = new Map();

function rateLimit(max, windowMs) {

    return (req, res, next) => {

        const now = Date.now();
        const recent = (hits.get(req.ip) || []).filter(time => now - time < windowMs);

        if (recent.length >= max) {
            return res.status(429).json({ error: "Too many requests. Please wait a few minutes and try again." });
        }

        recent.push(now);
        hits.set(req.ip, recent);
        next();
    };
}

setInterval(() => hits.clear(), 3600_000).unref();


/* =========================================
   AVAILABLE GROQ MODELS
========================================= */

app.get("/api/models", async (req, res) => {

    try {
        res.json({ models: await getAvailableModels() });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }

});


/* =========================================
   CROP IMAGE (cached per crop for 24 hours)
========================================= */

const imageCache = new Map();
const EMPTY_IMAGE = { image: null, photographer: null, profile: null, unsplash: null };

app.get("/api/crop-image", async (req, res) => {

    const crop = clean(req.query.crop || "agriculture", LIMITS.crop).toLowerCase();

    res.set("Cache-Control", "public, max-age=86400");

    if (!process.env.UNSPLASH_ACCESS_KEY) {
        return res.json({ ...EMPTY_IMAGE, crop });
    }

    const cached = imageCache.get(crop);

    if (cached && Date.now() - cached.at < 86400_000) {
        return res.json(cached.payload);
    }

    try {

        const { response, data } = await fetchJson(
            "https://api.unsplash.com/search/photos?" +
            new URLSearchParams({
                query: `${crop} farm agriculture field`,
                per_page: "1",
                orientation: "landscape"
            }),
            { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } },
            10000
        );

        if (!response.ok) {
            console.error("Unsplash error:", data);
            return res.status(response.status).json({ error: data.errors?.[0] || "Unable to search crop image." });
        }

        const photo = data.results?.[0];
        const utm = "?utm_source=smartfarm_ai&utm_medium=referral";

        const payload = photo
            ? {
                image: photo.urls.regular,
                crop,
                photographer: photo.user.name,
                profile: `${photo.user.links.html}${utm}`,
                unsplash: `https://unsplash.com/${utm}`
            }
            : { ...EMPTY_IMAGE, crop };

        if (imageCache.size >= 200) {
            imageCache.delete(imageCache.keys().next().value); // drop oldest
        }

        imageCache.set(crop, { payload, at: Date.now() });

        res.json(payload);

    } catch (error) {
        console.error("Crop image error:", error);
        res.status(500).json({ error: "Unable to load crop image." });
    }

});


/* =========================================
   SMART FARM AI ADVICE
========================================= */

function buildPrompt({ farmerName, location, crop, soil, season, question }, languageName) {

    return `
Help an Indian farmer with practical farming guidance.

FARMER DETAILS
Name: ${farmerName || "Not provided"}
Location: ${location || "Not provided"}
Crop: ${crop}
Soil Type: ${soil || "Not provided"}
Season: ${season || "Not provided"}

FARMER QUESTION
${question}

LANGUAGE
Write the ENTIRE answer in ${languageName}, using its native script.
Translate the section headings into ${languageName} too.
Use very simple, farmer-friendly words. Keep numbers and units easy to understand.
Technical terms may be followed by the English word in brackets.

FORMAT
Use exactly these 7 sections, in this order. Write each heading alone on one line as **Heading**:
1. Crop Analysis
2. Soil Advice
3. Irrigation Advice
4. Fertilizer and Nutrient Advice
5. Pest and Disease Precautions
6. Weather and Seasonal Precautions
7. Recommended Next Steps

Use bullet points. Keep advice practical for Indian farming conditions.
Do not invent exact chemical pesticide dosages.
For pesticide or fungicide selection, recommend checking with a qualified agricultural officer,
Krishi Vigyan Kendra (KVK), or a local agricultural expert.
`;
}

app.post("/api/advice", rateLimit(20, 10 * 60 * 1000), async (req, res) => {

    try {

        const body = req.body || {};

        const input = {
            farmerName: clean(body.farmerName, LIMITS.farmerName),
            location: clean(body.location, LIMITS.location),
            crop: clean(body.crop, LIMITS.crop),
            soil: clean(body.soil, LIMITS.soil),
            season: clean(body.season, LIMITS.season),
            question: clean(body.question, LIMITS.question)
        };

        if (!input.crop || !input.question) {
            return res.status(400).json({ error: "Crop name and farming question are required." });
        }

        const language = Object.hasOwn(LANGUAGES, body.language) ? body.language : "en";

        const available = await getAvailableModels();
        const preferred = language === "en" ? MODELS_EN : MODELS_INDIC;
        const model = preferred.find(id => available.includes(id));

        if (!model) {
            return res.status(400).json({
                error: "No suitable AI model is available for this API key.",
                availableModels: available
            });
        }

        const { response, data } = await fetchJson(
            `${GROQ_URL}/chat/completions`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", ...groqHeaders() },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: "You are SmartFarm AI, a helpful and careful agricultural assistant for Indian farmers." },
                        { role: "user", content: buildPrompt(input, LANGUAGES[language]) }
                    ],
                    temperature: 0.6,
                    // Indian scripts use many more tokens per word than English
                    max_completion_tokens: language === "en" ? 1200 : 2400
                })
            },
            60000
        );

        if (!response.ok) {
            console.error("Groq AI Error:", data);
            return res.status(response.status).json({ error: data.error?.message || "AI service error." });
        }

        res.json({
            success: true,
            model,
            language,
            advice: data.choices?.[0]?.message?.content || "No AI advice was generated."
        });

    } catch (error) {

        console.error("Server error:", error);

        res.status(error.status || 500).json({
            error: error.name === "TimeoutError"
                ? "The AI took too long to respond. Please try again."
                : error.status ? error.message : "Unable to connect to SmartFarm AI."
        });

    }

});


/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {
    console.log("\n=================================");
    console.log("🌱 SmartFarm AI Version 3 Started");
    console.log(`http://localhost:${PORT}`);
    console.log("=================================");
});
