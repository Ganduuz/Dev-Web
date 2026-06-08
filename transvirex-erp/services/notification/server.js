const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

// --- MODÈLE ---
const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "info" }, // 'info', 'warning', 'danger'
  lu: { type: Boolean, default: false },
  payload: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Notification = mongoose.model("Notification", NotificationSchema);

// --- RABBITMQ CONSUMER ---
async function startNotificationConsumer() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://rabbitmq");
    const channel = await conn.createChannel();
    
    // Écoute des événements de missions
    await channel.assertExchange("mission.events", "fanout", { durable: false });
    const q = await channel.assertQueue("notification_queue", { durable: true });
    await channel.bindQueue(q.queue, "mission.events", "");

    channel.consume(q.queue, async (msg) => {
      const event = JSON.parse(msg.content.toString());
      const createNotification = async (data) => {
        await Notification.create(data);
        console.log(`Notification créée: ${data.titre}`);
      };

      if (event.type === 'MISSION_INCIDENT') {
        const { missionId, incident } = event.payload;

        await createNotification({
          userId: "DISPATCHER",
          titre: `Incident signalé sur mission ${missionId}`,
          message: `${incident.type} – ${incident.description}`,
          type: "danger",
          payload: { missionId, incident }
        });

        await createNotification({
          userId: "ADMIN",
          titre: `Incident sur mission ${missionId}`,
          message: `Un incident a été signalé : ${incident.type}`,
          type: "danger",
          payload: { missionId, incident }
        });
      } else if (event.type === 'MISSION_REASSIGNED' || event.type === 'MISSION_PROPOSAL') {
        const mission = event.payload;

        await createNotification({
          userId: mission.chauffeurId,
          titre: `Proposition de mission ${mission.reference || mission.id}`,
          message: `Une mission vous a été proposée. Destination : ${mission.adresseArrivee}`,
          type: "info",
          payload: { mission }
        });

        await createNotification({
          userId: "ADMIN",
          titre: `Mission proposée / réassignée ${mission.reference || mission.id}`,
          message: `La mission a été assignée à ${mission.chauffeurId}`,
          type: "info",
          payload: { mission }
        });
      } else if (event.type === 'MISSION_DELIVERED') {
        const mission = event.payload;

        await createNotification({
          userId: "FACTURATION",
          titre: `Mission livrée : ${mission.reference || mission.id}`,
          message: `Préparez la facturation pour la livraison terminée.`,
          type: "success",
          payload: { mission }
        });

        await createNotification({
          userId: "ADMIN",
          titre: `Mission livrée ${mission.reference || mission.id}`,
          message: `Une mission vient d'être marquée comme livrée.`,
          type: "success",
          payload: { mission }
        });
      } else if (event.type === 'MISSION_CREATED') {
        await createNotification({
          userId: "ADMIN",
          titre: `Nouvelle mission créée ${event.payload.reference || event.payload.id}`,
          message: `Une nouvelle mission a été enregistrée.`,
          type: "info",
          payload: { mission: event.payload }
        });
      }

      channel.ack(msg);
    });
  } catch (err) {
    console.error("Erreur RabbitMQ, tentative de reconnexion dans 5s...", err);
    setTimeout(startNotificationConsumer, 5000);
  }
}

// --- ROUTES D'API ---
function buildUserNotificationQuery(userId, role) {
  const conditions = [{ userId }];
  if (role) conditions.push({ userId: role.toUpperCase() });
  conditions.push({ userId: "ADMIN" }, { userId: "ALL" });
  return { $or: conditions };
}

app.get(["/notifications/:userId", "/notification/user/:userId"], async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = buildUserNotificationQuery(req.params.userId, role);
    const notifs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(notifs);
  } catch (err) { next(err); }
});

app.post("/notification", async (req, res, next) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (err) { next(err); }
});

app.patch("/notification/:id/lire", async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { lu: true }, { new: true });
    if (!notification) return res.status(404).json({ error: "Notification non trouvée" });
    res.json(notification);
  } catch (err) { next(err); }
});

app.patch("/notification/user/:userId/tout-lire", async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = buildUserNotificationQuery(req.params.userId, role);
    const result = await Notification.updateMany(query, { lu: true });
    res.json({ modified: result.modifiedCount });
  } catch (err) { next(err); }
});

// --- DÉMARRAGE ---
app.listen(3005, async () => {
  await mongoose.connect(process.env.MONGO_URL || "mongodb://mongo:27017/erp");
  await startNotificationConsumer();
  console.log("Service Notification prêt sur port 3005 🚀");
});