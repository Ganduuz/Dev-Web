const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { publishEvent } = require('../messaging/rabbitmq');

const prisma = new PrismaClient();

const missionSchema = z.object({
  chauffeurId:    z.string().uuid(),
  clientNom:      z.string().min(1),
  adresseDepart:  z.string().min(1),
  adresseArrivee: z.string().min(1),
  dateDepart:     z.string().datetime(),
  priorite:       z.enum(['BASSE','NORMALE','HAUTE','URGENTE']).optional(),
  notes:          z.string().optional(),
});

// ── GET /missions ─────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { statut, chauffeurId, priorite } = req.query;
    const where = {};
    if (statut)      where.statut     = statut;
    if (chauffeurId) where.chauffeurId = chauffeurId;
    if (priorite)    where.priorite   = priorite;

    // Un chauffeur ne voit que ses missions
    if (req.user.role === 'CHAUFFEUR') where.chauffeurId = req.user.userId;

    const missions = await prisma.mission.findMany({
      where,
      include: { incidents: true },
      orderBy: { dateDepart: 'asc' },
    });
    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/:id ─────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      include: { incidents: true },
    });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions — créer (DISPATCHER, ADMIN) ────────────────────────────────
router.post('/', verifyToken, requireRole(['DISPATCHER','ADMIN']), async (req, res) => {
  try {
    const data = missionSchema.parse(req.body);
    const mission = await prisma.mission.create({
      data: { ...data, dispatcherId: req.user.userId, dateDepart: new Date(data.dateDepart) },
    });
    publishEvent('mission.events', { type: 'MISSION_CREATED', payload: mission });
    res.status(201).json(mission);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ errors: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/statut — changer le statut ───────────────────────────
router.patch('/:id/statut', verifyToken, async (req, res) => {
  try {
    const { statut } = req.body;
    const allowed = ['EN_ATTENTE','ASSIGNEE','EN_COURS','LIVREE','INCIDENT','ANNULEE'];
    if (!allowed.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

    const mission = await prisma.mission.update({
      where: { id: req.params.id },
      data: {
        statut,
        dateLivraison: statut === 'LIVREE' ? new Date() : undefined,
      },
    });
    publishEvent('mission.events', { type: 'MISSION_STATUS_UPDATED', payload: mission });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/assigner — réassigner un chauffeur ───────────────────
router.patch('/:id/assigner', verifyToken, requireRole(['DISPATCHER','ADMIN']), async (req, res) => {
  try {
    const { chauffeurId } = req.body;
    if (!chauffeurId) return res.status(400).json({ error: 'chauffeurId requis' });

    const mission = await prisma.mission.update({
      where: { id: req.params.id },
      data: { chauffeurId, statut: 'ASSIGNEE' },
    });
    publishEvent('mission.events', { type: 'MISSION_REASSIGNED', payload: mission });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions/:id/incidents — signaler un incident ──────────────────────
router.post('/:id/incidents', verifyToken, async (req, res) => {
  try {
    const { type, description } = req.body;
    if (!type || !description) return res.status(400).json({ error: 'type et description requis' });

    const [incident] = await prisma.$transaction([
      prisma.incident.create({
        data: { missionId: req.params.id, type, description, signalePar: req.user.userId },
      }),
      prisma.mission.update({ where: { id: req.params.id }, data: { statut: 'INCIDENT' } }),
    ]);

    publishEvent('mission.events', { type: 'MISSION_INCIDENT', payload: { missionId: req.params.id, incident } });
    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /missions/:id (ADMIN) ──────────────────────────────────────────────
router.delete('/:id', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await prisma.mission.delete({ where: { id: req.params.id } });
    res.json({ message: 'Mission supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;