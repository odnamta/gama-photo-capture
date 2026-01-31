// MANUAL TYPES - DO NOT AUTO-GENERATE
// Photo Capture uses shared GAMA ERP Supabase
// Only these tables are relevant to this app

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ========================================
      // PRIMARY TABLES (Photo Capture owns)
      // ========================================

      photo_checklists: {
        Row: {
          id: string
          stage: string
          sequence: number
          title: string
          title_id: string | null
          description: string | null
          description_id: string | null
          tips: string | null
          is_required: boolean
          photo_type: string
          example_image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage: string
          sequence: number
          title: string
          title_id?: string | null
          description?: string | null
          description_id?: string | null
          tips?: string | null
          is_required?: boolean
          photo_type: string
          example_image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage?: string
          sequence?: number
          title?: string
          title_id?: string | null
          description?: string | null
          description_id?: string | null
          tips?: string | null
          is_required?: boolean
          photo_type?: string
          example_image_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      shipment_photos: {
        Row: {
          id: string
          job_order_id: string | null
          checklist_item_id: string | null
          uploaded_by: string
          photo_type: string
          stage: string
          file_name: string
          file_size: number | null
          mime_type: string
          storage_bucket: string
          storage_path: string
          thumbnail_path: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_accuracy: number | null
          taken_at: string
          uploaded_at: string | null
          upload_status: string
          sync_status: string
          notes: string | null
          has_damage: boolean
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_order_id?: string | null
          checklist_item_id?: string | null
          uploaded_by: string
          photo_type: string
          stage: string
          file_name: string
          file_size?: number | null
          mime_type?: string
          storage_bucket?: string
          storage_path: string
          thumbnail_path?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_accuracy?: number | null
          taken_at?: string
          uploaded_at?: string | null
          upload_status?: string
          sync_status?: string
          notes?: string | null
          has_damage?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          job_order_id?: string | null
          checklist_item_id?: string | null
          photo_type?: string
          stage?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string
          storage_bucket?: string
          storage_path?: string
          thumbnail_path?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_accuracy?: number | null
          taken_at?: string
          uploaded_at?: string | null
          upload_status?: string
          sync_status?: string
          notes?: string | null
          has_damage?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_photos_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_photos_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "photo_checklists"
            referencedColumns: ["id"]
          }
        ]
      }

      photo_upload_queue: {
        Row: {
          id: string
          photo_id: string | null
          local_blob_key: string
          retry_count: number
          last_attempt_at: string | null
          error_message: string | null
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          photo_id?: string | null
          local_blob_key: string
          retry_count?: number
          last_attempt_at?: string | null
          error_message?: string | null
          priority?: number
          created_at?: string
        }
        Update: {
          photo_id?: string | null
          local_blob_key?: string
          retry_count?: number
          last_attempt_at?: string | null
          error_message?: string | null
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "photo_upload_queue_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "shipment_photos"
            referencedColumns: ["id"]
          }
        ]
      }

      // ========================================
      // SECONDARY TABLES (Read from GAMA ERP)
      // Read-only in this app
      // ========================================

      job_orders: {
        Row: {
          id: string
          jo_number: string
          customer_id: string | null
          project_id: string | null
          description: string | null
          status: string
          execution_date: string | null
          origin: string | null
          destination: string | null
          assigned_to: string | null
          cargo_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          jo_number: string
          customer_id?: string | null
          project_id?: string | null
          description?: string | null
          status: string
          execution_date?: string | null
          origin?: string | null
          destination?: string | null
          assigned_to?: string | null
          cargo_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          jo_number?: string
          customer_id?: string | null
          project_id?: string | null
          description?: string | null
          status?: string
          execution_date?: string | null
          origin?: string | null
          destination?: string | null
          assigned_to?: string | null
          cargo_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }

      user_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          email: string | null
          role: string
          department: string | null
          avatar_url: string | null
        }
        Insert: {
          user_id: string
          full_name?: string | null
          email?: string | null
          role: string
          department?: string | null
          avatar_url?: string | null
        }
        Update: {
          user_id?: string
          full_name?: string | null
          email?: string | null
          role?: string
          department?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }

      customers: {
        Row: {
          id: string
          name: string
          code: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
        }
        Relationships: []
      }

      employees: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          employee_code: string | null
          position: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          employee_code?: string | null
          position?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          employee_code?: string | null
          position?: string | null
        }
        Relationships: []
      }

      resource_assignments: {
        Row: {
          id: string
          job_order_id: string | null
          resource_id: string | null
          start_date: string | null
          end_date: string | null
          status: string | null
        }
        Insert: {
          id?: string
          job_order_id?: string | null
          resource_id?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          job_order_id?: string | null
          resource_id?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ========================================
// HELPER TYPES
// ========================================

export type PhotoChecklist = Database['public']['Tables']['photo_checklists']['Row']
export type PhotoChecklistInsert = Database['public']['Tables']['photo_checklists']['Insert']

export type ShipmentPhoto = Database['public']['Tables']['shipment_photos']['Row']
export type ShipmentPhotoInsert = Database['public']['Tables']['shipment_photos']['Insert']

export type PhotoUploadQueueItem = Database['public']['Tables']['photo_upload_queue']['Row']

export type JobOrder = Database['public']['Tables']['job_orders']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']

// ========================================
// ENUM TYPES
// ========================================

export type PhotoType =
  | 'cargo_before'
  | 'cargo_after'
  | 'cargo_transit'
  | 'document'
  | 'damage'
  | 'issue'

export type JobStage = 'job_start' | 'in_transit' | 'job_end'

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed'

export type SyncStatus = 'local' | 'syncing' | 'synced'
