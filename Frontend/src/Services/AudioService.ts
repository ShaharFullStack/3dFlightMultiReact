// src/Services/AudioService.ts

/**
 * Service for handling game audio
 */
class AudioService {
    private musicTracks: string[] = [
        'assets/music/Scratch Dog.mp3',
        'assets/music/Dog Trap.mp3',
        'assets/music/Slow J-Dog.mp3',
        'assets/music/Trapdog.mp3',
        'assets/music/Dogbalism.mp3',
        'assets/music/Dogfight.mp3',
        'assets/music/Hip Dog.mp3',
        'assets/music/Metaldog.mp3',
        'assets/music/Pixledog.mp3'
    ];
    
    private currentMusicIndex: number = 0;
    private backgroundMusic: HTMLAudioElement | null = null;
    private isMuted: boolean = false;
    private volume: number = 0.5;
    private showMessageCallback: ((message: string) => void) | null = null;
    private isCurrentlyPlaying: boolean = false;
    private trackLoadingInProgress: boolean = false;

    /**
     * Set callback for showing messages
     */
    public setMessageCallback(callback: (message: string) => void): void {
        this.showMessageCallback = callback;
    }

    /**
     * Play background music
     */
    public playMusic(): void {
        // Prevent multiple simultaneous calls
        if (this.trackLoadingInProgress) {
            console.log("Track loading already in progress, ignoring duplicate call");
            return;
        }
        
        try {
            console.log("Starting music playback");
            
            // Stop any playing music first
            this.stopTrack();
            
            // Set the flag to indicate loading is in progress
            this.trackLoadingInProgress = true;
            
            // Load and play the music
            this.loadAndPlayTrack();
        } catch (error) {
            console.error("Critical error in playMusic:", error);
            this.trackLoadingInProgress = false;
        }
    }
    
    /**
     * Load and play the current track
     */
    private loadAndPlayTrack(): void {
        // Get the current track path
        const trackPath = this.musicTracks[this.currentMusicIndex];
        console.log(`Attempting to load music: ${trackPath}`);
        
        // Create audio element
        this.backgroundMusic = new Audio(trackPath);
        this.backgroundMusic.volume = this.isMuted ? 0 : this.volume;
        
        // Set up error handler
        this.backgroundMusic.onerror = (e) => {
            console.error(`Error loading music track: ${trackPath}`, e);
            
            // Try with alternate path formats
            this.tryAlternatePathFormats();
        };
        
        // Set up success handler
        this.backgroundMusic.oncanplaythrough = () => {
            console.log(`Music loaded successfully: ${trackPath}`);
            
            // Play the audio
            if (this.backgroundMusic) {
                this.backgroundMusic.play().then(() => {
                    console.log("Audio playback started successfully");
                    this.isCurrentlyPlaying = true;
                    this.trackLoadingInProgress = false;
                    
                    // Show track name
                    if (this.showMessageCallback) {
                        const trackName = trackPath
                            .replace('assets/music/', '')
                            .replace('.mp3', '');
                        this.showMessageCallback(trackName + " :שם הטראק");
                    }
                }).catch(e => {
                    console.error('Error playing music:', e);
                    
                    // Handle autoplay restrictions
                    if (this.showMessageCallback) {
                        this.showMessageCallback("Click on the screen to enable audio");
                    }
                    
                    const handleUserInteraction = () => {
                        if (this.backgroundMusic) {
                            this.backgroundMusic.play().catch(err => {
                                console.error("Still can't play audio after user interaction:", err);
                            });
                        }
                        document.removeEventListener('click', handleUserInteraction);
                    };
                    
                    document.addEventListener('click', handleUserInteraction);
                    this.trackLoadingInProgress = false;
                });
                
                // Set up ended handler
                this.backgroundMusic.onended = () => {
                    console.log("Track ended, playing next track");
                    this.isCurrentlyPlaying = false;
                    this.currentMusicIndex = (this.currentMusicIndex + 1) % this.musicTracks.length;
                    this.playMusic();
                };
            }
        };
        
        // Start loading the track
        this.backgroundMusic.load();
    }
    
