const multer = require("multer")

/**
 * PDF upload middleware — used for resume uploads
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true)
        } else {
            cb(new Error("Only PDF files are allowed."), false)
        }
    }
})

/**
 * Audio upload middleware — used for voice transcription (Whisper)
 * Accepts webm, ogg, mp4, wav, m4a, etc.
 */
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB max (Groq Whisper limit)
    },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "audio/webm",
            "audio/ogg",
            "audio/mp4",
            "audio/mpeg",
            "audio/wav",
            "audio/x-wav",
            "audio/m4a",
            "audio/x-m4a",
            "video/webm",  // Some browsers record as video/webm even for audio-only
        ]
        if (allowed.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
            cb(null, true)
        } else {
            cb(new Error(`Unsupported audio format: ${file.mimetype}`), false)
        }
    }
})

module.exports = upload
module.exports.audioUpload = audioUpload