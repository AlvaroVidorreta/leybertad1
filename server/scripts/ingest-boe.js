import { XMLParser } from "fast-xml-parser";
import Prisma from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
});

async function main() {
    console.log("🇪🇸 Starting BOE Ingestion Worker...");

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Today YYYYMMDD
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

            await prisma.bill.upsert({
                where: { id },
                update: { title: title.slice(0, 500), pdfUrl: fullPdf, boeUrl: fullUrl },
                create: {
                    id,
                    title: title.slice(0, 500),
                    date: new Date(),
                    summary: title.slice(0, 500),
                    pdfUrl: fullPdf,
                    boeUrl: fullUrl
                }
            });
            process.stdout.write(".");
            count++;
        }
        console.log(`\n✅ Successfully synced ${count} regulations to DB.`);

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
