import DBRepo from "./db.repo.js";
import { IPost } from "../../Common/interface/index.js";
import { PostModel } from "../Models/post.model.js";
import { HUser } from "../Models/user.model.js";
import { PostPrivacyEnum } from "../../Common/enums/index.js";

class PostRepo extends DBRepo<IPost> {
  constructor() {
    super(PostModel);
  }
  checkGetPostsPrivacy(user: HUser) {
    const conditions = [
      { privacy: PostPrivacyEnum.Public },
      { author: user._id },
      { author: { $in: user.friends }, privacy: PostPrivacyEnum.Friends },
      { tags: { $in: [user._id] } },
    ];
    return conditions;
  }
}

export default new PostRepo();
