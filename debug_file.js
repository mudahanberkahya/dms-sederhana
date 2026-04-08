import { db } from './packages/server/src/db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const id = '17fcb343-8dfc-4f09-a584-a2b58f15d601';
        console.log(`Checking doc ${id}...`);
        const res = await db.execute(sql`SELECT file_path, signed_file_path FROM document WHERE id = ${id}`);
        console.log("DB Result:", res);

        let filePath = res[0].signed_file_path || res[0].file_path;
        console.log("filePath:", filePath);

        let absolutePath = filePath;
        if (!path.isAbsolute(filePath)) {
            absolutePath = path.resolve(process.cwd(), filePath);
            if (!fs.existsSync(absolutePath) && process.env.DOCUMENT_STORAGE_PATH) {
                absolutePath = path.join(process.env.DOCUMENT_STORAGE_PATH, path.basename(filePath));
            }
        }
        console.log("resolved path:", absolutePath);
        if (fs.existsSync(absolutePath)) {
            const stats = fs.statSync(absolutePath);
            console.log("File exists! Size:", stats.size, "bytes");
        } else {
            console.log("FILE DOES NOT EXIST AT PATH.");
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
