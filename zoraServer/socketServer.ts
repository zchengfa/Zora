import { WebSocketServer } from "ws";
import type { Server } from 'http'

export function startSocketServer(server:Server) {
    //websocket服务
    const wss = new WebSocketServer({server})
    const clients = new Set()
    wss.on('connection', (socket) => {
        clients.add(socket)
        console.log('Client connected')
    })
}
