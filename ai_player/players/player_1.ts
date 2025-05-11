import { randomUUID } from 'crypto';
import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Initialize when used, with options object
const MODEL_NAME = "gemini-2.5-pro-exp-03-25";

// Define the canonical N64 button names that the AI should use.
// These should correspond to the keys in the frontend's N64_CONTROL_MAP.
export const N64_BUTTON_NAMES = [
    "A", "B", "START",
    "DPAD_UP", "DPAD_DOWN", "DPAD_LEFT", "DPAD_RIGHT",
    "L_TRIG", "R_TRIG", "Z_TRIG",
    "C_UP", "C_DOWN", "C_LEFT", "C_RIGHT",
    "LEFT_STICK_X_PLUS", "LEFT_STICK_X_MINUS",
    "LEFT_STICK_Y_PLUS", "LEFT_STICK_Y_MINUS"
] as const;

export type N64ButtonName = typeof N64_BUTTON_NAMES[number];

interface PressButtonPayload {
    button: N64ButtonName;
    player: number;
    duration: number;
}

interface AIDescriptionPayload {
    description: string;
}

interface AIStatusUpdatePayload {
    status: string;
}

export type AIAction =
    | { type: "PRESS_BUTTON"; payload: PressButtonPayload }
    | { type: "AI_DESCRIPTION"; payload: AIDescriptionPayload }
    | { type: "AI_STATUS_UPDATE"; payload: AIStatusUpdatePayload };

export class Player {
    public readonly name: string;
    private requestScreenshotFn: (commandId: string) => void;
    private sendCommandFn: (action: AIAction) => void; // Typed the action here
    private isPlaying: boolean = false;
    private loopTimeoutId: NodeJS.Timeout | null = null;
    private pendingScreenshotCallbacks: Map<string, (imageData: string) => void> = new Map();
    private genAI: GoogleGenAI; // Type is GoogleGenAI

    constructor(
        name: string,
        requestScreenshotFn: (commandId: string) => void,
        sendCommandFn: (action: AIAction) => void // Typed the action here
    ) {
        this.name = name;
        this.requestScreenshotFn = requestScreenshotFn;
        this.sendCommandFn = sendCommandFn;
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY environment variable is not set.");
        }
        // Corrected: Initialize with options object
        this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
            // Simplified log message, removed size calculation
            console.log(`Player '${this.name}': Received screenshot for processing.`);

            // Describe the screenshot with AI
            this.sendCommandInternal({ type: "AI_STATUS_UPDATE", payload: { status: "Describing scene..." } });
            const description = await this.describeScreenshotWithAI(screenshotData);
            console.log(`Player '${this.name}': AI Screenshot Description: ${description}`);

            // Send the description to the frontend
            const descriptionAction: AIAction = {
                type: "AI_DESCRIPTION",
                payload: { description }
            };
            this.sendCommandInternal(descriptionAction);

            // Placeholder for AI decision logic. 
            // When implementing, ensure the AI outputs an N64ButtonName.
            this.sendCommandInternal({ type: "AI_STATUS_UPDATE", payload: { status: "Deciding next move..." } });
            const aiChosenButton: N64ButtonName = await this.decideButtonWithAI(description);

            const action: AIAction = {
                type: "PRESS_BUTTON",
                payload: { button: aiChosenButton, player: 0, duration: 100 }
            };
            console.log(`Player '${this.name}': Decided action:`, action);

