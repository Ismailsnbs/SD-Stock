import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Admin tokens last a month (they use both mobile + web, re-login is cheap).
export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, role: "admin", username: admin.username }, SECRET, {
    expiresIn: "30d"
  });
}

// Customer tokens never expire — the storefront keeps members logged in forever.
export function signCustomerToken(customer) {
  return jwt.sign(
    { sub: customer.id, role: "customer", loginId: customer.loginId, name: customer.name },
    SECRET
    // no expiresIn → infinite session
  );
}

function readToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export function requireAdmin(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin access only." });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Your session is no longer valid. Sign in again." });
  }
}

export function requireCustomer(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "customer") return res.status(403).json({ error: "Customer access only." });
    req.customer = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Your session is no longer valid. Sign in again." });
  }
}
