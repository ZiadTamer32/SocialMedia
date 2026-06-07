import nodemailer from "nodemailer";
import {
  EMAIL_PASSWORD,
  EMAIL_SERVICE,
  EMAIL_USERNAME,
} from "../../config/app.config.js";
import { InternalServerErrorException } from "../exceptions/domain.exception.js";

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
  },
});

const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) => {
  try {
    await transporter.sendMail({
      from: `"Social Media App" <${EMAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
  } catch (err: any) {
    throw new InternalServerErrorException(
      `Error sending verification email: ${err.message}` ||
        "Failed to send email",
    );
  }
};

export default sendEmail;
