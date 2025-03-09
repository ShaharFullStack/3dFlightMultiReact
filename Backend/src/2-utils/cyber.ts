import jwt, { JsonWebTokenError, SignOptions, TokenExpiredError } from "jsonwebtoken";
import { appConfig } from "../2-utils/app-config"; // Corrected import path
import { UserModel } from "../3-models/user-model";
import { RoleModel } from "../3-models/role-model";
import crypto from "crypto";

class Cyber {
    public hash(plainText: string): string {
        if (!plainText) return null;
        return crypto.createHmac("sha512", appConfig.hashingSalt).update(plainText).digest("hex");
    }

    public getNewToken(user: UserModel): string {
        delete user.password; // Remove password from user object
        const payload = { user };
        const options: SignOptions = { expiresIn: "3h" };
        return jwt.sign(payload, appConfig.jwtSecret, options);
    }

    public validateToken(token: string): UserModel {
        try {
            if (!token) throw new Error("No token provided");
            const decoded = jwt.verify(token, appConfig.jwtSecret) as { user: UserModel };
            return decoded.user;
        } catch (err) {
            if (err instanceof TokenExpiredError) {
                console.log("Token expired");
            } else if (err instanceof JsonWebTokenError) {
                console.log("Invalid token");
            } else {
                console.log("Unknown error during token validation:", err);
            }
            throw err; // Re-throw for handling in the caller
        }
    }

    public validateAdmin(token: string): boolean {
        try {
            if (!token) return false;
            const payload = jwt.decode(token) as { user: UserModel };
            if (!payload || !payload.user) return false;
            return payload.user.roleId === RoleModel.Admin;
        } catch (err) {
            console.log("Error decoding token:", err);
            return false;
        }
    }
}

export const cyber = new Cyber();