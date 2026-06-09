import { Server } from "socket.io";
import { UnauthorizedException } from "../../Common/exceptions/domain.exception.js";
import { checkToken } from "../../MiddleWares/authMiddleware.js";
import { Server as HTTPServer } from "http";

class RealTimeGateway {
    constructor() { }

    initializeIo(server: HTTPServer) {

        const io = new Server(server, {
            cors: {
                origin: "*",
            },
        });

        io.use(
            async (socket, next) => {
                try {
                    const token = socket.handshake.headers.authorization;
                    const url = `/${socket.handshake.url.split("/")[1]}`
                    if (!token) {
                        throw new UnauthorizedException("Token is required")
                    }
                    const { isUserExist, verified } = await checkToken(token, url);
                    socket.data = { user: isUserExist, tokenData: verified }
                    next();
                } catch (error) {
                    next(error as Error)
                }
            }
        )

        io.on("connection", async (socket) => {
            console.log(`Socket connected ${socket.id}`);
        });
    }
}
export default new RealTimeGateway()