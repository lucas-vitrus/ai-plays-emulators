# AI plays Emulators 
(For now only Nintendo 64)

This is a ready-to-use AI environment that runs on your browser. Simply connect with 
![50790014-e0a0-4dd0-a838-9c9cfd8bb2f9](https://github.com/user-attachments/assets/89dfbe5e-bd59-45fa-8c1b-38cd02b03b79)

## Running it from Web
[https://ai-plays-emulators.vercel.app](https://ai-plays-emulators.vercel.app/) and set your [Vitrus API key](https://app.vitrus.ai) and your world ID

### Creating a player
```ts
bun add vitrus 
```
## Running it locally
<img width="1726" alt="image" src="https://github.com/user-attachments/assets/08be59cc-37c8-4169-8b2a-a99ab1e0b570" />

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
    ROM_URL = https://path/your_file_here.n64 #Your game of preference
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

# Gamepad Buttons map
<img width="598" alt="image" src="https://github.com/user-attachments/assets/9d7bfff7-49ec-416a-b295-41ee9c8cb030" />

    
    
