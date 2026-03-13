const jwt = require('jsonwebtoken');

/**
 * Senior Dev Tip: We use a try-catch block here to handle 
 * expired or malformed tokens gracefully without crashing the server.
 */
module.exports = function (req, res, next) {
  // 1. Get token from the header
  // Standard format: "Authorization: Bearer <token>"
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Check if no token exists
  if (!token) {
    return res.status(401).json({ msg: 'No token found, authorization denied' });
  }

  // 3. Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add the user payload (id, username) to the request object
    req.user = decoded;
    
    // 4. CALL NEXT() - This moves the request to the next function/route
    next(); 
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid or has expired' });
  }
};