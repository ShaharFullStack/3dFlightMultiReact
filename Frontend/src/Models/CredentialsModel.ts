// src/Models/CredentialsModel.ts

/**
 * Model for user credentials
 */
export class CredentialsModel {
    public username: string;
    public email: string;
    public password: string;

    /**
     * Create new credentials
     */
    constructor(username?: string, password?: string) {
        this.username = username || "";
        this.password = password || "";
    }
}