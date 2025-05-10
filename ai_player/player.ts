import { randomUUID } from 'crypto';

export class Player {
    public readonly name: string;
    private requestScreenshotFn: (commandId: string) => void;
    private sendCommandFn: (action: any) => void;
    private isPlaying: boolean = false;
    private loopTimeoutId: NodeJS.Timeout | null = null;
    private pendingScreenshotCallbacks: Map<string, (imageData: string) => void> = new Map();

    constructor(
        name: string,
        requestScreenshotFn: (commandId: string) => void,
        sendCommandFn: (action: any) => void
    ) {
        this.name = name;
        this.requestScreenshotFn = requestScreenshotFn;
        this.sendCommandFn = sendCommandFn;
        console.log(`Player instance '${this.name}' created with callbacks.`);
    }

    public getName(): string {
        return this.name;
    }

    public async start(): Promise<void> {
        if (this.isPlaying) {
            console.log(`Player '${this.name}' is already playing.`);
            return;
        }
        this.isPlaying = true;
        console.log(`Player '${this.name}' started playing.`);
        this.gameLoop();
    }

    public stop(): void {
        if (!this.isPlaying) {
            console.log(`Player '${this.name}' is not playing.`);
            return;
        }
        this.isPlaying = false;
        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }
        this.pendingScreenshotCallbacks.clear();
        console.log(`Player '${this.name}' stopped playing.`);
    }

    private async gameLoop(): Promise<void> {
        if (!this.isPlaying) {
            return;
        }

        try {
            console.log(`Player '${this.name}': Requesting screenshot...`);
            const screenshotData = await this.requestScreenshotInternal();
            console.log(`Player '${this.name}': Received screenshot (length: ${screenshotData.length})`);

            const mockAction = { type: "PRESS_BUTTON", payload: { button: "A", player: 0, duration: 100 } }; // Example action
            console.log(`Player '${this.name}': Decided action:`, mockAction);

            this.sendCommandInternal(mockAction);

        } catch (error) {
            console.error(`Player '${this.name}': Error in game loop:`, error);
        }

        if (this.isPlaying) {
            this.loopTimeoutId = setTimeout(() => this.gameLoop(), 1000);
        }
    }

    private requestScreenshotInternal(): Promise<string> {
        return new Promise((resolve, reject) => {
            const commandId = randomUUID();
            const timeout = setTimeout(() => {
                this.pendingScreenshotCallbacks.delete(commandId);
                reject(new Error(`Screenshot request ${commandId} for player '${this.name}' timed out after 10 seconds`));
            }, 10000);

            this.pendingScreenshotCallbacks.set(commandId, (imageData) => {
                clearTimeout(timeout);
                this.pendingScreenshotCallbacks.delete(commandId);
                resolve(imageData);
            });

            try {
                this.requestScreenshotFn(commandId);
                console.log(`Player '${this.name}': Called requestScreenshotFn with commandId: ${commandId}`);
            } catch (error) {
                console.error(`Player '${this.name}': Error calling requestScreenshotFn`, error);
                clearTimeout(timeout);
                this.pendingScreenshotCallbacks.delete(commandId);
                reject(error);
            }
        });
    }

    public handleScreenshotResponse(commandId: string, imageData: string): void {
        const callback = this.pendingScreenshotCallbacks.get(commandId);
        if (callback) {
            console.log(`Player '${this.name}': Handling screenshot response for commandId: ${commandId}`);
            callback(imageData);
        } else {
            console.warn(`Player '${this.name}': Received screenshot for unknown or timed out commandId: ${commandId}`);
        }
    }

    private sendCommandInternal(action: any): void {
        try {
            this.sendCommandFn(action);
            console.log(`Player '${this.name}': Called sendCommandFn with action:`, action);
        } catch (error) {
            console.error(`Player '${this.name}': Error calling sendCommandFn`, error);
        }
    }
}
