import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    // service: process.env.SMTP_SERVICE,
    host: "smtp.hostinger.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    // authMethod: "LOGIN",
  });

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: options.email,
    subject: options.subject,
    // Use `html` if `isHtml` is true, otherwise use `text`
    [options.isHtml ? "html" : "text"]: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
