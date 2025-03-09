// src/Managers/InputManager.ts

/**
 * Manager for handling keyboard input
 */
export class InputManager {
    // Keyboard state
    private keys: Record<string, boolean> = {};
    
    // Callback for special keys
    private specialKeyHandler: (key: string) => void;
    
    // Event listeners
    private keydownListener: (e: KeyboardEvent) => void;
    private keyupListener: (e: KeyboardEvent) => void;
    
    /**
     * Constructor
     * @param specialKeyHandler Callback function for special keys
     */
    constructor(specialKeyHandler: (key: string) => void) {
        this.specialKeyHandler = specialKeyHandler;
        
        // Set up event listener references for later cleanup
        this.keydownListener = (e: KeyboardEvent) => this.handleKeyDown(e);
        this.keyupListener = (e: KeyboardEvent) => this.handleKeyUp(e);
    }
    
    /**
     * Initialize the input manager
     */
    public initialize(): void {
        console.log("Initializing keyboard event listeners");
        
        // Set up keyboard event listeners
        window.addEventListener('keydown', this.keydownListener);
        window.addEventListener('keyup', this.keyupListener);
    }
    
    /**
     * Handle keydown events
     */
    private handleKeyDown(e: KeyboardEvent): void {
        this.keys[e.key] = true;
        
        // Call special key handler
        this.specialKeyHandler(e.key);
    }
    
    /**
     * Handle keyup events
     */
    private handleKeyUp(e: KeyboardEvent): void {
        this.keys[e.key] = false;
    }
    
    /**
     * Get the current keyboard state
     */
    public getKeys(): Record<string, boolean> {
        return this.keys;
    }
    
    /**
     * Check if a specific key is pressed
     */
    public isKeyPressed(key: string): boolean {
        return !!this.keys[key];
    }
    
    /**
     * Clean up resources
     */
    public cleanup(): void {
        // Remove event listeners
        window.removeEventListener('keydown', this.keydownListener);
        window.removeEventListener('keyup', this.keyupListener);
        
        // Reset keys
        this.keys = {};
    }
}