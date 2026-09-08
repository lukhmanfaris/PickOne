import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Category {
  id: string;
  name: string;
}

interface Work {
  id: string;
  categoryId: string;
  name: string;
  note?: string;
  img?: string;
  presetStyle?: number;
}

interface ReviewConfig {
  id: string;
  title: string;
  brief: string;
  categories: Category[];
  works: Work[];
  maxSubmits: number;
  pin: string;
  open: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Ballot {
  key: string;
  voterId: string;
  name: string;
  count: number;
  votes: Record<string, string>; // categoryId -> workId
  timestamp: number;
}

interface StoreData {
  cfg: ReviewConfig;
  ballots: Ballot[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "review_store.json");

const defaultReview: ReviewConfig = {
  id: "default-review",
  title: "Identity — Concept Review",
  brief: "Pick the route that best fits our brand direction. Cast 1 vote per category based on personality and versatility.",
  categories: [
    { id: "cat-logo", name: "Brand Logo Concept" },
    { id: "cat-type", name: "Typography System" }
  ],
  works: [
    {
      id: "w-swiss",
      categoryId: "cat-logo",
      name: "Kinetic Swiss",
      note: "Rational geometric grid with electric blue focal points.",
      img: "",
      presetStyle: 0
    },
    {
      id: "w-brutalist",
      categoryId: "cat-logo",
      name: "Neo-Monolith",
      note: "Bold architectural framing, structured brass lines.",
      img: "",
      presetStyle: 1
    },
    {
      id: "w-organic",
      categoryId: "cat-logo",
      name: "Soft Organic",
      note: "Subtle fluid curvatures, atmospheric warm tones.",
      img: "",
      presetStyle: 2
    },
    {
      id: "w-dynamic",
      categoryId: "cat-type",
      name: "Dual Horizon",
      note: "Overlapping chromatic geometries symbolizing intersection.",
      img: "",
      presetStyle: 3
    },
    {
      id: "w-editorial",
      categoryId: "cat-type",
      name: "Atelier Serif",
      note: "High-fashion editorial restraint, balanced negative space.",
      img: "",
      presetStyle: 4
    }
  ],
  maxSubmits: 2,
  pin: "1234",
  open: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

let memoryStore: StoreData = {
  cfg: defaultReview,
  ballots: []
};

function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.cfg) {
        if (!parsed.cfg.categories) {
          parsed.cfg.categories = defaultReview.categories;
        }
        if (parsed.cfg.works) {
          parsed.cfg.works.forEach((w: any) => {
            if (!w.categoryId) {
              w.categoryId = defaultReview.categories[0].id;
            }
          });
        } else {
          parsed.cfg.works = defaultReview.works;
        }
        memoryStore = parsed;
      }
    } else {
      saveStore();
    }
  } catch (err) {
    console.error("Failed to initialize file store, using in-memory store:", err);
  }
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist data file:", err);
  }
}

initStore();

const sseClients: Set<express.Response> = new Set();

