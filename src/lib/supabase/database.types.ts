
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
                },"bloqueos_empleado": {
                  Row: {
                    "created_at": string,"desde": string,"empleado_id": string,"hasta": string,"id": string,"motivo": string,"sucursal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"desde": string,"empleado_id": string,"hasta": string,"id"?: string,"motivo"?: string,"sucursal_id": string
                  }
                  Update: {
                    "created_at"?: string,"desde"?: string,"empleado_id"?: string,"hasta"?: string,"id"?: string,"motivo"?: string,"sucursal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloqueos_empleado_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueos_empleado_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_servicio": {
                  Row: {
                    "activa": boolean,"created_at": string,"descripcion": string | null,"id": string,"imagen": string | null,"nombre": string,"orden": number,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"created_at"?: string,"descripcion"?: string | null,"id"?: string,"imagen"?: string | null,"nombre": string,"orden"?: number,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "activa"?: boolean,"created_at"?: string,"descripcion"?: string | null,"id"?: string,"imagen"?: string | null,"nombre"?: string,"orden"?: number,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_servicio_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes": {
                  Row: {
                    "activo": boolean,"apellido": string,"busqueda": string | null,"codigo": number,"creado_por": string | null,"created_at": string,"direccion": string | null,"documento": string | null,"email": string | null,"fecha_nacimiento": string | null,"foto_path": string | null,"genero": string | null,"id": string,"nombre": string,"notas": string | null,"origen": string,"permitir_fotos": boolean,"recordatorios_whatsapp": boolean,"sucursal_origen_id": string | null,"telefono": string | null,"telefono_digitos": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"apellido"?: string,"busqueda"?: never,"codigo"?: never,"creado_por"?: string | null,"created_at"?: string,"direccion"?: string | null,"documento"?: string | null,"email"?: string | null,"fecha_nacimiento"?: string | null,"foto_path"?: string | null,"genero"?: string | null,"id"?: string,"nombre": string,"notas"?: string | null,"origen"?: string,"permitir_fotos"?: boolean,"recordatorios_whatsapp"?: boolean,"sucursal_origen_id"?: string | null,"telefono"?: string | null,"telefono_digitos"?: never,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"apellido"?: string,"busqueda"?: never,"codigo"?: never,"creado_por"?: string | null,"created_at"?: string,"direccion"?: string | null,"documento"?: string | null,"email"?: string | null,"fecha_nacimiento"?: string | null,"foto_path"?: string | null,"genero"?: string | null,"id"?: string,"nombre"?: string,"notas"?: string | null,"origen"?: string,"permitir_fotos"?: boolean,"recordatorios_whatsapp"?: boolean,"sucursal_origen_id"?: string | null,"telefono"?: string | null,"telefono_digitos"?: never,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_sucursal_origen_id_fkey"
      columns: ["sucursal_origen_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"consultas_salud": {
                  Row: {
                    "accion": string,"cliente_id": string,"created_at": string,"detalle": string | null,"documento_id": string | null,"id": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"cliente_id": string,"created_at"?: string,"detalle"?: string | null,"documento_id"?: string | null,"id"?: string,"usuario_id"?: string | null
                  }
                  Update: {
                    "accion"?: string,"cliente_id"?: string,"created_at"?: string,"detalle"?: string | null,"documento_id"?: string | null,"id"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consultas_salud_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultas_salud_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documentos_cliente": {
                  Row: {
                    "categoria": Database["public"]['Enums']["categoria_documento"],"cliente_id": string,"created_at": string,"id": string,"nombre": string,"path": string,"plan_id": string | null,"subido_por": string | null,"tamano": number,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria": Database["public"]['Enums']["categoria_documento"],"cliente_id": string,"created_at"?: string,"id"?: string,"nombre": string,"path": string,"plan_id"?: string | null,"subido_por"?: string | null,"tamano": number,"tipo": string
                  }
                  Update: {
                    "categoria"?: Database["public"]['Enums']["categoria_documento"],"cliente_id"?: string,"created_at"?: string,"id"?: string,"nombre"?: string,"path"?: string,"plan_id"?: string | null,"subido_por"?: string | null,"tamano"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documentos_cliente_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_cliente_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "planes_tratamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_cliente_subido_por_fkey"
      columns: ["subido_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"empleado_servicios": {
                  Row: {
                    "comision_pct": number | null,"empleado_id": string,"servicio_id": string,"sucursal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comision_pct"?: number | null,"empleado_id": string,"servicio_id": string,"sucursal_id": string
                  }
                  Update: {
                    "comision_pct"?: number | null,"empleado_id"?: string,"servicio_id"?: string,"sucursal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleado_servicios_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "empleado_servicios_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "empleado_servicios_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"empleados": {
                  Row: {
                    "apellido": string,"color": string,"comision_pct": number,"created_at": string,"email": string | null,"especialidad": string | null,"estado": Database["public"]['Enums']["estado_empleado"],"foto_path": string | null,"id": string,"nombre": string,"orden": number,"reserva_web": boolean,"rol": Database["public"]['Enums']["rol_usuario"],"sucursal_id": string,"telefono": string | null,"updated_at": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "apellido"?: string,"color"?: string,"comision_pct"?: number,"created_at"?: string,"email"?: string | null,"especialidad"?: string | null,"estado"?: Database["public"]['Enums']["estado_empleado"],"foto_path"?: string | null,"id"?: string,"nombre": string,"orden"?: number,"reserva_web"?: boolean,"rol"?: Database["public"]['Enums']["rol_usuario"],"sucursal_id": string,"telefono"?: string | null,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Update: {
                    "apellido"?: string,"color"?: string,"comision_pct"?: number,"created_at"?: string,"email"?: string | null,"especialidad"?: string | null,"estado"?: Database["public"]['Enums']["estado_empleado"],"foto_path"?: string | null,"id"?: string,"nombre"?: string,"orden"?: number,"reserva_web"?: boolean,"rol"?: Database["public"]['Enums']["rol_usuario"],"sucursal_id"?: string,"telefono"?: string | null,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleados_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "empleados_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"historial_medico": {
                  Row: {
                    "actualizado_por": string | null,"alergias": string | null,"altura_cm": number | null,"cliente_id": string,"condiciones": string | null,"consentimiento": boolean,"consentimiento_at": string | null,"consentimiento_por": string | null,"observaciones": string | null,"peso_kg": number | null,"presion": string | null,"tipo_sangre": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_por"?: string | null,"alergias"?: string | null,"altura_cm"?: number | null,"cliente_id": string,"condiciones"?: string | null,"consentimiento"?: boolean,"consentimiento_at"?: string | null,"consentimiento_por"?: string | null,"observaciones"?: string | null,"peso_kg"?: number | null,"presion"?: string | null,"tipo_sangre"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actualizado_por"?: string | null,"alergias"?: string | null,"altura_cm"?: number | null,"cliente_id"?: string,"condiciones"?: string | null,"consentimiento"?: boolean,"consentimiento_at"?: string | null,"consentimiento_por"?: string | null,"observaciones"?: string | null,"peso_kg"?: number | null,"presion"?: string | null,"tipo_sangre"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "historial_medico_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historial_medico_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historial_medico_consentimiento_por_fkey"
      columns: ["consentimiento_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"horarios_empleado": {
                  Row: {
                    "dia_semana": number,"empleado_id": string,"entrada": string,"id": string,"salida": string,"sucursal_id": string,"trabaja": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "dia_semana": number,"empleado_id": string,"entrada"?: string,"id"?: string,"salida"?: string,"sucursal_id": string,"trabaja"?: boolean
                  }
                  Update: {
                    "dia_semana"?: number,"empleado_id"?: string,"entrada"?: string,"id"?: string,"salida"?: string,"sucursal_id"?: string,"trabaja"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "horarios_empleado_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "horarios_empleado_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"horarios_sucursal": {
                  Row: {
                    "abierto": boolean,"apertura": string,"cierre": string,"dia_semana": number,"id": string,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abierto"?: boolean,"apertura"?: string,"cierre"?: string,"dia_semana": number,"id"?: string,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "abierto"?: boolean,"apertura"?: string,"cierre"?: string,"dia_semana"?: number,"id"?: string,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "horarios_sucursal_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"medicamentos_cliente": {
                  Row: {
                    "cliente_id": string,"desde": string | null,"dosis": string | null,"id": string,"medicamento": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"desde"?: string | null,"dosis"?: string | null,"id"?: string,"medicamento": string,"orden"?: number
                  }
                  Update: {
                    "cliente_id"?: string,"desde"?: string | null,"dosis"?: string | null,"id"?: string,"medicamento"?: string,"orden"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "medicamentos_cliente_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "historial_medico"
      referencedColumns: ["cliente_id"]
    }
                  ]
                },"negocio": {
                  Row: {
                    "color_acento": string,"color_fondo": string,"color_primario": string,"created_at": string,"dv": string | null,"email": string | null,"email_respaldo": string | null,"facebook": string | null,"horario_texto": string | null,"id": string,"instagram": string | null,"itbms_pct": number,"logo_path": string | null,"mensaje_comprobante": string | null,"moneda": string,"nombre_comercial": string,"nombre_legal": string | null,"ruc": string | null,"sitio_web": string | null,"telefono": string | null,"tiktok": string | null,"tipografia_texto": string,"tipografia_titulos": string,"unico": boolean,"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color_acento"?: string,"color_fondo"?: string,"color_primario"?: string,"created_at"?: string,"dv"?: string | null,"email"?: string | null,"email_respaldo"?: string | null,"facebook"?: string | null,"horario_texto"?: string | null,"id"?: string,"instagram"?: string | null,"itbms_pct"?: number,"logo_path"?: string | null,"mensaje_comprobante"?: string | null,"moneda"?: string,"nombre_comercial"?: string,"nombre_legal"?: string | null,"ruc"?: string | null,"sitio_web"?: string | null,"telefono"?: string | null,"tiktok"?: string | null,"tipografia_texto"?: string,"tipografia_titulos"?: string,"unico"?: boolean,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "color_acento"?: string,"color_fondo"?: string,"color_primario"?: string,"created_at"?: string,"dv"?: string | null,"email"?: string | null,"email_respaldo"?: string | null,"facebook"?: string | null,"horario_texto"?: string | null,"id"?: string,"instagram"?: string | null,"itbms_pct"?: number,"logo_path"?: string | null,"mensaje_comprobante"?: string | null,"moneda"?: string,"nombre_comercial"?: string,"nombre_legal"?: string | null,"ruc"?: string | null,"sitio_web"?: string | null,"telefono"?: string | null,"tiktok"?: string | null,"tipografia_texto"?: string,"tipografia_titulos"?: string,"unico"?: boolean,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"paquetes": {
                  Row: {
                    "activo": boolean,"created_at": string,"descripcion": string | null,"frecuencia_dias": number,"id": string,"nombre": string,"orden": number,"precio_sesion": number,"precio_total": number,"servicio_id": string | null,"sesiones": number,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"descripcion"?: string | null,"frecuencia_dias"?: number,"id"?: string,"nombre": string,"orden"?: number,"precio_sesion": number,"precio_total": number,"servicio_id"?: string | null,"sesiones": number,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"descripcion"?: string | null,"frecuencia_dias"?: number,"id"?: string,"nombre"?: string,"orden"?: number,"precio_sesion"?: number,"precio_total"?: number,"servicio_id"?: string | null,"sesiones"?: number,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paquetes_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paquetes_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "created_at": string,"email": string | null,"es_dueno": boolean,"id": string,"nombre_completo": string,"telefono": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"es_dueno"?: boolean,"id": string,"nombre_completo"?: string,"telefono"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"es_dueno"?: boolean,"id"?: string,"nombre_completo"?: string,"telefono"?: string | null,"updated_at"?: string
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
                },"planes_tratamiento": {
                  Row: {
                    "cliente_id": string,"creado_por": string | null,"created_at": string,"estado": Database["public"]['Enums']["estado_plan"],"fecha_inicio": string,"frecuencia_dias": number,"id": string,"notas": string | null,"paquete_id": string | null,"precio_sesion": number,"precio_total": number,"procedimiento": string,"profesional_id": string | null,"servicio_id": string | null,"sesiones_total": number,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"creado_por"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_plan"],"fecha_inicio": string,"frecuencia_dias"?: number,"id"?: string,"notas"?: string | null,"paquete_id"?: string | null,"precio_sesion": number,"precio_total": number,"procedimiento": string,"profesional_id"?: string | null,"servicio_id"?: string | null,"sesiones_total": number,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cliente_id"?: string,"creado_por"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_plan"],"fecha_inicio"?: string,"frecuencia_dias"?: number,"id"?: string,"notas"?: string | null,"paquete_id"?: string | null,"precio_sesion"?: number,"precio_total"?: number,"procedimiento"?: string,"profesional_id"?: string | null,"servicio_id"?: string | null,"sesiones_total"?: number,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "planes_tratamiento_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planes_tratamiento_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planes_tratamiento_paquete_id_fkey"
      columns: ["paquete_id"]
isOneToOne: false
      referencedRelation: "paquetes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planes_tratamiento_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planes_tratamiento_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planes_tratamiento_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"servicios": {
                  Row: {
                    "activo": boolean,"categoria_id": string,"created_at": string,"descripcion": string | null,"duracion_min": number,"id": string,"nombre": string,"orden": number,"precio": number,"precio_descuento": number | null,"reserva_web": boolean,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria_id": string,"created_at"?: string,"descripcion"?: string | null,"duracion_min": number,"id"?: string,"nombre": string,"orden"?: number,"precio": number,"precio_descuento"?: number | null,"reserva_web"?: boolean,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"categoria_id"?: string,"created_at"?: string,"descripcion"?: string | null,"duracion_min"?: number,"id"?: string,"nombre"?: string,"orden"?: number,"precio"?: number,"precio_descuento"?: number | null,"reserva_web"?: boolean,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicios_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_servicio"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servicios_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"sesiones_tratamiento": {
                  Row: {
                    "estado": Database["public"]['Enums']["estado_sesion"],"fecha": string | null,"hora": string | null,"id": string,"notas": string | null,"numero": number,"pagada": boolean,"plan_id": string,"sucursal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "estado"?: Database["public"]['Enums']["estado_sesion"],"fecha"?: string | null,"hora"?: string | null,"id"?: string,"notas"?: string | null,"numero": number,"pagada"?: boolean,"plan_id": string,"sucursal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "estado"?: Database["public"]['Enums']["estado_sesion"],"fecha"?: string | null,"hora"?: string | null,"id"?: string,"notas"?: string | null,"numero"?: number,"pagada"?: boolean,"plan_id"?: string,"sucursal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sesiones_tratamiento_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "planes_tratamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sesiones_tratamiento_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
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
            "abrir_documento":
{ Args: { "p_documento": string }; Returns: {
              "nombre": string,"path": string,"tipo": string
            }[]
                           },
"documentos_de_cliente":
{ Args: { "p_cliente": string }; Returns: {
              "categoria": Database["public"]['Enums']["categoria_documento"],"created_at": string,"id": string,"nombre": string,"plan_id": string,"subido_por_nombre": string,"tamano": number,"tipo": string
            }[]
                           },
"eliminar_documento":
{ Args: { "p_documento": string }; Returns: string
                           },
"guardar_historial_medico":
{ Args: { "p_cliente": string,"p_datos": Json,"p_medicamentos": Json }; Returns: undefined
                           },
"login_espera_segundos":
{ Args: { "p_email_hash": string,"p_ip": string }; Returns: number
                           },
"login_registrar_intento":
{ Args: { "p_email_hash": string,"p_exito": boolean,"p_ip": string }; Returns: undefined
                           },
"marca_publica":
{ Args: Record<PropertyKey, never>; Returns: {
              "color_acento": string,"color_fondo": string,"color_primario": string,"email": string,"facebook": string,"horario_texto": string,"instagram": string,"logo_path": string,"nombre_comercial": string,"sitio_web": string,"telefono": string,"tiktok": string,"tipografia_texto": string,"tipografia_titulos": string,"whatsapp": string
            }[]
                           },
"mis_permisos":
{ Args: { "p_sucursal": string }; Returns: {
              "modulo": Database["public"]['Enums']["modulo_app"],"nivel": Database["public"]['Enums']["nivel_permiso"]
            }[]
                           },
"permisos_salud":
{ Args: { "p_cliente": string }; Returns: {
              "editar": boolean,"ver": boolean
            }[]
                           },
"registrar_documento":
{ Args: { "p_categoria": Database["public"]['Enums']["categoria_documento"],"p_cliente": string,"p_nombre": string,"p_plan"?: string,"p_tamano": number,"p_tipo": string }; Returns: {
              "id": string,"path": string
            }[]
                           },
"ver_historial_medico":
{ Args: { "p_cliente": string }; Returns: Json
                           }
          }
          Enums: {
            "categoria_documento": "consentimiento"|"estudio"|"antes_despues"|"receta"|"identificacion"|"otro","estado_empleado": "activo"|"vacaciones"|"inactivo","estado_plan": "activo"|"pausado"|"completado"|"cancelado","estado_sesion": "pendiente"|"completada"|"cancelada","modulo_app": "agenda"|"clientes"|"servicios"|"personal"|"productos"|"ventas"|"caja"|"finanzas"|"reportes"|"configuracion","nivel_permiso": "ninguno"|"lectura"|"total","rol_usuario": "admin"|"recepcion"|"estilista"|"asistente"
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
            "categoria_documento": ["consentimiento", "estudio", "antes_despues", "receta", "identificacion", "otro"],"estado_empleado": ["activo", "vacaciones", "inactivo"],"estado_plan": ["activo", "pausado", "completado", "cancelado"],"estado_sesion": ["pendiente", "completada", "cancelada"],"modulo_app": ["agenda", "clientes", "servicios", "personal", "productos", "ventas", "caja", "finanzas", "reportes", "configuracion"],"nivel_permiso": ["ninguno", "lectura", "total"],"rol_usuario": ["admin", "recepcion", "estilista", "asistente"]
          }
        }
} as const
