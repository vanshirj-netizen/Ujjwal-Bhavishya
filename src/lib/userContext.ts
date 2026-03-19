import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────
// FUNCTION 1: fetchFreshUserContext
// Call this BEFORE every AI API call.
// Never cache. Always fresh from Supabase.
// ─────────────────────────────────────────

export const fetchFreshUserContext = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        full_name, selected_master,
        chosen_world, mother_tongue,
        childhood_state, mti_zone,
        mti_profile_type, mti_primary_zone,
        mti_secondary_zone, primary_goal,
        current_streak
      `)
      .eq("id", user.id)
      .single();

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select(`
        current_day, days_completed,
        payment_status, is_active
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const currentDay = enrollment?.current_day ?? 0;

    const { data: taughtLessons } = await supabase
      .from("lessons")
      .select("day_number, title")
      .lte("day_number", currentDay)
      .order("day_number", { ascending: true });

    const { data: dayProgress } = await supabase
      .from("progress")
      .select(`
        day_number, day_complete,
        quiz_score, master_watched,
        gyani_complete, gyanu_complete,
        practice_complete
      `)
      .eq("user_id", user.id)
      .eq("day_complete", true)
      .order("day_number", { ascending: false });

    const { data: errors } = await supabase
      .from("practice_errors")
      .select(`
        error_category, error_subtype,
        error_word, correct_form,
        student_version, lesson_day,
        session_type
      `)
      .eq("user_id", user.id)
      .eq("resolved", false)
      .order("detected_at", { ascending: false })
      .limit(5);

    const { data: scores } = await supabase
      .from("transformation_scores")
      .select(`
        fluency_score, mti_score,
        grammar_score, consistency_score,
        overall_score, certificate_tier,
        intervention_flag
      `)
      .eq("user_id", user.id)
      .order("last_calculated_at", { ascending: false })
      .limit(1)
      .single();

    const { data: recentFlames } = await supabase
      .from("reflection_sessions")
      .select(`
        day_number, confidence_rating,
        spoke_about, biggest_challenge,
        flame_date
      `)
      .eq("user_id", user.id)
      .order("flame_date", { ascending: false })
      .limit(3);

    const { data: coachNote } = await supabase
      .from("coach_notes")
      .select("notes, updated_at")
      .eq("student_id", user.id)
      .single();

    const { data: trainingPlan } = await supabase
      .from("student_training_plans")
      .select(`
        current_focus, week_goal,
        ai_recommendation, based_on_day
      `)
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    return {
      userId: user.id,
      profile,
      enrollment,
      currentDay,
      taughtLessons: taughtLessons ?? [],
      dayProgress: dayProgress ?? [],
      errors: errors ?? [],
      scores: scores ?? null,
      recentFlames: recentFlames ?? [],
      coachNote: coachNote ?? null,
      trainingPlan: trainingPlan ?? null,
    };
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────
// FUNCTION 2: buildSystemPrompt
// ─────────────────────────────────────────

