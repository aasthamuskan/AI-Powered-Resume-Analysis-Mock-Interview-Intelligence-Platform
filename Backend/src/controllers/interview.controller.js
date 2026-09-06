const pdfParse = require("pdf-parse/lib/pdf-parse.js")
const { generateInterviewReport, generateResumePdf, handlePlanChat, evaluateMockAnswer, evaluateFaceInterview, transcribeAudio } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    const { selfDescription, jobDescription } = req.body

    // Validation — JD must be present and meaningful
    if (!jobDescription || jobDescription.trim() === "") {
        return res.status(400).json({ message: "Job description is required." })
    }

    const jdTrimmed = jobDescription.trim()
    const jdWords   = jdTrimmed.split(/\s+/).filter(w => w.length > 1)

    if (jdTrimmed.length < 50) {
        return res.status(400).json({ message: `Job description is too short (${jdTrimmed.length} chars). Please paste the full job description.` })
    }

    if (jdWords.length < 10) {
        return res.status(400).json({ message: `That doesn't look like a real job description (only ${jdWords.length} words detected). Please paste the actual JD text.` })
    }

    let resumeContent = ""

    if (req.file && req.file.buffer) {
        try {
            const parsed = await pdfParse(req.file.buffer)
            resumeContent = parsed.text
            console.log(`PDF parsed successfully. Characters extracted: ${resumeContent.length}`)
        } catch (err) {
            console.error("PDF parse error:", err.message || err)
            return res.status(400).json({ message: "Could not read the uploaded PDF. Please try a different file." })
        }
    }

    if (!resumeContent && (!selfDescription || selfDescription.trim() === "")) {
        return res.status(400).json({ message: "Please upload a resume PDF or provide a self description." })
    }

    try {
        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("generateInterViewReport error:", err.message)
        res.status(500).json({ message: err.message || "Failed to generate interview report." })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    try {
        const interviewReport = await interviewReportModel.findById(interviewReportId)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        if (!jobDescription) {
            return res.status(400).json({ message: "Job description is missing from this report." })
        }

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (err) {
        console.error("generateResumePdf error:", err.message)
        res.status(500).json({ message: err.message || "Failed to generate resume PDF." })
    }
}

/**
 * @description Controller to chat with AI coach about the interview plan, optionally modifying it.
 */
async function chatInterviewController(req, res) {
    const { interviewId, message, chatHistory } = req.body

    if (!interviewId || !message) {
        return res.status(400).json({ message: "Interview ID and message are required." })
    }

    try {
        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        const { resume, selfDescription, jobDescription } = interviewReport

        // Construct current plan details to give the model
        const currentPlan = {
            matchScore: interviewReport.matchScore,
            technicalQuestions: interviewReport.technicalQuestions,
            behavioralQuestions: interviewReport.behavioralQuestions,
            skillGaps: interviewReport.skillGaps,
            preparationPlan: interviewReport.preparationPlan
        }

        const result = await handlePlanChat({
            resume,
            selfDescription,
            jobDescription,
            currentPlan,
            message,
            chatHistory
        })

        // If there is an updated plan, apply updates to MongoDB and save
        if (result.updatedPlan) {
            const up = result.updatedPlan
            if (up.matchScore !== undefined && typeof up.matchScore === 'number') {
                interviewReport.matchScore = up.matchScore
            }
            if (up.technicalQuestions !== undefined && Array.isArray(up.technicalQuestions)) {
                interviewReport.technicalQuestions = up.technicalQuestions
            }
            if (up.behavioralQuestions !== undefined && Array.isArray(up.behavioralQuestions)) {
                interviewReport.behavioralQuestions = up.behavioralQuestions
            }
            if (up.skillGaps !== undefined && Array.isArray(up.skillGaps)) {
                interviewReport.skillGaps = up.skillGaps
            }
            if (up.preparationPlan !== undefined && Array.isArray(up.preparationPlan)) {
                const existingPlan = interviewReport.preparationPlan ? interviewReport.preparationPlan.map(item => item.toObject ? item.toObject() : item) : []
                if (existingPlan.length > 0 && up.preparationPlan.length < existingPlan.length) {
                    // Smart merge by day to prevent partial updates from deleting other days
                    const dayMap = new Map(existingPlan.map(item => [item.day, item]))
                    up.preparationPlan.forEach(newItem => {
                        dayMap.set(newItem.day, newItem)
                    })
                    interviewReport.preparationPlan = Array.from(dayMap.values()).sort((a, b) => a.day - b.day)
                } else {
                    interviewReport.preparationPlan = up.preparationPlan
                }
            }

            await interviewReport.save()
        }

        return res.status(200).json({
            message: "Chat processed successfully",
            response: result.response,
            updatedReport: result.updatedPlan ? interviewReport : null
        })

    } catch (err) {
        console.error("chatInterviewController error:", err)
        return res.status(500).json({ message: err.message || "Failed to process chat message." })
    }
}

/**
 * @description Evaluate a single mock interview answer and return AI feedback.
 */
async function evaluateMockAnswerController(req, res) {
    try {
        const { question, userAnswer, interviewId, questionType } = req.body

        if (!question || typeof question !== "string" || question.trim() === "") {
            return res.status(400).json({ message: "question is required." })
        }
        if (!userAnswer || typeof userAnswer !== "string" || userAnswer.trim() === "") {
            return res.status(400).json({ message: "userAnswer is required." })
        }

        // Fetch job description for context
        let jobDescription = ""
        if (interviewId) {
            const report = await interviewReportModel.findById(interviewId).select("jobDescription").lean()
            if (report?.jobDescription) jobDescription = report.jobDescription
        }

        const evaluation = await evaluateMockAnswer({
            question: question.trim(),
            userAnswer: userAnswer.trim(),
            jobDescription,
            questionType: questionType || "technical",
        })

        return res.status(200).json(evaluation)

    } catch (err) {
        console.error("evaluateMockAnswerController error:", err)
        return res.status(500).json({ message: err.message || "Failed to evaluate answer." })
    }
}


/**
 * @description Evaluate a face-based mock interview answer with expression + voice behavioral data.
 */
async function evaluateFaceInterviewController(req, res) {
    try {
        const { question, transcript, expressionMetrics, voiceMetrics, interviewId, questionType } = req.body

        if (!question || typeof question !== "string" || question.trim() === "") {
            return res.status(400).json({ message: "question is required." })
        }

        // Fetch job description for context
        let jobDescription = ""
        if (interviewId) {
            const report = await interviewReportModel.findById(interviewId).select("jobDescription").lean()
            if (report?.jobDescription) jobDescription = report.jobDescription
        }

        const evaluation = await evaluateFaceInterview({
            question: question.trim(),
            transcript: transcript || "",
            expressionMetrics: expressionMetrics || {},
            voiceMetrics: voiceMetrics || {},
            jobDescription,
            questionType: questionType || "technical",
        })

        return res.status(200).json(evaluation)

    } catch (err) {
        console.error("evaluateFaceInterviewController error:", err)
        return res.status(500).json({ message: err.message || "Failed to evaluate face interview answer." })
    }
}


/**
 * @route POST /api/interview/transcribe
 * @description Transcribe uploaded audio using Groq Whisper
 */
async function transcribeAudioController(req, res) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "No audio file uploaded." })
        }

        const mimeType = req.file.mimetype || "audio/webm"
        const text = await transcribeAudio(req.file.buffer, mimeType)

        return res.status(200).json({ transcript: text })
    } catch (err) {
        console.error("transcribeAudio controller error:", err)
        return res.status(500).json({ message: err.message || "Failed to transcribe audio." })
    }
}


module.exports = { 
    generateInterViewReportController, 
    getInterviewReportByIdController, 
    getAllInterviewReportsController, 
    generateResumePdfController,
    chatInterviewController,
    evaluateMockAnswerController,
    evaluateFaceInterviewController,
    transcribeAudioController
}