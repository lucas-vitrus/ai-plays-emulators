// This file will contain the backend server logic.
// For now, it's a simple HTTP server.

const server = Bun.serve({
  port: 3001, // You can change the port as needed
  fetch(req) {
    return new Response("Hello from the backend!");
  },
});

console.log(`Backend server listening on http://localhost:${server.port}`);