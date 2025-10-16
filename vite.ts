import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "./vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible paths for different deployment scenarios
  const possiblePaths = [
    // Render deployment path (from /opt/render/project/src to /opt/render/project/dist/public)
    path.resolve(process.cwd(), "..", "dist", "public"),
    // Alternative Render path (from /opt/render/project/src/server to /opt/render/project/dist/public)
    path.resolve(import.meta.dirname, "..", "..", "dist", "public"),
    // Standard development/production path
    path.resolve(import.meta.dirname, "..", "dist", "public"),
    // Alternative path in server directory
    path.resolve(import.meta.dirname, "public"),
    // Another Render path variation
    path.resolve(import.meta.dirname, "..", "..", "..", "dist", "public"),
    // Direct dist path from current working directory
    path.resolve(process.cwd(), "dist", "public"),
    // Absolute path for Render (fallback)
    "/opt/render/project/dist/public",
  ];

  let distPath: string | null = null;
  
  // Debug information for deployment
  console.log(`🔍 Current working directory: ${process.cwd()}`);
  console.log(`🔍 Server file location: ${import.meta.dirname}`);
  console.log(`🔍 Node environment: ${process.env.NODE_ENV || 'undefined'}`);
  
  // Check if we're running from built file or source
  const isBuilt = import.meta.dirname.includes('dist');
  console.log(`🔍 Running from built file: ${isBuilt}`);
  
  // Find the first existing path
  for (const testPath of possiblePaths) {
    console.log(`🔍 Checking path: ${testPath}`);
    if (fs.existsSync(testPath)) {
      distPath = testPath;
      console.log(`✅ Found build directory at: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    console.error("❌ Build directory not found. Tried paths:");
    possiblePaths.forEach((testPath, index) => {
      console.error(`  ${index + 1}. ${testPath}`);
    });
    
    // List all files in the current directory and parent directory for debugging
    try {
      const currentDir = process.cwd();
      console.log(`📁 Contents of current directory (${currentDir}):`);
      const files = fs.readdirSync(currentDir);
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
      });
      
      // Also check parent directory
      const parentDir = path.resolve(currentDir, '..');
      console.log(`📁 Contents of parent directory (${parentDir}):`);
      const parentFiles = fs.readdirSync(parentDir);
      parentFiles.forEach(file => {
        const filePath = path.join(parentDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
      });
    } catch (e) {
      console.error("❌ Could not read directories:", e);
    }
    
    // Try to create a minimal fallback directory structure
    try {
      const fallbackPath = path.resolve(process.cwd(), '..', 'dist', 'public');
      console.log(`🔧 Attempting to create fallback directory: ${fallbackPath}`);
      fs.mkdirSync(fallbackPath, { recursive: true });
      
      // Create a minimal index.html
      const minimalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>GiggleBuz Admin - Build Required</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .error { color: #d32f2f; }
              .info { color: #1976d2; }
            </style>
          </head>
          <body>
            <h1 class="error">⚠️ Build Required</h1>
            <p>The application client has not been built yet.</p>
            <p class="info">Please run: <code>npm run build</code></p>
            <p>Current working directory: ${process.cwd()}</p>
            <p>Server file location: ${import.meta.dirname}</p>
          </body>
        </html>
      `;
      fs.writeFileSync(path.join(fallbackPath, 'index.html'), minimalHtml);
      
      console.log(`✅ Created fallback directory and index.html`);
      distPath = fallbackPath;
    } catch (e) {
      console.error("❌ Could not create fallback directory:", e);
      
      // Create a simple fallback response instead of throwing error
      app.use("*", (_req, res) => {
        res.status(500).send(`
          <html>
            <head><title>Build Error</title></head>
            <body>
              <h1>Build Directory Not Found</h1>
              <p>The application build directory could not be located.</p>
              <p>Please ensure the client has been built with: <code>npm run build</code></p>
              <p>Current working directory: ${process.cwd()}</p>
              <p>Server file location: ${import.meta.dirname}</p>
              <p>Checked paths:</p>
              <ul>
                ${possiblePaths.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </body>
          </html>
        `);
      });
      return;
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
