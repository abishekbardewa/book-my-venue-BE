const {
  PrismaClient,
  BookingStatus,
  PaymentStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

export const createBooking = async (startDate, endDate, userId, propertyId) => {
  try {
    // Check if the property exists
    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
      },
    });
    if (!property) {
      return { error: 'Property not found' };
    }

    const startDateWithoutTime = new Date(startDate);
    startDateWithoutTime.setHours(0, 0, 0, 0);
    const endDateWithoutTime = new Date(endDate);
    endDateWithoutTime.setHours(23, 59, 59, 999);

    const existingBooking = await prisma.booking.findMany({
      where: {
        propertyId,
        bookingStatus: BookingStatus.PENDING || BookingStatus.FAILED,
        startDate: {
          lte: endDateWithoutTime,
        },
        endDate: {
          gte: startDateWithoutTime,
        },
      },
    });

    if (existingBooking.length > 0) {
      return { error: 'Already booked for the selected date range.' };
    }

    const booking = await prisma.$transaction(async (prisma) => {
      const createdBooking = await prisma.booking.create({
        data: {
          startDate,
          endDate,
          bookingStatus: BookingStatus.PENDING,
          userId,
          propertyId,
        },
        include: {
          user: true,
          property: true,
        },
      });

      return createdBooking;
    });
    return booking;
  } catch (error) {
    console.error('Error creating booking:', error);
    return { error: error.message };
  }
};
export const getBookingsByCustomerId = async (id, filter) => {
  try {
    let { page, limit, status } = filter;
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const totalCount = await prisma.booking.count({
      where: {
        userId: id,
        bookingStatus: status,
      },
    });
    const bookings = await prisma.booking.findMany({
      where: {
        userId: id,
        bookingStatus: status,
      },
      include: {
        reviews: true,
        user: true,
        property: {
          include: {
            reviews: true,
            propertyImages: true,
          },
        },
        payments: {
          where: {
            status: {
              in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED],
            },
          },
          select: {
            status: true,
            amount: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    });

    return {
      bookings,
      pagination: {
        totalCount,
        page,
        limit,
      },
    };
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw new Error('Failed to get bookings');
  }
};
export const getBookingsByOwnerId = async (ownerId, filter) => {
  try {
    let { page, limit, status } = filter;
    let statusFilter = {};

    if (status === BookingStatus.AWAITING_OWNER_APPROVAL) {
      statusFilter = {
        bookingStatus: status,
        createdAt: {
          // gte: new Date(Date.now() - 3 * 60 * 1000),
          // gte: new Date(Date.now() - 24 * 60 * 60 * 1000), //ONE DAY
        },
      };
    } else {
      statusFilter = {
        bookingStatus: status,
      };
    }
    console.log(statusFilter);
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const totalCount = await prisma.booking.count({
      where: {
        property: {
          ownerId,
        },
        OR: [
          statusFilter,
          // { bookingStatus: BookingStatus.CONFIRMED },
          // {
          //   bookingStatus: BookingStatus.AWAITING_OWNER_APPROVAL,
          //   createdAt: {
          //     // gte: new Date(Date.now() - 3 * 60 * 1000),
          //     gte: new Date(Date.now() - 24 * 60 * 60 * 1000), //ONE DAY
          //   },
          // },
          // { bookingStatus: BookingStatus.CANCELLED },
          // { bookingStatus: BookingStatus.COMPLETED },
        ],
      },
    });
    const bookings = await prisma.booking.findMany({
      where: {
        property: {
          ownerId,
        },
        OR: [
          statusFilter,
          // { bookingStatus: BookingStatus.CONFIRMED },
          // {
          //   bookingStatus: BookingStatus.AWAITING_OWNER_APPROVAL,
          //   createdAt: {
          //     // gte: new Date(Date.now() - 3 * 60 * 1000),
          //     gte: new Date(Date.now() - 24 * 60 * 60 * 1000), //ONE DAY
          //   },
          // },
          // { bookingStatus: BookingStatus.CANCELLED },
          // { bookingStatus: BookingStatus.COMPLETED },
        ],
      },
      include: {
        user: true,
        payments: {
          where: {
            status: {
              in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED],
            },
          },
          select: {
            status: true,
            amount: true,
          },
        },
        property: {
          include: {
            propertyImages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    });
    return {
      bookings,
      pagination: {
        totalCount,
        page,
        limit,
      },
    };
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw new Error('Failed to get bookings');
  }
};
export const getAllBookings = async () => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        property: true,
      },
    });
    return bookings;
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw new Error('Failed to get bookings');
  }
};

