import { config } from '@/config';
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(400).json({
      message: 'Token not found',
      status: 400,
    });
  }
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({
      message: 'Token not found',
      status: 400,
    });
  }

  jwt.verify(token, config.TOKEN.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        message: 'Unauthorised',
        status: 401,
      });
    }

    req.user = user;
    next();
  });
};
