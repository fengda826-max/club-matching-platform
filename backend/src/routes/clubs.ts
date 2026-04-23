import express from 'express'
import { PrismaClient } from '@prisma/client'
import { ClubService } from '../services/ClubService'

const router = express.Router()
const prisma = new PrismaClient()
const clubService = new ClubService(prisma)

/**
 * Get all clubs
 * GET /api/clubs
 */
router.get('/', async (req, res, next) => {
  try {
    const clubs = await clubService.getAllClubs()
    res.json({ success: true, data: clubs })
  } catch (err) {
    next(err)
  }
})

/**
 * Get single club by ID
 * GET /api/clubs/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const club = await clubService.getClubById(id)
    if (!club) {
      return res.status(404).json({ success: false, error: 'Club not found' })
    }
    res.json({ success: true, data: club })
  } catch (err) {
    next(err)
  }
})

/**
 * Create new club
 * POST /api/clubs
 */
router.post('/', async (req, res, next) => {
  try {
    const data = req.body
    const club = await clubService.createClub(data)
    res.status(201).json({ success: true, data: club })
  } catch (err) {
    next(err)
  }
})

/**
 * Update existing club
 * PUT /api/clubs/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const data = req.body
    const club = await clubService.updateClub(id, data)
    res.json({ success: true, data: club })
  } catch (err) {
    next(err)
  }
})

/**
 * Delete club
 * DELETE /api/clubs/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const club = await clubService.deleteClub(id)
    res.json({ success: true, data: club })
  } catch (err) {
    next(err)
  }
})

/**
 * Get statistics
 * GET /api/clubs/statistics/summary
 */
router.get('/statistics/summary', async (req, res, next) => {
  try {
    const stats = await clubService.getStatistics()
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

/**
 * Search clubs
 * GET /api/clubs/search/:keyword
 */
router.get('/search/:keyword', async (req, res, next) => {
  try {
    const keyword = req.params.keyword
    const clubs = await clubService.searchClubs(keyword)
    res.json({ success: true, data: clubs })
  } catch (err) {
    next(err)
  }
})

/**
 * Get all tags
 * GET /api/clubs/tags/all
 */
router.get('/tags/all', async (req, res, next) => {
  try {
    const tags = await clubService.getAllTags()
    res.json({ success: true, data: tags })
  } catch (err) {
    next(err)
  }
})

/**
 * Filter by category
 * GET /api/clubs/category/:category
 */
router.get('/category/:category', async (req, res, next) => {
  try {
    const category = req.params.category
    const clubs = await clubService.filterByCategory(category)
    res.json({ success: true, data: clubs })
  } catch (err) {
    next(err)
  }
})

export default router
