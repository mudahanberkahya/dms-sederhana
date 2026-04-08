/**
 * Middleware to ensure the authenticated user has one of the required roles.
 * Must be used AFTER `requireAuth` middleware.
 * 
 * @param {...string} allowedRoles - List of roles permitted to access the route
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: Access requires authentication" });
        }

        const userRole = req.user.role || 'initiator'; // Default fallback

        if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
            // Admins usually bypass role checks, though this can be customized
            return res.status(403).json({
                error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]. You have [${userRole}]`
            });
        }

        next();
    };
};
