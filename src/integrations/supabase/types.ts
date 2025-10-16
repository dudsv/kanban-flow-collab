export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          blocked_mime: string[] | null
          created_at: string | null
          id: number
          max_file_mb: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_mime?: string[] | null
          created_at?: string | null
          id?: number
          max_file_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_mime?: string[] | null
          created_at?: string | null
          id?: number
          max_file_mb?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_assignees: {
        Row: {
          card_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_assignees_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_tags: {
        Row: {
          card_id: string
          tag_id: string
        }
        Insert: {
          card_id: string
          tag_id: string
        }
        Update: {
          card_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          column_id: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          points: number | null
          priority: Database["public"]["Enums"]["priority_t"] | null
          project_id: string
          swimlane: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          column_id: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          points?: number | null
          priority?: Database["public"]["Enums"]["priority_t"] | null
          project_id: string
          swimlane?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          points?: number | null
          priority?: Database["public"]["Enums"]["priority_t"] | null
          project_id?: string
          swimlane?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          done: boolean
          done_at: string | null
          id: string
          order: number
          title: string
        }
        Insert: {
          checklist_id: string
          done?: boolean
          done_at?: string | null
          id?: string
          order?: number
          title: string
        }
        Update: {
          checklist_id?: string
          done?: boolean
          done_at?: string | null
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          card_id: string
          id: string
          order: number
          title: string
        }
        Insert: {
          card_id: string
          id?: string
          order?: number
          title: string
        }
        Update: {
          card_id?: string
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order: number
          project_id: string
          wip_limit: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order: number
          project_id: string
          wip_limit?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order?: number
          project_id?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          card_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          body: string
          card_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          card_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          card_id: string | null
          created_at: string | null
          created_by: string
          id: string
          project_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["convo_t"]
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          project_id?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["convo_t"]
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          project_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["convo_t"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          project_id: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          project_id: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          file_id: string | null
          id: string
          reply_to: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          file_id?: string | null
          id?: string
          reply_to?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          file_id?: string | null
          id?: string
          reply_to?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["role_t"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_at: string | null
          project_id: string
          role: Database["public"]["Enums"]["proj_role_t"]
          user_id: string
        }
        Insert: {
          added_at?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["proj_role_t"]
          user_id: string
        }
        Update: {
          added_at?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["proj_role_t"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_t"]
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_t"]
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_t"]
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          color?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      can_read_project: {
        Args: { pid: string }
        Returns: boolean
      }
      is_admin_project: {
        Args: { pid: string }
        Returns: boolean
      }
      is_superadmin: {
        Args: { uid: string }
        Returns: boolean
      }
      path_project_id: {
        Args: { path: string }
        Returns: string
      }
    }
    Enums: {
      convo_t: "dm" | "group" | "project" | "card"
      priority_t: "low" | "medium" | "high" | "critical"
      proj_role_t: "owner" | "admin" | "member" | "viewer"
      role_t: "superadmin" | "user"
      visibility_t: "public" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      convo_t: ["dm", "group", "project", "card"],
      priority_t: ["low", "medium", "high", "critical"],
      proj_role_t: ["owner", "admin", "member", "viewer"],
      role_t: ["superadmin", "user"],
      visibility_t: ["public", "private"],
    },
  },
} as const
