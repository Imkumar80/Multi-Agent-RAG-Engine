import { Request, Response } from "express"
import { ResponseStatus } from "../utils/values"
import { prisma } from "../utils/prisma"
import jwt from 'jsonwebtoken'
import { AUTH_COOKIE_NAME } from "../utils/cookies"

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to get current user ID from token (fail-safe, returns null if not auth)
const getCurrentUserId = (req: Request): string | null => {
    try {
        const token = req.cookies[AUTH_COOKIE_NAME];
        if (!token) return null;
        const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload;
        return payload.id || null;
    } catch {
        return null;
    }
}

export const searchUsers = async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
        return res.status(ResponseStatus.success).json({ users: [], success: true });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                title: true,
                institution: true,
            },
            take: 20
        });

        // Get isFollowing status for each user
        const currentUserId = getCurrentUserId(req);
        let usersWithFollowStatus = users.map(user => ({ ...user, isFollowing: false }));

        if (currentUserId) {
            const followings = await prisma.follows.findMany({
                where: {
                    followerId: currentUserId,
                    followingId: { in: users.map(u => u.id) }
                }
            });
            const followingIds = new Set(followings.map(f => f.followingId));
            usersWithFollowStatus = users.map(user => ({
                ...user,
                isFollowing: followingIds.has(user.id)
            }));
        }

        return res.status(ResponseStatus.success).json({ users: usersWithFollowStatus, success: true });
    } catch (error) {
        console.error("Search error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Search failed", success: false });
    }
}

export const followUser = async (req: Request, res: Response) => {
    const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    if (currentUserId === targetUserId) {
        return res.status(ResponseStatus.clientError).json({ msg: "Cannot follow yourself", success: false });
    }

    try {
        await prisma.follows.create({
            data: {
                followerId: currentUserId,
                followingId: targetUserId
            }
        });
        return res.status(ResponseStatus.success).json({ msg: "Followed successfully", success: true });
    } catch (error: any) {
        if (error.code === 'P2002') { // Already following
            return res.status(ResponseStatus.success).json({ msg: "Already following", success: true });
        }
        return res.status(ResponseStatus.internalServerError).json({ msg: "Follow failed", success: false });
    }
}

export const unfollowUser = async (req: Request, res: Response) => {
    const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    try {
        await prisma.follows.deleteMany({
            where: {
                followerId: currentUserId,
                followingId: targetUserId
            }
        });
        return res.status(ResponseStatus.success).json({ msg: "Unfollowed successfully", success: true });
    } catch (error) {
        return res.status(ResponseStatus.internalServerError).json({ msg: "Unfollow failed", success: false });
    }
}

export const getPublicProfile = async (req: Request, res: Response) => {
    const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
    const currentUserId = getCurrentUserId(req);

    try {
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                _count: {
                    select: {
                        followers: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ msg: "User not found", success: false });
        }

        // Check isFollowing
        let isFollowing = false;
        if (currentUserId) {
            const followRecord = await prisma.follows.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: currentUserId,
                        followingId: user.id
                    }
                }
            });
            isFollowing = !!followRecord;
        }

        // Remove sensitive data
        const { password, email, ...publicUser } = user;

        return res.status(ResponseStatus.success).json({
            user: publicUser,
            stats: {
                followers: (user as any)._count.followers,
                following: (user as any)._count.following
            },
            isFollowing,
            success: true
        });

    } catch (error) {
        console.error("Get public profile error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Internal error", success: false });
    }
}

export const getFollowers = async (req: Request, res: Response) => {
    const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        if (!user) return res.status(404).json({ msg: "User not found", success: false });

        const followers = await prisma.follows.findMany({
            where: { followingId: user.id },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        institution: true
                    }
                }
            }
        });

        // Map to flat user objects
        const users = followers.map(f => f.follower);

        // Get isFollowing status for current user
        const currentUserId = getCurrentUserId(req);
        let usersWithFollowStatus = users.map(u => ({ ...u, isFollowing: false }));

        if (currentUserId) {
            const followings = await prisma.follows.findMany({
                where: {
                    followerId: currentUserId,
                    followingId: { in: users.map(u => u.id) }
                }
            });
            const followingIds = new Set(followings.map(f => f.followingId));
            usersWithFollowStatus = users.map(u => ({
                ...u,
                isFollowing: followingIds.has(u.id)
            }));
        }

        return res.status(ResponseStatus.success).json({ users: usersWithFollowStatus, success: true });
    } catch (error) {
        console.error("Get followers error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to fetch followers", success: false });
    }
}

