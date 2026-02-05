export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlatformType =
  | "ios"
  | "android"
  | "steam"
  | "web"
  | "windows"
  | "macos"
  | "playstation"
  | "xbox"
  | "nintendo";

export type BatchStatus = "pending" | "processing" | "completed" | "failed";

export interface Database {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      developers: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          company_name: string | null;
          website_url: string | null;
          api_key: string | null;
          api_key_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          website_url?: string | null;
          api_key?: string | null;
          api_key_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          website_url?: string | null;
          api_key?: string | null;
          api_key_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          developer_id: string;
          name: string;
          slug: string;
          description: string | null;
          website_url: string | null;
          icon_url: string | null;
          is_active: boolean;
          allow_multiple_redemptions: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          developer_id: string;
          name: string;
          slug: string;
          description?: string | null;
          website_url?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
          allow_multiple_redemptions?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          developer_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          website_url?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
          allow_multiple_redemptions?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_developer_id_fkey";
            columns: ["developer_id"];
            isOneToOne: false;
            referencedRelation: "developers";
            referencedColumns: ["id"];
          }
        ];
      };
      code_batches: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          platform: Database["public"]["Enums"]["platform_type"];
          status: Database["public"]["Enums"]["batch_status"];
          error_message: string | null;
          total_codes: number;
          used_codes: number;
          expires_at: string | null;
          source_file_path: string | null;
          app_store_id: string | null;
          play_store_package: string | null;
          steam_app_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          platform: Database["public"]["Enums"]["platform_type"];
          status?: Database["public"]["Enums"]["batch_status"];
          error_message?: string | null;
          total_codes?: number;
          used_codes?: number;
          expires_at?: string | null;
          source_file_path?: string | null;
          app_store_id?: string | null;
          play_store_package?: string | null;
          steam_app_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          platform?: Database["public"]["Enums"]["platform_type"];
          status?: Database["public"]["Enums"]["batch_status"];
          error_message?: string | null;
          total_codes?: number;
          used_codes?: number;
          expires_at?: string | null;
          source_file_path?: string | null;
          app_store_id?: string | null;
          play_store_package?: string | null;
          steam_app_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "code_batches_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      codes: {
        Row: {
          id: string;
          batch_id: string;
          code_value: string;
          is_used: boolean;
          used_at: string | null;
          redeemer_fingerprint: string | null;
          redeemer_ip_hash: string | null;
          redeemer_platform: string | null;
          redeemer_user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          code_value: string;
          is_used?: boolean;
          used_at?: string | null;
          redeemer_fingerprint?: string | null;
          redeemer_ip_hash?: string | null;
          redeemer_platform?: string | null;
          redeemer_user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          code_value?: string;
          is_used?: boolean;
          used_at?: string | null;
          redeemer_fingerprint?: string | null;
          redeemer_ip_hash?: string | null;
          redeemer_platform?: string | null;
          redeemer_user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "codes_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "code_batches";
            referencedColumns: ["id"];
          }
        ];
      };
      redemption_logs: {
        Row: {
          id: string;
          code_id: string | null;
          batch_id: string;
          project_id: string;
          requested_platform: Database["public"]["Enums"]["platform_type"];
          detected_platform: string | null;
          success: boolean;
          failure_reason: string | null;
          fingerprint: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          country_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code_id?: string | null;
          batch_id: string;
          project_id: string;
          requested_platform: Database["public"]["Enums"]["platform_type"];
          detected_platform?: string | null;
          success: boolean;
          failure_reason?: string | null;
          fingerprint?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          country_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code_id?: string | null;
          batch_id?: string;
          project_id?: string;
          requested_platform?: Database["public"]["Enums"]["platform_type"];
          detected_platform?: string | null;
          success?: boolean;
          failure_reason?: string | null;
          fingerprint?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          country_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "redemption_logs_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "code_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemption_logs_code_id_fkey";
            columns: ["code_id"];
            isOneToOne: false;
            referencedRelation: "codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemption_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allocate_code: {
        Args: {
          p_project_id: string;
          p_platform: Database["public"]["Enums"]["platform_type"];
          p_fingerprint?: string;
          p_ip_hash?: string;
          p_user_agent?: string;
          p_detected_platform?: string;
        };
        Returns: {
          success: boolean;
          code_id: string;
          code_value: string;
          batch_name: string;
          error_message: string;
        }[];
      };
      public_redeem_code: {
        Args: {
          p_project_slug: string;
          p_platform: Database["public"]["Enums"]["platform_type"];
          p_fingerprint?: string;
          p_user_agent?: string;
        };
        Returns: {
          success: boolean;
          code_value: string;
          error_message: string;
        }[];
      };
      get_project_stats: {
        Args: {
          p_project_id: string;
        };
        Returns: {
          total_batches: number;
          total_codes: number;
          used_codes: number;
          available_codes: number;
          redemption_rate: number;
          codes_by_platform: Json;
        }[];
      };
      get_current_developer_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      user_owns_batch: {
        Args: { batch_id: string };
        Returns: boolean;
      };
      user_owns_project: {
        Args: { project_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      platform_type: PlatformType;
      batch_status: BatchStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
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
    : never = never
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

// Convenience types for common operations
export type Developer = Database["public"]["Tables"]["developers"]["Row"];
export type DeveloperInsert =
  Database["public"]["Tables"]["developers"]["Insert"];
export type DeveloperUpdate =
  Database["public"]["Tables"]["developers"]["Update"];

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type CodeBatch = Database["public"]["Tables"]["code_batches"]["Row"];
export type CodeBatchInsert =
  Database["public"]["Tables"]["code_batches"]["Insert"];
export type CodeBatchUpdate =
  Database["public"]["Tables"]["code_batches"]["Update"];

export type Code = Database["public"]["Tables"]["codes"]["Row"];
export type CodeInsert = Database["public"]["Tables"]["codes"]["Insert"];
export type CodeUpdate = Database["public"]["Tables"]["codes"]["Update"];

export type RedemptionLog =
  Database["public"]["Tables"]["redemption_logs"]["Row"];

// Project with computed stats
export interface ProjectWithStats extends Project {
  stats?: {
    total_batches: number;
    total_codes: number;
    used_codes: number;
    available_codes: number;
    redemption_rate: number;
    codes_by_platform: Record<
      PlatformType,
      { total: number; used: number }
    > | null;
  };
}

// Batch with codes count
export interface CodeBatchWithCodes extends CodeBatch {
  codes?: Code[];
}
