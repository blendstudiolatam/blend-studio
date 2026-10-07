
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accesos": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": string,"rol": Database["public"]['Enums']["rol_usuario"],"sucursal_id": string,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"rol": Database["public"]['Enums']["rol_usuario"],"sucursal_id": string,"updated_at"?: string,"usuario_id": string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"sucursal_id"?: string,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accesos_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "accesos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"auditoria": {
                  Row: {
                    "accion": string,"created_at": string,"datos_antes": Json | null,"datos_despues": Json | null,"id": number,"registro_id": string | null,"sucursal_id": string | null,"tabla": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"created_at"?: string,"datos_antes"?: Json | null,"datos_despues"?: Json | null,"id"?: never,"registro_id"?: string | null,"sucursal_id"?: string | null,"tabla": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "accion"?: string,"created_at"?: string,"datos_antes"?: Json | null,"datos_despues"?: Json | null,"id"?: never,"registro_id"?: string | null,"sucursal_id"?: string | null,"tabla"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auditoria_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "created_at": string,"es_dueno": boolean,"id": string,"nombre_completo": string,"telefono": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"es_dueno"?: boolean,"id": string,"nombre_completo"?: string,"telefono"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"es_dueno"?: boolean,"id"?: string,"nombre_completo"?: string,"telefono"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"permisos_rol": {
                  Row: {
                    "modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"],"rol": Database["public"]['Enums']["rol_usuario"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"],"rol": Database["public"]['Enums']["rol_usuario"],"updated_at"?: string
                  }
                  Update: {
                    "modulo"?: Database["public"]['Enums']["modulo_app"],"nivel"?: Database["public"]['Enums']["nivel_permiso"],"rol"?: Database["public"]['Enums']["rol_usuario"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"permisos_usuario": {
                  Row: {
                    "created_at": string,"id": string,"modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"],"sucursal_id": string,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"],"sucursal_id": string,"updated_at"?: string,"usuario_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"modulo"?: Database["public"]['Enums']["modulo_app"],"nivel"?: Database["public"]['Enums']["nivel_permiso"],"sucursal_id"?: string,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "permisos_usuario_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "permisos_usuario_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sucursales": {
                  Row: {
                    "activa": boolean,"created_at": string,"direccion": string | null,"id": string,"nombre": string,"slug": string,"telefono": string | null,"updated_at": string,"zona_horaria": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"created_at"?: string,"direccion"?: string | null,"id"?: string,"nombre": string,"slug": string,"telefono"?: string | null,"updated_at"?: string,"zona_horaria"?: string
                  }
                  Update: {
                    "activa"?: boolean,"created_at"?: string,"direccion"?: string | null,"id"?: string,"nombre"?: string,"slug"?: string,"telefono"?: string | null,"updated_at"?: string,"zona_horaria"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "login_espera_segundos":
{ Args: { "p_email_hash": string,"p_ip": string }; Returns: number
                           },
"login_registrar_intento":
{ Args: { "p_email_hash": string,"p_exito": boolean,"p_ip": string }; Returns: undefined
                           },
"mis_permisos":
{ Args: { "p_sucursal": string }; Returns: {
              "modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"]
            }[]
                           }
          }
          Enums: {
            "modulo_app": "agenda"|"clientes"|"servicios"|"personal"|"productos"|"ventas"|"caja"|"finanzas"|"reportes"|"configuracion","nivel_permiso": "ninguno"|"lectura"|"total","rol_usuario": "admin"|"recepcion"|"estilista"|"asistente"
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
  "public": {
          Enums: {
            "modulo_app": ["agenda", "clientes", "servicios", "personal", "productos", "ventas", "caja", "finanzas", "reportes", "configuracion"],"nivel_permiso": ["ninguno", "lectura", "total"],"rol_usuario": ["admin", "recepcion", "estilista", "asistente"]
          }
        }
} as const
