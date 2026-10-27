import type { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma.config.js";

export const registerChatHandlers = (io: Server, socket: Socket) => {
    // join room 
    socket.on('join-room', async ({ tripId, userId }) => {
        if (!tripId) return;
        socket.join(tripId);

        socket.to(tripId).emit('user-joined', {
            userId,
            timestamp: new Date()
        });
    });

    // leave room
    socket.on('leave-room', ({ tripId }) => {
        if (tripId) {
            socket.leave(tripId);
        }
    });

    // send message 
    socket.on('send-message', async ({ tripId, senderId, content }) => {
        if (!tripId || !senderId || !content?.trim()) return;

        try {
            let room = await prisma.chatRoom.findUnique({
                where: { tripId }
            });

            if (!room) {
                room = await prisma.chatRoom.create({
                    data: { tripId }
                });
            }

            const message = await prisma.chatMessage.create({
                data: {
                    content: content.trim(),
                    senderId,
                    roomId: room.id
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true,
                            verifiedBadge: true
                        }
                    }
                }
            });

            io.to(tripId).emit('new-message', message);
        } catch (error) {
            console.error("Error creating/emitting chat message:", error);
            socket.emit('chat-error', { message: 'Failed to send message.' });
        }
    });

    // Typing indicators
    socket.on('typing', ({ tripId, userName }) => {
        if (tripId && userName) {
            socket.to(tripId).emit('user-typing', userName);
        }
    });

    socket.on('stop-typing', ({ tripId, userName }) => {
        if (tripId) {
            socket.to(tripId).emit('user-stop-typing', userName);
        }
    });
};