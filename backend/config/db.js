import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup environment variables - try backend/.env first, then fallback to root/cwd .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });
dotenv.config({ override: true });

/**
 * Core Database Connection configuration.
 *
 * Establishes a database connection using Mongoose with the provided
 * connection URI. Gracefully handles errors and offline fallbacks.
 */

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'foodflow';

  if (!uri) {
    console.log('Database not configured');
    console.log('Running without MongoDB');
    return null;
  }

  try {
    // Mongoose standard connection setup
    await mongoose.connect(uri, {
      dbName,
    });
    
    console.log('MongoDB Connected Successfully');
    console.log(`Database: ${dbName}`);
    return mongoose.connection;
  } catch (error) {
    console.log(`[Database] Standard environment URI connection failed (${error.message}). Gracefully falling back to local JSON persistence.`);
    try {
      await mongoose.disconnect();
    } catch (disError) {
      // Swallowed
    }
    return null;
  }
};

export default connectDB;
