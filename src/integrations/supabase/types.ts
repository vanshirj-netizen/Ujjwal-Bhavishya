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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anubhav_attempts: {
        Row: {
          ai_feedback: string | null
          attempted_at: string | null
          day_number: number
          id: string
          mti_target: string | null
          score_awarded: number | null
          sentence: string
          session_id: string
          student_response: string
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          ai_feedback?: string | null
          attempted_at?: string | null
          day_number: number
          id?: string
          mti_target?: string | null
          score_awarded?: number | null
          sentence: string
          session_id: string
          student_response: string
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          ai_feedback?: string | null
          attempted_at?: string | null
          day_number?: number
          id?: string
          mti_target?: string | null
          score_awarded?: number | null
          sentence?: string
          session_id?: string
          student_response?: string
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "anubhav_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "anubhav_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      anubhav_practice_sessions: {
        Row: {
          ai_feedback: string | null
          audio_freespeech_path: string | null
          audio_sentences_path: string | null
          azure_word_errors: Json | null
          created_at: string | null
          day_number: number
          id: string
          lesson_topic: string | null
          natural_sound_score: number | null
          retry_count: number | null
          smoothness_score: number | null
          status: string | null
          submitted_at: string | null
          top_error_summary: string | null
          transcript_freespeech: string | null
          transcript_sentences: string | null
          user_id: string
          word_clarity_score: number | null
          writing_id: string | null
        }
        Insert: {
          ai_feedback?: string | null
          audio_freespeech_path?: string | null
          audio_sentences_path?: string | null
          azure_word_errors?: Json | null
          created_at?: string | null
          day_number: number
          id?: string
          lesson_topic?: string | null
          natural_sound_score?: number | null
          retry_count?: number | null
          smoothness_score?: number | null
          status?: string | null
          submitted_at?: string | null
          top_error_summary?: string | null
          transcript_freespeech?: string | null
          transcript_sentences?: string | null
          user_id: string
          word_clarity_score?: number | null
          writing_id?: string | null
        }
        Update: {
          ai_feedback?: string | null
          audio_freespeech_path?: string | null
          audio_sentences_path?: string | null
          azure_word_errors?: Json | null
          created_at?: string | null
          day_number?: number
          id?: string
          lesson_topic?: string | null
          natural_sound_score?: number | null
          retry_count?: number | null
          smoothness_score?: number | null
          status?: string | null
          submitted_at?: string | null
          top_error_summary?: string | null
          transcript_freespeech?: string | null
          transcript_sentences?: string | null
          user_id?: string
          word_clarity_score?: number | null
          writing_id?: string | null
        }
        Relationships: []
      }
      anubhav_sessions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          day_number: number
          id: string
          score: number | null
          sentence_index: number | null
          started_at: string | null
          total_attempted: number | null
          user_id: string
          world_type: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          day_number: number
          id?: string
          score?: number | null
          sentence_index?: number | null
          started_at?: string | null
          total_attempted?: number | null
          user_id: string
          world_type: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          day_number?: number
          id?: string
          score?: number | null
          sentence_index?: number | null
          started_at?: string | null
          total_attempted?: number | null
          user_id?: string
          world_type?: string
        }
        Relationships: []
      }
      anubhav_writings: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          lesson_topic: string | null
          sentence_1: string | null
          sentence_2: string | null
          sentence_3: string | null
          sentence_4: string | null
          sentence_5: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          lesson_topic?: string | null
          sentence_1?: string | null
          sentence_2?: string | null
          sentence_3?: string | null
          sentence_4?: string | null
          sentence_5?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          lesson_topic?: string | null
          sentence_1?: string | null
          sentence_2?: string | null
          sentence_3?: string | null
          sentence_4?: string | null
          sentence_5?: string | null
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          badges_earned: string[] | null
          certificate_image_url: string | null
          certificate_number: string | null
          certificate_pdf_url: string | null
          consistency_score: number | null
          course_id: string | null
          enrollment_id: string | null
          fluency_score: number | null
          grammar_score: number | null
          id: string
          is_verified: boolean | null
          issued_at: string | null
          mti_score: number | null
          photo_url: string | null
          tier: string
          transformation_score: number | null
          user_id: string | null
        }
        Insert: {
          badges_earned?: string[] | null
          certificate_image_url?: string | null
          certificate_number?: string | null
          certificate_pdf_url?: string | null
          consistency_score?: number | null
          course_id?: string | null
          enrollment_id?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          mti_score?: number | null
          photo_url?: string | null
          tier: string
          transformation_score?: number | null
          user_id?: string | null
        }
        Update: {
          badges_earned?: string[] | null
          certificate_image_url?: string | null
          certificate_number?: string | null
          certificate_pdf_url?: string | null
          consistency_score?: number | null
          course_id?: string | null
          enrollment_id?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          mti_score?: number | null
          photo_url?: string | null
          tier?: string
          transformation_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          coach_id: string | null
          id: string
          notes: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_id?: string | null
          id?: string
          notes?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string | null
          id?: string
          notes?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          total_days: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          total_days?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          total_days?: number | null
        }
        Relationships: []
      }
      daily_flames: {
        Row: {
          ai_generated_at: string | null
          ai_response: string | null
          audio_url: string | null
          biggest_challenge: string | null
          confidence_rating: number | null
          day_number: number
          elevenlabs_audio_url: string | null
          flame_date: string | null
          id: string
          spoke_about: string | null
          submitted_at: string | null
          tomorrows_intention: string | null
          user_id: string | null
          written_reflection: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_response?: string | null
          audio_url?: string | null
          biggest_challenge?: string | null
          confidence_rating?: number | null
          day_number: number
          elevenlabs_audio_url?: string | null
          flame_date?: string | null
          id?: string
          spoke_about?: string | null
          submitted_at?: string | null
          tomorrows_intention?: string | null
          user_id?: string | null
          written_reflection?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_response?: string | null
          audio_url?: string | null
          biggest_challenge?: string | null
          confidence_rating?: number | null
          day_number?: number
          elevenlabs_audio_url?: string | null
          flame_date?: string | null
          id?: string
          spoke_about?: string | null
          submitted_at?: string | null
          tomorrows_intention?: string | null
          user_id?: string | null
          written_reflection?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completion_date: string | null
          course_id: string
          current_day: number | null
          days_completed: number | null
          enrolled_at: string | null
          enrollment_type: string | null
          id: string
          is_active: boolean | null
          offline_payment_marked_by: string | null
          offline_payment_reference: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_mode: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          refund_completed_at: string | null
          refund_initiated_at: string | null
          refund_reason: string | null
          second_attempt_eligible: boolean | null
          trial_completed: boolean | null
          user_id: string | null
        }
        Insert: {
          completion_date?: string | null
          course_id?: string
          current_day?: number | null
          days_completed?: number | null
          enrolled_at?: string | null
          enrollment_type?: string | null
          id?: string
          is_active?: boolean | null
          offline_payment_marked_by?: string | null
          offline_payment_reference?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_mode?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          refund_completed_at?: string | null
          refund_initiated_at?: string | null
          refund_reason?: string | null
          second_attempt_eligible?: boolean | null
          trial_completed?: boolean | null
          user_id?: string | null
        }
        Update: {
          completion_date?: string | null
          course_id?: string
          current_day?: number | null
          days_completed?: number | null
          enrolled_at?: string | null
          enrollment_type?: string | null
          id?: string
          is_active?: boolean | null
          offline_payment_marked_by?: string | null
          offline_payment_reference?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_mode?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          refund_completed_at?: string | null
          refund_initiated_at?: string | null
          refund_reason?: string | null
          second_attempt_eligible?: boolean | null
          trial_completed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_offline_payment_marked_by_fkey"
            columns: ["offline_payment_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sessions: {
        Row: {
          ended_at: string | null
          id: string
          lesson_day: number | null
          master_used: string | null
          raw_conversation: Json | null
          session_summary: string | null
          session_type: string
          started_at: string | null
          user_id: string | null
          world_used: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          lesson_day?: number | null
          master_used?: string | null
          raw_conversation?: Json | null
          session_summary?: string | null
          session_type: string
          started_at?: string | null
          user_id?: string | null
          world_used?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          lesson_day?: number | null
          master_used?: string | null
          raw_conversation?: Json | null
          session_summary?: string | null
          session_type?: string
          started_at?: string | null
          user_id?: string | null
          world_used?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          day_number: number
          free_speak_context: string | null
          gamma_url: string | null
          grammar_hint: string | null
          gyani_timestamps: string | null
          gyani_youtube_url: string | null
          gyanu_timestamps: string | null
          gyanu_youtube_url: string | null
          id: string
          speak_example: string | null
          speak_max_seconds: number | null
          speak_min_seconds: number | null
          speak_prompt: string | null
          title: string
          wayground_quiz_url: string | null
          week_number: number | null
          write_example: string | null
          write_prompt: string | null
          write_sentence_count: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          day_number: number
          free_speak_context?: string | null
          gamma_url?: string | null
          grammar_hint?: string | null
          gyani_timestamps?: string | null
          gyani_youtube_url?: string | null
          gyanu_timestamps?: string | null
          gyanu_youtube_url?: string | null
          id?: string
          speak_example?: string | null
          speak_max_seconds?: number | null
          speak_min_seconds?: number | null
          speak_prompt?: string | null
          title: string
          wayground_quiz_url?: string | null
          week_number?: number | null
          write_example?: string | null
          write_prompt?: string | null
          write_sentence_count?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          day_number?: number
          free_speak_context?: string | null
          gamma_url?: string | null
          grammar_hint?: string | null
          gyani_timestamps?: string | null
          gyani_youtube_url?: string | null
          gyanu_timestamps?: string | null
          gyanu_youtube_url?: string | null
          id?: string
          speak_example?: string | null
          speak_max_seconds?: number | null
          speak_min_seconds?: number | null
          speak_prompt?: string | null
          title?: string
          wayground_quiz_url?: string | null
          week_number?: number | null
          write_example?: string | null
          write_prompt?: string | null
          write_sentence_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sentences: {
        Row: {
          course_id: string | null
          difficulty: number | null
          expected_keywords: string | null
          grammar_pattern: string | null
          id: string
          is_active: boolean | null
          lesson_day: number
          mti_target: string | null
          scenario_context: string | null
          sentence: string
          sentence_hindi: string | null
          sequence_order: number | null
          vocabulary_words: string | null
          world_type: string
        }
        Insert: {
          course_id?: string | null
          difficulty?: number | null
          expected_keywords?: string | null
          grammar_pattern?: string | null
          id?: string
          is_active?: boolean | null
          lesson_day: number
          mti_target?: string | null
          scenario_context?: string | null
          sentence: string
          sentence_hindi?: string | null
          sequence_order?: number | null
          vocabulary_words?: string | null
          world_type: string
        }
        Update: {
          course_id?: string | null
          difficulty?: number | null
          expected_keywords?: string | null
          grammar_pattern?: string | null
          id?: string
          is_active?: boolean | null
          lesson_day?: number
          mti_target?: string | null
          scenario_context?: string | null
          sentence?: string
          sentence_hindi?: string | null
          sequence_order?: number | null
          vocabulary_words?: string | null
          world_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean | null
          childhood_state: string | null
          chosen_world: string | null
          consent_given: boolean | null
          consent_timestamp: string | null
          country: string | null
          created_at: string | null
          current_streak: number | null
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          full_name: string
          gender: string | null
          id: string
          is_under_18: boolean | null
          last_flame_date: string | null
          longest_streak: number | null
          mother_tongue: string | null
          mti_primary_zone: string | null
          mti_profile_type: string | null
          mti_secondary_zone: string | null
          mti_zone: string | null
          next_day_unlock_at: string | null
          onboarding_complete: boolean | null
          onboarding_step: number | null
          parental_consent: boolean | null
          payment_status: string | null
          photo_url: string | null
          primary_goal: string | null
          selected_master: string | null
          ub_student_id: string | null
          updated_at: string | null
          whatsapp_opted_in: boolean | null
        }
        Insert: {
          age_verified?: boolean | null
          childhood_state?: string | null
          chosen_world?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          country?: string | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name?: string
          gender?: string | null
          id: string
          is_under_18?: boolean | null
          last_flame_date?: string | null
          longest_streak?: number | null
          mother_tongue?: string | null
          mti_primary_zone?: string | null
          mti_profile_type?: string | null
          mti_secondary_zone?: string | null
          mti_zone?: string | null
          next_day_unlock_at?: string | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          parental_consent?: boolean | null
          payment_status?: string | null
          photo_url?: string | null
          primary_goal?: string | null
          selected_master?: string | null
          ub_student_id?: string | null
          updated_at?: string | null
          whatsapp_opted_in?: boolean | null
        }
        Update: {
          age_verified?: boolean | null
          childhood_state?: string | null
          chosen_world?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          country?: string | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_under_18?: boolean | null
          last_flame_date?: string | null
          longest_streak?: number | null
          mother_tongue?: string | null
          mti_primary_zone?: string | null
          mti_profile_type?: string | null
          mti_secondary_zone?: string | null
          mti_zone?: string | null
          next_day_unlock_at?: string | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          parental_consent?: boolean | null
          payment_status?: string | null
          photo_url?: string | null
          primary_goal?: string | null
          selected_master?: string | null
          ub_student_id?: string | null
          updated_at?: string | null
          whatsapp_opted_in?: boolean | null
        }
        Relationships: []
      }
      progress: {
        Row: {
          anubhav_complete: boolean | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          day_complete: boolean | null
          day_number: number
          flame_complete: boolean | null
          gamma_complete: boolean | null
          gyani_complete: boolean | null
          gyanu_complete: boolean | null
          id: string
          lesson_complete: boolean | null
          lesson_id: string | null
          master_watched: boolean | null
          practice_complete: boolean | null
          quiz_complete: boolean | null
          quiz_score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anubhav_complete?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          day_complete?: boolean | null
          day_number: number
          flame_complete?: boolean | null
          gamma_complete?: boolean | null
          gyani_complete?: boolean | null
          gyanu_complete?: boolean | null
          id?: string
          lesson_complete?: boolean | null
          lesson_id?: string | null
          master_watched?: boolean | null
          practice_complete?: boolean | null
          quiz_complete?: boolean | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anubhav_complete?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          day_complete?: boolean | null
          day_number?: number
          flame_complete?: boolean | null
          gamma_complete?: boolean | null
          gyani_complete?: boolean | null
          gyanu_complete?: boolean | null
          id?: string
          lesson_complete?: boolean | null
          lesson_id?: string | null
          master_watched?: boolean | null
          practice_complete?: boolean | null
          quiz_complete?: boolean | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      shabd_shakti: {
        Row: {
          antonyms: string[] | null
          created_at: string | null
          day_number: number
          example_sentence: string | null
          id: string
          is_active: boolean | null
          meaning: string
          memory_trick: string | null
          pronunciation_guide: string | null
          synonyms: string[] | null
          word: string
        }
        Insert: {
          antonyms?: string[] | null
          created_at?: string | null
          day_number: number
          example_sentence?: string | null
          id?: string
          is_active?: boolean | null
          meaning: string
          memory_trick?: string | null
          pronunciation_guide?: string | null
          synonyms?: string[] | null
          word: string
        }
        Update: {
          antonyms?: string[] | null
          created_at?: string | null
          day_number?: number
          example_sentence?: string | null
          id?: string
          is_active?: boolean | null
          meaning?: string
          memory_trick?: string | null
          pronunciation_guide?: string | null
          synonyms?: string[] | null
          word?: string
        }
        Relationships: []
      }
      shabd_shakti_progress: {
        Row: {
          id: string
          learned_at: string | null
          mastered: boolean | null
          quiz_attempts: number | null
          quiz_correct: number | null
          shabd_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          learned_at?: string | null
          mastered?: boolean | null
          quiz_attempts?: number | null
          quiz_correct?: number | null
          shabd_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          learned_at?: string | null
          mastered?: boolean | null
          quiz_attempts?: number | null
          quiz_correct?: number | null
          shabd_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shabd_shakti_progress_shabd_id_fkey"
            columns: ["shabd_id"]
            isOneToOne: false
            referencedRelation: "shabd_shakti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shabd_shakti_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_errors: {
        Row: {
          correct_form: string | null
          detected_at: string | null
          error_category: string | null
          error_subtype: string | null
          error_word: string | null
          id: string
          lesson_day: number | null
          resolved: boolean | null
          resolved_at: string | null
          session_type: string | null
          student_version: string | null
          user_id: string | null
        }
        Insert: {
          correct_form?: string | null
          detected_at?: string | null
          error_category?: string | null
          error_subtype?: string | null
          error_word?: string | null
          id?: string
          lesson_day?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_type?: string | null
          student_version?: string | null
          user_id?: string | null
        }
        Update: {
          correct_form?: string | null
          detected_at?: string | null
          error_category?: string | null
          error_subtype?: string | null
          error_word?: string | null
          id?: string
          lesson_day?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_type?: string | null
          student_version?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan: {
        Row: {
          ai_recommendation: string | null
          based_on_day: number | null
          current_focus: string | null
          generated_at: string | null
          id: string
          user_id: string | null
          week_goal: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          based_on_day?: number | null
          current_focus?: string | null
          generated_at?: string | null
          id?: string
          user_id?: string | null
          week_goal?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          based_on_day?: number | null
          current_focus?: string | null
          generated_at?: string | null
          id?: string
          user_id?: string | null
          week_goal?: string | null
        }
        Relationships: []
      }
      transformation_scores: {
        Row: {
          certificate_tier: string | null
          consistency_score: number | null
          created_at: string | null
          enrollment_id: string | null
          fluency_score: number | null
          grammar_score: number | null
          id: string
          intervention_assigned_to: string | null
          intervention_flag: string | null
          intervention_notes: string | null
          last_calculated_at: string | null
          mti_score: number | null
          overall_score: number | null
          refund_eligible: boolean | null
          user_id: string | null
        }
        Insert: {
          certificate_tier?: string | null
          consistency_score?: number | null
          created_at?: string | null
          enrollment_id?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          intervention_assigned_to?: string | null
          intervention_flag?: string | null
          intervention_notes?: string | null
          last_calculated_at?: string | null
          mti_score?: number | null
          overall_score?: number | null
          refund_eligible?: boolean | null
          user_id?: string | null
        }
        Update: {
          certificate_tier?: string | null
          consistency_score?: number | null
          created_at?: string | null
          enrollment_id?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          intervention_assigned_to?: string | null
          intervention_flag?: string | null
          intervention_notes?: string | null
          last_calculated_at?: string | null
          mti_score?: number | null
          overall_score?: number | null
          refund_eligible?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transformation_scores_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_scores_intervention_assigned_to_fkey"
            columns: ["intervention_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          course_id: string
          created_at: string | null
          days_in_week: number | null
          id: string
          is_active: boolean | null
          theme_name: string
          theme_subtitle: string | null
          week_number: number
          week_type: string | null
        }
        Insert: {
          course_id?: string
          created_at?: string | null
          days_in_week?: number | null
          id?: string
          is_active?: boolean | null
          theme_name: string
          theme_subtitle?: string | null
          week_number: number
          week_type?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          days_in_week?: number | null
          id?: string
          is_active?: boolean | null
          theme_name?: string
          theme_subtitle?: string | null
          week_number?: number
          week_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ub_student_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
