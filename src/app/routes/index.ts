import { Router } from "express";
import userRouter from "../modules/user/user.routes.js";
import authRouter from "../modules/auth/auth.routes.js";
import travelPlanRouter from "../modules/travel-plan/travelPlan.routes.js";
import subscriptionRouter from "../modules/subscription/subscription.routes.js";
import joinRequestRouter from "../modules/travelPlan-join/travelPlanJoin.routes.js";
import reviewRouter from "../modules/review/review.routes.js";
import participantRouter from "../modules/travelParticipant/participant.router.js";
import tripParticipantRouter from "../modules/trip-participant/tripParticipant.routes.js";
import chatRoomRouter from "../modules/chat-room/chatRoom.routes.js";
import chatMessageRouter from "../modules/chat-message/chatMessage.routes.js";
import adminRouter from "../modules/admin/admin.routes.js";


export const router = Router()

const moduleRoutes = [
    {
        path: '/admin',
        route: adminRouter
    },
    {
        path: '/user',
        route: userRouter
    },
    {
        path: '/auth',
        route: authRouter
    },
    {
        path: '/travel-plan',
        route: travelPlanRouter
    },
    {
        path: '/subscription',
        route: subscriptionRouter
    },
    {
        path: '/join-request',
        route: joinRequestRouter
    },
    {
        path: '/review',
        route: reviewRouter
    },
    {
        path: '/participant',
        route: participantRouter
    },
    {
        path: '/trip-participant',
        route: tripParticipantRouter
    },
    {
        path: '/chat-room',
        route: chatRoomRouter
    },
    {
        path: '/chat-message',
        route: chatMessageRouter
    }
]


moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
