import admin from "firebase-admin";
import path from "node:path";
import { readFileSync } from "node:fs";
import { FIREBASE_PATH } from "../../config/app.config.js";

class FirebaseService {
  private _serviceAccount = readFileSync(path.resolve(FIREBASE_PATH));
  private _client;

  constructor() {
    this._client = admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(this._serviceAccount as unknown as string),
      ),
    });
  }

  async sendNotification({
    token,
    title,
    body,
  }: {
    token: string;
    title: string;
    body: string;
  }) {
    return await this._client
      .messaging()
      .send({ token, data: { title, body } });
  }
  async sendNotifications({
    tokens,
    title,
    body,
  }: {
    tokens: string[];
    title: string;
    body: string;
  }) {
    return await Promise.all(
      tokens.map((token) => {
        return this._client.messaging().send({ token, data: { title, body } });
      }),
    );
  }
}

export default new FirebaseService();
