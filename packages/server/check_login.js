import 'dotenv/config';
import { auth } from './src/auth.js';

async function run() {
    try {
        const body = {
            email: "ot@pentacity-hotel.com",
            password: "test1234"
        };
        const headers = new Headers();
        const req = new Request("http://localhost:3001/api/auth/sign-in/email", {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        const res = await auth.handler(req);
        console.log("Status:", res.status);
        res.headers.forEach((v,k) => console.log(k,v));
        console.log("Body:", await res.text());
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
