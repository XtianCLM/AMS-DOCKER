
// server.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import routes from "./routes/urls";

import { initializeCrons } from "./cron";

import {
  initializeSocket
} from "./socket";

import {
  registerSocketEvents
} from "./socket/socketEvents";

dotenv.config();

const app = express();

const server =
  http.createServer(app);

const PORT =
  Number(process.env.PORT) || 5000;

/* =========================
   ALLOWED ORIGINS
========================= */
const allowedOrigins = [
  process.env.NEXT_PUBLIC_API_URL,
  process.env
    .NEXT_PUBLIC_API_LOCAL_URL,
  process.env
    .FRONTEND_URL,
].filter(Boolean) as string[];

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: function (
      origin,
      callback
    ) {

      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {

        callback(null, true);

      } else {

        callback(
          new Error(
            "Not allowed by CORS"
          )
        );
      }
    },

    credentials: true,
  })
);

/* =========================
   MIDDLEWARES
========================= */
app.use(cookieParser());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =========================
   STATIC FILES
========================= */
app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    )
  )
);

/* =========================
   ROUTES
========================= */
app.use("/api", routes);

/* =========================
   SOCKET
========================= */
const io = initializeSocket(
  server,
  allowedOrigins
);

registerSocketEvents(io);

/* =========================
   CRONS
========================= */

async function startServer() {

  await initializeCrons();

  server.listen(
    PORT,
    "0.0.0.0",
    () => {

      console.log(
        `Server running on port ${PORT}`
      );

    }
  );
}

startServer().catch(console.error);
// initializeCrons();

