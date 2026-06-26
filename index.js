const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { ObjectId } = require("mongodb");

app.use(
  cors({
    origin: process.env.BETTER_AUTH_URL,
    credentials: true,
  }),
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// DB
const db = client.db("mdantormia");
const projectCollection = db.collection("projects");

async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error(error);
  }
}
run();

// Routes
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// project api
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

app.get("/projects", async (req, res) => {
  try {
    const project = await projectCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.send({
      success: true,
      count: project.length,
      data: project,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch projects ❌",
      error: error.message,
    });
  }
});

// update project api

app.put("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    const { _id, ...rest } = updateData;

    const result = await projectCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...rest,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }, // 🔥 VERY IMPORTANT
    );

    res.send({
      success: true,
      message: "project updated successfully",
      data: result.value, // ✅ FULL UPDATED DOC
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "update failed",
      error: error.message,
    });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await projectCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Project not found ",
      });
    }

    res.send({
      success: true,
      message: "Project deleted successfully ",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Delete failed",
      error: error.message,
    });
  }
});

// CV ডাউনলোড কাউন্ট করার জন্য
app.post("/downloads", async (req, res) => {
  const result = await db
    .collection("stats")
    .updateOne({ type: "CV" }, { $inc: { count: 1 } }, { upsert: true });
  res.json({ success: true });
});

app.get("/api/stats", async (req, res) => {
  try {
    // ১. প্রজেক্টের মোট সংখ্যা
    const totalProjects = await projectCollection.countDocuments();

    // ২. ভিজিট এবং ডাউনলোড কাউন্ট
    const stats = await db.collection("stats").find().toArray();
    const siteVisits = stats.find((s) => s.type === "SITE_VISITS")?.count || 0;
    const cvDownloads = stats.find((s) => s.type === "CV")?.count || 0;

    res.json({
      success: true,
      totalProjects,
      totalVisits: siteVisits,
      cvDownloads,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch stats" });
  }
});

app.post("/api/visits", async (req, res) => {
  try {
    const result = await db
      .collection("stats")
      .updateOne(
        { type: "SITE_VISITS" },
        { $inc: { count: 1 } },
        { upsert: true },
      );
    res.json({ success: true, message: "Visit recorded" });
  } catch (error) {
    res.status(500).send({ success: false, message: "Visit count failed" });
  }
});

// Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
