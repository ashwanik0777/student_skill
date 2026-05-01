import { Express, Request, Response, NextFunction } from "express";
import { clerkClient, ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Middleware to require Clerk authentication
export const requireAuth = ClerkExpressRequireAuth({});

interface ClerkUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddresses: {
    emailAddress: string;
    id: string;
  }[];
  // Additional properties from Clerk API
}

// Setup Clerk authentication routes
export function setupClerkAuth(app: Express) {
  // Handle webhook for user creation
  app.post("/api/clerk-webhook", async (req, res) => {
    try {
      const { data, type } = req.body;
      
      // Handle user creation event
      if (type === "user.created") {
        const clerkUser = data.data as ClerkUser;
        const emailAddress = clerkUser.emailAddresses[0]?.emailAddress;

        if (emailAddress) {
          // Check if user already exists in our database by clerk ID
          const existingUser = await storage.getUserByClerkId(clerkUser.id);
          
          if (!existingUser) {
            // Create a new user in our database
            await storage.createUser({
              clerkId: clerkUser.id,
              name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
              username: emailAddress.split("@")[0],
              email: emailAddress,
              password: "", // We don't need password when using Clerk
              role: "student",
              school: null,
              grade: null,
              avatar: null,
              profilePicture: null,
            });
          }
        }
      }
      
      res.status(200).send("Webhook received");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Webhook processing failed");
    }
  });

  // Get the current user
  app.get("/api/clerk-user", requireAuth, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - Clerk adds userId to the request
      const clerkUserId = req.auth.userId;
      if (!clerkUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the user from our database
      const user = await storage.getUserByClerkId(clerkUserId);
      
      if (!user) {
        // If user doesn't exist in our database, try to create one based on Clerk user data
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const emailAddress = clerkUser.emailAddresses[0]?.emailAddress;
        
        if (emailAddress) {
          const newUser = await storage.createUser({
            clerkId: clerkUserId,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
            username: emailAddress.split("@")[0],
            email: emailAddress,
            password: "", // We don't need password when using Clerk
            role: "student",
            school: null,
            grade: null,
            avatar: null,
            profilePicture: null,
          });
          
          return res.status(200).json(newUser);
        } else {
          return res.status(400).json({ message: "User missing email address" });
        }
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Update user profile
  app.patch("/api/clerk-user", requireAuth, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - Clerk adds userId to the request
      const clerkUserId = req.auth.userId;
      if (!clerkUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the user from our database
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update the user
      // TODO: Implement user update functionality in the storage interface
      // const updatedUser = await storage.updateUser(user.id, req.body);
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}