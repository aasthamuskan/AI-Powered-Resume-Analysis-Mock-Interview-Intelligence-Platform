import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, chatWithCoach, evaluateMockAnswerApi, evaluateFaceInterviewApi } from "../services/interview.api"
import { useContext } from "react"
import { InterviewContext } from "../interview.context"


export const useInterview = () => {

    const context = useContext(InterviewContext)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to generate report. Please try again."
            console.error("generateReport error:", err)
            setError(msg)
        } finally {
            setLoading(false)
        }

        return response?.interviewReport
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to fetch report."
            console.error("getReportById error:", err)
            setError(msg)
        } finally {
            setLoading(false)
        }
        return response?.interviewReport
    }

    const getReports = async () => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to fetch reports."
            console.error("getReports error:", err)
            setError(msg)
        } finally {
            setLoading(false)
        }

        return response?.interviewReports
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError(null)
        try {
            const blob = await generateResumePdf({ interviewReportId })

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()

            // Cleanup — remove link & revoke object URL to free memory
            link.remove()
            window.URL.revokeObjectURL(url)

        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to generate resume. Please try again."
            console.error("Resume PDF download failed:", err)
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    const chatWithAI = async ({ interviewId, message, chatHistory }) => {
        try {
            setError(null)
            const response = await chatWithCoach({ interviewId, message, chatHistory })
            if (response.updatedReport) {
                setReport(response.updatedReport)
            }
            return response
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to send message."
            console.error("chatWithAI error:", err)
            setError(msg)
            throw err
        }
    }

    const evaluateMockAnswer = async ({ question, userAnswer, interviewId, questionType }) => {
        try {
            setError(null)
            const result = await evaluateMockAnswerApi({ question, userAnswer, interviewId, questionType })
            return result
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to evaluate answer."
            console.error("evaluateMockAnswer error:", err)
            setError(msg)
            throw err
        }
    }

    const evaluateFaceInterview = async ({ question, transcript, expressionMetrics, voiceMetrics, interviewId, questionType }) => {
        try {
            setError(null)
            const result = await evaluateFaceInterviewApi({ question, transcript, expressionMetrics, voiceMetrics, interviewId, questionType })
            return result
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Failed to evaluate face interview answer."
            console.error("evaluateFaceInterview error:", err)
            setError(msg)
            throw err
        }
    }

    return { loading, error, report, reports, generateReport, getReportById, getReports, getResumePdf, chatWithAI, evaluateMockAnswer, evaluateFaceInterview }

}