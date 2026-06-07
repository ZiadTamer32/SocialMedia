import type {
  Model,
  MongooseUpdateQueryOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  Types,
  UpdateQuery,
} from "mongoose";

abstract class DBRepo<T> {
  constructor(protected model: Model<T>) {}

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<T>;
    projection?: ProjectionType<T>;
    options?: QueryOptions<T>;
  }) {
    return this.model.findOne(filter, projection, options);
  }

  async find({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<T>;
    projection?: ProjectionType<T>;
    options?: QueryOptions<T>;
  }) {
    return this.model.find(filter, projection, options);
  }

  async findOneAndUpdate({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<T>;
    update: UpdateQuery<T>;
    options?: QueryOptions<T>;
  }) {
    return this.model.findOneAndUpdate(filter, update, options);
  }
  async findById({
    id,
    projection,
    options,
  }: {
    id: string | Types.ObjectId;
    projection?: ProjectionType<T>;
    options?: QueryOptions<T>;
  }) {
    return this.model.findById(id, projection, options);
  }

  async create(doc: T) {
    return this.model.create(doc);
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<T>;
    update: UpdateQuery<T>;
    options?: MongooseUpdateQueryOptions<T>;
  }) {
    return this.model.updateOne(filter, update, options);
  }

  async paginate({
    filter,
    projection,
    options,
    page = 1,
    limit = 5,
  }: {
    filter?: QueryFilter<T>;
    projection?: ProjectionType<T>;
    options?: QueryOptions<T>;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;

    const docs = await this.model
      .find(filter, projection, options)
      .skip(skip)
      .limit(limit);

    const totalDocs = await this.model.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
      hasNextPage,
      hasPrevPage,
    };
  }
}

export default DBRepo;
