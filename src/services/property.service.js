import { BOOKING_STATUS } from '@/constants/status.constant';
import { BookingStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const create = async (data, imgData) => {
  let {
    propertyName,
    description,
    capacity,
    price,
    checkInTime,
    checkOutTime,
    address,
    city,
    country,
    pincode,
    lat,
    lng,
    extraInfo,
    ownerId,
  } = data;
  const propertyTags = JSON.parse(data.propertyTags);
  let amenities = [];
  if (data.amenities) {
    amenities = JSON.parse(data.amenities);
  }

  return await prisma.property.create({
    data: {
      propertyName,
      description,
      capacity,
      price,
      checkInTime,
      checkOutTime,
      address,
      city,
      country,
      pincode,
      lat,
      lng,
      extraInfo,
      ownerId,
      propertyImages: {
        create: [...imgData],
      },

      amenities: {
        create: [...amenities],
      },
      propertyTags: {
        create: propertyTags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: { id: tag.id },
              create: { tagName: tag.tagName, id: tag.id },
            },
          },
        })),
      },
    },
    include: {
      propertyTags: true,
      amenities: true,
      propertyImages: true,
    },
  });
};

export const findById = async (id) => {
  const propertyWithTags = await prisma.property.findUnique({
    where: { id },

    include: {
      // bookings: true,
      bookings: {
        where: {
          OR: [
            { bookingStatus: BookingStatus.CONFIRMED },
            { bookingStatus: BookingStatus.COMPLETED },
            { bookingStatus: BookingStatus.AWAITING_OWNER_APPROVAL },
            {
              bookingStatus: BookingStatus.PENDING,
              // createdAt: {
              //   gte: new Date(Date.now() - 3 * 60 * 1000),
              // },
            },
          ],
        },
        // select: {
        //   bookingStatus: true,
        //   review: true,
        // },
      },
      // bookings: {
      //   select: {
      //     id: true,
      //     email: true,
      //     firstName: true,
      //     lastName: true,
      //     phone: true,
      //     avatar: true,
      //   },
      // },
      propertyImages: true,
      reviews: true,
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
        },
      },
      amenities: {
        select: {
          amenityName: true,
        },
      },
      propertyTags: {
        select: {
          tag: {
            select: {
              tagName: true,
            },
          },
        },
      },
    },
  });

  const propertyTagsWithNames = propertyWithTags.propertyTags.map(
    (propertyTag) => propertyTag.tag.tagName
  );
  const amenitiesNames = propertyWithTags.amenities.map(
    (amenity) => amenity.amenityName
  );

  return {
    ...propertyWithTags,
    propertyTags: propertyTagsWithNames,
    amenities: amenitiesNames,
  };
};
export const findPropertyNameList = async (filters) => {
  const { city, search } = filters;
  try {
    const properties = await prisma.property.findMany({
      where: {
        city: city || undefined,
        propertyName: {
          contains: search,
        },
      },
      select: {
        propertyName: true,
      },
      take: 10,
    });

    return properties && properties?.length > 0
      ? properties?.map((prop) => prop.propertyName)
      : [];
  } catch (error) {
    console.error('Error in PropertyService.searchProperties:', error);
    throw error;
  }
};

// get all properties
export const findMany = async (filters) => {
  const { city, search, propertyTags, page = 1, limit = 8 } = filters;

  // Convert page and limit to numbers
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  // Calculate the skip value for pagination
  const skip = (pageNumber - 1) * limitNumber;

  // Get total count for pagination metadata
  const totalCount = await prisma.property.count({
    where: {
      city: city || undefined,
      propertyName: {
        contains: search || undefined,
      },
      propertyTags: propertyTags
        ? {
            some: {
              tag: {
                tagName: propertyTags,
              },
            },
          }
        : undefined,
    },
  });

  const properties = await prisma.property.findMany({
    where: {
      city: city || undefined,
      propertyName: {
        contains: search || undefined,
      },
      propertyTags: propertyTags
        ? {
            some: {
              tag: {
                tagName: propertyTags,
              },
            },
          }
        : undefined,
    },
    include: {
      propertyImages: true,
      propertyTags: {
        include: {
          tag: true,
        },
      },
    },
    skip,
    take: limitNumber,
  });

  return {
    properties,
    pagination: {
      totalCount,
      page,
      limit,
    },
  };
};

export const findManyById = async (id, filter) => {
  try {
    let { page, limit } = filter;
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const totalCount = await prisma.property.count({
      where: { ownerId: id },
    });

    const properties = await prisma.property.findMany({
      where: { ownerId: id },
      include: {
        propertyImages: true,
        propertyTags: {
          select: {
            tag: {
              select: {
                tagName: true,
              },
            },
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
      properties,
      pagination: {
        totalCount,
        page,
        limit,
      },
    };
  } catch (error) {
    console.error('Error getting properties:', error);
    throw new Error('Failed to get properties');
  }
};

export const update = async (id, reqObj) => {
  const { allImages, parsedPropertyTags, parsedAmenities, lat, lan, ...rest } =
    reqObj;
  return await prisma.property.update({
    where: {
      id,
    },
    data: {
      ...rest,

      propertyImages: {
        deleteMany: {},
        create: [...allImages],
      },

      amenities: {
        deleteMany: {},
        create: [...parsedAmenities],
      },
      propertyTags: {
        deleteMany: {},
        create: parsedPropertyTags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: { id: tag.id },
              create: { tagName: tag.tagName, id: tag.id },
            },
          },
        })),
      },
    },
    include: {
      propertyTags: true,
      amenities: true,
      propertyImages: true,
    },
  });
};

export const remove = async (id) => {
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
    include: {
      bookings: {
        where: {
          OR: [
            { bookingStatus: BookingStatus.AWAITING_OWNER_APPROVAL },
            { bookingStatus: BookingStatus.CONFIRMED },
          ],
        },
      },
    },
  });

  if (!property) {
    throw new Error(`Property with id ${id} not found`);
  }

  const hasBookingsToExclude = property.bookings.some(
    (booking) =>
      booking.bookingStatus === BookingStatus.AWAITING_OWNER_APPROVAL ||
      booking.bookingStatus === BookingStatus.CONFIRMED
  );

  if (!hasBookingsToExclude) {
    return await prisma.property.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  } else {
    throw new Error(
      'Property has bookings in AWAITING_OWNER_APPROVAL or CONFIRMED status.'
    );
  }
};
