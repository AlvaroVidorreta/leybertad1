import "dotenv/config";
import { syncDailyBoe } from "./services/boe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🇪🇸 Testing BOE Ingestion...");
    try {
        const result = await syncDailyBoe(); // Defaults to today
        console.log("✅ Sync Result:", result);

        console.log("🔍 Verifying DB records...");
        const bills = await prisma.bill.findMany({
            take: 5,
            orderBy: { date: 'desc' }
        });

        console.log(`📊 Found ${bills.length} bills in DB.`);
        bills.forEach(b => {
            console.log(`- [${b.id}] ${b.title.slice(0, 60)}...`);
        });

    } catch (e) {
        console.error("❌ Test Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
