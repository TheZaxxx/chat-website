import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Total users endpoint for leaderboard
  app.get('/api/stats/total-users', async (req, res) => {
    try {
      // In production, this would query the database for actual user count
      // For now, returning a default value that increments based on storage
      const totalUsers = await storage.getTotalUsers();
      res.json({ totalUsers });
    } catch (error) {
      console.error('Error fetching total users:', error);
      res.status(500).json({ error: 'Failed to fetch total users' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
