package com.training.app.data

enum class ExerciseCategory(val label: String, val emoji: String) {
    STRENGTH("Strength", "💪"),
    CARDIO("Cardio", "🏃"),
    FLEXIBILITY("Flexibility", "🧘"),
    CORE("Core", "🔥")
}

enum class Difficulty(val label: String) {
    BEGINNER("Beginner"),
    INTERMEDIATE("Intermediate"),
    ADVANCED("Advanced")
}

data class Exercise(
    val id: String,
    val name: String,
    val category: ExerciseCategory,
    val difficulty: Difficulty,
    val defaultReps: Int,
    val defaultSets: Int,
    val restSeconds: Int,
    val muscleGroups: List<String>,
    val steps: List<String>,
    val tips: List<String>,
    val animationType: AnimationType
)

enum class AnimationType {
    PUSH_UP,
    SQUAT,
    LUNGE,
    JUMPING_JACK,
    PLANK,
    CRUNCH,
    MOUNTAIN_CLIMBER,
    BURPEE,
    TRICEP_DIP,
    HIGH_KNEES,
    DEADLIFT,
    SHOULDER_PRESS
}

val exerciseLibrary: List<Exercise> = listOf(
    Exercise(
        id = "push_up",
        name = "Push-Up",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 12,
        defaultSets = 3,
        restSeconds = 60,
        muscleGroups = listOf("Chest", "Triceps", "Shoulders"),
        steps = listOf(
            "Start in a high plank — hands shoulder-width apart, body straight.",
            "Lower your chest toward the floor, keeping elbows at ~45°.",
            "Push through your palms and return to the starting position.",
            "Keep your core tight throughout the movement."
        ),
        tips = listOf(
            "Don't let your hips sag or pike up.",
            "Breathe in on the way down, out on the way up.",
            "For an easier variation, keep knees on the floor."
        ),
        animationType = AnimationType.PUSH_UP
    ),
    Exercise(
        id = "squat",
        name = "Bodyweight Squat",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 15,
        defaultSets = 3,
        restSeconds = 60,
        muscleGroups = listOf("Quads", "Glutes", "Hamstrings"),
        steps = listOf(
            "Stand with feet shoulder-width apart, toes slightly out.",
            "Brace your core and keep your chest up.",
            "Lower by pushing knees out and sitting back — thighs parallel to floor.",
            "Drive through your heels to stand back up."
        ),
        tips = listOf(
            "Keep your weight in your heels, not your toes.",
            "Knees should track over toes, not cave inward.",
            "Look straight ahead throughout the movement."
        ),
        animationType = AnimationType.SQUAT
    ),
    Exercise(
        id = "lunge",
        name = "Forward Lunge",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 10,
        defaultSets = 3,
        restSeconds = 60,
        muscleGroups = listOf("Quads", "Glutes", "Hamstrings", "Calves"),
        steps = listOf(
            "Stand tall with feet together.",
            "Step one foot forward and lower your back knee toward the floor.",
            "Front thigh should be parallel to the ground.",
            "Push off the front foot to return to the starting position.",
            "Alternate legs each rep."
        ),
        tips = listOf(
            "Keep your torso upright — don't lean forward.",
            "Front knee should not travel past your toes.",
            "Take a large enough step to create a 90° angle."
        ),
        animationType = AnimationType.LUNGE
    ),
    Exercise(
        id = "jumping_jack",
        name = "Jumping Jack",
        category = ExerciseCategory.CARDIO,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 30,
        defaultSets = 3,
        restSeconds = 30,
        muscleGroups = listOf("Full Body", "Calves", "Shoulders"),
        steps = listOf(
            "Stand with feet together and arms at your sides.",
            "Jump feet out to shoulder-width while raising arms overhead.",
            "Jump feet back together while lowering arms.",
            "Repeat in a smooth, rhythmic motion."
        ),
        tips = listOf(
            "Land softly to protect your knees.",
            "Keep a slight bend in your knees throughout.",
            "Maintain a consistent rhythm."
        ),
        animationType = AnimationType.JUMPING_JACK
    ),
    Exercise(
        id = "plank",
        name = "Plank Hold",
        category = ExerciseCategory.CORE,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 30,
        defaultSets = 3,
        restSeconds = 45,
        muscleGroups = listOf("Core", "Shoulders", "Glutes"),
        steps = listOf(
            "Place forearms on the floor, elbows under shoulders.",
            "Extend legs behind you, resting on your toes.",
            "Form a straight line from head to heels.",
            "Hold the position for the target time."
        ),
        tips = listOf(
            "Don't hold your breath — breathe steadily.",
            "Squeeze your glutes and abs throughout.",
            "Avoid letting hips rise or sag."
        ),
        animationType = AnimationType.PLANK
    ),
    Exercise(
        id = "crunch",
        name = "Crunch",
        category = ExerciseCategory.CORE,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 20,
        defaultSets = 3,
        restSeconds = 45,
        muscleGroups = listOf("Abs", "Core"),
        steps = listOf(
            "Lie on your back with knees bent, feet flat on the floor.",
            "Place hands lightly behind your head.",
            "Curl your upper body toward your knees using your abs.",
            "Lower back down with control."
        ),
        tips = listOf(
            "Don't yank your neck with your hands.",
            "Focus on contracting your abs, not just moving your head.",
            "Keep lower back pressed into the floor."
        ),
        animationType = AnimationType.CRUNCH
    ),
    Exercise(
        id = "mountain_climber",
        name = "Mountain Climber",
        category = ExerciseCategory.CARDIO,
        difficulty = Difficulty.INTERMEDIATE,
        defaultReps = 20,
        defaultSets = 3,
        restSeconds = 45,
        muscleGroups = listOf("Core", "Shoulders", "Hip Flexors", "Cardio"),
        steps = listOf(
            "Start in a high plank position — hands under shoulders.",
            "Drive one knee toward your chest.",
            "Quickly switch legs in a running motion.",
            "Keep hips level and core braced throughout."
        ),
        tips = listOf(
            "The faster you go, the more cardio benefit.",
            "Don't let your hips bounce up and down.",
            "Keep shoulders stacked over wrists."
        ),
        animationType = AnimationType.MOUNTAIN_CLIMBER
    ),
    Exercise(
        id = "burpee",
        name = "Burpee",
        category = ExerciseCategory.CARDIO,
        difficulty = Difficulty.ADVANCED,
        defaultReps = 10,
        defaultSets = 3,
        restSeconds = 90,
        muscleGroups = listOf("Full Body", "Cardio", "Core"),
        steps = listOf(
            "Stand with feet shoulder-width apart.",
            "Drop hands to the floor and jump feet back to plank.",
            "Perform a push-up (optional for added difficulty).",
            "Jump feet back to your hands.",
            "Explosively jump up with arms overhead."
        ),
        tips = listOf(
            "Focus on form before speed.",
            "Land softly when jumping to reduce impact.",
            "Modify by stepping instead of jumping if needed."
        ),
        animationType = AnimationType.BURPEE
    ),
    Exercise(
        id = "high_knees",
        name = "High Knees",
        category = ExerciseCategory.CARDIO,
        difficulty = Difficulty.BEGINNER,
        defaultReps = 30,
        defaultSets = 3,
        restSeconds = 30,
        muscleGroups = listOf("Hip Flexors", "Quads", "Cardio", "Core"),
        steps = listOf(
            "Stand with feet hip-width apart.",
            "Run in place, driving each knee up to hip height.",
            "Pump your arms in sync with your legs.",
            "Maintain a quick, steady pace."
        ),
        tips = listOf(
            "Keep your core engaged throughout.",
            "Land on the balls of your feet for less impact.",
            "Keep your back straight — don't lean backward."
        ),
        animationType = AnimationType.HIGH_KNEES
    ),
    Exercise(
        id = "tricep_dip",
        name = "Tricep Dip",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.INTERMEDIATE,
        defaultReps = 12,
        defaultSets = 3,
        restSeconds = 60,
        muscleGroups = listOf("Triceps", "Chest", "Shoulders"),
        steps = listOf(
            "Sit on the edge of a chair or bench, hands gripping the edge beside hips.",
            "Slide hips off the seat, legs extended or bent.",
            "Lower body by bending elbows to ~90°.",
            "Press back up until arms are straight."
        ),
        tips = listOf(
            "Keep your back close to the chair.",
            "Don't shrug your shoulders — keep them down.",
            "Bend knees to make it easier, straighten to make it harder."
        ),
        animationType = AnimationType.TRICEP_DIP
    ),
    Exercise(
        id = "deadlift",
        name = "Romanian Deadlift",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.INTERMEDIATE,
        defaultReps = 10,
        defaultSets = 3,
        restSeconds = 90,
        muscleGroups = listOf("Hamstrings", "Glutes", "Lower Back"),
        steps = listOf(
            "Stand with feet hip-width apart, slight bend in knees.",
            "Hinge at the hips, pushing them backward as you lower.",
            "Lower your hands along your legs until you feel a hamstring stretch.",
            "Drive hips forward to return to standing."
        ),
        tips = listOf(
            "Keep your back flat — never round the lower back.",
            "The movement comes from your hips, not your waist.",
            "Keep the weight (or hands) close to your body throughout."
        ),
        animationType = AnimationType.DEADLIFT
    ),
    Exercise(
        id = "shoulder_press",
        name = "Shoulder Press",
        category = ExerciseCategory.STRENGTH,
        difficulty = Difficulty.INTERMEDIATE,
        defaultReps = 12,
        defaultSets = 3,
        restSeconds = 60,
        muscleGroups = listOf("Shoulders", "Triceps", "Upper Back"),
        steps = listOf(
            "Stand or sit with weights at shoulder height, palms facing forward.",
            "Brace your core and keep your back straight.",
            "Press the weights straight up until arms are fully extended.",
            "Lower slowly back to shoulder level."
        ),
        tips = listOf(
            "Don't arch your lower back — engage your core.",
            "Control the descent — don't drop the weight.",
            "Keep wrists stacked over elbows throughout."
        ),
        animationType = AnimationType.SHOULDER_PRESS
    )
)

val categories = ExerciseCategory.values().toList()
