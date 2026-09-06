const Groq = require("groq-sdk")
const { toFile } = require("groq-sdk")
const puppeteer = require("puppeteer")
const { z } = require("zod")

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is missing. Please configure GROQ_API_KEY in your .env file.")
    }
    return new Groq({ apiKey })
}

const MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "groq/compound", "llama-3.3-70b-versatile"]

async function createGroqCompletion(params) {
    const groq = getGroqClient()
    let lastErr = null

    for (const model of MODELS) {
        try {
            return await groq.chat.completions.create({
                ...params,
                model
            })
        } catch (err) {
            console.warn(`Groq model ${model} failed: ${err.message}. Trying next model...`)
            lastErr = err
            const isModelError = err?.error?.code === 'model_not_found' || err?.error?.code === 'model_decommissioned' || err?.status === 404
            if (!isModelError) {
                throw err
            }
        }
    }
    throw lastErr || new Error("All Groq AI models failed.")
}



// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
    question: z.string(),
    intention: z.string(),
    answer: z.string(),
})

const SkillGapSchema = z.object({
    skill: z.string(),
    severity: z.enum(["low", "medium", "high"]),
})

const PreparationPlanSchema = z.object({
    day: z.number().int().positive(),
    focus: z.string(),
    tasks: z.array(z.string()),
})

const InterviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number().min(0).max(100),
    technicalQuestions: z.array(QuestionSchema).min(1),
    behavioralQuestions: z.array(QuestionSchema).min(1),
    skillGaps: z.array(SkillGapSchema),
    preparationPlan: z.array(PreparationPlanSchema).min(1),
})

