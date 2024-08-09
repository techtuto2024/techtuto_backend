import jwt from "jsonwebtoken";

const generateJwt = (id, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    maxAge: "15d",
  });
  res.cookie("token", token, {
    expiresIn: 15 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
  });
};

export default generateJwt;
