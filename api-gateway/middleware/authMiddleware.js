const jwt = require("jsonwebtoken");
const apiLogger = require("../src/utils/apiLogger");

const authValidation = async (req, res, next) => {
  // Fix: Using exact array lookups or clean regex on req.path ignores query strings completely
  const publicGetPaths = ["/get-posts", "/get-posts/:id"];
  const publicPostPaths = ["/register", "/login", "/refresh"];

  const isPublicGet =
    req.method === "GET" &&
    (publicGetPaths.includes(req.path) || req.path.startsWith("/posts/"));
  const isPublicPost =
    req.method === "POST" && publicPostPaths.includes(req.path);

  if (isPublicGet || isPublicPost) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      apiLogger.warn(
        `Authorization blocked: No token provided for path ${req.path}`,
      );
      return res.status(401).json({
        success: false,
        message: "Access Denied: No Token Provided",
      });
    }

    // jwt.verify automatically handles expiration & signature checks, throwing on failure
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Append user payload directly to the request pipeline context
    req.userInfo = decodedToken;
    next();
  } catch (error) {
    // Branch our logs and messaging based on the explicit JWT error signature
    if (error.name === "TokenExpiredError") {
      apiLogger.warn("Authentication failed: Token expired");
      return res.status(401).json({
        success: false,
        message: "Session Expired: Please refresh your authentication",
      });
    }

    apiLogger.error("Authentication failed: Invalid token signature", error);
    return res.status(401).json({
      success: false,
      message: "Access Denied: Invalid Token Provided",
    });
  }
};

module.exports = authValidation;
