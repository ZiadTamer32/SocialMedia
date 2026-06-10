import { ExtendedError, Server } from "socket.io";
import { UnauthorizedException } from "../../Common/exceptions/domain.exception.js";
import { checkToken } from "../../MiddleWares/authMiddleware.js";
import { SocketAuth } from "../../Common/interface/index.js";
import type { Server as HTTPServer } from "http";
import chatGateway from "../chat/realtime/chat.gateway.js";
import redisRepo from "../../DB/repositories/redis.repo.js";

class RealTimeGateway {
  private _chatGateway: typeof chatGateway;
  private _redisMethods: typeof redisRepo;
  constructor() {
    this._redisMethods = redisRepo;
    this._chatGateway = chatGateway;
  }

  async authentication(
    socket: SocketAuth,
    next: (err?: ExtendedError) => void,
  ) {
    try {
      let token =
        socket.handshake.headers.authorization ||
        socket.handshake.auth?.token ||
        socket.handshake.auth?.authorization;

      const url = `/${socket.handshake.url.split("/")[1]}`;
      if (!token) {
        throw new UnauthorizedException("Token is required");
      }
      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }
      const { isUserExist, verified } = await checkToken(token, url);
      socket.data.user = isUserExist;
      socket.data.tokenData = verified;
      next();
    } catch (error) {
      next(error as Error);
    }
  }

  initializeIo(server: HTTPServer) {
    const io = new Server(server, {
      cors: {
        origin: "*",
      },
    });

    io.use(this.authentication);

    io.on("connection", async (socket: SocketAuth) => {
      // console.log(`Socket connected ${socket.id}`);
      await this._redisMethods.addToSocketIo(socket.data.user._id, socket.id);
      this._chatGateway.registerEvent(socket, io);
      socket.on("disconnect", async () => {
        // console.log(`Socket disconnected ${socket.id}`);
        await this._redisMethods.removeSocketIo(
          socket.data.user._id,
          socket.id,
        );
      });
    });
  }
}
export default new RealTimeGateway();
