import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
    console.log("🚀 Testing Supabase connection & CRUD...");

    const dbUrl = process.env.DATABASE_URL;
    console.log("Debug: DATABASE_URL is", dbUrl ? "Defined" : "UNDEFINED");
    if (dbUrl) {
        // Mask password for safety in logs
        const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
        console.log("Debug: Loaded URL:", masked);
    } else {
        console.error("❌ FATAL: DATABASE_URL is not set!");
    }

    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        console.log("✅ Connection established!");

        // 1. Create
        console.log("📝 Creating test law...");
        const newLaw = await prisma.law.create({
            data: {
                titulo: "Ley de Prueba Automática",
                objetivo: "Verificar conexión a Supabase",
                detalles: "Esta ley fue creada por el script de prueba.",
                apodo: "TestBot",
                upvotes: 0,
                saves: 0,
            }
        });
        console.log(`✅ Created Law ID: ${newLaw.id}`);

        // 2. Read
        console.log("🔍 Reading back law...");
        const fetched = await prisma.law.findUnique({ where: { id: newLaw.id } });
        if (!fetched) throw new Error("Failed to retrieve created law!");
        console.log(`✅ Found: ${fetched.titulo}`);

        // 3. Delete
        console.log("🗑️ Cleaning up...");
        await prisma.law.delete({ where: { id: newLaw.id } });
        console.log("✅ Test law deleted.");

        console.log("🎉 FULL DB VERIFICATION SUCCESSFUL!");
    } catch (e) {
        console.error("❌ DB Verification Failed:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
