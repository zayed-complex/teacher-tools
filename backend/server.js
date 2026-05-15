import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
console.log("KEY:", process.env.GEMINI_API_KEY);
const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Serve static files from ../public (parent directory)
app.use(express.static(path.join(__dirname, "..", "public")));

/* =========================
   HOME ROUTE
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "exam_generator.html"));
});

/* =========================
   EXAM GENERATOR ROUTE (للامتحانات الذكية)
========================= */
app.post("/api/generate-exam", async (req, res) => {
    try {
        const { subject, grade, topic, lang, numObjective, numSubjective, totalGrade } = req.body;

        if (!subject || !grade || !topic) {
            return res.status(400).json({ 
                error: "Subject, grade, and topic are required" 
            });
        }

        const isArabic = lang === 'ar';
        
        const promptText = `Subject: ${subject}, Grade: ${grade}, Topic: ${topic}. 
Language: ${isArabic ? 'Arabic' : 'English'}.
Create a formal exam with 4 versions (A, B, C, D). 
Include ${numObjective} MCQs and ${numSubjective} subjective questions (one HOTS). 
Total grade: ${totalGrade}.
Make sure each version has different questions but covers the same topic.`;

        const systemInstruction = `Return ONLY a valid JSON object (NO markdown, NO backticks, NO preamble):
{
  "examTitle": "Exam Title",
  "models": [
    {
      "modelName": "A",
      "objectiveQuestions": [
        {
          "q": "Question text",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "Option 1"
        }
      ],
      "subjectiveQuestions": [
        {
          "q": "Question text",
          "linesNeeded": 3,
          "points": 5,
          "modelAnswer": "Sample answer",
          "isHOTS": false
        }
      ]
    }
  ]
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: promptText }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            },
            {
                headers: { "Content-Type": "application/json" }
            }
        );

        const rawText = response.data.candidates[0].content.parts[0].text;
        const examData = JSON.parse(rawText);

        res.json({ 
            success: true, 
            data: examData,
            subject,
            grade,
            totalGrade
        });

    } catch (error) {
        console.error("Exam Generation Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to generate exam",
            details: error.response?.data?.error?.message || error.message
        });
    }
});

/* =========================
   WORKSHEET GENERATOR ROUTE
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

        const systemInstruction = `Return ONLY a valid JSON object in ${isArabic ? 'Arabic' : 'English'} (NO markdown, NO backticks):
{
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
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: promptText }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            },
            {
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
   LESSON PLAN ROUTE
========================= */
app.post("/api/generate-lesson", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            {
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
   HEALTH CHECK ROUTE
========================= */
app.get("/api/health", (req, res) => {
    res.json({ status: "Server is running ✅" });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Exam Generator: POST http://localhost:${PORT}/api/generate-exam`);
    console.log(`📄 Worksheet Generator: POST http://localhost:${PORT}/api/generate-worksheet`);
});