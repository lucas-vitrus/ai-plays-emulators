# AI plays Emulators (Nintendo 64, PSX)

<img width="1726" alt="image" src="https://github.com/user-attachments/assets/08be59cc-37c8-4169-8b2a-a99ab1e0b570" />

This project is an attempt to create an AI that can play Nintendo 64 games.
It uses Bun for the runtime, Vite and React for the frontend, and a Bun server for the backend.

## Project Structure

- `emulator-environment/`: Contains the React frontend application using [EmulatorJS](https://emulatorjs.org/docs/getting-started).
- `ai-player/`: Contains an example of an AI agent.

## Getting Started in 3 steps

1.  **Install dependencies for the entire monorepo:**

    ```bash
    cd ./emulator-environment
    bun install
    ```

2. Setup **Environment Variables**
    To help developers focus only in the AI player development, we abstracted the ai-to-emulator communication using [Vitrus](https://github.com/vitrus-ai/vitrus-sdk) Agent-World-Actor (AwA) infrastructure.

    🔑 You can get your [API Keys here](https://app.vitrus.ai). 

    ```bash
    cd ./emulator-environment
    touch .env
    ```
    And inside of the `.env` file define your credentials and API
    ```bash
    VITE_VITRUS_API_KEY = vitrus-<api-key>
    VITE_VITRUS_WORLD = <world-id>
    ```
    Alternativelly you may fork this repo and use a custom AwA layer like [Redis](https://redis.io/), [PeerJs](https://peerjs.com/), etc. But we've made Vitrus SDK to simplify this.
   
3.  **Running the Frontend (Vite Development Server):**
    Navigate to the `emulator-environment` directory and run:

    ```bash
    cd ./emulator-environment
    bun run dev
    ```

    This will typically start the frontend on `http://localhost:5173`. You can defined the port by adding `--port 3000`.

4. (optional) Running the example Player (typescript) 
    ```bash
    cd ./ai-player
    bun install
    touch .env
    ```

    Add the same API Keys on `.env` but without the `VITE_` prefix.
    ```bash
    VITRUS_API_KEY = vitrus-<api-key>
    VITRUS_WORLD = <world-id> #Make sure it's the same world as the emulator
    ```

   With the browser running, run the player
    ```bash
    bun dev
    ```

    It should play now!! 🎉
    
    