export const getBookingById = async (id) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        payments: true,
        user: true,
        property: {
          include: {
            owner: true,
            propertyImages: true,
          },
        },
      },
    });
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw new Error('Failed to get booking');
  }
};

export const getIsPropertyBooked = async (filter) => {
  const { id, role } = filter;
  try {
    const completedBooking = await prisma.booking.findFirst({
      where: {
        userId: id,
        bookingStatus: 'COMPLETED', // Assuming BookingStatus.COMPLETED is a string or use the appropriate enum
      },
    });

    if (!completedBooking) {
      return {
        isBooked: false,
        review: [],
      };
    }

    const review = await prisma.review.findFirst({
      where: {
        userId: id,
        propertyId: completedBooking.propertyId,
      },
    });

    return {
      isBooked: true,
      review: review ? review : [],
    };
  } catch (error) {
    console.error('Error getting booking:', error);
    throw new Error('Failed to get booking');
  }
};

export const updateBookingStatus = async (
  bookingId,
  bookingStatus,
  paymentStatus
) => {
  console.log({ bookingId, bookingStatus, paymentStatus });
  try {
    return await prisma.$transaction(async (prisma) => {
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { bookingStatus },
        include: {
          user: true,
          property: {
            include: {
              owner: true,
            },
          },
          payments: true,
        },
      });

      if (paymentStatus === PaymentStatus.REFUNDED) {
        await prisma.payment.updateMany({
          where: { bookingId, status: PaymentStatus.SUCCESS },
          data: { status: paymentStatus },
        });
      }

      return updatedBooking;
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw new Error('Failed to update booking status');
  }
};

export const updateBookingEmailStatus = async (id, data) => {
  try {
    return await prisma.booking.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw new Error('Failed to update booking status');
  }
};

// New methods

export const getExpiredBookings = async (cutoffTime) => {
  try {
    const expiredBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: {
          lt: cutoffTime,
        },
      },
    });
    return expiredBookings;
  } catch (error) {
    throw new Error('Error retrieving expired bookings');
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    await prisma.booking.delete({
      where: {
        id: bookingId,
        bookingStatus: BookingStatus.PENDING,
      },
    });
  } catch (error) {
    throw new Error('Error deleting booking');
  }
};

export const cancelAndRefund = async (bookingId) => {
  try {
    await prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
        },
      });
      await prisma.payment.updateMany({
        where: { bookingId, status: PaymentStatus.SUCCESS },
        data: { status: PaymentStatus.REFUNDED },
      });
    });
  } catch (error) {
    throw new Error('Error updating booking status');
  }
};

export const getPendingOwnerActionBookings = async (cutoffTime) => {
  try {
    const pendingBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: BookingStatus.AWAITING_OWNER_APPROVAL,
        updatedAt: {
          lt: cutoffTime,
        },
      },
    });
    return pendingBookings;
  } catch (error) {
    throw new Error('Error retrieving pending owner action bookings');
  }
};

export const updateCompletedBookings = async (currentDate) => {
  try {
    const updatedBookings = await prisma.booking.updateMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        // paymentStatus: PaymentStatus.SUCCESS,
        endDate: {
          lt: currentDate,
        },
        payments: {
          some: {
            status: PaymentStatus.SUCCESS,
          },
        },
      },
      data: {
        bookingStatus: BookingStatus.COMPLETED,
      },
    });

    return updatedBookings;
  } catch (error) {
    console.error('Error updating completed bookings:', error);
    throw new Error('Failed to update completed bookings');
  }
};