const ResumePdfSchema = z.object({
    html: z.string().min(1),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanJsonContent(rawText) {
    if (!rawText) return "{}"
    let text = rawText.trim()
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim()
    return text
}

function normalizeInterviewReport(raw, jobDescription = "") {
    if (!raw || typeof raw !== "object") raw = {}

    let title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : ""
    if (!title) {
        const firstLine = (jobDescription || "").trim().split("\n")[0] || ""
        title = firstLine.slice(0, 60) || "Target Position"
    }

    let matchScore = 75
    if (typeof raw.matchScore === "number") {
        matchScore = Math.max(0, Math.min(100, Math.round(raw.matchScore)))
    } else if (typeof raw.matchScore === "string") {
        const parsed = parseInt(raw.matchScore.replace(/[^0-9]/g, ""), 10)
        if (!isNaN(parsed)) matchScore = Math.max(0, Math.min(100, parsed))
    }

    const technicalQuestions = Array.isArray(raw.technicalQuestions)
        ? raw.technicalQuestions.map(q => ({
            question: String(q?.question || "What relevant technical experience do you bring to this role?"),
            intention: String(q?.intention || "To evaluate core technical proficiency."),
            answer: String(q?.answer || "Highlight key projects, architecture, and measurable outcomes.")
        }))
        : []

    if (technicalQuestions.length === 0) {
        technicalQuestions.push({
            question: "Can you walk through a complex technical solution you engineered?",
            intention: "Assessing architectural decisions and technical depth.",
            answer: "Describe the situation, technical choices, trade-offs, and final impact."
        })
    }

    const behavioralQuestions = Array.isArray(raw.behavioralQuestions)
        ? raw.behavioralQuestions.map(q => ({
            question: String(q?.question || "Tell me about a time you handled competing priorities."),
            intention: String(q?.intention || "Evaluating resilience and priority management."),
            answer: String(q?.answer || "Discuss prioritization criteria, stakeholder alignment, and delivery.")
        }))
        : []

    if (behavioralQuestions.length === 0) {
        behavioralQuestions.push({
            question: "How do you navigate technical disagreements within a team?",
            intention: "Assessing teamwork and communication skills.",
            answer: "Focus on data-driven discussions, active listening, and building consensus."
        })
    }

    const skillGaps = Array.isArray(raw.skillGaps)
        ? raw.skillGaps.map(sg => {
            let sev = String(sg?.severity || "medium").toLowerCase().trim()
            if (!["low", "medium", "high"].includes(sev)) sev = "medium"
            return {
                skill: String(sg?.skill || "Role Alignment"),
                severity: sev
            }
        })
        : []

    const preparationPlan = Array.isArray(raw.preparationPlan)
        ? raw.preparationPlan.map((p, idx) => {
            let day = parseInt(p?.day, 10)
            if (isNaN(day) || day < 1) day = idx + 1
            const focus = String(p?.focus || `Day ${day} Preparation Focus`)
            const tasks = Array.isArray(p?.tasks)
                ? p.tasks.map(t => String(t))
                : [String(p?.tasks || "Review key technical topics and practice responses")]
            return { day, focus, tasks }
        })
        : []

    if (preparationPlan.length === 0) {
        preparationPlan.push({
            day: 1,
            focus: "Initial Requirement Review & Setup",
            tasks: ["Analyze target job requirements", "Prepare key STAR story points", "Research target company domain"]
        })
    }

    return {
        title,
        matchScore,
        technicalQuestions,
        behavioralQuestions,
        skillGaps,
        preparationPlan
    }
}

// ─────────────────────────────────────────────────────────────────────────────


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const truncatedResume = (resume || "").slice(0, 7000)
    const prompt = `You are an expert career coach and interview preparation specialist.

Generate a detailed interview report for a candidate based on the following information:

Resume: ${truncatedResume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription}

Return a JSON object with EXACTLY this structure (no extra fields):
{
  "title": "Job title extracted from job description",
  "matchScore": <number 0-100 indicating how well candidate matches the job>,
  "technicalQuestions": [
    {
      "question": "technical question to ask in interview",
      "intention": "why interviewer asks this question",
      "answer": "how to answer - key points, approach, what to cover"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "behavioral question to ask in interview",
      "intention": "why interviewer asks this question",
      "answer": "how to answer - key points, approach, what to cover"
    }
  ],
  "skillGaps": [
    {
      "skill": "skill the candidate is lacking",
      "severity": "low" | "medium" | "high"
    }
  ],
  "preparationPlan": [
    {
      "day": <day number starting from 1>,
      "focus": "main topic to focus on this day",
      "tasks": ["specific task 1", "specific task 2", "specific task 3"]
    }
  ]
}

Generate at least 5 technical questions, 4 behavioral questions, identify key skill gaps, and create a 7-day preparation plan.`

    try {
        const response = await createGroqCompletion({
            messages: [
                {
                    role: "system",
                    content: "You are an expert interview coach. Always respond with valid JSON only, no markdown, no extra text."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        })

        const cleanedStr = cleanJsonContent(response.choices[0]?.message?.content)
        const raw = JSON.parse(cleanedStr)
        const normalized = normalizeInterviewReport(raw, jobDescription)

        // Validate normalized report
        const validated = InterviewReportSchema.parse(normalized)
        return validated

    } catch (err) {
        console.error("generateInterviewReport error details:", err)
        throw new Error(err.message || "Failed to generate interview report. Please try again.")
    }
}



async function generatePdfFromHtml(htmlContent) {
    console.log("Launching Puppeteer browser...")

    const isWindows = process.platform === "win32"

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            // NOTE: --single-process is omitted — it crashes on Windows
        ],
        protocolTimeout: 60000,
        timeout: 30000,
    })

    console.log("Browser launched. Opening page...")

    try {
        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 30000 })

        console.log("Page content set. Generating PDF...")

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })

        console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`)
        return pdfBuffer
    } finally {
        await browser.close()
        console.log("Browser closed.")
    }
}


async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `You are a professional resume writer.

Generate an ATS-friendly, professional resume in HTML format for a candidate with the following details:

Resume/Experience: ${(resume || "Not provided").slice(0, 7000)}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription}

Return a JSON object with EXACTLY this structure:
{
  "html": "<full HTML resume content here>"
}

Requirements for the HTML resume:
- Tailored for the given job description
- ATS-friendly (parseable by applicant tracking systems)
- Professional, clean design with subtle styling
- Include inline CSS styles only
- 1-2 pages when printed to PDF
- Highlight relevant skills and experience
- Should NOT look AI-generated
- Use a professional color scheme (dark navy header, white body)
- Sections: Contact Info, Professional Summary, Skills, Experience, Education, Projects (if any)`

    try {
        const response = await createGroqCompletion({
            messages: [
                {
                    role: "system",
                    content: "You are a professional resume writer. Always respond with valid JSON only, no markdown, no extra text."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.6,
        })

        const cleanedStr = cleanJsonContent(response.choices[0]?.message?.content)
        const raw = JSON.parse(cleanedStr)

        // Validate with Zod — ensures html field exists and is non-empty
        const { html } = ResumePdfSchema.parse(raw)

        const pdfBuffer = await generatePdfFromHtml(html)

        return pdfBuffer

    } catch (err) {
        console.error("generateResumePdf error details:", err)
        throw new Error(err.message || "Failed to generate resume PDF.")
    }
}

const ChatResponseSchema = z.object({
    response: z.string(),
    updatedPlan: z.object({
        matchScore: z.number().min(0).max(100).optional(),
        technicalQuestions: z.array(QuestionSchema).optional(),
        behavioralQuestions: z.array(QuestionSchema).optional(),
        skillGaps: z.array(SkillGapSchema).optional(),
        preparationPlan: z.array(PreparationPlanSchema).optional()
    }).nullable()
})

async function handlePlanChat({ resume, selfDescription, jobDescription, currentPlan, message, chatHistory }) {
    const formattedHistory = chatHistory && chatHistory.length > 0 
        ? chatHistory.map(ch => `${ch.role === 'user' ? 'Candidate' : 'Coach (You)'}: ${ch.content}`).join('\n')
        : "None";

    const prompt = `You are PrepIQ, an expert AI career coach. You are discussing a personalized interview preparation plan with a candidate.

