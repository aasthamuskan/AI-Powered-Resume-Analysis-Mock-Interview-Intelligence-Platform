const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")
const { audioUpload } = require("../middlewares/file.middleware")

const interviewRouter = express.Router()



/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description,resume pdf and job description.
 * @access private
 */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)


/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)

/**
 * @route POST /api/interview/chat
 * @description chat with AI coach to discuss or modify the interview plan
 * @access private
 */
interviewRouter.post("/chat", authMiddleware.authUser, interviewController.chatInterviewController)

/**
 * @route POST /api/interview/mock/evaluate
 * @description Evaluate a candidate's mock interview answer using AI and return score + feedback.
 * @access private
 */
interviewRouter.post("/mock/evaluate", authMiddleware.authUser, interviewController.evaluateMockAnswerController)

/**
 * @route POST /api/interview/mock/face-evaluate
 * @description Evaluate a face-based interview answer with expression + voice behavioral signals.
 * @access private
 */
interviewRouter.post("/mock/face-evaluate", authMiddleware.authUser, interviewController.evaluateFaceInterviewController)


/**
 * @route POST /api/interview/transcribe
 * @description Transcribe audio using Groq Whisper. Accepts audio/webm blob from browser.
 * @access private
 */
interviewRouter.post("/transcribe", authMiddleware.authUser, audioUpload.single("audio"), interviewController.transcribeAudioController)


module.exports = interviewRouter