            this.sendCommandInternal(action);

        } catch (error) {
            console.error(`Player '${this.name}': Error in game loop:`, error);
        }

    }

    private async describeScreenshotWithAI(base64ImageData: string): Promise<string> {
        try {
            // Check and remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            let cleanBase64ImageData = base64ImageData;
            const dataUrlPrefixMatch = base64ImageData.match(/^data:image\/\w+;base64,/);
            if (dataUrlPrefixMatch) {
                cleanBase64ImageData = base64ImageData.substring(dataUrlPrefixMatch[0].length);
                console.log(`Player '${this.name}': Removed data URL prefix from screenshot data.`);
            }

            const contents = [
                {
                    inlineData: {
                        mimeType: "image/jpeg", // Assuming JPEG, frontend sends JPEG via toDataURL('image/jpeg')
                        data: cleanBase64ImageData,
                    },
                },
                { text: "Describe this N64 game screenshot for an AI player. Focus on actionable elements, player position, enemies, items, and overall game state relevant for deciding the next move." },
            ];

            const result = await this.genAI.models.generateContent({ model: MODEL_NAME, contents });
            // Corrected: Access .text as a property based on linter feedback and user example.
            const text = result.text;
            if (typeof text !== 'string') {
                // Removed logging the full 'result' object
                console.error(`Player '${this.name}': Unexpected AI response format. Expected string, got ${typeof text}.`);
                return "Error: AI response text is not a string.";
            }
            return text;
        } catch (error: any) { // Catch as any to access potential properties
            console.error(`Player '${this.name}': Error describing screenshot with AI. Status: ${error?.status}, Message: ${error?.message}`);
            if (error?.details) {
                // Removed direct logging of error.details to avoid large output
                console.error(`Player '${this.name}': AI Error Details were present but are not fully logged to prevent console spam. Check error message and status.`);
            }
            if (error instanceof Error && error.stack) {
                console.error(`Player '${this.name}': AI Error Stack: ${error.stack}`);
            }
            return "Error describing image with AI.";
        }
    }

    private async decideButtonWithAI(gameStateDescription: string): Promise<N64ButtonName> {
        try {
            const prompt = `
Based on the following N64 game state description, what is the best single button to press next?
Game State: "${gameStateDescription}"

Choose ONE button from the following list. Your answer MUST be ONLY one of these button names:
${N64_BUTTON_NAMES.join(", ")}
`;

            const contents = [{ text: prompt }];
            const result = await this.genAI.models.generateContent({ model: MODEL_NAME, contents });
            const aiResponse = result.text?.trim();

            if (aiResponse && N64_BUTTON_NAMES.includes(aiResponse as N64ButtonName)) {
                console.log(`Player '${this.name}': AI chose button: ${aiResponse}`);
                return aiResponse as N64ButtonName;
            } else {
                console.warn(`Player '${this.name}': AI returned an invalid button name: '${aiResponse}'. Defaulting to START.`);
                return "START"; // Default to a safe button if AI response is invalid
            }

        } catch (error: any) {
            console.error(`Player '${this.name}': Error deciding button with AI. Status: ${error?.status}, Message: ${error?.message}`);
            if (error instanceof Error && error.stack) {
                console.error(`Player '${this.name}': AI Button Decision Error Stack: ${error.stack}`);
            }
            console.warn(`Player '${this.name}': Defaulting to START button due to error in AI decision.`);
            return "START"; // Default to a safe button on error
        }
    }

    // Restored missing method
    private requestScreenshotInternal(): Promise<string> {
        return new Promise((resolve, reject) => {
            const commandId = randomUUID();
            const timeout = setTimeout(() => {
                this.pendingScreenshotCallbacks.delete(commandId);
                reject(new Error(`Screenshot request ${commandId} for player '${this.name}' timed out after 20 seconds`));
            }, 20000);

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

    // Restored missing method
    public handleScreenshotResponse(commandId: string, imageData: string): void {
        const callback = this.pendingScreenshotCallbacks.get(commandId);
        if (callback) {
            console.log(`Player '${this.name}': Handling screenshot response for commandId: ${commandId}`);
            callback(imageData);
        } else {
            console.warn(`Player '${this.name}': Received screenshot for unknown or timed out commandId: ${commandId}`);
        }
    }

    // Restored missing method
    private sendCommandInternal(action: AIAction): void {
        try {
            this.sendCommandFn(action);
            console.log(`Player '${this.name}': Called sendCommandFn with action:`, action);
        } catch (error) {
            console.error(`Player '${this.name}': Error calling sendCommandFn`, error);
        }
    }
}