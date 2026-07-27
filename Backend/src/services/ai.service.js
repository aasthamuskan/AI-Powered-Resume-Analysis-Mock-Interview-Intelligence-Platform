const Groq = require("groq-sdk")
const puppeteer = require("puppeteer")
const { z } = require("zod")

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

const MODEL = "llama-3.3-70b-versatile"


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

// ─────────────────────────────────────────────────────────────────────────────


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `You are an expert career coach and interview preparation specialist.

Generate a detailed interview report for a candidate based on the following information:

Resume: ${resume || "Not provided"}
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
        const response = await groq.chat.completions.create({
            model: MODEL,
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

        const raw = JSON.parse(response.choices[0].message.content)

        // Validate + parse with Zod — throws if AI returned wrong structure/types
        const validated = InterviewReportSchema.parse(raw)

        return validated

    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Interview report validation failed:", err.errors)
            throw new Error("AI returned an invalid report structure. Please try again.")
        }
        console.error("generateInterviewReport error:", err.message)
        throw new Error("Failed to generate interview report. Please try again.")
    }
}


async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",   // needed on Render (limited /dev/shm)
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--single-process"           // required for some cloud environments
        ],
        headless: true
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}


async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `You are a professional resume writer.

Generate an ATS-friendly, professional resume in HTML format for a candidate with the following details:

Resume/Experience: ${resume || "Not provided"}
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
        const response = await groq.chat.completions.create({
            model: MODEL,
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

        const raw = JSON.parse(response.choices[0].message.content)

        // Validate with Zod — ensures html field exists and is non-empty
        const { html } = ResumePdfSchema.parse(raw)

        const pdfBuffer = await generatePdfFromHtml(html)

        return pdfBuffer

    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Resume PDF validation failed:", err.errors)
            throw new Error("AI returned an invalid resume structure. Please try again.")
        }
        console.error("generateResumePdf error:", err.message)
        throw new Error("Failed to generate resume PDF. Please try again.")
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
- Candidate's Resume: ${resume || "Not provided"}
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
        const response = await groq.chat.completions.create({
            model: MODEL,
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

        const raw = JSON.parse(response.choices[0].message.content);
        const validated = ChatResponseSchema.parse(raw);
        return validated;
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Plan chat validation failed:", err.errors);
            throw new Error("AI returned an invalid chat response structure.");
        }
        console.error("handlePlanChat error:", err.message);
        throw new Error("Failed to process chat message.");
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

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.4,
        })

        const raw = JSON.parse(completion.choices[0].message.content)
        const validated = MockEvaluationSchema.parse(raw)
        return validated

    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Mock eval validation failed:", err.errors)
            throw new Error("AI returned an invalid evaluation structure.")
        }
        console.error("evaluateMockAnswer error:", err.message)
        throw new Error("Failed to evaluate mock answer.")
    }
}

module.exports = { generateInterviewReport, generateResumePdf, handlePlanChat, evaluateMockAnswer }