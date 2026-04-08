import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(salt + ':' + derivedKey.toString('hex'));
        });
    });
}

async function run() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const hashed = await hashPassword('password123');
        const emails = [
            'budi@astarahotel.com',
            'rina@astarahotel.com',
            'agus@astarahotel.com',
            'sari@astarahotel.com'
        ];
        
        for (const email of emails) {
            const res = await pool.query('SELECT id, name FROM "user" WHERE email = $1', [email]);
            if (res.rows.length > 0) {
                const userId = res.rows[0].id;
                await pool.query('UPDATE account SET password = $1 WHERE user_id = $2', [hashed, userId]);
                console.log(`✅ Reset password for ${res.rows[0].name} (${email})`);
            } else {
                console.log(`❌ User not found: ${email}`);
            }
        }
    } finally {
        await pool.end();
    }
}

run().catch(console.error);
