import Vitrus from "vitrus";

const vitrus = new Vitrus({
    apiKey: import.meta.env.VITRUS_API_KEY as string,
    world: import.meta.env.VITRUS_WORLD as string, // as we are using an actor, we need to define a world for it.
    baseUrl: "ws://localhost:3333",
});

const emulator = await vitrus.actor("emulator", {});

console.log("emulator registered");
const response = await emulator.run("get_game_state", {
    game_id: "123",
});

console.log(response);