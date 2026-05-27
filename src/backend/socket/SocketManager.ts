import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { eventBus } from '../events/EventBus';

export class SocketManager {
  private io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupListeners();
    this.setupEventBusIntegration();
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Client joins a specific match room
      socket.on('join_match', (matchId: string) => {
        socket.join(`match:${matchId}`);
        console.log(`[Socket] Client ${socket.id} joined match:${matchId}`);
      });

      // Client leaves a specific match room
      socket.on('leave_match', (matchId: string) => {
        socket.leave(`match:${matchId}`);
        console.log(`[Socket] Client ${socket.id} left match:${matchId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }

  // Bridging the internal EventBus to the Socket.IO network layer
  private setupEventBusIntegration() {
    eventBus.on('ANY_EVENT', (eventData: any) => {
      const matchId = eventData.payload?.matchId;
      if (matchId) {
        // Redux-style dispatch to isolated match room
        this.io.to(`match:${matchId}`).emit('dispatch', eventData);
      } else {
        // Global broadcast if no matchId specified
        this.io.emit('dispatch', eventData);
      }
    });
  }
}
