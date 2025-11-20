import {WebSocketServer} from 'ws'

const wss = new WebSocketServer({port:8080})
const clients = new Set()
wss.on('connection', (socket) => {
  clients.add(socket)
  console.log('Client connected: ' + socket)
})


console.log('websocket 服务器启动在 ws://localhost:8080')
