const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
global.crypto = require("crypto");

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
let retryCount = 0;
const MAX_RETRIES = 10;

async function startNotificationConsumer() {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";
    console.log(`Tentative de connexion à RabbitMQ (${rabbitmqUrl})...`);
    
    const conn = await amqp.connect(rabbitmqUrl);
    const channel = await conn.createChannel();
    
    // Écoute des événements de missions
    await channel.assertExchange("mission.events", "fanout", { durable: false });
    const q = await channel.assertQueue("notification_queue", { durable: true });
    await channel.bindQueue(q.queue, "mission.events", "");

    console.log("✅ Consommateur de notifications RabbitMQ démarré");
    retryCount = 0; // Reset counter on success

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        console.log(`📩 Événement reçu: ${event.type}`);
        
        const createNotification = async (data) => {
          await Notification.create(data);
          console.log(`✅ Notification créée: ${data.titre}`);
        };

        const notifyUsers = async (userIds, data) => {
          await Promise.all(userIds.map((userId) => createNotification({ ...data, userId })));
        };

        if (event.type === 'MISSION_INCIDENT') {
          const { missionId, incident } = event.payload;
          await notifyUsers(["DISPATCHER", "ADMIN"], {
            titre: `Alerte incendie mission ${missionId}`,
            message: `${incident.type} – ${incident.description}`,
            type: "alerte",
            payload: { missionId, incident }
          });
        } else if (event.type === 'MISSION_REASSIGNED' || event.type === 'MISSION_PROPOSAL') {
          const mission = event.payload;
          await notifyUsers([mission.chauffeurId, "ADMIN"], {
            titre: `Nouvelle mission / réassignation ${mission.reference || mission._id}`,
            message: `Destination : ${mission.adresseArrivee}`,
            type: "info",
            payload: { mission }
          });
        } else if (event.type === 'MISSION_DELIVERED') {
          const mission = event.payload;
          await notifyUsers(["FACTURATION", "ADMIN"], {
            titre: `Livraison terminée ${mission.reference || mission._id}`,
            message: `Préparez la facturation pour cette mission.`,
            type: "succes",
            payload: { mission }
          });
        } else if (event.type === 'MISSION_CREATED') {
          await notifyUsers(["ADMIN"], {
            titre: `Nouvelle mission créée ${event.payload.reference || event.payload._id}`,
            message: `Une nouvelle mission a été enregistrée.`,
            type: "info",
            payload: { mission: event.payload }
          });
        } else if (event.type === 'MISSION_STATUS_UPDATED') {
          await notifyUsers(["ADMIN"], {
            titre: `Statut mission mis à jour ${event.payload.reference || event.payload._id}`,
            message: `Nouveau statut : ${event.payload.statut}`,
            type: "info",
            payload: { mission: event.payload }
          });
        }
        
        channel.ack(msg);
      } catch (msgErr) {
        console.error("Erreur traitement message:", msgErr);
        channel.nack(msg, false, false);
      }
    });

    // Handle connection errors
    conn.on("error", (err) => {
      console.error("Erreur connexion RabbitMQ:", err);
      retryConnect();
    });

  } catch (err) {
    console.error(`❌ Erreur RabbitMQ (tentative ${retryCount + 1}/${MAX_RETRIES}):`, err.message);
    retryConnect();
  }
}

function retryConnect() {
  retryCount++;
  if (retryCount > MAX_RETRIES) {
    console.warn("⚠️  Nombre maximum de tentatives atteint. Service en mode dégradé.");
    return;
  }
  const delay = Math.min(5000 * Math.pow(2, Math.min(retryCount - 1, 3)), 30000);
  console.log(`⏳ Reconnexion RabbitMQ dans ${delay}ms...`);
  setTimeout(startNotificationConsumer, delay);
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
    const userId = req.params.userId;
    const query = buildUserNotificationQuery(userId, role);
    
    console.log(`📬 Requête notifications pour userId=${userId}, role=${role}, query:`, JSON.stringify(query));
    
    const notifs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    console.log(`📭 ${notifs.length} notifications trouvées pour ${userId}`);
    res.json(notifs);
  } catch (err) {
    console.error("Erreur récupération notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/notification", async (req, res, next) => {
  try {
    console.log("📧 Création notification manuelle:", req.body);
    const notification = await Notification.create(req.body);
    console.log("✅ Notification créée:", notification._id);
    res.status(201).json(notification);
  } catch (err) {
    console.error("❌ Erreur création notification:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/notification/:id/lire", async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { lu: true }, { new: true });
    if (!notification) return res.status(404).json({ error: "Notification non trouvée" });
    res.json(notification);
  } catch (err) {
    console.error("Erreur marquer notification comme lu:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/notification/user/:userId/tout-lire", async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = buildUserNotificationQuery(req.params.userId, role);
    const result = await Notification.updateMany(query, { lu: true });
    console.log(`✅ ${result.modifiedCount} notifications marquées comme lu pour ${req.params.userId}`);
    res.json({ modified: result.modifiedCount });
  } catch (err) {
    console.error("Erreur marquage tout lire:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- DÉMARRAGE ---
const port = process.env.PORT || 3005;
app.listen(port, async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://mongo:27017/erp");
    console.log(`Service Notification prêt sur port ${port} 🚀`);
  } catch (err) {
    console.error("Erreur connexion MongoDB:", err.message);
  }
  
  // Démarrer le consumer RabbitMQ en arrière-plan (non-bloquant)
  startNotificationConsumer();
});