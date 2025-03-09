// src/Utils/Notify.ts

/**
 * Notification types
 */
export enum NotificationType {
    SUCCESS = "success",
    ERROR = "error",
    INFO = "info",
    WARNING = "warning"
}

/**
 * Notification service for displaying messages to the user
 */
class Notify {
    private notifications: HTMLDivElement[] = [];
    private container: HTMLDivElement | null = null;

    /**
     * Initialize the notification container
     */
    private initContainer(): void {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.className = "notification-container";
            document.body.appendChild(this.container);
            
            // Add styles
            const style = document.createElement("style");
            style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                }
                
                .notification {
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: notification-slide-in 0.3s ease forwards;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    max-width: 400px;
                    position: relative;
                    overflow: hidden;
                }
                
                .notification.success {
                    background-color: #10b981;
                    border-left: 4px solid #059669;
                }
                
                .notification.error {
                    background-color: #ef4444;
                    border-left: 4px solid #dc2626;
                }
                
                .notification.info {
                    background-color: #3b82f6;
                    border-left: 4px solid #2563eb;
                }
                
                .notification.warning {
                    background-color: #f59e0b;
                    border-left: 4px solid #d97706;
                }
                
                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background-color: rgba(255, 255, 255, 0.5);
                }
                
                .notification-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes notification-slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes notification-slide-out {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Show a notification
     */
    private show(message: string, type: NotificationType, duration: number = 3000): void {
        this.initContainer();
        
        if (!this.container) return;
        
        // Create notification element
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            ${message}
            <button class="notification-close">&times;</button>
            <div class="notification-progress"></div>
        `;
        
        // Add to container
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Set up progress bar
        const progressBar = notification.querySelector(".notification-progress") as HTMLDivElement;
        if (progressBar) {
            progressBar.style.width = "100%";
            progressBar.style.transition = `width ${duration}ms linear`;
            setTimeout(() => {
                progressBar.style.width = "0%";
            }, 10);
        }
        
        // Set up close button
        const closeButton = notification.querySelector(".notification-close") as HTMLButtonElement;
        if (closeButton) {
            closeButton.addEventListener("click", () => this.close(notification));
        }
        
        // Auto-remove after duration
        setTimeout(() => this.close(notification), duration);
    }

    /**
     * Close a notification
     */
    private close(notification: HTMLDivElement): void {
        if (!notification || !notification.parentElement) return;
        
        // Add slide-out animation
        notification.style.animation = "notification-slide-out 0.3s ease forwards";
        
        // Remove after animation completes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    /**
     * Close all notifications
     */
    public closeAll(): void {
        [...this.notifications].forEach(notification => this.close(notification));
    }

    /**
     * Show a success notification
     */
    public success(message: string, duration: number = 3000): void {
        this.show(message, NotificationType.SUCCESS, duration);
    }

    /**
     * Show an error notification
     */
    public error(message: string, duration: number = 4000): void {
        this.show(message, NotificationType.ERROR, duration);
    }

    /**
     * Show an info notification
     */
    public info(message: string, duration: number = 3000): void {
        this.show(message, NotificationType.INFO, duration);
    }

    /**
     * Show a warning notification
     */
    public warning(message: string, duration: number = 3500): void {
        this.show(message, NotificationType.WARNING, duration);
    }
}

// Create a singleton instance
export const notify = new Notify();
