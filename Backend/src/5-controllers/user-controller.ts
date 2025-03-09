import express, { Request, Response, NextFunction } from "express";
import { UserModel } from "../3-models/user-model";
import { userService } from "../4-services/user-service";
import { CredentialsModel } from "../3-models/credentials-model";
import { StatusCode } from "../3-models/enums";
import { cyber } from "../2-utils/cyber";
import { ForbiddenError } from "../3-models/error-models";

class UserController {
    public readonly router = express.Router();

    public constructor() {
        this.router.post("/register", this.register);
        this.router.post("/login", this.login);
        this.router.get("/users/me", this.getUser);
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            const user = new UserModel(req.body);
            const token = await userService.register(user);
            res.status(StatusCode.Created).json({ token });
        } catch (error) {
            next(error);
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            const credentials = new CredentialsModel(req.body);
            const token = await userService.login(credentials);
            res.json(token);
        } catch (err) {
            next(err);
        }
    }

    public async getUser(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                throw new ForbiddenError("No token provided");
            }
            const user = cyber.validateToken(token); // Returns UserModel
            res.json(user);
        } catch (error) {
            next(error);
        }
    }
}

export const userController = new UserController();