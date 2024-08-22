import jwt from "jsonwebtoken";

const generateJwt = (id, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  res.cookie("token", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: false,
    sameSite: "none",
    path: "/"
  });
};

export default generateJwt;
