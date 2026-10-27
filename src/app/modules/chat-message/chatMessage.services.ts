import { StatusCodes } from "http-status-codes"
import { prisma } from "../../config/prisma.config.js"
import AppError from "../../errorHelpers/appError.js"

// Get chat messages
const getChatMessagesForSpecificRoom = async(tripId: string) => {

    const room = await prisma.chatRoom.findUnique({
        where: {
            tripId
        }
    })

    if (!room) {
        return [];
    }

    const result = await prisma.chatMessage.findMany({
        where: {
            roomId: room.id,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profileImage: true,
                    verifiedBadge: true,
                },
            },
        },
        orderBy: {
            createdAt: 'asc',
        },
    });
    return result || [];
}

export const ChatMessagServices = {
    getChatMessagesForSpecificRoom
}