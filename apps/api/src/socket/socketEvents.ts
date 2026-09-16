import { Server } from "socket.io";

export const registerSocketEvents = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-agent-room", (agentId: string) => {
      socket.join(agentId);
      console.log(`Agent joined notification room: ${agentId}`);
    });

    socket.on("join-upline-reactivation-room", (agentId: string) => {
      socket.join(`agent:${agentId}`);
      console.log(`Upline joined reactivation room: agent:${agentId}`);
    });

    socket.on("join-branch-reactivation-room", (branchCode: string) => {
      socket.join(`branch:${branchCode}`);
      console.log(`Branch joined reactivation room: branch:${branchCode}`);
    });

    socket.on("join-admin-reactivation-room", () => {
      socket.join("admin:reactivation");
      console.log("Admin joined room: admin:reactivation");
    });

    socket.on("join-admin-payment-room", () => {
      socket.join("admin:payments");
      console.log("Admin joined room: admin:payments");
    });

    socket.on("join-admin-withdraw-room", () => {
      socket.join("admin:withdraw");
      console.log("Admin joined room: admin:withdraw");
    });

    socket.on(
      "join-admin-promotion-room",
      () => {
        socket.join(
          "admin:promotions"
        );

        console.log(
          "Admin joined room: admin:promotions"
        );
      }
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });

  });
};