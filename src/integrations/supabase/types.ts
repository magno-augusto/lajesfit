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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      diet_entries: {
        Row: {
          consumed_at: string
          created_at: string
          food_id: number
          grams: number
          id: string
          meal: Database["public"]["Enums"]["meal_type"]
          user_id: string
        }
        Insert: {
          consumed_at?: string
          created_at?: string
          food_id: number
          grams: number
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          user_id: string
        }
        Update: {
          consumed_at?: string
          created_at?: string
          food_id?: number
          grams?: number
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "taco_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          distance_km: number | null
          event_date: string
          id: string
          location: string
          max_participants: number | null
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          distance_km?: number | null
          event_date: string
          id?: string
          location: string
          max_participants?: number | null
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          distance_km?: number | null
          event_date?: string
          id?: string
          location?: string
          max_participants?: number | null
          title?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          media_urls: string[]
          type: Database["public"]["Enums"]["post_type"]
          user_id: string
          workout_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          media_urls?: string[]
          type?: Database["public"]["Enums"]["post_type"]
          user_id: string
          workout_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          media_urls?: string[]
          type?: Database["public"]["Enums"]["post_type"]
          user_id?: string
          workout_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      strava_tokens: {
        Row: {
          access_token: string
          athlete_id: number | null
          created_at: string
          expires_at: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_id?: number | null
          created_at?: string
          expires_at: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_id?: number | null
          created_at?: string
          expires_at?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taco_foods: {
        Row: {
          carbs_g: number
          category: string | null
          energy_kcal: number
          fat_g: number
          fiber_g: number
          id: number
          name: string
          protein_g: number
          sodium_mg: number
        }
        Insert: {
          carbs_g?: number
          category?: string | null
          energy_kcal: number
          fat_g?: number
          fiber_g?: number
          id: number
          name: string
          protein_g?: number
          sodium_mg?: number
        }
        Update: {
          carbs_g?: number
          category?: string | null
          energy_kcal?: number
          fat_g?: number
          fiber_g?: number
          id?: number
          name?: string
          protein_g?: number
          sodium_mg?: number
        }
        Relationships: []
      }
      workouts: {
        Row: {
          activity_type: string
          avg_heart_rate: number | null
          calories: number | null
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          elevation_gain_meters: number | null
          id: string
          name: string | null
          source: Database["public"]["Enums"]["workout_source"]
          started_at: string
          strava_activity_id: number | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_meters?: number | null
          id?: string
          name?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          started_at: string
          strava_activity_id?: number | null
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_meters?: number | null
          id?: string
          name?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          started_at?: string
          strava_activity_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      meal_type: "breakfast" | "lunch" | "snack" | "dinner"
      post_type: "general" | "workout" | "diet"
      workout_source: "manual" | "strava"
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
      meal_type: ["breakfast", "lunch", "snack", "dinner"],
      post_type: ["general", "workout", "diet"],
      workout_source: ["manual", "strava"],
    },
  },
} as const