export const buildSystemPrompt = (
  ctx: NonNullable<Awaited<ReturnType<typeof fetchFreshUserContext>>>
): string => {
  const {
    profile, currentDay,
    taughtLessons, errors, scores,
    recentFlames, coachNote, trainingPlan,
  } = ctx;

  const firstName = profile?.full_name?.split(" ")[0] ?? "Student";

  const masterPersona =
    profile?.selected_master === "gyanu"
      ? `You are Gyanu — energetic, modern, action-oriented. You speak with fire and urgency. You celebrate wins loudly and push students to act immediately.`
      : `You are Gyani — wise, deep, and philosophical. You help students understand concepts at their roots. You speak with calm authority and timeless perspective.`;

  const worlds = (profile?.chosen_world ?? "").split(",").filter(Boolean);
  const worldContext = [
    worlds.includes("professional")
      ? `This student uses English for career and professional growth. Prioritise formal tone, workplace vocabulary, emails, and business communication.`
      : "",
    worlds.includes("casual")
      ? `This student also uses English for social life and everyday conversations. Include natural idioms and colloquial expressions.`
      : "",
  ].filter(Boolean).join("\n");

  const mtiContext = profile?.mti_zone
    ? `MTI PROFILE:
Language zone: ${profile.mti_zone}
Mother tongue: ${profile.mother_tongue ?? "unknown"}
Grew up in: ${profile.childhood_state ?? "unknown"}
MTI type: ${profile.mti_profile_type ?? "single"}
Primary interference: ${profile.mti_primary_zone ?? "unknown"}
${profile.mti_secondary_zone ? `Secondary: ${profile.mti_secondary_zone}` : ""}`
    : `Mother tongue: ${profile?.mother_tongue ?? "unknown"}
Grew up in: ${profile?.childhood_state ?? "unknown"}`;

  const taughtTopics = taughtLessons
    .map(l => `Day ${l.day_number}: ${l.title}`)
    .join("\n");

  const curriculumGate =
    taughtLessons.length > 0
      ? `CURRICULUM GATE — NON-NEGOTIABLE:
Student has completed up to Day ${currentDay} of 60.
Taught topics:
${taughtTopics}

You may ONLY correct, teach, or reference grammar and vocabulary from the above list.
If the student makes an error on a concept NOT yet taught, do NOT correct it. Say:
"We will cover that soon — focus on today's topic for now."`
      : `Student is on Day ${currentDay}. No lessons completed yet. Start from absolute basics only.`;

  const errorContext = errors.length > 0
    ? `KNOWN RECURRING ERRORS (target these — do NOT repeat corrections already given):
${errors.map(e =>
  `• [${e.error_category}/${e.error_subtype}] Said: "${e.student_version}" Correct: "${e.correct_form}" Day ${e.lesson_day ?? "?"}`
).join("\n")}`
    : "No recurring errors logged yet.";

  const scoreContext = scores
    ? `CURRENT SCORES:
Fluency: ${scores.fluency_score}/100
Grammar: ${scores.grammar_score}/100
MTI: ${scores.mti_score}/100
Consistency: ${scores.consistency_score}/100
Overall: ${scores.overall_score}/100
Level: ${scores.certificate_tier ?? "beginner"}`
    : "No scores recorded yet.";

  const flameContext = recentFlames.length > 0
    ? `RECENT SESSIONS:
${recentFlames.map(f =>
  `Day ${f.day_number}: confidence ${f.confidence_rating}/10 Spoke about: ${f.spoke_about ?? "—"} Challenge: ${f.biggest_challenge ?? "—"}`
).join("\n")}`
    : "";

  const coachContext = coachNote?.notes
    ? `COACH NOTES: ${coachNote.notes}`
    : "";

  const planContext = trainingPlan
    ? `ACTIVE TRAINING PLAN:
Focus: ${trainingPlan.current_focus}
This week: ${trainingPlan.week_goal}
Recommendation: ${trainingPlan.ai_recommendation}`
    : "";

  return `
${masterPersona}

STUDENT: ${firstName}
Streak: ${ctx.profile?.current_streak ?? 0} days
Goals: ${profile?.primary_goal ?? "general English improvement"}
Days in course: ${currentDay} of 60

${worldContext}

${mtiContext}

${curriculumGate}

${scoreContext}

${errorContext}

${flameContext}

${coachContext}

${planContext}

BEHAVIOUR RULES:
- Always call the student ${firstName}
- Never introduce concepts beyond Day ${currentDay}
- Celebrate streak and progress warmly
- End every response with ONE short practice prompt targeting the weakest current area
- Keep responses concise and high-energy
- Correct errors with warmth, not criticism
`.trim();
};

// ─────────────────────────────────────────
// FUNCTION 3: saveSessionSummary
// ─────────────────────────────────────────

export const saveSessionSummary = async (
  userId: string,
  sessionType: string,
  masterUsed: string,
  worldUsed: string,
  lessonDay: number,
  rawConversation: object[],
  summary: {
    session_summary: string;
    errors: Array<{
      error_category: string;
      error_subtype: string;
      error_word: string;
      correct_form: string;
      student_version: string;
    }>;
    scores: {
      fluency_score: number;
      mti_score: number;
      grammar_score: number;
      consistency_score: number;
      overall_score: number;
      certificate_tier: string;
    } | null;
    training_plan: {
      current_focus: string;
      week_goal: string;
      ai_recommendation: string;
    } | null;
  }
) => {
  try {
    // 1. Save session record
    await supabase
      .from("legacy_learning_sessions")
      .insert({
        user_id: userId,
        session_type: sessionType,
        master_used: masterUsed,
        world_used: worldUsed,
        lesson_day: lessonDay,
        raw_conversation: rawConversation as any,
        session_summary: summary.session_summary,
        ended_at: new Date().toISOString(),
      });

    // 2. Save new errors detected
    for (const e of summary.errors) {
      const { data: existing } = await supabase
        .from("practice_errors")
        .select("id")
        .eq("user_id", userId)
        .eq("error_word", e.error_word)
        .eq("error_subtype", e.error_subtype)
        .eq("resolved", false)
        .single();

      if (!existing) {
        await supabase
          .from("practice_errors")
          .insert({
            user_id: userId,
            session_type: sessionType,
            error_category: e.error_category,
            error_subtype: e.error_subtype,
            error_word: e.error_word,
            correct_form: e.correct_form,
            student_version: e.student_version,
            lesson_day: lessonDay,
            resolved: false,
          });
      }
    }

    // 3. Update transformation scores
    if (summary.scores) {
      const { data: existing } = await supabase
        .from("transformation_scores")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        await supabase
          .from("transformation_scores")
          .update({
            ...summary.scores,
            last_calculated_at: new Date().toISOString(),
          } as any)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("transformation_scores")
          .insert({
            user_id: userId,
            ...summary.scores,
          } as any);
      }
    }

    // 4. Save training plan if updated
    if (summary.training_plan) {
      await supabase
        .from("student_training_plans")
        .insert({
          user_id: userId,
          based_on_day: lessonDay,
          generated_at: new Date().toISOString(),
          ...summary.training_plan,
        });
    }
  } catch (err) {
    console.error("Session save failed:", err);
  }
};
