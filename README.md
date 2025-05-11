# AI Plays Nintendo 64

<img width="1726" alt="image" src="https://github.com/user-attachments/assets/08be59cc-37c8-4169-8b2a-a99ab1e0b570" />

This project is an attempt to create an AI that can play Nintendo 64 games.
It uses Bun for the runtime, Vite and React for the frontend, and a Bun server for the backend.

## Project Structure

- `frontend/`: Contains the React frontend application (Vite + TS).
- `backend/`: Contains the Bun backend server.

## Getting Started

1.  **Install dependencies for the entire monorepo:**

    ```bash
    bun install
    ```

2.  **Running the Frontend (Vite Development Server):**
    Navigate to the `frontend` directory and run:

    ```bash
    cd frontend
    bun run dev
    ```

    This will typically start the frontend on `http://localhost:5173`.

3.  **Running the Backend Server:**
    Navigate to the `backend` directory and run:
    ```bash
    cd backend
    bun run dev
    ```
    This will start the backend server, by default on `http://localhost:3001`.

## Further Development

- The frontend will host the N64 emulator (WASM).
- The backend will manage AI workflows, game state, and potentially interact with the emulator via Puppeteer or direct JavaScript interop if the emulator allows.
- Puppeteer will be used to control the web application hosting the emulator.
