export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      channel_embeddings: {
        Row: {
          channel_id: string;
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          channel_id: string;
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          channel_id?: string;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_channel';
            columns: ['channel_id'];
            isOneToOne: false;
            referencedRelation: 'channels';
            referencedColumns: ['id'];
          },
        ];
      };
      channels: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          name: string;
          organization_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name: string;
          organization_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name?: string;
          organization_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_organization';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      direct_message_conversations: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_organization';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      direct_message_participants: {
        Row: {
          conversation_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_conversation';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'direct_message_conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id: string;
          message_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id?: string;
          message_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          message_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_message';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          channel_id: string | null;
          content: string;
          content_embedding: string | null;
          conversation_id: string | null;
          created_at: string;
          id: string;
          is_ai_generated: boolean;
          parent_message_id: string | null;
          sender_id: string;
          updated_at: string;
        };
        Insert: {
          channel_id?: string | null;
          content: string;
          content_embedding?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          is_ai_generated?: boolean;
          parent_message_id?: string | null;
          sender_id: string;
          updated_at?: string;
        };
        Update: {
          channel_id?: string | null;
          content?: string;
          content_embedding?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          is_ai_generated?: boolean;
          parent_message_id?: string | null;
          sender_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_channel';
            columns: ['channel_id'];
            isOneToOne: false;
            referencedRelation: 'channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_conversation';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'direct_message_conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_parent_message';
            columns: ['parent_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_sender';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          channel_id: string | null;
          conversation_id: string | null;
          created_at: string;
          id: string;
          message_id: string | null;
          read: boolean;
          sender_id: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          read?: boolean;
          sender_id?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          read?: boolean;
          sender_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_channel';
            columns: ['channel_id'];
            isOneToOne: false;
            referencedRelation: 'channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_conversation';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'direct_message_conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_message';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_sender';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_embeddings: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_organization';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_organization';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_owner';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_message';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_embeddings: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          ai_persona_prompt: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          last_seen: string | null;
          status: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          ai_persona_prompt?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          email: string;
          id?: string;
          last_seen?: string | null;
          status?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          ai_persona_prompt?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          last_seen?: string | null;
          status?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_reaction: {
        Args: {
          message_id_input: string;
          user_id_input: string;
          emoji_input: string;
        };
        Returns: string;
      };
      binary_quantize:
        | {
            Args: {
              '': string;
            };
            Returns: unknown;
          }
        | {
            Args: {
              '': unknown;
            };
            Returns: unknown;
          };
      check_channel_slug_availability: {
        Args: {
          org_id: string;
          channel_slug: string;
        };
        Returns: boolean;
      };
      delete_channel: {
        Args: {
          channel_id: string;
        };
        Returns: boolean;
      };
      delete_direct_message_conversation: {
        Args: {
          conversation_id: string;
        };
        Returns: boolean;
      };
      delete_message: {
        Args: {
          message_id: string;
        };
        Returns: boolean;
      };
      delete_organization: {
        Args: {
          org_id: string;
        };
        Returns: boolean;
      };
      delete_reaction: {
        Args: {
          reaction_id: string;
          user_id_input: string;
        };
        Returns: boolean;
      };
      delete_user: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
      };
      exec_sql: {
        Args: {
          query: string;
        };
        Returns: undefined;
      };
      halfvec_avg: {
        Args: {
          '': number[];
        };
        Returns: unknown;
      };
      halfvec_out: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      halfvec_send: {
        Args: {
          '': unknown;
        };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: {
          '': unknown[];
        };
        Returns: number;
      };
      hnsw_bit_support: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      hnswhandler: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      ivfflat_bit_support: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      l2_norm:
        | {
            Args: {
              '': unknown;
            };
            Returns: number;
          }
        | {
            Args: {
              '': unknown;
            };
            Returns: number;
          };
      l2_normalize:
        | {
            Args: {
              '': string;
            };
            Returns: string;
          }
        | {
            Args: {
              '': unknown;
            };
            Returns: unknown;
          }
        | {
            Args: {
              '': unknown;
            };
            Returns: unknown;
          };
      search_organizations: {
        Args: {
          query_embedding: string;
          similarity_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          similarity: number;
        }[];
      };
      search_users: {
        Args: {
          query_embedding: string;
          similarity_threshold: number;
          match_count: number;
          organization_id: string;
        };
        Returns: {
          id: string;
          similarity: number;
        }[];
      };
      sparsevec_out: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: {
          '': unknown;
        };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: {
          '': unknown[];
        };
        Returns: number;
      };
      vector_avg: {
        Args: {
          '': number[];
        };
        Returns: string;
      };
      vector_dims:
        | {
            Args: {
              '': string;
            };
            Returns: number;
          }
        | {
            Args: {
              '': unknown;
            };
            Returns: number;
          };
      vector_norm: {
        Args: {
          '': string;
        };
        Returns: number;
      };
      vector_out: {
        Args: {
          '': string;
        };
        Returns: unknown;
      };
      vector_send: {
        Args: {
          '': string;
        };
        Returns: string;
      };
      vector_typmod_in: {
        Args: {
          '': unknown[];
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
