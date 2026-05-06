import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   HOME ROUTE
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   WORKSHEET GENERATOR ROUTE
   يستخدمه تطبيق React لتوليد أوراق العمل
========================= */
app.post("/api/generate-worksheet", async (req, res) => {
    try {
        const { subject, grade, topic, lang } = req.body;

        if (!subject || !grade || !topic) {
            return res.status(400).json({ 
                error: "Subject, grade, and topic are required" 
            });
        }

        const isArabic = lang === 'ar';
        
        const promptText = `Subject: ${subject}, Grade: ${grade}, Topic: ${topic}. Language: ${isArabic ? 'Arabic' : 'English'}.
Create a differentiated worksheet with self-assessment. 
STRICT RULES:
1. Group 1: Foundational/Basic questions.
2. Group 2: Intermediate/Mid-level questions.
3. Challenge Questions: Advanced/Gifted level questions.
4. Use Latin letters (x, y, z) for math/science. 
5. All text in ${isArabic ? 'Arabic' : 'English'}.
6. DO NOT include a starter activity.`;

        const systemInstruction = `Return ONLY a valid JSON object in ${isArabic ? 'Arabic' : 'English'}: {
  "title": "", 
  "standard": "", 
  "essentialQuestion": "", 
  "worksheet": {
    "level1": {"title": "${isArabic ? 'المجموعة الأولى' : 'Group 1'}", "questions": ["3 questions"]},
    "level2": {"title": "${isArabic ? 'المجموعة الثانية' : 'Group 2'}", "questions": ["3 questions"]},
    "level3": {"title": "${isArabic ? 'أسئلة التحدي' : 'Challenge Questions'}", "questions": ["2 questions"]}
  },
  "selfAssessment": [
    {"criteria": "...", "status": ""},
    {"criteria": "...", "status": ""},
    {"criteria": "...", "status": ""}
  ]
}. No markdown.`;

        const response = await axios.post(
            "[generativelanguage.googleapis.com](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent)",
            {
                contents: [{ parts: [{ text: promptText }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            },
            {
                params: { key: process.env.GEMINI_API_KEY },
                headers: { "Content-Type": "application/json" }
            }
        );

        const rawText = response.data.candidates[0].content.parts[0].text;
        const planData = JSON.parse(rawText);

        res.json({ success: true, data: planData });

    } catch (error) {
        console.error("Worksheet Generation Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to generate worksheet",
            details: error.response?.data?.error?.message || error.message
        });
    }
});

/* =========================
   LESSON PLAN ROUTE (الأصلي)
========================= */
app.post("/generate-lesson", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await axios.post(
            "[generativelanguage.googleapis.com](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent)",
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            {
                params: { key: process.env.GEMINI_API_KEY },
                headers: { "Content-Type": "application/json" }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("Lesson Generation Error:", error.response?.data || error.message);
        res.status(500).json({
            error: error.response?.data || error.message
        });
    }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
