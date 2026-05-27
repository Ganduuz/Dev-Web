const express = require("express");
const app = express();

app.use(express.json());

let notifications = [];

// GET notifications
app.get("/notification", (req, res) => {
    res.json(notifications);
});

// POST notification
app.post("/notification", (req, res) => {
    const notif = {
        id: notifications.length + 1,
        ...req.body
    };
    notifications.push(notif);
    res.json(notif);
});

app.listen(3005, () => {
    console.log("Notification service running on 3005");
});