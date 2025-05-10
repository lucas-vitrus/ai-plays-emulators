
import Gun from 'gun';

const server = require('http').createServer().listen(8080);
const gun = Gun({ web: server });
