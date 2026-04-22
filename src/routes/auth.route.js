const { Router } = require('express')
require('./routes/auth.routes')
const authController = require("../controllers/auth.controller")
// const authMiddleware = require("../middlewares/auth.middleware")

const authRouter = Router()

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post("/register", authController.registerUserController)


/**
 * @route POST /api/auth/login
 * @description login user with emial and password
 * @acess Public
 */
authRouter.post("/api/login",authController.loginUserController)
module.exports = authRouter