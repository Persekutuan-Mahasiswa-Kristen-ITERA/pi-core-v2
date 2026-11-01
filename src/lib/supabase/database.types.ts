
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "assignments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_unique_per_unit": boolean,"member_id": string,"org_unit_id": string,"period_id": string,"position_id": string,"unit_type": Database["public"]['Enums']["org_unit_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_unique_per_unit": boolean,"member_id": string,"org_unit_id": string,"period_id": string,"position_id": string,"unit_type": Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_unique_per_unit"?: boolean,"member_id"?: string,"org_unit_id"?: string,"period_id"?: string,"position_id"?: string,"unit_type"?: Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_position_type_fk"
      columns: ["position_id","unit_type"]
isOneToOne: false
      referencedRelation: "positions"
      referencedColumns: ["id","unit_type"]
    },{
      foreignKeyName: "assignments_position_unique_fk"
      columns: ["position_id","is_unique_per_unit"]
isOneToOne: false
      referencedRelation: "positions"
      referencedColumns: ["id","is_unique_per_unit"]
    },{
      foreignKeyName: "assignments_unit_type_fk"
      columns: ["org_unit_id","unit_type"]
isOneToOne: false
      referencedRelation: "org_units"
      referencedColumns: ["id","type"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"id": number,"new_data": Json | null,"occurred_at": string,"old_data": Json | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"members": {
                  Row: {
                    "access_level": Database["public"]['Enums']["access_level"],"created_at": string,"created_by": string | null,"deactivated_at": string | null,"email": string,"full_name": string,"id": string,"is_active": boolean,"member_type": Database["public"]['Enums']["member_type"],"must_change_password": boolean,"nim": string | null,"nip": string | null,"phone": string | null,"updated_at": string,"updated_by": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"email": string,"full_name": string,"id"?: string,"is_active"?: boolean,"member_type"?: Database["public"]['Enums']["member_type"],"must_change_password"?: boolean,"nim"?: string | null,"nip"?: string | null,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"email"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"member_type"?: Database["public"]['Enums']["member_type"],"must_change_password"?: boolean,"nim"?: string | null,"nip"?: string | null,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"org_settings": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": boolean,"org_name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: boolean,"org_name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: boolean,"org_name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"org_units": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"name": string,"parent_id": string | null,"sort_order": number,"type": Database["public"]['Enums']["org_unit_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"parent_id"?: string | null,"sort_order"?: number,"type": Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"parent_id"?: string | null,"sort_order"?: number,"type"?: Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "org_units_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "org_units"
      referencedColumns: ["id"]
    }
                  ]
                },"periods": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_on": string | null,"id": string,"is_active": boolean,"label": string,"starts_on": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"is_active"?: boolean,"label": string,"starts_on"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"is_active"?: boolean,"label"?: string,"starts_on"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"position_roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"position_id": string,"role_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"position_id": string,"role_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"position_id"?: string,"role_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "position_roles_position_id_fkey"
      columns: ["position_id"]
isOneToOne: false
      referencedRelation: "positions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "position_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "role_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "position_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"positions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_unique_per_unit": boolean,"name": string,"rank": number,"unit_type": Database["public"]['Enums']["org_unit_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_unique_per_unit"?: boolean,"name": string,"rank": number,"unit_type": Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_unique_per_unit"?: boolean,"name"?: string,"rank"?: number,"unit_type"?: Database["public"]['Enums']["org_unit_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"grants_admin": boolean,"id": string,"is_system": boolean,"key": string | null,"name": string,"sort_order": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"grants_admin"?: boolean,"id"?: string,"is_system"?: boolean,"key"?: string | null,"name": string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"grants_admin"?: boolean,"id"?: string,"is_system"?: boolean,"key"?: string | null,"name"?: string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "role_overview": {
                  Row: {
                    "active_member_count": number | null,"description": string | null,"grants_admin": boolean,"id": string,"is_system": boolean,"key": string | null,"name": string,"position_count": number | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                           "active_member_count"?: never,"description"?: string | null,"grants_admin"?: boolean | null,"id"?: string | null,"is_system"?: boolean | null,"key"?: string | null,"name"?: string | null,"position_count"?: never,"sort_order"?: number | null
                         }
                        Update: {
                           "active_member_count"?: never,"description"?: string | null,"grants_admin"?: boolean | null,"id"?: string | null,"is_system"?: boolean | null,"key"?: string | null,"name"?: string | null,"position_count"?: never,"sort_order"?: number | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "current_access":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_active_period":
{ Args: { "p_period_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "access_level": "super_admin"|"admin"|"member","member_type": "student"|"lecturer","org_unit_type": "organization"|"bph"|"department"|"bureau"|"division"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "access_level": ["super_admin", "admin", "member"],"member_type": ["student", "lecturer"],"org_unit_type": ["organization", "bph", "department", "bureau", "division"]
          }
        }
} as const
