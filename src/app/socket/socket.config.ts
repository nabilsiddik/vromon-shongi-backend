import { Server } from 'socket.io'
import { registerChatHandlers } from './chat.socket.js'

let io: Server
export const initSocket = (server: any) => {
    const allowedOrigins = ['http://localhost:3000', 'https://travel-buddy-frontend-six.vercel.app'];
    if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
        allowedOrigins.push(process.env.CLIENT_URL);
    }

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST'],
        },
    })

    console.log('Socket.IO initialized')

    io.on('connection', (socket) => {
        console.log('User is connected', socket.id);

        registerChatHandlers(io, socket)

        socket.on('disconnect', () => {
            console.log('User is disconnected', socket.id);
        })
    })

    return io
}