Context:
- Candidate's Resume: ${(resume || "Not provided").slice(0, 5000)}
- Candidate's Self Description: ${selfDescription || "Not provided"}
- Target Job Description: ${jobDescription}

Current Generated Plan Details (Current State):
${JSON.stringify(currentPlan, null, 2)}

Chat Message History:
${formattedHistory}

New Message from Candidate: "${message}"

Your task is to:
1. Respond to the candidate's query or feedback as a professional, encouraging coach.
2. If the candidate explicitly requests changes to their preparation plan, technical questions, behavioral questions, match score, or skill gaps (e.g. "Add more JS questions", "Change Day 3 focus to System Design", "Include Kubernetes in skill gaps"), you MUST make those changes and provide the updated plan fields under "updatedPlan" in your JSON response.
3. If the candidate does NOT request any plan modifications, set "updatedPlan" to null.

CRITICAL RULES FOR "updatedPlan":
- Whenever you modify an array field in "updatedPlan" (such as preparationPlan, technicalQuestions, behavioralQuestions, or skillGaps), you MUST return the COMPLETE list including ALL unchanged items along with the updated/added items.
- NEVER return a partial array containing only the updated item. (For instance, if updating Day 3 of preparationPlan, return ALL days with Day 3 updated, NOT just Day 3).
- Only include top-level keys in "updatedPlan" that are being changed or modified. Leave unmodified sections out of "updatedPlan" (or set them to undefined/omit them).

Return a JSON object with EXACTLY this structure (do not include any markdown formatting, just the raw JSON object):
{
  "response": "<your conversational coaching response to the candidate>",
  "updatedPlan": null | {
    "matchScore": <number 0-100 or omit>,
    "technicalQuestions": [
       { "question": "string", "intention": "string", "answer": "string" }
    ],
    "behavioralQuestions": [
       { "question": "string", "intention": "string", "answer": "string" }
    ],
    "skillGaps": [
       { "skill": "string", "severity": "low" | "medium" | "high" }
    ],
    "preparationPlan": [
       { "day": 1, "focus": "string", "tasks": ["string"] }
    ]
  }
}`;

    try {
        const response = await createGroqCompletion({
            messages: [
                {
                    role: "system",
                    content: "You are PrepIQ, a helpful and adaptive interview coach. Always respond with valid JSON only, no markdown, no extra text."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const cleanedStr = cleanJsonContent(response.choices[0]?.message?.content)
        const raw = JSON.parse(cleanedStr);
        const validated = ChatResponseSchema.parse(raw);
        return validated;
    } catch (err) {
        console.error("handlePlanChat error details:", err);
        throw new Error(err.message || "Failed to process chat message.");
    }
}

// ─── Mock Interview Answer Evaluator ─────────────────────────────────────────

const MockEvaluationSchema = z.object({
    score:        z.number().int().min(1).max(10),
    feedback:     z.string().min(1),
    improvements: z.array(z.string()).min(1).max(5),
    followUp:     z.string(),
    verdict:      z.enum(["excellent", "good", "average", "needs_work"]),
})

/**
 * @description Evaluate a candidate's mock interview answer using AI.
 * @param {string} question - The interview question asked
 * @param {string} userAnswer - The candidate's answer
 * @param {string} jobDescription - Context about the job role
 * @param {string} questionType - 'technical' or 'behavioral'
 */
async function evaluateMockAnswer({ question, userAnswer, jobDescription, questionType }) {
    try {
        const prompt = `You are a senior interviewer at a top tech company evaluating a candidate's mock interview answer.

