import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { CredentialsModel } from "../Models/CredentialsModel";
import { UserModel } from "../Models/UserModel";
import { store } from "../Redux/Store"; // Adjust path as needed
import { userActions } from "../Redux/UserSlice"; // Adjust path as needed
import { AppConfig } from "../Utils/AppConfig"; // Adjust path as needed

class UserService {
    public constructor() {
        const token = sessionStorage.getItem("token");
        if (token) this.initUser(token);
    }

    private initUser(token: string): void {
        try {
            const container = jwtDecode<{ user: UserModel }>(token);
            const dbUser = container.user;
            store.dispatch(userActions.initUser(dbUser));
        } catch (error) {
            console.warn("Invalid token detected:", error);
            sessionStorage.removeItem("token");
        }
    }

    public async register(user: UserModel): Promise<void> {
        try {
            const response = await axios.post<string>(AppConfig.registerUrl, user);
            const token = response.data;
            this.initUser(token);
            sessionStorage.setItem("token", token);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Registration failed";
            console.error("Registration Error:", errorMessage);
            throw new Error(errorMessage);
        }
    }

    public async login(credentials: CredentialsModel): Promise<void> {
        try {
            const response = await axios.post<string>(AppConfig.loginUrl, credentials);
            const token = response.data;
            this.initUser(token);
            sessionStorage.setItem("token", token);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Login failed";
            console.error("Login Error:", errorMessage);
            throw new Error(errorMessage);
        }
    }

    public logout(): void {
        store.dispatch(userActions.logoutUser());
        sessionStorage.removeItem("token");
    }

    public async getUser(): Promise<UserModel> {
        try {
            const token = sessionStorage.getItem("token");
            if (!token) throw new Error("No token available");
            const response = await axios.get<UserModel>(AppConfig.userUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (err) {
            console.error("Get User Error:", err);
            throw new Error("Failed to get user");
        }
    }

    public async updateUser(user: UserModel): Promise<UserModel> {
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.put<UserModel>(AppConfig.userUrl, user, {
                headers: { Authorization: `Bearer ${token}` },
            });
            store.dispatch(userActions.initUser(response.data)); // Update Redux state
            return response.data;
        } catch (err) {
            console.error("Update User Error:", err);
            throw new Error("Failed to update user");
        }
    }

    public async deleteUser(): Promise<void> {
        try {
            const token = sessionStorage.getItem("token");
            await axios.delete(AppConfig.userUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            this.logout(); // Clear state after deletion
        } catch (err) {
            console.error("Delete User Error:", err);
            throw new Error("Failed to delete user");
        }
    }

    public async getPlayerName(defaultName: string): Promise<string> {
        try {
            const savedName = localStorage.getItem('playerName');
            return savedName || defaultName;
        } catch (error) {
            console.error('Error getting player name:', error);
            return defaultName;
        }
    }

    // Save player name - implementation for the missing method
    public async savePlayerName(name: string): Promise<void> {
        try {
            localStorage.setItem('playerName', name);
        } catch (error) {
            console.error('Error saving player name:', error);
            throw error;
        }
    }
}

export const userService = new UserService();