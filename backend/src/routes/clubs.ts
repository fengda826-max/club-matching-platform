import express from 'express'
import { prisma } from '../lib/prisma'
import { clubCreateSchema, clubIdSchema, clubUpdateSchema } from '../schemas/club'
import { ClubService } from '../services/ClubService'

const router = express.Router()
const clubService = new ClubService(prisma)

router.get('/', async (_req, res, next) => {
  try { res.json({ success: true, data: await clubService.getAllClubs() }) }
  catch (error) { next(error) }
})

router.get('/statistics/summary', async (_req, res, next) => {
  try { res.json({ success: true, data: await clubService.getStatistics() }) }
  catch (error) { next(error) }
})

router.get('/search/:keyword', async (req, res, next) => {
  try { res.json({ success: true, data: await clubService.searchClubs(req.params.keyword.slice(0, 100)) }) }
  catch (error) { next(error) }
})

router.get('/tags/all', async (_req, res, next) => {
  try { res.json({ success: true, data: await clubService.getAllTags() }) }
  catch (error) { next(error) }
})

router.get('/category/:category', async (req, res, next) => {
  try { res.json({ success: true, data: await clubService.filterByCategory(req.params.category.slice(0, 30)) }) }
  catch (error) { next(error) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const club = await clubService.getClubById(clubIdSchema.parse(req.params.id))
    if (!club) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '社团不存在' })
    return res.json({ success: true, data: club })
  } catch (error) { return next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    const club = await clubService.createClub(clubCreateSchema.parse(req.body))
    res.status(201).json({ success: true, data: club })
  } catch (error) { next(error) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const club = await clubService.updateClub(clubIdSchema.parse(req.params.id), clubUpdateSchema.parse(req.body))
    res.json({ success: true, data: club })
  } catch (error) { next(error) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const club = await clubService.deleteClub(clubIdSchema.parse(req.params.id))
    res.json({ success: true, data: club })
  } catch (error) { next(error) }
})

export default router
