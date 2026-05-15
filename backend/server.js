import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

console.log("API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("API KEY START:", process.env.GEMINI_API_KEY?.slice(0, 10));

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "..", "public")));

/* =========================
   HOME ROUTE
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "exam_generator.html"));
});

/* =========================
   HELPER FUNCTION
========================= */
async function callGemini(promptText, systemInstruction = "") {
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            contents: [{ parts: [{ text: promptText }] }],
            systemInstruction: systemInstruction
                ? { parts: [{ text: systemInstruction }] }
                : undefined,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4
            }
        },
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
}

/* =========================
   EXAM GENERATOR
========================= */
app.post("/api/generate-exam", async (req, res) => {
    try {
        const { subject, grade, topic, lang, numObjective, numSubjective, totalGrade } = req.body;

        const promptText = `
        Subject: ${subject}
        Grade: ${grade}
        Topic: ${topic}
        Language: ${lang}

        Create exam with:
        - ${numObjective} MCQ
        - ${numSubjective} subjective
        Total Grade: ${totalGrade}
        `;

        const result = await callGemini(promptText);

        res.json(result);

    } catch (error) {
        console.error("Exam Generation Error:", error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/* =========================
   WORKSHEET GENERATOR
========================= */
app.post("/api/generate-worksheet", async (req, res) => {
    try {
        const { subject, grade, topic, lang } = req.body;

        const promptText = `
        Generate worksheet for:
        Subject: ${subject}
        Grade: ${grade}
        Topic: ${topic}
        Language: ${lang}
        `;

        const result = await callGemini(promptText);

        res.json(result);

    } catch (error) {
        console.error("Worksheet Generation Error:", error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/* =========================
   LESSON PLAN GENERATOR
========================= */
app.post("/api/generate-lesson", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: "Prompt is required"
            });
        }

        const result = await callGemini(prompt);

        res.json(result);

    } catch (error) {
        console.error("Lesson Generation Error FULL:", error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
    res.json({
        status: "Server is running ✅"
    });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Exam Generator: POST http://localhost:${PORT}/api/generate-exam`);
    console.log(`📄 Worksheet Generator: POST http://localhost:${PORT}/api/generate-worksheet`);
    console.log(`📚 Lesson Generator: POST http://localhost:${PORT}/api/generate-lesson`);
});