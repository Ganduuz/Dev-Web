const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'transvirex_secret_2026';

/**
 * Middleware pour vérifier le token JWT
 * Ajoute req.user avec les données décodées du token
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  const token = header.split(' ')[1];
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * @param {string[]} roles - Liste des rôles autorisés
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    
    if (!roles.includes(req.user.role?.toLowerCase?.())) {
      return res.status(403).json({ error: 'Accès refusé : rôle insuffisant' });
    }
    
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
};