QUESTION TYPE: ${questionType || "technical"}
QUESTION: ${question}
CANDIDATE'S ANSWER: ${userAnswer || "(no answer provided)"}
JOB CONTEXT: ${jobDescription || "Software engineering role"}

Evaluate the answer rigorously and return a JSON object with exactly these fields:
- "score": integer from 1 to 10 (10 = perfect, 7-8 = good, 5-6 = average, 1-4 = poor)
- "feedback": 2-3 sentences of specific, direct feedback on what was good and what was lacking
- "improvements": array of 2-3 concise, actionable improvement suggestions (short bullet-style strings)
- "followUp": a natural follow-up question the interviewer would ask based on the answer
- "verdict": one of "excellent" (9-10), "good" (7-8), "average" (5-6), "needs_work" (1-4)

Be direct and honest. If the answer is too short or vague, reflect that in the score.
Return ONLY valid JSON. No extra text.

Example format:
{
  "score": 7,
  "feedback": "Your answer demonstrated solid understanding of the core concept. However, you missed mentioning trade-offs.",
  "improvements": ["Mention time complexity", "Include a real-world example", "Discuss scalability trade-offs"],
  "followUp": "How would you optimize this approach for high-traffic scenarios?",
  "verdict": "good"
}`

        const completion = await createGroqCompletion({
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.4,
        })

        const cleanedStr = cleanJsonContent(completion.choices[0]?.message?.content)
        const raw = JSON.parse(cleanedStr)
        const validated = MockEvaluationSchema.parse(raw)
        return validated

    } catch (err) {
        console.error("evaluateMockAnswer error details:", err)
        throw new Error(err.message || "Failed to evaluate mock answer.")
    }
}

// ─── Face Interview Evaluator ────────────────────────────────────────────────

const FaceEvaluationSchema = z.object({
    contentScore:        z.number().int().min(1).max(10),
    confidenceScore:     z.number().int().min(1).max(10),
    communicationScore:  z.number().int().min(1).max(10),
    eyeContactScore:     z.number().int().min(1).max(10),
    overallScore:        z.number().int().min(1).max(10),
    verdict:             z.enum(["excellent", "good", "average", "needs_work"]),
    contentFeedback:     z.string().min(1),
    behaviorFeedback:    z.string().min(1),
    keyStrengths:        z.array(z.string()).min(1).max(4),
    improvements:        z.array(z.string()).min(1).max(5),
    followUp:            z.string(),
    behaviorInsights:    z.array(z.object({
        type:    z.enum(["positive", "negative", "neutral"]),
        insight: z.string(),
    })).min(1).max(5),
})

/**
 * @description Evaluate a face-based mock interview answer with behavioral signals.
 * @param {string} question - Interview question asked
 * @param {string} transcript - Candidate's spoken answer text
 * @param {object} expressionMetrics - Aggregated face expression data
 * @param {object} voiceMetrics - Aggregated voice analysis data
 * @param {string} jobDescription - Job role context
 * @param {string} questionType - 'technical' or 'behavioral'
 */
async function evaluateFaceInterview({ question, transcript, expressionMetrics, voiceMetrics, jobDescription, questionType }) {
    const {
        nervousnessScore = 0,
        eyeContactRatio = 1,
        avgFearful = 0,
        avgHappy = 0,
        avgNeutral = 1,
        expressionChanges = 0,
        dominantExpression = "neutral"
    } = expressionMetrics || {}

    const {
        speakingRate = 130,
        pauseRatio = 0.2,
        rmsVariance = 0,
        silenceCount = 0,
        totalDurationSec = 30
    } = voiceMetrics || {}

    const prompt = `You are a world-class behavioral interview coach and senior technical interviewer at a top tech company. 
You have access to both the candidate's spoken answer AND real-time behavioral data captured during the interview.

═══════════════════ INTERVIEW CONTEXT ═══════════════════
QUESTION TYPE: ${questionType || "technical"}
QUESTION ASKED: ${question}
JOB CONTEXT: ${jobDescription || "Software engineering role"}

═══════════════════ CANDIDATE'S ANSWER ═══════════════════
SPOKEN TRANSCRIPT: ${transcript || "(no answer provided — candidate remained silent)"}

═══════════════════ BEHAVIORAL SIGNALS (Real-time data) ═══════════════════
FACIAL EXPRESSION DATA:
- Nervousness Score: ${nervousnessScore.toFixed(1)}/100 (0=calm, 100=very nervous)
- Eye Contact Maintained: ${(eyeContactRatio * 100).toFixed(0)}% of answer time
- Dominant Expression: ${dominantExpression}
- Average Fearful Expression: ${(avgFearful * 100).toFixed(1)}%
- Average Happy/Confident Expression: ${(avgHappy * 100).toFixed(1)}%
- Average Neutral Expression: ${(avgNeutral * 100).toFixed(1)}%
- Expression Changes (micro-expressions count): ${expressionChanges}

