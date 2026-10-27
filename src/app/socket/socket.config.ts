import { Server } from 'socket.io'
import { registerChatHandlers } from './chat.socket.js'

let io: Server
export const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
    if (origin.endsWith('.vercel.app')) return true;
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
    if (origin === 'https://travel-buddy-frontend-six.vercel.app') return true;
    return false;
};

export const initSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS blocked for origin: ${origin}`));
                }
            },
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