    /**
     * Try alternative path formats for loading the track
     */
    private tryAlternatePathFormats(): void {
        const prefixes = ['./assets/music/', '../assets/music/', 'assets/music/', ''];
        const trackName = this.musicTracks[this.currentMusicIndex].split('/').pop() || '';
        let attemptIndex = 0;
        
        const tryNextPrefix = () => {
            if (attemptIndex >= prefixes.length) {
                console.log("All path formats failed, moving to next track");
                this.currentMusicIndex = (this.currentMusicIndex + 1) % this.musicTracks.length;
                this.trackLoadingInProgress = false;
                this.playMusic();
                return;
            }
            
            const prefix = prefixes[attemptIndex];
            const path = prefix + trackName;
            console.log(`Trying alternate path format: ${path}`);
            
            // Create new audio element
            const audio = new Audio(path);
            
            // Set up error handler
            audio.onerror = () => {
                console.log(`Failed with path: ${path}`);
                attemptIndex++;
                tryNextPrefix();
            };
            
            // Set up success handler
            audio.oncanplaythrough = () => {
                console.log(`Successfully loaded with path: ${path}`);
                
                // Clean up old audio if it exists
                if (this.backgroundMusic) {
                    this.backgroundMusic.pause();
                    this.backgroundMusic.src = '';
                }
                
                // Set the new audio as current
                this.backgroundMusic = audio;
                this.backgroundMusic.volume = this.isMuted ? 0 : this.volume;
                
                // Play the audio
                this.backgroundMusic.play().then(() => {
                    console.log("Audio playback started successfully");
                    this.isCurrentlyPlaying = true;
                    this.trackLoadingInProgress = false;
                    
                    // Show track name
                    if (this.showMessageCallback) {
                        const trackName = path
                            .split('/').pop() || ''
                            .replace('.mp3', '');
                        this.showMessageCallback(trackName + " :שם הטראק");
                    }
                }).catch(e => {
                    console.error('Error playing music with alternate path:', e);
                    this.trackLoadingInProgress = false;
                });
                
                // Set up ended handler
                this.backgroundMusic.onended = () => {
                    console.log("Track ended, playing next track");
                    this.isCurrentlyPlaying = false;
                    this.currentMusicIndex = (this.currentMusicIndex + 1) % this.musicTracks.length;
                    this.playMusic();
                };
            };
            
            // Start loading the track
            audio.load();
        };
        
        tryNextPrefix();
    }

    /**
     * Play the next track
     */
    public nextTrack(): void {
        // Only change tracks if not currently loading
        if (!this.trackLoadingInProgress) {
            this.currentMusicIndex = (this.currentMusicIndex + 1) % this.musicTracks.length;
            this.playMusic();
        }
    }

    /**
     * Play the previous track
     */
    public previousTrack(): void {
        // Only change tracks if not currently loading
        if (!this.trackLoadingInProgress) {
            this.currentMusicIndex = (this.currentMusicIndex - 1 + this.musicTracks.length) % this.musicTracks.length;
            this.playMusic();
        }
    }

    /**
     * Stop current track
     */
    public stopTrack(): void {
        if (this.backgroundMusic) {
            // Remove all event listeners
            this.backgroundMusic.oncanplaythrough = null;
            this.backgroundMusic.onended = null;
            this.backgroundMusic.onerror = null;
            
            // Pause the audio
            this.backgroundMusic.pause();
            
            // Clear the source
            this.backgroundMusic.src = '';
            
            // Clean up
            this.backgroundMusic = null;
            this.isCurrentlyPlaying = false;
        }
    }

    /**
     * Toggle mute state
     */
    public toggleMute(): void {
        this.isMuted = !this.isMuted;
        
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.isMuted ? 0 : this.volume;
        }
        
        if (this.showMessageCallback) {
            this.showMessageCallback(this.isMuted ? "מוזיקה: מושתקת" : "מוזיקה: מופעלת");
        }
    }

    /**
     * Set volume level (0-1)
     */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.backgroundMusic && !this.isMuted) {
            this.backgroundMusic.volume = this.volume;
        }
        
        if (this.showMessageCallback) {
            this.showMessageCallback(`עוצמת קול: ${Math.round(this.volume * 100)}%`);
        }
    }

    /**
     * Play a sound effect
     */
    public playSoundEffect(soundFile: string, volume: number = 1.0): void {
        try {
            const sound = new Audio(soundFile);
            sound.volume = this.isMuted ? 0 : volume;
            sound.play().catch(e => console.log('Error playing sound effect:', e));
        } catch (error) {
            console.error('Error playing sound effect:', error);
        }
    }

    /**
     * Get the current track name
     */
    public getCurrentTrackName(): string {
        return this.musicTracks[this.currentMusicIndex]
            .replace('assets/music/', '')
            .replace('.mp3', '');
    }
}

// Create a singleton instance
const audioService = new AudioService();
export default audioService;