export const getFollowing = async (req: Request, res: Response) => {
    const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        if (!user) return res.status(404).json({ msg: "User not found", success: false });

        const following = await prisma.follows.findMany({
            where: { followerId: user.id },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        institution: true
                    }
                }
            }
        });

        // Map to flat user objects
        const users = following.map(f => f.following);

        // Get isFollowing status for current user
        const currentUserId = getCurrentUserId(req);
        let usersWithFollowStatus = users.map(u => ({ ...u, isFollowing: false }));

        if (currentUserId) {
            const followings = await prisma.follows.findMany({
                where: {
                    followerId: currentUserId,
                    followingId: { in: users.map(u => u.id) }
                }
            });
            const followingIds = new Set(followings.map(f => f.followingId));
            usersWithFollowStatus = users.map(u => ({
                ...u,
                isFollowing: followingIds.has(u.id)
            }));
        }

        return res.status(ResponseStatus.success).json({ users: usersWithFollowStatus, success: true });
    } catch (error) {
        console.error("Get following error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to fetch following", success: false });
    }
}

export const getRecommendations = async (req: Request, res: Response) => {
    const currentUserId = getCurrentUserId(req);

    try {
        // 1. Get IDs of users current user is already following
        let excludedIds: string[] = [];
        let currentUserPincode: number | null = null;

        if (currentUserId) {
            excludedIds.push(currentUserId);
            const user = await prisma.user.findUnique({
                where: { id: currentUserId },
                select: { pincode: true }
            });
            if (user?.pincode) currentUserPincode = user.pincode;

            const followings = await prisma.follows.findMany({
                where: { followerId: currentUserId },
                select: { followingId: true }
            });
            excludedIds.push(...followings.map(f => f.followingId));
        }

        // 2. "Famous" - Top users by follower count
        const famousUsers = await prisma.user.findMany({
            where: {
                id: { notIn: excludedIds }
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                title: true,
                institution: true,
                _count: {
                    select: { followers: true }
                }
            },
            orderBy: {
                followers: { _count: 'desc' }
            },
            take: 10
        });

        // 3. "Suggested" - Mutuals (Users followed by people current user follows)
        let suggestedUsers: any[] = [];
        if (currentUserId) {
            const followingIds = excludedIds.filter(id => id !== currentUserId);
            if (followingIds.length > 0) {
                const mutuals = await prisma.follows.findMany({
                    where: {
                        followerId: { in: followingIds },
                        followingId: { notIn: excludedIds }
                    },
                    include: {
                        following: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                title: true,
                                institution: true
                            }
                        }
                    },
                    take: 10
                });
                suggestedUsers = mutuals.map(m => m.following);
            }
        }

        // 4. "Local" - Researchers near you
        let localUsers: any[] = [];
        if (currentUserPincode) {
            localUsers = await prisma.user.findMany({
                where: {
                    pincode: currentUserPincode,
                    id: { notIn: excludedIds }
                },
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    title: true,
                    institution: true
                },
                take: 10
            });
        }

        // Combine, filter out nulls/duplicates and limit
        const combined = [...localUsers, ...suggestedUsers, ...famousUsers];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        const finalRecommendations = unique.slice(0, 10);

        return res.status(ResponseStatus.success).json({
            users: finalRecommendations,
            success: true
        });
    } catch (error) {
        console.error("Recommendations error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to fetch recommendations", success: false });
    }
}

export const getPincodeRecommendations = async (req: Request, res: Response) => {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { pincode: true }
        });

        if (!user?.pincode) {
            return res.status(ResponseStatus.success).json({ users: [], success: true });
        }

        const localUsers = await prisma.user.findMany({
            where: {
                pincode: user.pincode,
                id: { not: currentUserId }
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                title: true,
                institution: true,
            },
            take: 10
        });

        // Get isFollowing status
        const followings = await prisma.follows.findMany({
            where: {
                followerId: currentUserId,
                followingId: { in: localUsers.map(u => u.id) }
            }
        });
        const followingIds = new Set(followings.map(f => f.followingId));

        const usersWithFollowStatus = localUsers.map(u => ({
            ...u,
            isFollowing: followingIds.has(u.id)
        }));

        return res.status(ResponseStatus.success).json({
            users: usersWithFollowStatus,
            success: true
        });
    } catch (error) {
        console.error("Local recommendations error:", error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to fetch local recommendations", success: false });
    }
}
