const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: process.env.BETTER_AUTH_URL,
    credentials: true,
  }),
);

app.use(express.json());

// 🔥 Port
const PORT = process.env.PORT || 5000;

// 🔥 MongoDB setup
const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 🔥 DB connect function
async function connectDB() {
  try {
    await client.connect();

    const db = client.db("mdantormia");

    app.locals.db = db;
    app.locals.projectCollection = db.collection("projects");
    app.locals.statsCollection = db.collection("stats");

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ DB connection failed:", error);
  }
}
connectDB();

// 🔥 Root route
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

// 🔥 Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// ============================
// 🔥 PROJECT ROUTES
// ============================

// ➕ Create Project
app.post("/projects", async (req, res) => {
  try {
    const projectCollection = req.app.locals.projectCollection;

    const { image, name, description, tech, github, live } = req.body;

    if (!image || !name || !description || !tech?.length || !github || !live) {
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

// 📥 Get All Projects
app.get("/projects", async (req, res) => {
  try {
    const projectCollection = req.app.locals.projectCollection;

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

// ✏️ Update Project
app.put("/projects/:id", async (req, res) => {
  try {
    const projectCollection = req.app.locals.projectCollection;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid ID ❌",
      });
    }

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
      message: "Project updated successfully ✏️",
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

// ❌ Delete Project
app.delete("/projects/:id", async (req, res) => {
  try {
    const projectCollection = req.app.locals.projectCollection;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid ID ❌",
      });
    }

    const result = await projectCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Project not found ❌",
      });
    }

    res.send({
      success: true,
      message: "Project deleted successfully 🗑️",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Delete failed",
      error: error.message,
    });
  }
});

// ============================
// 📊 STATS ROUTES
// ============================

// ➕ CV Download Count
app.post("/downloads", async (req, res) => {
  try {
    const statsCollection = req.app.locals.statsCollection;

    await statsCollection.updateOne(
      { type: "CV" },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).send({ success: false });
  }
});

// ➕ Visit Count
app.post("/api/visits", async (req, res) => {
  try {
    const statsCollection = req.app.locals.statsCollection;

    await statsCollection.updateOne(
      { type: "SITE_VISITS" },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).send({ success: false });
  }
});

// 📊 Get Stats
app.get("/api/stats", async (req, res) => {
  try {
    const projectCollection = req.app.locals.projectCollection;
    const statsCollection = req.app.locals.statsCollection;

    const totalProjects = await projectCollection.countDocuments();

    const stats = await statsCollection.find().toArray();

    const siteVisits =
      stats.find((s) => s.type === "SITE_VISITS")?.count || 0;
    const cvDownloads =
      stats.find((s) => s.type === "CV")?.count || 0;

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

// ============================
// 🔥 GLOBAL ERROR HANDLER
// ============================

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// ============================
// 🚀 SERVER START
// ============================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});