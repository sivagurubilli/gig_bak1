import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerMobileRoutes } from "./mobileRoutes";
import { setupSwagger } from "./swagger";
import { connectDatabase } from "./database";
import cors from "cors";

const app = express();

// Security middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://gig-bak1.onrender.com", "https://your-client-domain.com"]
    : ["http://localhost:3000", "http://localhost:5173", "https://gig-bak1.onrender.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0"
  });
});

// API info endpoint
app.get("/api", (req: Request, res: Response) => {
  res.json({
    name: "GiggleBuz API Server",
    version: "1.0.0",
    description: "Backend API for GiggleBuz application",
    endpoints: {
      admin: "/api/admin",
      mobile: "/api/v1",
      docs: "/api-docs",
      health: "/health"
    },
    status: "running"
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Register API routes
registerRoutes(app);
registerMobileRoutes(app);

// 404 handler for API routes
app.use("/api/*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler:", err);
  
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    const port = process.env.PORT || 5000;
    
    console.log(`🌐 Starting server on port ${port}...`);
    app.listen(Number(port), "0.0.0.0", () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`MongoDB URI: ${process.env.MONGODB_URI ? "Connected" : "Not configured"}`);
      console.log(`API Documentation: http://localhost:${port}/api-docs`);
      console.log(`Health Check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
