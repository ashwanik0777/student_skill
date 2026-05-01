import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectToDatabase } from "./lib/mongoDb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Connect to databases with timeouts to avoid blocking server startup
  let mongoConnected = false;
  let postgresConnected = false;
  
  // Set MongoDB connection environment variable
  if (process.env.MONGODB_URI) {
    try {
      // Set a timeout of 10 seconds for MongoDB connection
      const mongoConnectionPromise = connectToDatabase();
      const mongoTimeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          log("MongoDB connection is taking too long", "mongodb");
          resolve(false);
        }, 10000); // 10 second timeout
      });
      
      mongoConnected = await Promise.race([mongoConnectionPromise, mongoTimeoutPromise]);
      
      if (mongoConnected) {
        log("Successfully connected to MongoDB Atlas database", "mongodb");
      }
    } catch (error) {
      log(`Error connecting to MongoDB: ${error}`, "mongodb");
    }
  }
  
  // Set PostgreSQL connection environment variable
  if (process.env.DATABASE_URL) {
    try {
      // Check Postgres connection from the db module
      const { connectToDatabase: connectToPostgres } = await import('./db');
      
      // Set a timeout of 10 seconds for PostgreSQL connection
      const pgConnectionPromise = connectToPostgres();
      const pgTimeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          log("PostgreSQL connection is taking too long", "db");
          resolve(false);
        }, 10000); // 10 second timeout
      });
      
      postgresConnected = await Promise.race([pgConnectionPromise, pgTimeoutPromise]);
      
      if (postgresConnected) {
        log("Successfully connected to PostgreSQL database", "db");
        process.env.USE_POSTGRES = 'true';
      }
    } catch (error) {
      log(`Error connecting to PostgreSQL: ${error}`, "db");
    }
  }
  
  // Log storage decision
  if (postgresConnected) {
    log("Using PostgreSQL for data storage", "server");
  } else if (mongoConnected) {
    log("Using MongoDB for data storage", "server");
  } else {
    log("Using in-memory storage as fallback", "server");
  }
  
  // Continue with server startup regardless of DB connection status
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`Error: ${err.message}`, "error");
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on a configurable host/port for local/dev flexibility.
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || "127.0.0.1";
  const listenOptions: { port: number; host: string; reusePort?: boolean } = { port, host };

  if (process.env.REUSE_PORT === "true") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on ${host}:${port}`);
  });
})();
