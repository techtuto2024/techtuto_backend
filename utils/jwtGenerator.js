import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === 'production';

const generateJwt = (id, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  // res.cookie('token', token, {
  //   secure: false, // set to true or isProduction when frontend is on https
  //   sameSite: "none",
  //   maxAge: 15 * 24 * 60 * 60 * 1000
  // });
  return token
};

export default generateJwt;
