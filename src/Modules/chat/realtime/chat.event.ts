import { Server } from "socket.io";
import { SocketAuth } from "../../../Common/interface/index.js";
import RedisRepo from "../../../DB/repositories/redis.repo.js";
import chatService from "../chat.service.js";

class ChatEvent {
  private _chatService = new chatService();
  private _redisMethods: typeof RedisRepo;

  constructor() {
    this._redisMethods = RedisRepo;
  }

  getChatEvent(socket: SocketAuth) {
    socket.on("getChat", () => {
      console.log("Chat event received");
    });
  }

  sendMessage(socket: SocketAuth, io: Server) {
    return socket.on("sendMessage", async (data) => {
      await this._chatService.sendMessage(data, socket.data.user);
      const usersIds = await this._redisMethods.getSocketIo(
        socket.data.user._id,
      );
      io.to(usersIds).emit("successMessage", data);

      const anotherUser = await this._redisMethods.getSocketIo(data.sendTo);

      if (anotherUser.length) {
        socket.to(anotherUser).emit("newMessage", {
          from: socket.data.user,
          content: data.content,
        });
      }
    });
  }

  sendGroupMessage(socket: SocketAuth, io: Server) {
    return socket.on("sendGroupMessage", async (data) => {
      const group = await this._chatService.sendGroupMessage(
        data,
        socket.data.user,
      );

      const usersIds = await this._redisMethods.getSocketIo(
        socket.data.user._id,
      );

      io.to(usersIds).emit("successMessage", {
        sendTo: data.groupId,
        ...data,
      });

      socket.to(group.roomId as string).emit("newMessage", {
        from: socket.data.user,
        content: data.content,
        groupId: data.groupId,
      });
    });
  }

  joinChatRoom(socket: SocketAuth) {
    return socket.on("join_room", (data) => {
      socket.join(data.roomId);
    });
  }
}

export default new ChatEvent();
