import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === 'production';

const generateJwt = (id, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 24 * 60 * 60 * 1000
  });
};

export default generateJwt;
