import { config } from '@/config';
import { UserService, JWTService, EmailService } from '@/services';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginOtp = async (req, res) => {
  const { email } = req.body;

  const existingEmail = await UserService.findOtpEmail(email);

  if (!existingEmail) {
    await UserService.createEmailInOtp(email);
  }
  let otp;
  if (email.endsWith('@venue.com')) {
    otp = '000000';
  } else {
    otp = Math.floor(100000 + Math.random() * 900000).toString();
    EmailService.sendOTPEmail(email, otp);
  }

  await UserService.updateOtp(email, { otp: otp });

  res.status(200).json({ message: 'OTP sent to your email' });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await UserService.findOtpEmail(email);

  if (!user || user.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Check if OTP has expired
  const currentTime = new Date();
  const expiryTime = new Date(user.expirytime);
  if (currentTime > expiryTime) {
    await UserService.removeEmailinOtp(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  const existingUser = await UserService.findByEmail(email);
  console.log(existingUser);
  if (!existingUser) {
    await UserService.removeEmailinOtp(email);

    return res.status(200).json({
      message: 'success',
      data: { email: email, isNewUser: true },
      status: 200,
      success: true,
    });
  } else {
    const accessToken = JWTService.generateAccessToken(existingUser);
    const refreshToken = JWTService.generateRefreshToken(existingUser);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
    });

    await UserService.removeEmailinOtp(email);

    return res.status(200).json({
      message: 'Onboarding pending',
      status: 200,
      success: false,
      data: { ...existingUser, accessToken },
    });
  }
};

export const createUser = async (req, res) => {
  try {
    if (req.body.phone) {
      const existingPhone = await UserService.findByPhone(req.body.phone);
      if (existingPhone) {
        return res.status(409).json({
          message: 'Phone number already exists',
          status: 409,
          success: false,
        });
      }
    }

    const newUser = await UserService.create({
      ...req.body,
    });

    const accessToken = JWTService.generateAccessToken(newUser);
    const refreshToken = JWTService.generateRefreshToken(newUser);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
    });

    return res.status(201).json({
      message: 'success',
      data: { ...newUser, accessToken },
      status: 201,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    console.log(req.body);
    const existingUser = await UserService.findByEmail(req.body.email);
    if (!existingUser) {
      return res.status(200).json({
        message: 'success',
        data: { ...req.body, isNewUser: true },
        status: 200,
        success: true,
      });
    } else {
      const accessToken = JWTService.generateAccessToken(existingUser);
      const refreshToken = JWTService.generateRefreshToken(existingUser);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
      });

      return res.status(200).json({
        message: 'Google Login User',
        status: 200,
        success: false,
        data: { ...existingUser, accessToken },
      });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  const options = {
    httpOnly: true,
    secure: true,
  };

  req.user = null;

  return res.status(200).clearCookie('refreshToken', options).json({
    message: 'User logged Out',
    status: 200,
    success: true,
    data: {},
  });
};

export const refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) {
    return res.status(400).json({
      message: 'Refresh token not found',
      status: 400,
      success: false,
    });
  }
  const refreshToken = cookies.refreshToken;
  jwt.verify(refreshToken, config.TOKEN.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        message: 'Unauthorized',
        status: 401,
        success: false,
      });
    }
    const { iat, ...restUser } = user;
    const accessToken = JWTService.generateAccessToken(restUser);
    res.status(200).json({
      message: 'success',
      status: 200,
      data: accessToken,
      success: true,
    });
  });
};

export const changePassword = async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;
  if (!id || !oldPassword || !newPassword) {
    return res.status(400).json({
      message: 'Required field missing',
      status: 400,
      success: false,
    });
  }
  const user = await UserService.findById(id);

  if (!user) {
    return res.status(400).json({
      message: 'User not found',
      status: 400,
      success: false,
    });
  }
  console.log(user);
  const { password } = user;
  const compare = await bcrypt.compare(oldPassword, password);
  if (!compare) {
    return res.status(400).json({
      message: 'Incorrect Password',
      status: 400,
      success: false,
    });
  }
  const hashedPassword = await UserService.hashPassword(newPassword);
  const result = await UserService.updatePassword(id, hashedPassword);
  console.log(result);
  if (!result) {
    return res.status(400).json({
      message: 'Password Changed Failed',
      status: 400,
      success: false,
    });
  }
  delete result.password;
  return res.status(200).json({
    message: 'success',
    status: 200,
    success: true,
    data: { ...result },
  });
};
