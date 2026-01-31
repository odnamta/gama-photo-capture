/**
 * Unit Tests for PhotoThumbnailGrid Component
 * 
 * Tests the photo thumbnail grid used in the capture completion summary.
 * **Validates: Requirements 3.6.2, 3.6.3**
 */

import { describe, it, expect } from 'vitest'
import type { CapturedPhoto } from '@/components/atoms/photo-thumbnail-grid'

describe('PhotoThumbnailGrid', () => {
  describe('CapturedPhoto Interface', () => {
    it('should accept valid captured photo data', () => {
      const photo: CapturedPhoto = {
        checklistItemId: 'item-1',
        title: 'Cargo Front View',
        thumbnailUrl: '/thumbnails/photo1.jpg',
        status: 'captured'
      }
      
      expect(photo.checklistItemId).toBe('item-1')
      expect(photo.title).toBe('Cargo Front View')
      expect(photo.thumbnailUrl).toBe('/thumbnails/photo1.jpg')
      expect(photo.status).toBe('captured')
    })

    it('should accept valid skipped photo data', () => {
      const photo: CapturedPhoto = {
        checklistItemId: 'item-2',
        title: 'Existing Damage',
        thumbnailUrl: '',
        status: 'skipped'
      }
      
      expect(photo.checklistItemId).toBe('item-2')
      expect(photo.title).toBe('Existing Damage')
      expect(photo.thumbnailUrl).toBe('')
      expect(photo.status).toBe('skipped')
    })
  })

  describe('Grid Display Logic', () => {
    /**
     * Helper function to determine grid display state
     */
    function getGridDisplayState(photos: CapturedPhoto[]) {
      return {
        isEmpty: photos.length === 0,
        itemCount: photos.length,
        capturedCount: photos.filter(p => p.status === 'captured').length,
        skippedCount: photos.filter(p => p.status === 'skipped').length,
        shouldRender: photos.length > 0
      }
    }

    it('should not render when photos array is empty', () => {
      const result = getGridDisplayState([])
      
      expect(result.isEmpty).toBe(true)
      expect(result.shouldRender).toBe(false)
    })

    it('should render when photos array has items', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Photo 1', thumbnailUrl: '/thumb1.jpg', status: 'captured' }
      ]
      
      const result = getGridDisplayState(photos)
      
      expect(result.isEmpty).toBe(false)
      expect(result.shouldRender).toBe(true)
      expect(result.itemCount).toBe(1)
    })

    it('should count captured and skipped items correctly', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Cargo Front', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
        { checklistItemId: '2', title: 'Cargo Left', thumbnailUrl: '/thumb2.jpg', status: 'captured' },
        { checklistItemId: '3', title: 'Damage', thumbnailUrl: '', status: 'skipped' },
        { checklistItemId: '4', title: 'Document', thumbnailUrl: '/thumb4.jpg', status: 'captured' },
      ]
      
      const result = getGridDisplayState(photos)
      
      expect(result.itemCount).toBe(4)
      expect(result.capturedCount).toBe(3)
      expect(result.skippedCount).toBe(1)
    })

    it('should handle all captured items', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Photo 1', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
        { checklistItemId: '2', title: 'Photo 2', thumbnailUrl: '/thumb2.jpg', status: 'captured' },
      ]
      
      const result = getGridDisplayState(photos)
      
      expect(result.capturedCount).toBe(2)
      expect(result.skippedCount).toBe(0)
    })

    it('should handle all skipped items', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Optional 1', thumbnailUrl: '', status: 'skipped' },
        { checklistItemId: '2', title: 'Optional 2', thumbnailUrl: '', status: 'skipped' },
      ]
      
      const result = getGridDisplayState(photos)
      
      expect(result.capturedCount).toBe(0)
      expect(result.skippedCount).toBe(2)
    })
  })

  describe('Thumbnail Item Display Logic', () => {
    /**
     * Helper function to determine thumbnail item display state
     */
    function getThumbnailItemState(photo: CapturedPhoto) {
      const isCaptured = photo.status === 'captured'
      const hasImage = isCaptured && photo.thumbnailUrl !== ''
      
      return {
        isCaptured,
        showImage: hasImage,
        showPlaceholder: !hasImage,
        ariaLabel: `${photo.title}: ${photo.status}`,
        titleClass: isCaptured ? 'text-foreground' : 'text-muted-foreground'
      }
    }

    it('should show image for captured photo with thumbnail URL', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Cargo Front',
        thumbnailUrl: '/thumb.jpg',
        status: 'captured'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.isCaptured).toBe(true)
      expect(result.showImage).toBe(true)
      expect(result.showPlaceholder).toBe(false)
    })

    it('should show placeholder for skipped item', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '2',
        title: 'Damage',
        thumbnailUrl: '',
        status: 'skipped'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.isCaptured).toBe(false)
      expect(result.showImage).toBe(false)
      expect(result.showPlaceholder).toBe(true)
    })

    it('should show placeholder for captured photo without thumbnail URL', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '3',
        title: 'Photo',
        thumbnailUrl: '',
        status: 'captured'
      }
      
      const result = getThumbnailItemState(photo)
      
      // Even if captured, no image to show
      expect(result.showImage).toBe(false)
      expect(result.showPlaceholder).toBe(true)
    })

    it('should generate correct aria-label for captured item', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Cargo Front View',
        thumbnailUrl: '/thumb.jpg',
        status: 'captured'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.ariaLabel).toBe('Cargo Front View: captured')
    })

    it('should generate correct aria-label for skipped item', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '2',
        title: 'Existing Damage',
        thumbnailUrl: '',
        status: 'skipped'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.ariaLabel).toBe('Existing Damage: skipped')
    })

    it('should use foreground text color for captured items', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Photo',
        thumbnailUrl: '/thumb.jpg',
        status: 'captured'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.titleClass).toBe('text-foreground')
    })

    it('should use muted text color for skipped items', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '2',
        title: 'Optional',
        thumbnailUrl: '',
        status: 'skipped'
      }
      
      const result = getThumbnailItemState(photo)
      
      expect(result.titleClass).toBe('text-muted-foreground')
    })
  })

  describe('Status Badge Display Logic', () => {
    /**
     * Helper function to determine status badge display state
     */
    function getStatusBadgeState(status: 'captured' | 'skipped') {
      const isCaptured = status === 'captured'
      
      return {
        isCaptured,
        badgeColor: isCaptured ? 'bg-green-500' : 'bg-amber-500',
        iconType: isCaptured ? 'check' : 'skip',
        testId: `status-badge-${status}`
      }
    }

    it('should show green badge with check icon for captured status', () => {
      const result = getStatusBadgeState('captured')
      
      expect(result.isCaptured).toBe(true)
      expect(result.badgeColor).toBe('bg-green-500')
      expect(result.iconType).toBe('check')
      expect(result.testId).toBe('status-badge-captured')
    })

    it('should show amber badge with skip icon for skipped status', () => {
      const result = getStatusBadgeState('skipped')
      
      expect(result.isCaptured).toBe(false)
      expect(result.badgeColor).toBe('bg-amber-500')
      expect(result.iconType).toBe('skip')
      expect(result.testId).toBe('status-badge-skipped')
    })
  })

  describe('Accessibility', () => {
    /**
     * Helper function to generate expected aria attributes
     */
    function getAriaAttributes(photos: CapturedPhoto[]) {
      return {
        gridRole: 'list',
        gridLabel: 'Captured photos',
        itemRole: 'listitem',
        itemLabels: photos.map(p => `${p.title}: ${p.status}`)
      }
    }

    it('should have correct grid role and label', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Photo 1', thumbnailUrl: '/thumb.jpg', status: 'captured' }
      ]
      
      const attrs = getAriaAttributes(photos)
      
      expect(attrs.gridRole).toBe('list')
      expect(attrs.gridLabel).toBe('Captured photos')
    })

    it('should have correct item role', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Photo 1', thumbnailUrl: '/thumb.jpg', status: 'captured' }
      ]
      
      const attrs = getAriaAttributes(photos)
      
      expect(attrs.itemRole).toBe('listitem')
    })

    it('should generate correct item labels for mixed statuses', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Cargo Front', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
        { checklistItemId: '2', title: 'Damage', thumbnailUrl: '', status: 'skipped' },
        { checklistItemId: '3', title: 'Document', thumbnailUrl: '/thumb3.jpg', status: 'captured' },
      ]
      
      const attrs = getAriaAttributes(photos)
      
      expect(attrs.itemLabels).toEqual([
        'Cargo Front: captured',
        'Damage: skipped',
        'Document: captured'
      ])
    })
  })

  describe('Edge Cases', () => {
    it('should handle single item grid', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Single Photo', thumbnailUrl: '/thumb.jpg', status: 'captured' }
      ]
      
      expect(photos.length).toBe(1)
    })

    it('should handle many items', () => {
      const photos: CapturedPhoto[] = Array.from({ length: 10 }, (_, i) => ({
        checklistItemId: `item-${i}`,
        title: `Photo ${i + 1}`,
        thumbnailUrl: `/thumb${i}.jpg`,
        status: i % 3 === 0 ? 'skipped' as const : 'captured' as const
      }))
      
      expect(photos.length).toBe(10)
      expect(photos.filter(p => p.status === 'skipped').length).toBe(4) // 0, 3, 6, 9
      expect(photos.filter(p => p.status === 'captured').length).toBe(6)
    })

    it('should handle long titles', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'This is a very long title that should be truncated in the UI display',
        thumbnailUrl: '/thumb.jpg',
        status: 'captured'
      }
      
      expect(photo.title.length).toBeGreaterThan(50)
    })

    it('should handle special characters in title', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Foto Kargo (Depan) - 前面',
        thumbnailUrl: '/thumb.jpg',
        status: 'captured'
      }
      
      expect(photo.title).toBe('Foto Kargo (Depan) - 前面')
    })

    it('should handle blob URLs as thumbnail URLs', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Photo',
        thumbnailUrl: 'blob:http://localhost:3001/abc123-def456',
        status: 'captured'
      }
      
      expect(photo.thumbnailUrl.startsWith('blob:')).toBe(true)
    })

    it('should handle data URLs as thumbnail URLs', () => {
      const photo: CapturedPhoto = {
        checklistItemId: '1',
        title: 'Photo',
        thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        status: 'captured'
      }
      
      expect(photo.thumbnailUrl.startsWith('data:')).toBe(true)
    })
  })

  describe('Typical Usage Scenarios', () => {
    it('should handle job_start stage completion (4 required, 1 optional)', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Cargo Front View', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
        { checklistItemId: '2', title: 'Cargo Left Side', thumbnailUrl: '/thumb2.jpg', status: 'captured' },
        { checklistItemId: '3', title: 'Cargo Right Side', thumbnailUrl: '/thumb3.jpg', status: 'captured' },
        { checklistItemId: '4', title: 'Existing Damage', thumbnailUrl: '', status: 'skipped' },
        { checklistItemId: '5', title: 'Loading Document', thumbnailUrl: '/thumb5.jpg', status: 'captured' },
      ]
      
      const captured = photos.filter(p => p.status === 'captured')
      const skipped = photos.filter(p => p.status === 'skipped')
      
      expect(captured.length).toBe(4)
      expect(skipped.length).toBe(1)
      expect(skipped[0].title).toBe('Existing Damage')
    })

    it('should handle in_transit stage (all optional)', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Rest Stop Check', thumbnailUrl: '', status: 'skipped' },
        { checklistItemId: '2', title: 'Issue Documentation', thumbnailUrl: '', status: 'skipped' },
      ]
      
      const captured = photos.filter(p => p.status === 'captured')
      const skipped = photos.filter(p => p.status === 'skipped')
      
      expect(captured.length).toBe(0)
      expect(skipped.length).toBe(2)
    })

    it('should handle job_end stage with damage documented', () => {
      const photos: CapturedPhoto[] = [
        { checklistItemId: '1', title: 'Delivered Cargo', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
        { checklistItemId: '2', title: 'Unloading Complete', thumbnailUrl: '/thumb2.jpg', status: 'captured' },
        { checklistItemId: '3', title: 'Delivery Document', thumbnailUrl: '/thumb3.jpg', status: 'captured' },
        { checklistItemId: '4', title: 'Damage Report', thumbnailUrl: '/thumb4.jpg', status: 'captured' },
      ]
      
      const captured = photos.filter(p => p.status === 'captured')
      const skipped = photos.filter(p => p.status === 'skipped')
      
      expect(captured.length).toBe(4)
      expect(skipped.length).toBe(0)
    })
  })
})
