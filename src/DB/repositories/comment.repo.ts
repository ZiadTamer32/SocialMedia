import DBRepo from "./db.repo.js";
import { IComment } from "../../Common/interface/index.js";
import { CommentModel } from "../Models/comment.model.js";

class CommentRepo extends DBRepo<IComment> {
  constructor() {
    super(CommentModel);
  }
}

export default new CommentRepo();
