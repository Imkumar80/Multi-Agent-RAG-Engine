import express from 'express'
import { searchUsers, followUser, unfollowUser, getPublicProfile, getFollowers, getFollowing, getRecommendations, getPincodeRecommendations } from "../controller/userController"

const userRouter = express.Router()

userRouter.get("/search", searchUsers)
userRouter.get("/recommendations", getRecommendations)
userRouter.get("/pincode-recommendations", getPincodeRecommendations)
userRouter.post("/:id/follow", followUser)
userRouter.delete("/:id/follow", unfollowUser)
userRouter.get("/:username", getPublicProfile)
userRouter.get("/:username/followers", getFollowers)
userRouter.get("/:username/following", getFollowing)

export default userRouter
