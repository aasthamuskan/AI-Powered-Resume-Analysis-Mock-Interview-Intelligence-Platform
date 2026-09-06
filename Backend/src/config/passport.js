const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const userModel = require("../models/user.model")

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails[0]?.value
                const avatar = profile.photos && profile.photos[0]?.value

                if (!email) {
                    return done(new Error("No email found in Google profile"), null)
                }

                // Check if user already exists by googleId or email
                let user = await userModel.findOne({
                    $or: [{ googleId: profile.id }, { email }]
                })

                if (user) {
                    // Update user if googleId or avatar was missing
                    if (!user.googleId) user.googleId = profile.id
                    if (!user.avatar && avatar) user.avatar = avatar
                    await user.save()
                    return done(null, user)
                }

                // Otherwise create new user
                let baseUsername = profile.displayName 
                    ? profile.displayName.replace(/\s+/g, '').toLowerCase() 
                    : email.split('@')[0]

                // Ensure username uniqueness
                let username = baseUsername
                let counter = 1
                while (await userModel.findOne({ username })) {
                    username = `${baseUsername}${counter}`
                    counter++
                }

                user = await userModel.create({
                    username,
                    email,
                    googleId: profile.id,
                    avatar
                })

                return done(null, user)
            } catch (err) {
                return done(err, null)
            }
        }
    )
)

module.exports = passport
