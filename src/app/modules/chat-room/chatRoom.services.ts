import { StatusCodes } from "http-status-codes"
import { prisma } from "../../config/prisma.config.js"
import AppError from "../../errorHelpers/appError.js"
import type { Request, Response } from "express"
import type { JWTPayload } from "../../interfaces/index.js"

// check if the user can access chat room
export const canAccessChatRoom = async (tripId: string, userId: string) => {
  const trip = await prisma.travelPlan.findUnique({
    where: { id: tripId },
    select: { id: true, userId: true, isDeleted: true },
  });

  if (!trip || trip.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Travel plan not found');
  }

  // The creator/host of the trip can always access the chat room
  if (trip.userId === userId) {
    return true;
  }

  // Check if approved participant
  const participant = await prisma.tripParticipant.findFirst({
    where: {
      tripId,
      userId,
      status: 'APPROVED',
    },
  });

  if (!participant) {
    throw new AppError(StatusCodes.FORBIDDEN, 'You are not allowed to access this chat room. Only approved participants and the host can enter.');
  }

  return true;
};

// Get chat room
export const getChatRoom = async (tripId: string, userId: string) => {
  await canAccessChatRoom(tripId, userId);

  let room = await prisma.chatRoom.findUnique({
    where: { tripId },
    include: {
      trip: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    room = await prisma.chatRoom.create({
      data: { tripId },
      include: {
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
  }

  return room;
};


export const ChatRoomServices = {
    getChatRoom,
}