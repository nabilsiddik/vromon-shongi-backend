import { prisma } from "../../config/prisma.config.js";
import { UserStatus } from "../../../../generated/prisma/enums.js";

const getAdminAnalytics = async () => {
  // 1. Overall Metrics
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    verifiedUsers,
    totalPlans,
    totalParticipants,
    totalReviews,
    ratingAggregate,
    activeSubscriptions,
    recentUsers,
    recentPlans,
    recentReviews,
    recentRequests,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.BLOCKED } }),
    prisma.user.count({ where: { isDeleted: false, verifiedBadge: true } }),
    prisma.travelPlan.count({ where: { isDeleted: false } }),
    prisma.tripParticipant.count(),
    prisma.review.count({ where: { isDeleted: false } }),
    prisma.review.aggregate({
      where: { isDeleted: false },
      _avg: { rating: true },
    }),
    prisma.subscription.count({
      where: { status: "active" },
    }),
    prisma.user.findMany({
      where: { isDeleted: false },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImage: true,
        verifiedBadge: true,
        createdAt: true,
      },
    }),
    prisma.travelPlan.findMany({
      where: { isDeleted: false },
      take: 6,
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.review.findMany({
      where: { isDeleted: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
            destination: true,
          },
        },
      },
    }),
    prisma.tripParticipant.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        trip: {
          select: {
            id: true,
            title: true,
            destination: true,
          },
        },
      },
    }),
  ]);

  // 2. Travel Types Distribution
  const travelTypeGroups = await prisma.travelPlan.groupBy({
    by: ["travelType"],
    where: { isDeleted: false },
    _count: { id: true },
  });

  const travelTypeBreakdown = travelTypeGroups.map((g) => ({
    type: g.travelType,
    count: g._count.id,
  }));

  // 3. Top Destinations
  const destinationGroups = await prisma.travelPlan.groupBy({
    by: ["destination"],
    where: { isDeleted: false },
    _count: { id: true },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 5,
  });

  const topDestinations = destinationGroups.map((d) => ({
    destination: d.destination,
    count: d._count.id,
  }));

  // 4. Monthly trends (Last 6 months)
  const now = new Date();
  const monthlyData: { month: string; users: number; plans: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthLabel = d.toLocaleString("default", { month: "short" });

    const [usersCount, plansCount] = await Promise.all([
      prisma.user.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.travelPlan.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    monthlyData.push({
      month: monthLabel,
      users: usersCount,
      plans: plansCount,
    });
  }

  // 5. Trip requests status counts
  const participantStatusGroups = await prisma.tripParticipant.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const statusDistribution = participantStatusGroups.map((p) => ({
    status: p.status,
    count: p._count.id,
  }));

  return {
    overview: {
      totalUsers,
      activeUsers,
      blockedUsers,
      verifiedUsers,
      totalPlans,
      totalParticipants,
      totalReviews,
      averageRating: Number((ratingAggregate._avg.rating || 0).toFixed(1)),
      activeSubscriptions,
    },
    monthlyTrends: monthlyData,
    travelTypeBreakdown,
    topDestinations,
    statusDistribution,
    recentActivity: {
      users: recentUsers,
      plans: recentPlans,
      reviews: recentReviews,
      requests: recentRequests,
    },
  };
};

export const AdminServices = {
  getAdminAnalytics,
};
