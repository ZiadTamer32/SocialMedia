import DBRepo from "./db.repo.js";
import { UserModel } from "../Models/user.model.js";
import { IUser } from "../../Common/interface/index.js";

class UserRepo extends DBRepo<IUser> {
  constructor() {
    super(UserModel);
  }
}

export default new UserRepo();
