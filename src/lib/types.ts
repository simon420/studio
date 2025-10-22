// src/lib/types.ts
// Define the structure for a Product
export type Product = {
  id: string; // Unique identifier (e.g., combination of serverId and code or a UUID)
  name: string;
  code: number;
  price: number;
  serverId?: string; // Optional: Identifier for the server where the product is located
  addedByUid?: string; // UID of the user who added the product
  addedByEmail?: string; // Email of the user who added the product
};

export type UserRole = 'admin' | 'user'; // 'pending' role is no longer used in user documents

// Define the structure for a User stored in Firestore
export type UserFirestoreData = {
  uid: string; // Firebase Auth UID, matches document ID
  email: string | null; // Email from Firebase Auth
  role: UserRole;
  createdAt?: any; // Firestore ServerTimestamp
};

// This type is for the new admin registration request flow
export type AdminRequest = {
    id: string;
    email: string;
    hashedPassword?: string; // Password is now stored hashed in the request
    status: 'pending' | 'approved' | 'declined';
    requestedAt: any; // Firestore Timestamp
}


// SessionPayload is no longer needed with Firebase Auth handling sessions.
// If you pass ID tokens to backend, you might define a type for the decoded token.

    