VOICE ANALYSIS DATA:
- Speaking Rate: ${speakingRate} words/min (ideal: 120-160 wpm)
- Pause Ratio: ${(pauseRatio * 100).toFixed(1)}% of answer time spent pausing
- Voice Stability (lower=more stable): ${rmsVariance.toFixed(3)}
- Silence Count (unintended pauses): ${silenceCount}
- Total Answer Duration: ${totalDurationSec.toFixed(1)} seconds

═══════════════════ EVALUATION TASK ═══════════════════
Provide a holistic evaluation combining BOTH the answer content AND behavioral signals.

Return a JSON object with EXACTLY these fields:
- "contentScore": integer 1-10 — quality and completeness of the verbal answer
- "confidenceScore": integer 1-10 — confidence shown via face + voice (low nervousness, stable voice, positive expressions = high)
- "communicationScore": integer 1-10 — clarity, pace, structure of communication
- "eyeContactScore": integer 1-10 — ${(eyeContactRatio * 100).toFixed(0)}% eye contact. Map: >80%=9-10, 60-80%=7-8, 40-60%=5-6, <40%=1-4
- "overallScore": integer 1-10 — weighted holistic score (content 40%, confidence 25%, communication 20%, eyeContact 15%)
- "verdict": "excellent" (9-10), "good" (7-8), "average" (5-6), "needs_work" (1-4) — based on overallScore
- "contentFeedback": 2-3 sentences about the answer content quality
- "behaviorFeedback": 2-3 sentences interpreting the behavioral signals — mention specific data (e.g., "Your ${(eyeContactRatio*100).toFixed(0)}% eye contact shows...")
- "keyStrengths": array of 2-3 specific strengths (content OR behavioral)
- "improvements": array of 2-4 specific, actionable improvements (content AND behavioral)
- "followUp": a natural follow-up question an interviewer would ask
- "behaviorInsights": array of 2-5 objects, each with "type" ("positive"|"negative"|"neutral") and "insight" string — specific behavioral observations

Be direct, specific, and reference the actual behavioral data numbers. Return ONLY valid JSON.`

    try {
        const completion = await createGroqCompletion({
            messages: [
                {
                    role: "system",
                    content: "You are an expert behavioral interview coach. Always respond with valid JSON only, no markdown, no extra text."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.45,
        })

        const cleanedStr = cleanJsonContent(completion.choices[0]?.message?.content)
        const raw = JSON.parse(cleanedStr)
        const validated = FaceEvaluationSchema.parse(raw)
        return validated

    } catch (err) {
        console.error("evaluateFaceInterview error details:", err)
        throw new Error(err.message || "Failed to evaluate face interview answer.")
    }
}

/**
 * @name transcribeAudio
 * @description Transcribe an audio buffer using Groq Whisper (whisper-large-v3-turbo)
 * @param {Buffer} audioBuffer - raw audio file buffer
 * @param {string} mimeType - e.g. "audio/webm"
 * @returns {Promise<string>} transcribed text
 */
async function transcribeAudio(audioBuffer, mimeType = "audio/webm") {
    try {
        const groq = getGroqClient()

        // Determine file extension from mime type
        const extMap = {
            "audio/webm":   "webm",
            "audio/ogg":    "ogg",
            "audio/mp4":    "mp4",
            "audio/mpeg":   "mp3",
            "audio/wav":    "wav",
            "audio/x-wav":  "wav",
            "audio/m4a":    "m4a",
            "audio/x-m4a":  "m4a",
            "video/webm":   "webm",
        }
        const ext = extMap[mimeType] || "webm"
        const filename = `audio.${ext}`

        // Convert Buffer to a File-like object that Groq SDK accepts
        const audioFile = await toFile(audioBuffer, filename, { type: mimeType })

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-large-v3-turbo",
            response_format: "json",
            language: "en",
        })

        return transcription.text || ""
    } catch (err) {
        console.error("Groq Whisper transcription error:", err)
        throw new Error(err.message || "Failed to transcribe audio.")
    }
}

module.exports = { generateInterviewReport, generateResumePdf, handlePlanChat, evaluateMockAnswer, evaluateFaceInterview, transcribeAudio }