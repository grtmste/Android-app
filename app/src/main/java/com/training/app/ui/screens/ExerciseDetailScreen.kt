package com.training.app.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.training.app.data.Exercise
import com.training.app.data.exerciseLibrary
import com.training.app.ui.components.ExerciseAnimation
import kotlinx.coroutines.delay

@Composable
fun ExerciseDetailScreen(exerciseId: String, onBack: () -> Unit) {
    val exercise = remember(exerciseId) {
        exerciseLibrary.find { it.id == exerciseId }
    } ?: return

    val accent = categoryColor(exercise.category)

    var currentSet by remember { mutableIntStateOf(1) }
    var repsCompleted by remember { mutableIntStateOf(0) }
    var isResting by remember { mutableStateOf(false) }
    var restSecondsLeft by remember { mutableIntStateOf(exercise.restSeconds) }

    // Rest timer countdown
    LaunchedEffect(isResting) {
        if (isResting) {
            restSecondsLeft = exercise.restSeconds
            while (restSecondsLeft > 0) {
                delay(1000)
                restSecondsLeft--
            }
            isResting = false
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                // Top bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text(
                        text = exercise.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                // Animation area
                AnimatedContent(
                    targetState = isResting,
                    transitionSpec = { fadeIn(tween(300)) togetherWith fadeOut(tween(300)) },
                    label = "anim_or_rest"
                ) { resting ->
                    if (resting) {
                        RestTimerCard(
                            secondsLeft = restSecondsLeft,
                            totalSeconds = exercise.restSeconds,
                            accent = accent,
                            onSkip = { isResting = false },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .padding(horizontal = 16.dp)
                        )
                    } else {
                        ExerciseAnimation(
                            animationType = exercise.animationType,
                            accentColor = accent,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .padding(horizontal = 16.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            item {
                // Set & rep tracker
                SetRepTracker(
                    exercise = exercise,
                    currentSet = currentSet,
                    repsCompleted = repsCompleted,
                    accent = accent,
                    onRepAdd = { if (repsCompleted < exercise.defaultReps) repsCompleted++ },
                    onRepRemove = { if (repsCompleted > 0) repsCompleted-- },
                    onCompleteSet = {
                        if (currentSet < exercise.defaultSets) {
                            currentSet++
                            repsCompleted = 0
                            isResting = true
                        } else {
                            // All sets done
                            currentSet = exercise.defaultSets
                            repsCompleted = exercise.defaultReps
                        }
                    },
                    onReset = {
                        currentSet = 1
                        repsCompleted = 0
                        isResting = false
                    }
                )
                Spacer(modifier = Modifier.height(20.dp))
            }

            item {
                // Muscles & difficulty info
                ExerciseMetaRow(exercise = exercise, accent = accent)
                Spacer(modifier = Modifier.height(20.dp))
            }

            item {
                SectionTitle("How To Do It")
            }
            itemsIndexed(exercise.steps) { index, step ->
                StepItem(index + 1, step, accent)
            }

            item { Spacer(modifier = Modifier.height(20.dp)) }

            item {
                SectionTitle("Tips")
            }
            itemsIndexed(exercise.tips) { _, tip ->
                TipItem(tip)
            }
        }
    }
}

@Composable
private fun SetRepTracker(
    exercise: Exercise,
    currentSet: Int,
    repsCompleted: Int,
    accent: Color,
    onRepAdd: () -> Unit,
    onRepRemove: () -> Unit,
    onCompleteSet: () -> Unit,
    onReset: () -> Unit
) {
    val allDone = currentSet == exercise.defaultSets && repsCompleted == exercise.defaultReps
    val setProgress = (currentSet - 1).toFloat() / exercise.defaultSets + repsCompleted.toFloat() / (exercise.defaultReps * exercise.defaultSets)
    val animProgress by animateFloatAsState(targetValue = setProgress, label = "progress")

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (allDone) "Workout Complete! 🎉" else "Set $currentSet / ${exercise.defaultSets}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (allDone) accent else MaterialTheme.colorScheme.onSurface
                )
                IconButton(onClick = onReset) {
                    Icon(Icons.Default.Refresh, contentDescription = "Reset", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { animProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = accent,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                strokeCap = StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Reps counter
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                CounterButton("-", MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurface, onRepRemove)
                Spacer(modifier = Modifier.width(20.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$repsCompleted",
                        fontSize = 48.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = accent
                    )
                    Text(
                        text = "/ ${exercise.defaultReps} reps",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.width(20.dp))
                CounterButton("+", accent.copy(alpha = 0.15f), accent, onRepAdd)
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (!allDone) {
                ElevatedButton(
                    onClick = onCompleteSet,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.elevatedButtonColors(containerColor = accent, contentColor = Color.Black)
                ) {
                    Text(
                        text = if (currentSet < exercise.defaultSets) "Complete Set → Rest" else "Finish Workout",
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun CounterButton(label: String, bg: Color, textColor: Color, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(bg)
            .padding(0.dp),
        contentAlignment = Alignment.Center
    ) {
        FilledTonalButton(
            onClick = onClick,
            modifier = Modifier.size(48.dp),
            shape = CircleShape,
            contentPadding = PaddingValues(0.dp),
            colors = ButtonDefaults.filledTonalButtonColors(containerColor = bg)
        ) {
            Text(label, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = textColor)
        }
    }
}

@Composable
private fun RestTimerCard(
    secondsLeft: Int,
    totalSeconds: Int,
    accent: Color,
    onSkip: () -> Unit,
    modifier: Modifier = Modifier
) {
    val progress = secondsLeft.toFloat() / totalSeconds.toFloat()
    val animProgress by animateFloatAsState(targetValue = progress, tween(900), label = "rest")

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Rest", style = MaterialTheme.typography.headlineMedium, color = accent, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "$secondsLeft s",
                fontSize = 56.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { animProgress },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = accent,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                strokeCap = StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(16.dp))
            FilledTonalButton(onClick = onSkip, shape = RoundedCornerShape(10.dp)) {
                Text("Skip rest")
            }
        }
    }
}

@Composable
private fun ExerciseMetaRow(exercise: Exercise, accent: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        MetaCard("Sets", "${exercise.defaultSets}", accent, Modifier.weight(1f))
        MetaCard("Reps", "${exercise.defaultReps}", accent, Modifier.weight(1f))
        MetaCard("Rest", "${exercise.restSeconds}s", accent, Modifier.weight(1f))
    }
    Spacer(modifier = Modifier.height(10.dp))
    // Muscle groups
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        exercise.muscleGroups.forEach { muscle ->
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(muscle, style = MaterialTheme.typography.labelMedium, color = accent)
            }
        }
    }
}

@Composable
private fun MetaCard(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, style = MaterialTheme.typography.titleLarge, color = accent, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
    )
}

@Composable
private fun StepItem(number: Int, text: String, accent: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(accent),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$number",
                style = MaterialTheme.typography.labelLarge,
                color = Color.Black,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun TipItem(text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text("•", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 2.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )
    }
}
