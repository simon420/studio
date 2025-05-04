// Define the structure for a Product
export type Product = {
  id: string; // Unique identifier (e.g., combination of serverId and code or a UUID)
  name: string;
  code: number;
  price: number;
  serverId?: string; // Optional: Identifier for the server where the product is located
};

// Define the structure for a User
export type User = {
  id: string; // Firestore document ID
  username: string;
  passwordHash: string; // Store hashed password, never plain text
  role: 'admin' | 'user';
};

// Type for session payload (stored in JWT)
export type SessionPayload = {
  userId: string;
  username: string;
  role: User['role'];
  exp?: number; // Expiration timestamp
};
