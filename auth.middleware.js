require("dotenv").config();
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.header("x-access-token");
  if (!token) return res.status(401).send("access denied. No token provided");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // const decoded = jwt.verify(token, 'test');
    req.user = decoded;
    next();
  } catch (err) {
    console.log("err");
    res.status(400).send(err);
  }
}

module.exports = { auth };
