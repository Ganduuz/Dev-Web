// switch DB
db = db.getSiblingDB("erp");

// DRIVERS
db.drivers.insertMany([
  { name: "Ali", vehicle: "Truck", rating: 4.5 },
  { name: "Yassine", vehicle: "Van", rating: 4.2 }
]);

// CLIENTS
db.clients.insertMany([
  { name: "Amazon", address: "Paris" },
  { name: "Carrefour", address: "Lille" }
]);

// HUBS
db.hubs.insertMany([
  { name: "Paris Hub", city: "Paris" },
  { name: "Lille Hub", city: "Lille" }
]);

// DELIVERIES
db.deliveries.insertMany([
  { from: "Paris", to: "Lille", status: "pending" },
  { from: "Lille", to: "Paris", status: "done" }
]);