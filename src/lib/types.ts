// Define the structure for a Product
export type Product = {
  id: string; // Unique identifier (e.g., combination of serverId and code or a UUID)
  name: string;
  code: number;
  price: number;
  serverId?: string; // Optional: Identifier for the server where the product is located
};

export type UserRole = 'admin' | 'user';

// Define the structure for a User stored in Firestore
export type UserFirestoreData = {
  uid: string; // Firebase Auth UID, matches document ID
  email: string | null; // Email from Firebase Auth
  role: UserRole;
  createdAt?: any; // Firestore ServerTimestamp
  // Add any other profile information you want to store
};


// SessionPayload is no longer needed with Firebase Auth handling sessions.
// If you pass ID tokens to backend, you might define a type for the decoded token.
