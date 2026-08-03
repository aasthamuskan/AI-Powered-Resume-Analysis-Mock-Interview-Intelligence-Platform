import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
})


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {

    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)

    // sirf tab append karo jab file actually select hui ho
    if (resumeFile) {
        formData.append("resume", resumeFile)
    }

    const response = await api.post("/api/interview/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return response.data

}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}

/**
 * @description Service to chat with AI coach to discuss/modify the plan.
 */
export const chatWithCoach = async ({ interviewId, message, chatHistory }) => {
    const response = await api.post("/api/interview/chat", { interviewId, message, chatHistory })
    return response.data
}

/**
 * @description Service to evaluate a mock interview answer and get AI feedback.
 */
export const evaluateMockAnswerApi = async ({ question, userAnswer, interviewId, questionType }) => {
    const response = await api.post("/api/interview/mock/evaluate", {
        question,
        userAnswer,
        interviewId,
        questionType,
    })
    return response.data
}

/**
 * @description Service to evaluate a face-based interview answer with expression + voice behavioral metrics.
 */
export const evaluateFaceInterviewApi = async ({ question, transcript, expressionMetrics, voiceMetrics, interviewId, questionType }) => {
    const response = await api.post("/api/interview/mock/face-evaluate", {
        question,
        transcript,
        expressionMetrics,
        voiceMetrics,
        interviewId,
        questionType,
    })
    return response.data
}
