const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
global.crypto = require("crypto");
// 🔌 MongoDB connection (Docker)
mongoose.connect("mongodb://mongo:27017/erp")
  .then(() => console.log("MongoDB connected 🚀"))
  .catch(err => console.error("MongoDB error ❌", err));

// 📦 USER MODEL
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true }, // chauffeur, dispatcher, admin
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", UserSchema);

// 🧪 TEST ROUTE
app.get("/", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/", async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 🔍 GET USER BY ID
app.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🚀 START SERVER
app.listen(3001, () => {
    console.log("User service running on port 3001");
});