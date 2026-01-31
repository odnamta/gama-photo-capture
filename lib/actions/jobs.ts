'use server'

import { createClient } from '@/lib/supabase/server'
import type { JobWithProgress, StageProgress, PhotoChecklistItem } from '@/types/job'

/**
 * Fetch jobs assigned to the current user
 * Jobs are linked via: resource_assignments.resource_id → employees.id → employees.user_id
 */
export async function getMyJobs(): Promise<{ 
  jobs: JobWithProgress[]
  error: string | null 
}> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { jobs: [], error: 'Not authenticated' }
  }

  // Get employee record for current user
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (empError || !employee) {
    return { jobs: [], error: 'Employee record not found' }
  }

  // Get job assignments for this employee
  const { data: assignments, error: assignError } = await supabase
    .from('resource_assignments')
    .select(`
      id,
      job_order_id,
      start_date,
      end_date,
      status
    `)
    .eq('resource_id', employee.id)
    .not('job_order_id', 'is', null)
    .order('start_date', { ascending: false })

  if (assignError) {
    return { jobs: [], error: assignError.message }
  }

  if (!assignments || assignments.length === 0) {
    return { jobs: [], error: null }
  }

  // Get unique job IDs
  const jobIds = [...new Set(assignments.map(a => a.job_order_id).filter(Boolean))] as string[]

  // Fetch job orders with customer info
  const { data: jobOrders, error: jobError } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      description,
      status,
      customer:customers(id, name)
    `)
    .in('id', jobIds)

  if (jobError) {
    return { jobs: [], error: jobError.message }
  }

  // Fetch photo counts per job
  const { data: photos, error: photoError } = await supabase
    .from('shipment_photos')
    .select('job_order_id, stage, checklist_item_id')
    .in('job_order_id', jobIds)
    .eq('is_deleted', false)

  if (photoError) {
    console.error('Error fetching photos:', photoError)
  }

  // Fetch checklist requirements
  const { data: checklist, error: checklistError } = await supabase
    .from('photo_checklists')
    .select('id, stage, is_required')
    .eq('is_active', true)

  if (checklistError) {
    console.error('Error fetching checklist:', checklistError)
  }

  // Calculate required counts per stage
  const requiredCounts = {
    job_start: checklist?.filter(c => c.stage === 'job_start' && c.is_required).length || 0,
    in_transit: checklist?.filter(c => c.stage === 'in_transit' && c.is_required).length || 0,
    job_end: checklist?.filter(c => c.stage === 'job_end' && c.is_required).length || 0,
  }

  const totalCounts = {
    job_start: checklist?.filter(c => c.stage === 'job_start').length || 0,
    in_transit: checklist?.filter(c => c.stage === 'in_transit').length || 0,
    job_end: checklist?.filter(c => c.stage === 'job_end').length || 0,
  }

  // Build jobs with progress
  const jobs: JobWithProgress[] = (jobOrders || []).map(job => {
    const assignment = assignments.find(a => a.job_order_id === job.id)
    const jobPhotos = photos?.filter(p => p.job_order_id === job.id) || []

    // Count completed photos per stage
    const completedCounts = {
      job_start: jobPhotos.filter(p => p.stage === 'job_start').length,
      in_transit: jobPhotos.filter(p => p.stage === 'in_transit').length,
      job_end: jobPhotos.filter(p => p.stage === 'job_end').length,
    }

    // Check if job_start is complete (all required photos taken)
    const jobStartComplete = completedCounts.job_start >= requiredCounts.job_start

    const progress: JobWithProgress['progress'] = {
      job_start: {
        required: requiredCounts.job_start,
        completed: completedCounts.job_start,
        total: totalCounts.job_start,
        isComplete: jobStartComplete,
        isLocked: false,
      },
      in_transit: {
        required: requiredCounts.in_transit,
        completed: completedCounts.in_transit,
        total: totalCounts.in_transit,
        isComplete: true, // in_transit has no required photos
        isLocked: false,
      },
      job_end: {
        required: requiredCounts.job_end,
        completed: completedCounts.job_end,
        total: totalCounts.job_end,
        isComplete: completedCounts.job_end >= requiredCounts.job_end,
        isLocked: !jobStartComplete, // Locked until job_start is complete
      },
    }

    // Handle customer as array or object
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer

    return {
      id: job.id,
      joNumber: job.jo_number,
      description: job.description,
      status: job.status,
      customerName: customer?.name || 'Unknown Customer',
      assignmentDate: assignment?.start_date || '',
      progress,
    }
  })

  return { jobs, error: null }
}

/**
 * Fetch a single job with full details
 */
export async function getJobDetail(jobId: string): Promise<{
  job: JobWithProgress | null
  checklist: PhotoChecklistItem[]
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { job: null, checklist: [], error: 'Not authenticated' }
  }

  // Fetch job order with customer
  const { data: jobOrder, error: jobError } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      description,
      status,
      customer:customers(id, name)
    `)
    .eq('id', jobId)
    .single()

  if (jobError || !jobOrder) {
    return { job: null, checklist: [], error: jobError?.message || 'Job not found' }
  }

  // Fetch checklist
  const { data: checklist, error: checklistError } = await supabase
    .from('photo_checklists')
    .select('*')
    .eq('is_active', true)
    .order('stage')
    .order('sequence')

  if (checklistError) {
    return { job: null, checklist: [], error: checklistError.message }
  }

  // Fetch photos for this job
  const { data: photos, error: photoError } = await supabase
    .from('shipment_photos')
    .select('id, stage, checklist_item_id')
    .eq('job_order_id', jobId)
    .eq('is_deleted', false)

  if (photoError) {
    console.error('Error fetching photos:', photoError)
  }

  // Calculate progress
  const requiredCounts = {
    job_start: checklist?.filter(c => c.stage === 'job_start' && c.is_required).length || 0,
    in_transit: checklist?.filter(c => c.stage === 'in_transit' && c.is_required).length || 0,
    job_end: checklist?.filter(c => c.stage === 'job_end' && c.is_required).length || 0,
  }

  const totalCounts = {
    job_start: checklist?.filter(c => c.stage === 'job_start').length || 0,
    in_transit: checklist?.filter(c => c.stage === 'in_transit').length || 0,
    job_end: checklist?.filter(c => c.stage === 'job_end').length || 0,
  }

  const completedCounts = {
    job_start: photos?.filter(p => p.stage === 'job_start').length || 0,
    in_transit: photos?.filter(p => p.stage === 'in_transit').length || 0,
    job_end: photos?.filter(p => p.stage === 'job_end').length || 0,
  }

  const jobStartComplete = completedCounts.job_start >= requiredCounts.job_start

  const progress: JobWithProgress['progress'] = {
    job_start: {
      required: requiredCounts.job_start,
      completed: completedCounts.job_start,
      total: totalCounts.job_start,
      isComplete: jobStartComplete,
      isLocked: false,
    },
    in_transit: {
      required: requiredCounts.in_transit,
      completed: completedCounts.in_transit,
      total: totalCounts.in_transit,
      isComplete: true,
      isLocked: false,
    },
    job_end: {
      required: requiredCounts.job_end,
      completed: completedCounts.job_end,
      total: totalCounts.job_end,
      isComplete: completedCounts.job_end >= requiredCounts.job_end,
      isLocked: !jobStartComplete,
    },
  }

  // Handle customer as array or object
  const customer = Array.isArray(jobOrder.customer) ? jobOrder.customer[0] : jobOrder.customer

  const job: JobWithProgress = {
    id: jobOrder.id,
    joNumber: jobOrder.jo_number,
    description: jobOrder.description,
    status: jobOrder.status,
    customerName: customer?.name || 'Unknown Customer',
    assignmentDate: '',
    progress,
  }

  return { 
    job, 
    checklist: (checklist || []) as PhotoChecklistItem[], 
    error: null 
  }
}
