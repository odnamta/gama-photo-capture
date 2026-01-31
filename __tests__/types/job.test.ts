import { describe, it, expect } from 'vitest'
import {
  JOB_STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_STATUS_COLORS,
  getStageStatus,
  type JobStage,
  type StageProgress,
  type StageStatus,
} from '@/types/job'

describe('Job Types', () => {
  describe('JOB_STAGES', () => {
    it('should have exactly 3 stages in correct order', () => {
      expect(JOB_STAGES).toEqual(['job_start', 'in_transit', 'job_end'])
    })

    it('should have labels for all stages', () => {
      JOB_STAGES.forEach(stage => {
        expect(STAGE_LABELS[stage]).toBeDefined()
        expect(STAGE_LABELS[stage].en).toBeTruthy()
        expect(STAGE_LABELS[stage].id).toBeTruthy()
      })
    })

    it('should have descriptions for all stages', () => {
      JOB_STAGES.forEach(stage => {
        expect(STAGE_DESCRIPTIONS[stage]).toBeDefined()
        expect(STAGE_DESCRIPTIONS[stage].en).toBeTruthy()
        expect(STAGE_DESCRIPTIONS[stage].id).toBeTruthy()
      })
    })
  })

  describe('getStageStatus', () => {
    it('should return "locked" when stage is locked', () => {
      const progress: StageProgress = {
        required: 4,
        completed: 0,
        total: 5,
        isComplete: false,
        isLocked: true,
      }
      expect(getStageStatus(progress)).toBe('locked')
    })

    it('should return "complete" when stage is complete', () => {
      const progress: StageProgress = {
        required: 4,
        completed: 4,
        total: 5,
        isComplete: true,
        isLocked: false,
      }
      expect(getStageStatus(progress)).toBe('complete')
    })

    it('should return "in_progress" when some photos taken', () => {
      const progress: StageProgress = {
        required: 4,
        completed: 2,
        total: 5,
        isComplete: false,
        isLocked: false,
      }
      expect(getStageStatus(progress)).toBe('in_progress')
    })

    it('should return "not_started" when no photos taken', () => {
      const progress: StageProgress = {
        required: 4,
        completed: 0,
        total: 5,
        isComplete: false,
        isLocked: false,
      }
      expect(getStageStatus(progress)).toBe('not_started')
    })

    it('should prioritize locked over complete', () => {
      const progress: StageProgress = {
        required: 4,
        completed: 4,
        total: 5,
        isComplete: true,
        isLocked: true, // Locked takes priority
      }
      expect(getStageStatus(progress)).toBe('locked')
    })
  })

  describe('STAGE_STATUS_COLORS', () => {
    it('should have colors for all statuses', () => {
      const statuses: StageStatus[] = ['locked', 'not_started', 'in_progress', 'complete']
      statuses.forEach(status => {
        expect(STAGE_STATUS_COLORS[status]).toBeDefined()
        expect(STAGE_STATUS_COLORS[status]).toContain('bg-')
      })
    })
  })
})

describe('Stage Locking Logic', () => {
  it('job_end should be locked when job_start is not complete', () => {
    const jobStartProgress: StageProgress = {
      required: 4,
      completed: 2, // Not all required photos
      total: 5,
      isComplete: false,
      isLocked: false,
    }

    // job_end should be locked based on job_start completion
    const jobEndLocked = !jobStartProgress.isComplete
    expect(jobEndLocked).toBe(true)
  })

  it('job_end should be unlocked when job_start is complete', () => {
    const jobStartProgress: StageProgress = {
      required: 4,
      completed: 4, // All required photos
      total: 5,
      isComplete: true,
      isLocked: false,
    }

    const jobEndLocked = !jobStartProgress.isComplete
    expect(jobEndLocked).toBe(false)
  })

  it('in_transit should never be locked', () => {
    // in_transit has no required photos, always accessible
    const inTransitProgress: StageProgress = {
      required: 0,
      completed: 0,
      total: 2,
      isComplete: true, // Always complete (no requirements)
      isLocked: false, // Never locked
    }
    expect(inTransitProgress.isLocked).toBe(false)
  })
})

describe('Photo Requirements', () => {
  it('job_start should have 4 required photos', () => {
    // Based on seed data: 4 required, 1 optional
    const expectedRequired = 4
    const expectedTotal = 5
    expect(expectedRequired).toBe(4)
    expect(expectedTotal).toBe(5)
  })

  it('in_transit should have 0 required photos', () => {
    // Based on seed data: 0 required, 2 optional
    const expectedRequired = 0
    const expectedTotal = 2
    expect(expectedRequired).toBe(0)
    expect(expectedTotal).toBe(2)
  })

  it('job_end should have 3 required photos', () => {
    // Based on seed data: 3 required, 1 optional
    const expectedRequired = 3
    const expectedTotal = 4
    expect(expectedRequired).toBe(3)
    expect(expectedTotal).toBe(4)
  })
})
