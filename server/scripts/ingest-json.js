import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "..", "data", "bills.json");

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
});

async function main() {
    console.log("🇪🇸 Starting JSON-based BOE Ingestion (Forced Date)...");

    // Ensure data dir exists
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Using a valid past date to guarantee data for demo
    const date = "20241120";
    const url = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${date}`;

    console.log(`📡 Fetching BOE for date: ${date} from ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch BOE: ${response.statusText}`);
        }

        const xml = await response.text();
        const data = parser.parse(xml);

        const items = [];
        const sections = Array.isArray(data.sumario?.diario?.seccion)
            ? data.sumario.diario.seccion
            : [data.sumario?.diario?.seccion].filter(Boolean);

        for (const section of sections) {
            const deps = Array.isArray(section.departamento) ? section.departamento : [section.departamento].filter(Boolean);
            for (const dep of deps) {
                const rawItems = Array.isArray(dep.item) ? dep.item : [dep.item].filter(Boolean);
                items.push(...rawItems);
            }
        }

        console.log(`🔍 Found ${items.length} items. Filtering...`);

        // Read existing
        let existingBills = [];
        if (fs.existsSync(DATA_FILE)) {
            existingBills = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }

        let count = 0;
        for (const item of items) {
            const title = item.titulo || "";
            if (!title.toLowerCase().includes("ley") && !title.toLowerCase().includes("decreto")) continue;

            const id = item.identificador || item["@_id"];
            if (!id) continue;

            const pdfUrl = typeof item.url_pdf === 'object' ? item.url_pdf["#text"] : item.url_pdf;
            const boeUrl = typeof item.url_html === 'object' ? item.url_html["#text"] : item.url_html;
            const fullUrl = boeUrl ? `https://www.boe.es${boeUrl}` : undefined;
            const fullPdf = pdfUrl ? `https://www.boe.es${pdfUrl}` : undefined;

            const newBill = {
                id,
                title: title.slice(0, 500),
                summary: title.slice(0, 500),
                date: new Date().toISOString(),
                pdfUrl: fullPdf,
                boeUrl: fullUrl
            };

            // Upsert Logic (simple replace)
            const idx = existingBills.findIndex(b => b.id === id);
            if (idx >= 0) {
                existingBills[idx] = { ...existingBills[idx], ...newBill };
            } else {
                existingBills.push(newBill);
            }
            count++;
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(existingBills, null, 2), 'utf-8');
        console.log(`\n✅ Successfully saved ${count} regulations to ${DATA_FILE}. Total bills: ${existingBills.length}`);

    } catch (e) {
        console.error("❌ Error:", e);
    }
}

main();
