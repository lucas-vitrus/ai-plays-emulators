import Gun from "gun";
const gun = Gun();
const jeff = gun.get("jeff");

jeff.on((data) => {
    console.log("JEFF", data);
});

jeff.put({
    name: "jeff",
    age: 22,
});
