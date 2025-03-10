import cors from "cors";
import express, { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import https, { ServerOptions } from "https";
import path from "path";
import { appConfig } from "./2-utils/app-config";
import { userController } from "./5-controllers/user-controller";
import { errorMiddleware } from "./6-middleware/error-middleware";
import { loggerMiddleware } from "./6-middleware/logger-middleware";
import { securityMiddleware } from "./6-middleware/security-middleware";

class App {
    public server: Express;

    public start(): void {
        this.server = express();

        this.server.use(
            rateLimit({
                windowMs: 5000,
                limit: 1000,
                skip: (request: Request) => request.originalUrl.startsWith("/api/game/images/"),
            })
        );

        this.server.use(helmet({ crossOriginResourcePolicy: false }));

        const corsOrigins = ["http://localhost:3000"];
        this.server.use(cors({ origin: corsOrigins }));

        this.server.use(express.json());

        this.server.use(loggerMiddleware.consoleLogRequest);
        this.server.use(securityMiddleware.preventXssAttack);

        this.server.use("/api", userController.router);

        this.server.use("*", errorMiddleware.routeNotFound);
        this.server.use(errorMiddleware.catchAll);

        if (appConfig.isDevelopment) {
            this.server.listen(appConfig.port, () =>
                console.log(
                    `Listening on http://localhost:${appConfig.port} |+|+|+|+ Reading......... ${corsOrigins}`
                )
            );
        } else {
            const httpsServer = https.createServer( this.server);
            httpsServer.listen(appConfig.port, () =>
                console.log(`Listening on https://localhost:${appConfig.port}`)
            );
        }
    }
}

export const app = new App();
app.start();