const jwt = require("jsonwebtoken");
const config = require("config");

function authMiddleware(req, res, next) {
  if (
    !req.query.age &&
    !req.query.gender &&
    !req.query.fromDate &&
    !req.query.toData
  ) {
    console.log("req age", req.age);
    next();
  } else {
    const token = req.header("x-auth-token");

    if (!token)
      return res.status(401).send("Access denied. No token provided.");

    try {
      const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
      req.user = decoded;
      next();
    } catch (ex) {
      res.status(400).send("Invalid token.");
    }
  }
}

module.exports = authMiddleware;
