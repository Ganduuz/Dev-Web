const express = require('express');
const app = express();

app.use(express.json());

const missionRoutes = require('./routes/mission.routes');
const { connectRabbitMQ } = require('./messaging/rabbitmq');

app.use('/missions', missionRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mission-service' }));

const PORT = process.env.PORT || 3002;

async function start() {
  await connectRabbitMQ();
  app.listen(PORT, () => console.log(`[mission-service] running on port ${PORT}`));
}

start().catch(console.error);