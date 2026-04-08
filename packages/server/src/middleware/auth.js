import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

/**
 * Middleware to ensure the user is authenticated.
 * Attaches the user session to `req.user` and `req.session`.
 */
export const requireAuth = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session || !session.user) {
            return res.status(401).json({ error: "Unauthorized: No valid session" });
        }

        req.user = session.user;
        req.session = session.session;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
