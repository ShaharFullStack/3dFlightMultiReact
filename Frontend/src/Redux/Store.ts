import { configureStore } from "@reduxjs/toolkit";
import { UserModel } from "../Models/UserModel";
import { loggerMiddleware } from "./Middleware";
import { userSlice } from "./UserSlice";


export type AppState = {
    user: UserModel; // Allow null for the initial state
    // likes: LikeModel[]; // Likes state type
};

export const store = configureStore({
    reducer: {
        user: userSlice.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(loggerMiddleware)
});