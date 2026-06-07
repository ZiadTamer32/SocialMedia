import { generateOTP } from "../security/generateOTP.js";
import { hashOperation } from "../security/hash.js";
import sendEmail from "./sendEmail.js";
import redisMethods from "../../DB/repositories/redis.repo.js";

const sendOTP = async ({
  email,
  subject,
  template,
}: {
  email: string;
  subject: string;
  template: string;
}) => {
  const OTP = generateOTP();
  const hashedOTP = await hashOperation({ plainText: OTP });

  await sendEmail({
    to: email,
    subject,
    html: template.replace("{verificationCode}", OTP),
  });

  await redisMethods.setString({
    key: `OTP::${email}::${subject.replaceAll(" ", "_")}`,
    value: hashedOTP,
    expValue: 60 * 5,
  });
};

export default sendOTP;
