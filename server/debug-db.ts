import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

async function main() {
    console.log("🔍 Starting Manual Debug Script...");

    // Manually read .env to bypass dotenv/config issues
    const envPath = path.resolve(process.cwd(), ".env");
    console.log(`📂 Reading .env from: ${envPath}`);

    let dbUrl: string | undefined;
    try {
        const envContent = fs.readFileSync(envPath, "utf-8");
        // Regex to find DATABASE_URL="..."
        const match = envContent.match(/DATABASE_URL="([^"]+)"/);
        if (match && match[1]) {
            dbUrl = match[1];
            // Mask password
            console.log(`✅ Found DATABASE_URL: ${dbUrl.replace(/:([^:@]+)@/, ":****@")}`);
        } else {
            console.error("❌ Could not regex parse DATABASE_URL from .env file directly.");
        }
    } catch (e) {
        console.error("❌ Failed to read .env file:", e);
    }

    if (!dbUrl) {
        console.error("❌ Aborting: No DB URL.");
        process.exit(1);
    }

    console.log("🔌 Initializing PrismaClient with explicit datasource...");
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: dbUrl,
            },
        },
        log: ['query', 'info', 'warn', 'error'], // Enable full logging
    });

    try {
        console.log("⏳ Connecting...");
        await prisma.$connect();
        console.log("✅ CONNECTED!");

        const count = await prisma.law.count();
        console.log(`📊 Law count: ${count}`);

    } catch (e) {
        console.error("❌ CONNECTION FAILED:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
