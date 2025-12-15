// utils/paginate.js
const paginate = async ({
  model,
  page = 1,
  limit = 10,
  query = {},
  sort = { createdAt: -1, _id: 1 },
  populate = null
}) => {
  const skip = (page - 1) * limit;

  const total = await model.countDocuments(query);

  let dbQuery = model.find(query).sort(sort).skip(skip).limit(limit);

  if (populate) {
    dbQuery = dbQuery.populate(populate);
  }

  const data = await dbQuery;

  return {
    data,
    pagination: {
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit,
      hasMore: page * limit < total,
    },
  };
};

module.exports = paginate;
