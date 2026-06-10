import DBRepo from "./db.repo.js";
import { IChat } from "../../Common/interface/index.js";
import { ChatModel } from "../Models/chat.model.js";

class ChatRepo extends DBRepo<IChat> {
  constructor() {
    super(ChatModel);
  }
}

export default new ChatRepo();