function broadcastUpdate() {
  const payload = JSON.stringify({
    type: "update",
    cfg: memoryStore.cfg,
    ballots: memoryStore.ballots
  });
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/api/review", (_req, res) => {
    res.json({
      cfg: memoryStore.cfg,
      ballots: memoryStore.ballots
    });
  });

  app.get("/api/review/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(
      `data: ${JSON.stringify({
        type: "init",
        cfg: memoryStore.cfg,
        ballots: memoryStore.ballots
      })}\n\n`
    );

    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  app.post("/api/review/setup", (req, res) => {
    try {
      const { title, brief, categories, works, maxSubmits, pin, currentPin } = req.body;

      if (memoryStore.cfg && memoryStore.cfg.pin && currentPin !== memoryStore.cfg.pin) {
        return res.status(401).json({ error: "Invalid admin passcode." });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Review title is required." });
      }

      if (!categories || !Array.isArray(categories) || categories.length < 1) {
        return res.status(400).json({ error: "At least one category is required." });
      }

      if (!works || !Array.isArray(works) || works.length < 2) {
        return res.status(400).json({ error: "At least two design routes are required." });
      }

      const cleanCats: Category[] = categories
        .filter((c: any) => c && c.name && c.name.trim())
        .map((c: any, index: number) => ({
          id: c.id || `cat-${index}-${Date.now()}`,
          name: c.name.trim()
        }));

      if (cleanCats.length < 1) {
        return res.status(400).json({ error: "At least one named category is required." });
      }

      const validCatIds = new Set(cleanCats.map(c => c.id));

      const cleanWorks: Work[] = works
        .filter((w: any) => w && w.name && w.name.trim() && w.categoryId && validCatIds.has(w.categoryId))
        .map((w: any, index: number) => ({
          id: w.id || `route-${index}-${Date.now()}`,
          categoryId: w.categoryId,
          name: w.name.trim(),
          note: (w.note || "").trim(),
          img: w.img || "",
          presetStyle: typeof w.presetStyle === "number" ? w.presetStyle : index % 5
        }));

      if (cleanWorks.length < 2) {
        return res.status(400).json({ error: "At least two named routes belonging to valid categories are required." });
      }

      const numSubmits = Math.max(1, parseInt(maxSubmits, 10) || 2);
      const cleanPin = (pin || "").trim() || (memoryStore.cfg?.pin || "1234");

      memoryStore.cfg = {
        id: memoryStore.cfg?.id || `rev-${Date.now()}`,
        title: title.trim(),
        brief: (brief || "").trim(),
        categories: cleanCats,
        works: cleanWorks,
        maxSubmits: numSubmits,
        pin: cleanPin,
        open: typeof memoryStore.cfg?.open === "boolean" ? memoryStore.cfg.open : true,
        createdAt: memoryStore.cfg?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // Filter invalid votes from existing ballots
      const validWorkIds = new Set(cleanWorks.map((w) => w.id));
      memoryStore.ballots = memoryStore.ballots.map((b) => {
        const cleanedVotes: Record<string, string> = {};
        for (const catId of validCatIds) {
          if (b.votes[catId] && validWorkIds.has(b.votes[catId])) {
            cleanedVotes[catId] = b.votes[catId];
          }
        }
        return { ...b, votes: cleanedVotes };
      });

      saveStore();
      broadcastUpdate();

      res.json({ success: true, cfg: memoryStore.cfg, ballots: memoryStore.ballots });
    } catch (err: any) {
      console.error("Error in /api/review/setup:", err);
      res.status(500).json({ error: "Failed to save configuration." });
    }
  });

  app.post("/api/review/ballot", (req, res) => {
    try {
      const { voterId, name, votes } = req.body;

      if (!memoryStore.cfg.open) {
        return res.status(400).json({ error: "Voting is currently closed." });
      }

      if (!voterId || !name || !name.trim()) {
        return res.status(400).json({ error: "Voter name and ID are required." });
      }

      if (!votes || typeof votes !== 'object') {
        return res.status(400).json({ error: "Invalid votes format." });
      }

      const reqCats = memoryStore.cfg.categories.length;
      if (Object.keys(votes).length !== reqCats) {
         return res.status(400).json({ error: `Please vote for all ${reqCats} categories.` });
      }

      const existingIndex = memoryStore.ballots.findIndex((b) => b.voterId === voterId);
      const prevCount = existingIndex >= 0 ? memoryStore.ballots[existingIndex].count : 0;

      if (prevCount >= memoryStore.cfg.maxSubmits) {
        return res.status(400).json({
          error: `You have reached your submission limit of ${memoryStore.cfg.maxSubmits} times.`
        });
      }

      const votesSignature = Object.entries(votes).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('|');
      const ballotKey = `b:${voterId}:${prevCount + 1}:${votesSignature}:${encodeURIComponent(name.trim())}`;
      
      const newBallot: Ballot = {
        key: ballotKey,
        voterId,
        name: name.trim(),
        count: prevCount + 1,
        votes,
        timestamp: Date.now()
      };

      if (existingIndex >= 0) {
        memoryStore.ballots[existingIndex] = newBallot;
      } else {
        memoryStore.ballots.push(newBallot);
      }

      saveStore();
      broadcastUpdate();

      res.json({
        success: true,
        ballot: newBallot,
        cfg: memoryStore.cfg,
        ballots: memoryStore.ballots
      });
    } catch (err: any) {
      console.error("Error in /api/review/ballot:", err);
      res.status(500).json({ error: "Failed to record ballot." });
    }
  });

  app.post("/api/review/admin/toggle", (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin !== memoryStore.cfg.pin) {
        return res.status(401).json({ error: "Invalid admin passcode." });
      }

      memoryStore.cfg.open = !memoryStore.cfg.open;
      memoryStore.cfg.updatedAt = Date.now();

      saveStore();
      broadcastUpdate();

      res.json({ success: true, open: memoryStore.cfg.open });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to toggle voting." });
    }
  });

  app.post("/api/review/admin/clear", (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin !== memoryStore.cfg.pin) {
        return res.status(401).json({ error: "Invalid admin passcode." });
      }

      memoryStore.ballots = [];
      memoryStore.cfg.updatedAt = Date.now();

      saveStore();
      broadcastUpdate();

      res.json({ success: true, message: "All ballots cleared." });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear ballots." });
    }
  });

  app.post("/api/review/admin/verify", (req, res) => {
    const { pin } = req.body;
    if (pin === memoryStore.cfg.pin) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ valid: false, error: "Incorrect admin passcode." });
    }
  });

  app.post("/api/review/admin/reset-sample", (req, res) => {
    const { pin } = req.body;
    if (!pin || pin !== memoryStore.cfg.pin) {
      return res.status(401).json({ error: "Invalid admin passcode." });
    }
    memoryStore.cfg = {
      ...defaultReview,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    memoryStore.ballots = [];
    saveStore();
    broadcastUpdate();
    res.json({ success: true, cfg: memoryStore.cfg, ballots: memoryStore.ballots });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Design Review Server running at http://localhost:${PORT}`);
  });
}

startServer();
