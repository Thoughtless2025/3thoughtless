import * as functions from "firebase-functions";
import * as express from "express";

const app = express();

app.get("/hello", (req, res) => {
  res.status(200).send("Hello from the Gemini Adapter!");
});

export const api = functions.https.onRequest(app);