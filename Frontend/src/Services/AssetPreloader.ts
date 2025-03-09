// src/Utils/AssetPreloader.ts

export class AssetPreloader {
    private static texturePaths = [
        '/assets/images/grass_top.jpg'
        // Add other texture paths as needed
    ];
    
    private static audioPaths = [
        '/assets/music/Scratch Dog.mp3',
        '/assets/music/Dog Trap.mp3',
        '/assets/music/Slow J-Dog.mp3',
        '/assets/music/Trapdog.mp3',
        '/assets/music/Dogbalism.mp3',
        '/assets/music/Dogfight.mp3',
        '/assets/music/Hip Dog.mp3',
        '/assets/music/Metaldog.mp3',
        '/assets/music/Pixledog.mp3'
    ];
    
    private static alternativePrefixes = ['', './', '../', 'public/', '/public/'];
    
    /**
     * Preload essential assets and resolve when complete or failed
     */
    public static preloadAssets(
        progressCallback: (progress: number) => void
    ): Promise<boolean> {
        return new Promise((resolve) => {
            let totalAssets = this.texturePaths.length + this.audioPaths.length;
            let loadedAssets = 0;
            
            console.log(`Preloading ${totalAssets} assets...`);
            
            // If no assets to load, resolve immediately
            if (totalAssets === 0) {
                progressCallback(100);
                resolve(true);
                return;
            }
            
            // Track if preloader completely failed
            let anySuccess = false;
            
            // Helper to update progress
            const updateProgress = () => {
                loadedAssets++;
                const progress = Math.round((loadedAssets / totalAssets) * 100);
                progressCallback(progress);
                
                // Resolve when all assets are processed
                if (loadedAssets >= totalAssets) {
                    console.log(`Preloader finished. Success: ${anySuccess}`);
                    resolve(anySuccess);
                }
            };
            
            // Preload textures
            this.texturePaths.forEach(texturePath => {
                this.tryLoadTexture(texturePath, (success) => {
                    if (success) anySuccess = true;
                    updateProgress();
                });
            });
            
            // Preload audio
            this.audioPaths.forEach(audioPath => {
                this.tryLoadAudio(audioPath, (success) => {
                    if (success) anySuccess = true;
                    updateProgress();
                });
            });
        });
    }
    
    /**
     * Try to load a texture with multiple path prefixes
     */
    private static tryLoadTexture(
        path: string, 
        callback: (success: boolean) => void
    ): void {
        let loaded = false;
        let attemptsComplete = 0;
        
        this.alternativePrefixes.forEach(prefix => {
            if (loaded) return;
            
            const fullPath = prefix + path;
            const img = new Image();
            
            img.onload = () => {
                if (!loaded) {
                    loaded = true;
                    console.log(`Texture loaded successfully: ${fullPath}`);
                    callback(true);
                }
            };
            
            img.onerror = () => {
                attemptsComplete++;
                if (attemptsComplete >= this.alternativePrefixes.length && !loaded) {
                    console.error(`Failed to load texture: ${path}`);
                    callback(false);
                }
            };
            
            img.src = fullPath;
        });
    }
    
    /**
     * Try to load an audio file with multiple path prefixes
     */
    private static tryLoadAudio(
        path: string, 
        callback: (success: boolean) => void
    ): void {
        let loaded = false;
        let attemptsComplete = 0;
        
        this.alternativePrefixes.forEach(prefix => {
            if (loaded) return;
            
            const fullPath = prefix + path;
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                if (!loaded) {
                    loaded = true;
                    console.log(`Audio loaded successfully: ${fullPath}`);
                    callback(true);
                }
            };
            
            audio.onerror = () => {
                attemptsComplete++;
                if (attemptsComplete >= this.alternativePrefixes.length && !loaded) {
                    console.error(`Failed to load audio: ${path}`);
                    callback(false);
                }
            };
            
            audio.src = fullPath;
        });
    }
}