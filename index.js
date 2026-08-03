const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { ObjectId, MongoClient, ServerApiVersion } = require("mongodb");

// Middleware
app.use(
  cors({
    origin: process.env.BETTER_AUTH_URL,
    credentials: true,
  })
);
app.use(express.json());

const PORT = process.env.PORT || 5000;
const uri = process.env.DB_URL;

// Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Global DB variables
let db;
let projectCollection;

// 🔥 Connect DB
async function connectDB() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected Successfully");

    db = client.db("mdantormia");
    projectCollection = db.collection("projects");
  } catch (error) {
    console.error("❌ DB Connection Failed:", error);
    process.exit(1); // stop server if DB fails
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

// CREATE Project
app.post("/projects", async (req, res) => {
  try {
    const { image, name, description, tech, github, live } = req.body;

    if (
      !image ||
      !name ||
      !description ||
      !tech ||
      tech.length === 0 ||
      !github ||
      !live
    ) {
      return res.status(400).send({
        success: false,
        message: "All fields are required ❌",
      });
    }

    const project = {
      image,
      name,
      description,
      tech,
      github,
      live,
      createdAt: new Date(),
    };

    const result = await projectCollection.insertOne(project);

    res.send({
      success: true,
      message: "Project added successfully 🚀",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET Projects
app.get("/projects", async (req, res) => {
  try {
    const projects = await projectCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch projects ❌",
      error: error.message,
    });
  }
});

// UPDATE Project
app.put("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { _id, ...rest } = req.body;

    const result = await projectCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...rest,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    res.send({
      success: true,
      message: "Project updated successfully",
      data: result.value,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Update failed",
      error: error.message,
    });
  }
});

// DELETE Project
app.delete("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await projectCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Project not found",
      });
    }

    res.send({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Delete failed",
      error: error.message,
    });
  }
});

// CV Download Count
app.post("/downloads", async (req, res) => {
  await db
    .collection("stats")
    .updateOne({ type: "CV" }, { $inc: { count: 1 } }, { upsert: true });

  res.json({ success: true });
});

// Stats
app.get("/api/stats", async (req, res) => {
  try {
    const totalProjects = await projectCollection.countDocuments();

    const stats = await db.collection("stats").find().toArray();

    const siteVisits =
      stats.find((s) => s.type === "SITE_VISITS")?.count || 0;
    const cvDownloads = stats.find((s) => s.type === "CV")?.count || 0;

    res.json({
      success: true,
      totalProjects,
      totalVisits: siteVisits,
      cvDownloads,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch stats",
    });
  }
});

// Visit Count
app.post("/api/visits", async (req, res) => {
  try {
    await db
      .collection("stats")
      .updateOne(
        { type: "SITE_VISITS" },
        { $inc: { count: 1 } },
        { upsert: true }
      );

    res.json({ success: true });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Visit count failed",
    });
  }
});

// 🔥 Start Server AFTER DB Connect
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();

// 🔥 Graceful Shutdown (VERY IMPORTANT)
process.on("SIGINT", async () => {
  console.log("🛑 Closing MongoDB connection...");
  await client.close();
  process.exit(0);
});