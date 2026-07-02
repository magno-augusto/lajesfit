export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      challenges: {
        Row: {
          created_at: string;
          id: string;
          period_end: string;
          period_start: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          period_end: string;
          period_start: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          period_end?: string;
          period_start?: string;
          status?: string;
        };
        Relationships: [];
      };
      challenge_participants: {
        Row: {
          challenge_id: string;
          end_weight_kg: number | null;
          id: string;
          joined_at: string;
          start_weight_kg: number;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          end_weight_kg?: number | null;
          id?: string;
          joined_at?: string;
          start_weight_kg: number;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          end_weight_kg?: number | null;
          id?: string;
          joined_at?: string;
          start_weight_kg?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_entries: {
        Row: {
          carbs_g: number;
          consumed_at: string;
          created_at: string;
          diet_meal_id: string | null;
          fat_g: number;
          food_id: number | null;
          food_name: string;
          grams: number;
          id: string;
          kcal: number;
          meal: string;
          photo_url: string | null;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          carbs_g?: number;
          consumed_at?: string;
          created_at?: string;
          diet_meal_id?: string | null;
          fat_g?: number;
          food_id?: number | null;
          food_name: string;
          grams: number;
          id?: string;
          kcal: number;
          meal: string;
          photo_url?: string | null;
          protein_g?: number;
          user_id: string;
        };
        Update: {
          carbs_g?: number;
          consumed_at?: string;
          created_at?: string;
          diet_meal_id?: string | null;
          fat_g?: number;
          food_id?: number | null;
          food_name?: string;
          grams?: number;
          id?: string;
          kcal?: number;
          meal?: string;
          photo_url?: string | null;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_entries_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "taco_foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diet_entries_diet_meal_id_fkey";
            columns: ["diet_meal_id"];
            isOneToOne: false;
            referencedRelation: "diet_meals";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_meals: {
        Row: {
          consumed_at: string;
          created_at: string;
          id: string;
          meal: string;
          photo_url: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          consumed_at?: string;
          created_at?: string;
          id?: string;
          meal: string;
          photo_url?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          consumed_at?: string;
          created_at?: string;
          id?: string;
          meal?: string;
          photo_url?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      food_measures: {
        Row: {
          created_at: string;
          food_id: number;
          grams: number;
          id: number;
          is_default: boolean;
          label: string;
          source: string | null;
          source_id: string | null;
          unit: string;
        };
        Insert: {
          created_at?: string;
          food_id: number;
          grams: number;
          id?: number;
          is_default?: boolean;
          label: string;
          source?: string | null;
          source_id?: string | null;
          unit: string;
        };
        Update: {
          created_at?: string;
          food_id?: number;
          grams?: number;
          id?: number;
          is_default?: boolean;
          label?: string;
          source?: string | null;
          source_id?: string | null;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_measures_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          aliases: string[];
          brand: string | null;
          carbs_g: number;
          category: string | null;
          created_at: string;
          fat_g: number;
          fiber_g: number;
          id: number;
          kcal: number;
          name: string;
          protein_g: number;
          source: string;
          source_id: string | null;
        };
        Insert: {
          aliases?: string[];
          brand?: string | null;
          carbs_g?: number;
          category?: string | null;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          id?: number;
          kcal: number;
          name: string;
          protein_g?: number;
          source: string;
          source_id?: string | null;
        };
        Update: {
          aliases?: string[];
          brand?: string | null;
          carbs_g?: number;
          category?: string | null;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          id?: number;
          kcal?: number;
          name?: string;
          protein_g?: number;
          source?: string;
          source_id?: string | null;
        };
        Relationships: [];
      };
      food_requests: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          normalized_query: string;
          query: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          normalized_query: string;
          query: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          normalized_query?: string;
          query?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [];
      };
      follow_requests: {
        Row: {
          created_at: string;
          requested_id: string;
          requester_id: string;
        };
        Insert: {
          created_at?: string;
          requested_id: string;
          requester_id: string;
        };
        Update: {
          created_at?: string;
          requested_id?: string;
          requester_id?: string;
        };
        Relationships: [];
      };
      strava_tokens: {
        Row: {
          access_token: string;
          athlete_id: number | null;
          created_at: string;
          expires_at: number;
          refresh_token: string;
          scope: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          athlete_id?: number | null;
          created_at?: string;
          expires_at: number;
          refresh_token: string;
          scope?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          athlete_id?: number | null;
          created_at?: string;
          expires_at?: number;
          refresh_token?: string;
          scope?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      strava_webhook_events: {
        Row: {
          aspect_type: string;
          created_at: string;
          error_message: string | null;
          event_time: number | null;
          id: string;
          object_id: number;
          object_type: string;
          owner_id: number;
          processed_at: string | null;
          status: string;
          subscription_id: number | null;
          updates: Json;
        };
        Insert: {
          aspect_type: string;
          created_at?: string;
          error_message?: string | null;
          event_time?: number | null;
          id?: string;
          object_id: number;
          object_type: string;
          owner_id: number;
          processed_at?: string | null;
          status?: string;
          subscription_id?: number | null;
          updates?: Json;
        };
        Update: {
          aspect_type?: string;
          created_at?: string;
          error_message?: string | null;
          event_time?: number | null;
          id?: string;
          object_id?: number;
          object_type?: string;
          owner_id?: number;
          processed_at?: string | null;
          status?: string;
          subscription_id?: number | null;
          updates?: Json;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_id: string;
          comment_id: string | null;
          created_at: string;
          id: string;
          post_id: string | null;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          actor_id: string;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          post_id?: string | null;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          post_id?: string | null;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "post_comments";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_views: {
        Row: {
          post_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          viewed_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          media_url: string | null;
          updated_at: string;
          user_id: string;
          workout_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          updated_at?: string;
          user_id: string;
          workout_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          updated_at?: string;
          user_id?: string;
          workout_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          calorie_goal: number | null;
          created_at: string;
          display_name: string;
          goal_activity_level: string | null;
          goal_age: number | null;
          goal_height_cm: number | null;
          goal_sex: string | null;
          goal_weight_kg: number | null;
          id: string;
          is_admin: boolean;
          is_private: boolean;
          notifications_enabled: boolean;
          recovery_email: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          calorie_goal?: number | null;
          created_at?: string;
          display_name: string;
          goal_activity_level?: string | null;
          goal_age?: number | null;
          goal_height_cm?: number | null;
          goal_sex?: string | null;
          goal_weight_kg?: number | null;
          id: string;
          is_admin?: boolean;
          is_private?: boolean;
          notifications_enabled?: boolean;
          recovery_email?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          calorie_goal?: number | null;
          created_at?: string;
          display_name?: string;
          goal_activity_level?: string | null;
          goal_age?: number | null;
          goal_height_cm?: number | null;
          goal_sex?: string | null;
          goal_weight_kg?: number | null;
          id?: string;
          is_admin?: boolean;
          is_private?: boolean;
          notifications_enabled?: boolean;
          recovery_email?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      taco_foods: {
        Row: {
          carbs_g: number;
          category: string | null;
          fat_g: number;
          fiber_g: number;
          id: number;
          kcal: number;
          name: string;
          protein_g: number;
        };
        Insert: {
          carbs_g?: number;
          category?: string | null;
          fat_g?: number;
          fiber_g?: number;
          id?: number;
          kcal: number;
          name: string;
          protein_g?: number;
        };
        Update: {
          carbs_g?: number;
          category?: string | null;
          fat_g?: number;
          fiber_g?: number;
          id?: number;
          kcal?: number;
          name?: string;
          protein_g?: number;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          activity_type: string;
          calories: number | null;
          created_at: string;
          distance_meters: number | null;
          duration_seconds: number | null;
          id: string;
          media_url: string | null;
          notes: string | null;
          performed_at: string;
          source: string;
          strava_activity_id: number | null;
          title: string | null;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          calories?: number | null;
          created_at?: string;
          distance_meters?: number | null;
          duration_seconds?: number | null;
          id?: string;
          media_url?: string | null;
          notes?: string | null;
          performed_at?: string;
          source?: string;
          strava_activity_id?: number | null;
          title?: string | null;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          calories?: number | null;
          created_at?: string;
          distance_meters?: number | null;
          duration_seconds?: number | null;
          id?: string;
          media_url?: string | null;
          notes?: string | null;
          performed_at?: string;
          source?: string;
          strava_activity_id?: number | null;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_challenge_lifecycle: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_login_email: {
        Args: {
          p_username: string;
        };
        Returns: string;
      };
      get_feed_post_ids: {
        Args: {
          p_user_id: string;
          p_limit: number;
          p_offset: number;
        };
        Returns: {
          post_id: string;
        }[];
      };
      get_challenge_leaderboard: {
        Args: {
          p_challenge_id: string;
        };
        Returns: {
          avatar_url: string | null;
          display_name: string;
          pct_loss: number;
          rank: number;
          user_id: string;
          username: string;
        }[];
      };
      get_workout_days_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          avatar_url: string | null;
          display_name: string;
          active_days: number;
          user_id: string;
          username: string;
        }[];
      };
      get_diet_days_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          avatar_url: string | null;
          display_name: string;
          active_days: number;
          user_id: string;
          username: string;
        }[];
      };
      get_distance_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          avatar_url: string | null;
          display_name: string;
          total_distance_meters: number;
          user_id: string;
          username: string;
        }[];
      };
      get_calories_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          avatar_url: string | null;
          display_name: string;
          total_calories: number;
          user_id: string;
          username: string;
        }[];
      };
      admin_set_participant_weight: {
        Args: {
          p_challenge_id: string;
          p_user_id: string;
          p_start_weight_kg: number;
          p_end_weight_kg?: number | null;
        };
        Returns: undefined;
      };
      upsert_catalog_food: {
        Args: {
          p_brand: string | null;
          p_carbs_g?: number;
          p_category: string | null;
          p_fat_g?: number;
          p_fiber_g?: number;
          p_kcal: number;
          p_measures?: Json;
          p_name: string;
          p_protein_g?: number;
          p_source: string;
          p_source_id: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      challenge_status: "active" | "closed";
      notification_type: "like" | "comment";
      meal_type: "breakfast" | "lunch" | "snack" | "dinner";
      post_type: "general" | "workout" | "diet";
      workout_source: "manual" | "strava";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      meal_type: ["breakfast", "lunch", "snack", "dinner"],
      post_type: ["general", "workout", "diet"],
      workout_source: ["manual", "strava"],
    },
  },
} as const;
