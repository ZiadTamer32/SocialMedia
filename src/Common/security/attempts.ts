import redisMethods from "../../DB/repositories/redis.repo.js";
import { TooManyRequestsException } from "../exceptions/domain.exception.js";

const attempts = async ({
  email,
  type,
  numOfAttempts,
  expireAt,
}: {
  email: string;
  type: string;
  numOfAttempts: number;
  expireAt: number;
}) => {
  const blockKey = `BLOCK::${email}::${type}`;
  const attemptKey = `ATTEMPT::${email}::${type}`;

  // 1. Check if user is currently blocked
  const isBlocked = await redisMethods.getString(blockKey);
  if (isBlocked) {
    throw new TooManyRequestsException(
      `Too many attempts. Please try again later.`,
    );
  }

  // 2. Get current attempt count
  const attempt = await redisMethods.getString(attemptKey);

  let countAttempt = 0;
  if (attempt) {
    countAttempt = +attempt;
  }

  const currentAttempt = countAttempt + 1;

  // 3. After numOfAttempts attempt → (expireAt) min block
  if (currentAttempt >= numOfAttempts) {
    await redisMethods.setString({
      key: blockKey,
      value: "blocked",
      expValue: expireAt,
    });
    await redisMethods.del(attemptKey);
    throw new TooManyRequestsException(
      "Too many attempts. Please try again in 5 minutes.",
    );
  }

  // 4. Increment attempt counter
  if (!attempt) {
    await redisMethods.setString({
      key: attemptKey,
      value: 1,
      expValue: 60 * 30,
    });
  } else {
    await redisMethods.incr(attemptKey);
  }
};

export default attempts;
