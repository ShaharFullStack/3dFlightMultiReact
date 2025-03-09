// src/Utils/AppConfig.ts

/**
 * Application configuration
 */
export class AppConfig {
    // API endpoints
    public static apiUrl = process.env.REACT_APP_BASE_URL || window.location.origin + '/';
    public static registerUrl = AppConfig.apiUrl + "api/register/";
    public static loginUrl = AppConfig.apiUrl + "api/login/";
    public static userUrl = AppConfig.apiUrl + "api/users/";
    
    // Game server endpoint
    public static gameServerUrl = AppConfig.apiUrl + "api/balloon/";
    
    // Game settings
    public static maxBalloons = 50;
    public static maxPlayers = 10;
    public static bulletLifespan = 5000;
    public static respawnProtectionTime = 3000;
    
    // Resource paths with public URL handling
    private static getPublicPath() {
        // Check if running in development mode
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // In development, use relative paths; in production, use public URL
        return isDev ? '' : (process.env.PUBLIC_URL || '');
    }
    
    // Asset paths with proper public URL prefixing
    public static groundTexturePath = AppConfig.getPublicPath() + "/assets/images/grass_top.jpg";
    public static musicPath = AppConfig.getPublicPath() + "/assets/music/";
}