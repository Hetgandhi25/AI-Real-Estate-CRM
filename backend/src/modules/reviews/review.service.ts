import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";

type ReviewPayload = {
  customerId?: string;
  reviewerName?: string;
  rating?: number;
  comment?: string;
};

export async function listReviews(params?: { search?: string }) {
  const where: any = {};
  if (params?.search) {
    const q = params.search;
    where.OR = [
      { reviewerName: { contains: q, mode: "insensitive" } },
      { comment: { contains: q, mode: "insensitive" } },
      {
        customer: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }
  return prisma.review.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReviewById(id: string) {
  return prisma.review.findUnique({ where: { id }, include: { customer: true } });
}

export async function createReview(payload: ReviewPayload) {
  if (!payload.customerId || !payload.reviewerName || !payload.rating || !payload.comment) {
    throw new ApiError(400, "All review fields are required.");
  }

  return prisma.review.create({
    data: {
      customerId: payload.customerId,
      reviewerName: payload.reviewerName,
      rating: payload.rating,
      comment: payload.comment,
    },
    include: { customer: true },
  });
}

export async function updateReview(id: string, payload: ReviewPayload) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  return prisma.review.update({
    where: { id },
    data: {
      customerId: payload.customerId ?? review.customerId,
      reviewerName: payload.reviewerName ?? review.reviewerName,
      rating: payload.rating ?? review.rating,
      comment: payload.comment ?? review.comment,
    },
    include: { customer: true },
  });
}

export async function deleteReview(id: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  await prisma.review.delete({ where: { id } });
}
