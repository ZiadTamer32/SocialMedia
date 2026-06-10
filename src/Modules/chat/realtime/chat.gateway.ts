import ChatEvents from "./chat.event.js";
import { SocketAuth } from "../../../Common/interface/index.js";
import { Server } from "socket.io";

class ChatGateway {
  private _chatEvents: typeof ChatEvents;

  constructor() {
    this._chatEvents = ChatEvents;
  }

  registerEvent(socket: SocketAuth, io: Server) {
    this._chatEvents.getChatEvent(socket);
    this._chatEvents.sendMessage(socket, io);
    this._chatEvents.sendGroupMessage(socket, io);
    this._chatEvents.joinChatRoom(socket);
  }
}

export default new ChatGateway();
