import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "..", "data", "bills.json");

router.post("/sync", (req, res) => res.json({ message: "Sync via script only" }));

router.get("/", (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (e) {
        console.error("Error reading bills.json", e);
        res.json([]);
    }
});

router.post("/:id/note", (req, res) => res.status(501).json({ error: "Not implemented in JSON mode" }));

export default router;
