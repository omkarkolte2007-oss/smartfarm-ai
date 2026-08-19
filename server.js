require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "public")
));


/* =========================================
   API KEY CHECK
========================================= */

console.log(
    process.env.GROQ_API_KEY
        ? "✓ Groq API key loaded"
        : "✗ GROQ_API_KEY missing"
);

console.log(
    process.env.UNSPLASH_ACCESS_KEY
        ? "✓ Unsplash key loaded"
        : "⚠ Unsplash key missing - fallback image will be used"
);


/* =========================================
   GET AVAILABLE GROQ MODELS
========================================= */

app.get("/api/models", async (req, res) => {

    try {

        const response = await fetch(
            "https://api.groq.com/openai/v1/models",
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.GROQ_API_KEY}`
                }
            }
        );

        const data = await response.json();

        res.status(response.status).json(data);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


/* =========================================
   DYNAMIC CROP IMAGE SEARCH
========================================= */

app.get("/api/crop-image", async (req, res) => {

    try {

        const crop = String(
            req.query.crop || "agriculture"
        ).trim();

        if (!process.env.UNSPLASH_ACCESS_KEY) {

            return res.json({
                image: null,
                crop,
                photographer: null,
                profile: null,
                unsplash: null
            });

        }

        const searchQuery =
            `${crop} farm agriculture field`;

        const response = await fetch(
            "https://api.unsplash.com/search/photos?" +
            new URLSearchParams({
                query: searchQuery,
                per_page: "1",
                orientation: "landscape"
            }),
            {
                headers: {
                    Authorization:
                        `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            console.error(
                "Unsplash error:",
                data
            );

            return res.status(response.status).json({
                error:
                    data.errors?.[0] ||
                    "Unable to search crop image."
            });

        }

        const photo = data.results?.[0];

        if (!photo) {

            return res.json({
                image: null,
                crop,
                photographer: null,
                profile: null,
                unsplash: null
            });

        }

        res.json({

            image: photo.urls.regular,

            crop,

            photographer: photo.user.name,

            profile:
                `${photo.user.links.html}` +
                `?utm_source=smartfarm_ai&utm_medium=referral`,

            unsplash:
                "https://unsplash.com/?utm_source=smartfarm_ai&utm_medium=referral"

        });

    } catch (error) {

        console.error(
            "Crop image error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to load crop image."
        });

    }

});


/* =========================================
   SMART FARM AI ADVICE
========================================= */

app.post("/api/advice", async (req, res) => {

    try {

        const {
            farmerName,
            location,
            crop,
            soil,
            season,
            question
        } = req.body;


        if (
            !crop ||
            !question
        ) {

            return res.status(400).json({
                error:
                    "Crop name and farming question are required."
            });

        }


        /* GET AVAILABLE MODELS */

        const modelResponse = await fetch(
            "https://api.groq.com/openai/v1/models",
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.GROQ_API_KEY}`
                }
            }
        );

        const modelData =
            await modelResponse.json();


        if (!modelResponse.ok) {

            return res.status(
                modelResponse.status
            ).json({

                error:
                    modelData.error?.message ||
                    "Unable to access AI models."

            });

        }


        const availableModels =
            modelData.data.map(
                model => model.id
            );


        const preferredModels = [

            "llama-3.1-8b-instant",

            "llama-3.3-70b-versatile",

            "openai/gpt-oss-20b",

            "openai/gpt-oss-120b"

        ];


        const selectedModel =
            preferredModels.find(
                model =>
                    availableModels.includes(model)
            );


        if (!selectedModel) {

            return res.status(400).json({

                error:
                    "No suitable AI model is available for this API key.",

                availableModels

            });

        }


        const prompt = `
You are SmartFarm AI, an intelligent agricultural assistant.

Help farmers with practical farming guidance.

FARMER DETAILS

Name: ${farmerName || "Not provided"}
Location: ${location || "Not provided"}
Crop: ${crop}
Soil Type: ${soil || "Not provided"}
Season: ${season || "Not provided"}

FARMER QUESTION

${question}

Give a useful answer for Indian farming conditions.

Use exactly these sections:

**Crop Analysis**

**Soil Advice**

**Irrigation Advice**

**Fertilizer and Nutrient Advice**

**Pest and Disease Precautions**

**Weather and Seasonal Precautions**

**Recommended Next Steps**

Use simple English.

Use bullet points.

Keep advice practical.

Do not invent exact chemical pesticide dosages.

For pesticide or fungicide selection, recommend checking with
a qualified agricultural officer, Krishi Vigyan Kendra (KVK),
or local agricultural expert.
`;


        const aiResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${process.env.GROQ_API_KEY}`

                },

                body: JSON.stringify({

                    model: selectedModel,

                    messages: [

                        {
                            role: "system",

                            content:
                                "You are SmartFarm AI, a helpful agricultural assistant."
                        },

                        {
                            role: "user",

                            content: prompt
                        }

                    ],

                    temperature: 0.6,

                    max_completion_tokens: 1200

                })

            }
        );


        const aiData =
            await aiResponse.json();


        if (!aiResponse.ok) {

            console.error(
                "Groq AI Error:",
                aiData
            );

            return res.status(
                aiResponse.status
            ).json({

                error:
                    aiData.error?.message ||
                    "AI service error."

            });

        }


        const advice =
            aiData.choices?.[0]
                ?.message?.content ||
            "No AI advice was generated.";


        res.json({

            success: true,

            model: selectedModel,

            advice

        });

    } catch (error) {

        console.error(
            "Server error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to connect to SmartFarm AI."

        });

    }

});


/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("🌱 SmartFarm AI Version 2 Started");
    console.log(
        `http://localhost:${PORT}`
    );
    console.log("=================================");

});