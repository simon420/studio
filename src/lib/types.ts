// Define the structure for a Product
export type Product = {
  id: string; // Unique identifier (e.g., combination of serverId and code or a UUID)
  name: string;
  code: number;
  price: number;
  serverId?: string; // Optional: Identifier for the server where the product is located
};
