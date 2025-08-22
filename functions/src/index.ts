import * as functions from "firebase-functions";
import * as express from "express";
import {google} from "googleapis";

const app = express();

// Simple endpoint for testing
app.get("/hello", (req, res) => {
  res.status(200).send("Hello from the Gemini Adapter!");
});

// Get credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "https://us-central1-athoughtless.cloudfunctions.net/api/auth/google/callback";

// Add debug logging to check if env vars are loaded.
functions.logger.info("Attempting to initialize OAuth2Client...");
functions.logger.info(`CLIENT_ID: ${CLIENT_ID ? "Loaded" : "MISSING"}`);
functions.logger.info(`CLIENT_SECRET: ${CLIENT_SECRET ? "Loaded" : "MISSING"}`);

// Scopes required for Gemini API
const SCOPES = [
  "https://www.googleapis.com/auth/generative-language.tuning",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Step 1: Redirect user to Google's consent screen
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.redirect(authUrl);
});

// Step 2: Handle the callback from Google
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const {tokens} = await oauth2Client.getToken(code);
    // IMPORTANT: In a real app, you would securely store these tokens
    // associated with the user.
    // For this test, we'll just log them to the function logs.
    functions.logger.info("Received Tokens:", tokens);

    oauth2Client.setCredentials(tokens);

    // You can optionally get user profile info to confirm who logged in
    const oauth2 = google.oauth2({version: "v2", auth: oauth2Client});
    const {data} = await oauth2.userinfo.get();
    functions.logger.info("User Info:", data);

    const successMessage = "Authentication successful! You can close this tab.";
    return res.status(200).send(successMessage);
  } catch (error) {
    functions.logger.error("Error retrieving access token", error);
    return res.status(500).send("Authentication failed");
  }
});


const runtimeOptions = {
  secrets: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
};

export const api = functions.runWith(runtimeOptions).https.onRequest(app);
