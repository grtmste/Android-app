package com.training.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp
import com.training.app.data.AnimationType
import com.training.app.ui.theme.SurfaceVariantDark
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun ExerciseAnimation(
    animationType: AnimationType,
    modifier: Modifier = Modifier,
    accentColor: Color = Color(0xFF4FC3F7)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "exercise")
    val progress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "progress"
    )

    Box(
        modifier = modifier
            .background(SurfaceVariantDark, RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            when (animationType) {
                AnimationType.PUSH_UP -> drawPushUp(progress, accentColor)
                AnimationType.SQUAT -> drawSquat(progress, accentColor)
                AnimationType.LUNGE -> drawLunge(progress, accentColor)
                AnimationType.JUMPING_JACK -> drawJumpingJack(progress, accentColor)
                AnimationType.PLANK -> drawPlank(progress, accentColor)
                AnimationType.CRUNCH -> drawCrunch(progress, accentColor)
                AnimationType.MOUNTAIN_CLIMBER -> drawMountainClimber(progress, accentColor)
                AnimationType.BURPEE -> drawBurpee(progress, accentColor)
                AnimationType.HIGH_KNEES -> drawHighKnees(progress, accentColor)
                AnimationType.TRICEP_DIP -> drawTricepDip(progress, accentColor)
                AnimationType.DEADLIFT -> drawDeadlift(progress, accentColor)
                AnimationType.SHOULDER_PRESS -> drawShoulderPress(progress, accentColor)
            }
        }
    }
}

// ─── Stick-figure helpers ───────────────────────────────────────────────────

private fun DrawScope.drawHead(center: Offset, radius: Float, color: Color) {
    drawCircle(color = color, radius = radius, center = center)
}

private fun DrawScope.drawLine(
    start: Offset,
    end: Offset,
    color: Color,
    strokeWidth: Float = 8f
) {
    drawLine(
        color = color,
        start = start,
        end = end,
        strokeWidth = strokeWidth,
        cap = StrokeCap.Round
    )
}

private fun DrawScope.drawFloor(y: Float, color: Color) {
    drawLine(
        color = color.copy(alpha = 0.3f),
        start = Offset(size.width * 0.1f, y),
        end = Offset(size.width * 0.9f, y),
        strokeWidth = 4f,
        cap = StrokeCap.Round
    )
}

// Helper: lerp between two floats
private fun lerp(a: Float, b: Float, t: Float) = a + (b - a) * t

// Helper: angle to offset from a pivot
private fun polar(pivot: Offset, length: Float, angleDeg: Float): Offset {
    val rad = Math.toRadians(angleDeg.toDouble())
    return Offset(
        pivot.x + length * cos(rad).toFloat(),
        pivot.y + length * sin(rad).toFloat()
    )
}

// ─── Push-Up ───────────────────────────────────────────────────────────────

private fun DrawScope.drawPushUp(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.72f
    val headR = w * 0.055f

    // Body height oscillates: high plank vs low
    val bodyY = lerp(floorY - w * 0.18f, floorY - w * 0.07f, t)

    val shoulderX = w * 0.42f
    val shoulderY = bodyY

    val hipX = w * 0.62f
    val hipY = bodyY

    val headCenter = Offset(shoulderX - headR * 1.4f, shoulderY - headR * 1.2f)

    // Arms angle changes with height
    val handY = floorY - 4f
    val handX = w * 0.28f
    val elbowY = lerp(shoulderY + w * 0.04f, shoulderY + w * 0.10f, t)
    val elbowX = lerp(shoulderX - w * 0.06f, shoulderX - w * 0.10f, t)

    drawFloor(floorY, color)

    // Body (torso line)
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    // Head
    drawHead(headCenter, headR, color)
    // Upper arm
    drawLine(Offset(shoulderX, shoulderY), Offset(elbowX, elbowY), color)
    // Forearm
    drawLine(Offset(elbowX, elbowY), Offset(handX, handY), color)
    // Other arm (symmetrical, mirrored slightly)
    val elbowX2 = lerp(shoulderX - w * 0.04f, shoulderX - w * 0.07f, t)
    val elbowY2 = lerp(shoulderY + w * 0.06f, shoulderY + w * 0.12f, t)
    drawLine(Offset(shoulderX, shoulderY), Offset(elbowX2, elbowY2), color.copy(alpha = 0.5f))
    drawLine(Offset(elbowX2, elbowY2), Offset(handX + w * 0.04f, handY), color.copy(alpha = 0.5f))

    // Legs straight
    val kneeX = lerp(hipX + w * 0.06f, hipX + w * 0.07f, t)
    val kneeY = lerp(hipY + w * 0.12f, hipY + w * 0.10f, t)
    val footX = kneeX + w * 0.06f
    val footY = floorY - 4f
    drawLine(Offset(hipX, hipY), Offset(kneeX, kneeY), color)
    drawLine(Offset(kneeX, kneeY), Offset(footX, footY), color)
}

// ─── Squat ─────────────────────────────────────────────────────────────────

private fun DrawScope.drawSquat(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.80f
    val headR = w * 0.055f

    // Hip height: standing vs squatted
    val hipY = lerp(floorY - w * 0.36f, floorY - w * 0.18f, t)
    val hipX = w * 0.50f

    val torsoLen = w * 0.20f
    val shoulderY = hipY - torsoLen
    val shoulderX = hipX

    val headCenter = Offset(shoulderX, shoulderY - headR * 1.3f)

    // Knee position changes
    val kneeOutward = lerp(0f, w * 0.08f, t)
    val kneeY = lerp(floorY - w * 0.20f, floorY - w * 0.06f, t)
    val kneeXL = hipX - w * 0.10f - kneeOutward
    val kneeXR = hipX + w * 0.10f + kneeOutward

    val footXL = kneeXL - w * 0.02f
    val footXR = kneeXR + w * 0.02f

    // Arms: outstretched forward when squatting
    val armAngle = lerp(-30f, 0f, t)
    val armLen = w * 0.16f
    val elbowL = polar(Offset(shoulderX - w * 0.04f, shoulderY + w * 0.04f), armLen * 0.5f, 180f + armAngle)
    val handL = polar(elbowL, armLen * 0.5f, 175f + armAngle)
    val elbowR = polar(Offset(shoulderX + w * 0.04f, shoulderY + w * 0.04f), armLen * 0.5f, 0f - armAngle)
    val handR = polar(elbowR, armLen * 0.5f, -5f - armAngle)

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    // Torso
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    // Arms
    drawLine(Offset(shoulderX - w * 0.04f, shoulderY + w * 0.04f), elbowL, color)
    drawLine(elbowL, handL, color)
    drawLine(Offset(shoulderX + w * 0.04f, shoulderY + w * 0.04f), elbowR, color)
    drawLine(elbowR, handR, color)
    // Legs
    drawLine(Offset(hipX, hipY), Offset(kneeXL, kneeY), color)
    drawLine(Offset(kneeXL, kneeY), Offset(footXL, floorY), color)
    drawLine(Offset(hipX, hipY), Offset(kneeXR, kneeY), color)
    drawLine(Offset(kneeXR, kneeY), Offset(footXR, floorY), color)
}

// ─── Lunge ─────────────────────────────────────────────────────────────────

private fun DrawScope.drawLunge(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.80f
    val headR = w * 0.055f

    val hipY = lerp(floorY - w * 0.40f, floorY - w * 0.22f, t)
    val hipX = w * 0.50f
    val torsoLen = w * 0.22f
    val shoulderX = hipX + lerp(0f, w * 0.02f, t)
    val shoulderY = hipY - torsoLen
    val headCenter = Offset(shoulderX, shoulderY - headR * 1.3f)

    // Front leg
    val frontKneeX = hipX + lerp(w * 0.08f, w * 0.14f, t)
    val frontKneeY = lerp(floorY - w * 0.16f, floorY - w * 0.04f, t)
    val frontFootX = frontKneeX + w * 0.04f

    // Back leg
    val backKneeX = hipX - lerp(w * 0.06f, w * 0.12f, t)
    val backKneeY = lerp(floorY - w * 0.20f, floorY - w * 0.04f, t)
    val backFootX = backKneeX - w * 0.02f

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    // Arms natural hang
    drawLine(Offset(shoulderX - w * 0.05f, shoulderY), Offset(shoulderX - w * 0.08f, shoulderY + w * 0.16f), color)
    drawLine(Offset(shoulderX + w * 0.05f, shoulderY), Offset(shoulderX + w * 0.08f, shoulderY + w * 0.16f), color)
    // Front leg
    drawLine(Offset(hipX, hipY), Offset(frontKneeX, frontKneeY), color)
    drawLine(Offset(frontKneeX, frontKneeY), Offset(frontFootX, floorY), color)
    // Back leg
    drawLine(Offset(hipX, hipY), Offset(backKneeX, backKneeY), color)
    drawLine(Offset(backKneeX, backKneeY), Offset(backFootX, floorY), color)
}

// ─── Jumping Jack ──────────────────────────────────────────────────────────

private fun DrawScope.drawJumpingJack(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val cx = w * 0.50f
    val floorY = h * 0.80f
    val headR = w * 0.055f

    val headY = h * 0.20f
    val shoulderY = headY + headR * 2.2f
    val hipY = shoulderY + w * 0.22f

    // Arms: down vs overhead
    val armAngle = lerp(80f, 30f, t)  // angle from vertical
    val armLen = w * 0.20f
    val handL = polar(Offset(cx - w * 0.04f, shoulderY), armLen, 180f + armAngle)
    val handR = polar(Offset(cx + w * 0.04f, shoulderY), armLen, -armAngle)

    // Legs: together vs spread
    val legSpread = lerp(0f, w * 0.14f, t)
    val kneeYBase = hipY + w * 0.16f
    val footY = floorY

    drawFloor(floorY, color)
    drawHead(Offset(cx, headY), headR, color)
    drawLine(Offset(cx, shoulderY), Offset(cx, hipY), color)
    // Arms
    drawLine(Offset(cx - w * 0.04f, shoulderY), handL, color)
    drawLine(Offset(cx + w * 0.04f, shoulderY), handR, color)
    // Legs
    drawLine(Offset(cx, hipY), Offset(cx - legSpread, kneeYBase), color)
    drawLine(Offset(cx - legSpread, kneeYBase), Offset(cx - legSpread - w * 0.02f, footY), color)
    drawLine(Offset(cx, hipY), Offset(cx + legSpread, kneeYBase), color)
    drawLine(Offset(cx + legSpread, kneeYBase), Offset(cx + legSpread + w * 0.02f, footY), color)
}

// ─── Plank ─────────────────────────────────────────────────────────────────

private fun DrawScope.drawPlank(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.68f
    val headR = w * 0.050f

    // Slight sway: hips raise very slightly
    val hipY = lerp(floorY - w * 0.08f, floorY - w * 0.10f, t)
    val hipX = w * 0.58f
    val shoulderX = w * 0.38f
    val shoulderY = hipY

    val headCenter = Offset(shoulderX - headR * 1.5f, shoulderY - headR * 0.8f)

    // Elbow on floor
    val elbowX = shoulderX - w * 0.06f
    val elbowY = floorY - 4f
    val forearmX = elbowX - w * 0.08f

    // Feet
    val footX = hipX + w * 0.12f
    val footY = floorY - 4f

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    // Upper arm
    drawLine(Offset(shoulderX, shoulderY), Offset(elbowX, elbowY), color)
    // Forearm on floor
    drawLine(Offset(elbowX, elbowY), Offset(forearmX, elbowY), color)
    // Leg straight to feet
    val kneeX = lerp(hipX + w * 0.05f, hipX + w * 0.06f, t)
    val kneeY = lerp(hipY + w * 0.07f, hipY + w * 0.06f, t)
    drawLine(Offset(hipX, hipY), Offset(kneeX, kneeY), color)
    drawLine(Offset(kneeX, kneeY), Offset(footX, footY), color)
}

// ─── Crunch ────────────────────────────────────────────────────────────────

private fun DrawScope.drawCrunch(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.72f
    val headR = w * 0.055f

    val cx = w * 0.50f

    // Lower body fixed on floor
    val hipX = cx
    val hipY = floorY - w * 0.04f
    val kneeX = cx + w * 0.12f
    val kneeY = floorY - w * 0.14f
    val footX = cx + w * 0.22f
    val footY = floorY

    // Torso curls up
    val torsoAngle = lerp(-70f, -40f, t) // degrees from horizontal
    val torsoLen = w * 0.22f
    val shoulderPos = polar(Offset(hipX, hipY), torsoLen, torsoAngle)

    val headCenter = polar(shoulderPos, headR * 2f, torsoAngle - 10f)

    // Hands behind head
    val handL = polar(headCenter, headR * 1.8f, torsoAngle + 100f)
    val handR = polar(headCenter, headR * 1.8f, torsoAngle + 80f)

    drawFloor(floorY, color)
    // Lower body
    drawLine(Offset(hipX, hipY), Offset(kneeX, kneeY), color)
    drawLine(Offset(kneeX, kneeY), Offset(footX, footY), color)
    // Torso
    drawLine(Offset(hipX, hipY), shoulderPos, color)
    // Head
    drawHead(headCenter, headR, color)
    // Arms
    drawLine(shoulderPos, handL, color)
    drawLine(shoulderPos, handR, color)
}

// ─── Mountain Climber ──────────────────────────────────────────────────────

private fun DrawScope.drawMountainClimber(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.72f
    val headR = w * 0.050f

    val shoulderX = w * 0.35f
    val shoulderY = floorY - w * 0.20f
    val hipX = w * 0.58f
    val hipY = shoulderY + w * 0.02f
    val headCenter = Offset(shoulderX - headR * 1.5f, shoulderY - headR * 1.0f)

    // Arms: straight to floor
    val handX = shoulderX - w * 0.04f
    val handY = floorY - 4f
    drawLine(Offset(shoulderX, shoulderY), Offset(handX, handY), color)

    // Alternating driving knee
    val driveKneeX = lerp(hipX - w * 0.04f, hipX - w * 0.18f, t)
    val driveKneeY = lerp(hipY + w * 0.14f, hipY + w * 0.04f, t)
    val driveFootX = lerp(hipX + w * 0.04f, hipX - w * 0.06f, t)
    val driveFootY = lerp(floorY, floorY - w * 0.02f, t)

    val backKneeX = lerp(hipX + w * 0.10f, hipX + w * 0.14f, t)
    val backKneeY = hipY + w * 0.14f
    val backFootX = backKneeX + w * 0.08f

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    // Driving leg
    drawLine(Offset(hipX, hipY), Offset(driveKneeX, driveKneeY), color)
    drawLine(Offset(driveKneeX, driveKneeY), Offset(driveFootX, driveFootY), color)
    // Back leg
    drawLine(Offset(hipX, hipY), Offset(backKneeX, backKneeY), color)
    drawLine(Offset(backKneeX, backKneeY), Offset(backFootX, floorY - 4f), color)
}

// ─── Burpee ────────────────────────────────────────────────────────────────

private fun DrawScope.drawBurpee(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.80f
    val headR = w * 0.055f
    val cx = w * 0.50f

    // Phase: 0-0.4 = standing → jump, 0.4-0.6 = plank, 0.6-1 = jump up
    val phase = when {
        t < 0.4f -> t / 0.4f
        t < 0.6f -> -1f  // plank
        else -> (t - 0.6f) / 0.4f
    }

    if (phase == -1f) {
        // Draw plank pose
        val bodyY = floorY - w * 0.08f
        val shoulderX = cx - w * 0.12f
        drawFloor(floorY, color)
        drawHead(Offset(shoulderX - headR * 1.5f, bodyY - headR), headR, color)
        drawLine(Offset(shoulderX, bodyY), Offset(cx + w * 0.12f, bodyY), color)
        drawLine(Offset(shoulderX, bodyY), Offset(shoulderX - w * 0.04f, floorY - 4f), color)
        drawLine(Offset(cx + w * 0.12f, bodyY), Offset(cx + w * 0.18f, floorY - 4f), color)
    } else {
        // Standing / jumping
        val jumpY = if (phase > 0.5f) lerp(0f, -w * 0.08f, (phase - 0.5f) * 2f) else lerp(-w * 0.08f, 0f, phase * 2f)
        val headY = h * 0.18f + jumpY
        val shoulderY = headY + headR * 2.2f
        val hipY = shoulderY + w * 0.22f

        val armRaise = if (phase > 0.5f) lerp(0f, -w * 0.20f, (phase - 0.5f) * 2f) else w * 0.0f
        val handLY = shoulderY + armRaise
        val handRY = shoulderY + armRaise

        drawFloor(floorY + jumpY * 0.1f, color)
        drawHead(Offset(cx, headY), headR, color)
        drawLine(Offset(cx, shoulderY), Offset(cx, hipY), color)
        drawLine(Offset(cx, shoulderY), Offset(cx - w * 0.16f, handLY), color)
        drawLine(Offset(cx, shoulderY), Offset(cx + w * 0.16f, handRY), color)
        drawLine(Offset(cx, hipY), Offset(cx - w * 0.07f, floorY + jumpY * 0.3f), color)
        drawLine(Offset(cx, hipY), Offset(cx + w * 0.07f, floorY + jumpY * 0.3f), color)
    }
}

// ─── High Knees ────────────────────────────────────────────────────────────

private fun DrawScope.drawHighKnees(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.82f
    val headR = w * 0.055f
    val cx = w * 0.50f

    val headY = h * 0.18f
    val shoulderY = headY + headR * 2.2f
    val hipY = shoulderY + w * 0.22f

    // Alternating knees
    val leftKneeUp = lerp(floorY - w * 0.10f, hipY + w * 0.02f, t)
    val rightKneeDown = lerp(hipY + w * 0.04f, floorY - w * 0.10f, t)
    val leftFootY = lerp(floorY, hipY + w * 0.18f, t)
    val rightFootY = lerp(hipY + w * 0.18f, floorY, t)

    // Arms swing opposite
    val armSwing = lerp(-w * 0.08f, w * 0.08f, t)

    drawFloor(floorY, color)
    drawHead(Offset(cx, headY), headR, color)
    drawLine(Offset(cx, shoulderY), Offset(cx, hipY), color)
    // Arms
    drawLine(Offset(cx - w * 0.04f, shoulderY), Offset(cx - w * 0.12f - armSwing, shoulderY + w * 0.14f), color)
    drawLine(Offset(cx + w * 0.04f, shoulderY), Offset(cx + w * 0.12f + armSwing, shoulderY + w * 0.14f), color)
    // Left leg (knee up)
    drawLine(Offset(cx, hipY), Offset(cx - w * 0.06f, leftKneeUp), color)
    drawLine(Offset(cx - w * 0.06f, leftKneeUp), Offset(cx - w * 0.04f, leftFootY), color)
    // Right leg
    drawLine(Offset(cx, hipY), Offset(cx + w * 0.06f, rightKneeDown), color)
    drawLine(Offset(cx + w * 0.06f, rightKneeDown), Offset(cx + w * 0.08f, rightFootY), color)
}

// ─── Tricep Dip ────────────────────────────────────────────────────────────

private fun DrawScope.drawTricepDip(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.80f
    val headR = w * 0.055f
    val cx = w * 0.50f

    // Chair/bench
    val benchY = floorY - w * 0.18f
    val benchLeft = cx - w * 0.20f
    val benchRight = cx + w * 0.20f
    drawLine(Offset(benchLeft, benchY), Offset(benchRight, benchY), Color.Gray, 6f)
    drawLine(Offset(benchLeft, benchY), Offset(benchLeft, floorY), Color.Gray, 6f)
    drawLine(Offset(benchRight, benchY), Offset(benchRight, floorY), Color.Gray, 6f)

    val hipY = lerp(benchY + w * 0.04f, benchY + w * 0.16f, t)
    val hipX = cx
    val torsoLen = w * 0.22f
    val shoulderY = hipY - torsoLen
    val shoulderX = hipX
    val headCenter = Offset(shoulderX, shoulderY - headR * 1.3f)

    // Arms bent on bench
    val handY = benchY - 4f
    val handXL = benchLeft + w * 0.04f
    val handXR = benchRight - w * 0.04f
    val elbowY = lerp(hipY - w * 0.06f, hipY - w * 0.14f, t)

    // Legs extended
    val kneeX = cx + w * 0.14f
    val kneeY = hipY + w * 0.10f
    val footX = cx + w * 0.24f

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    drawLine(Offset(shoulderX, shoulderY), Offset(hipX, hipY), color)
    drawLine(Offset(shoulderX, shoulderY), Offset(elbowY, shoulderY - w * 0.04f), color.copy(alpha = 0f))
    // Left arm
    drawLine(Offset(shoulderX - w * 0.06f, shoulderY + w * 0.04f), Offset(handXL, elbowY), color)
    drawLine(Offset(handXL, elbowY), Offset(handXL, handY), color)
    // Right arm
    drawLine(Offset(shoulderX + w * 0.06f, shoulderY + w * 0.04f), Offset(handXR, elbowY), color)
    drawLine(Offset(handXR, elbowY), Offset(handXR, handY), color)
    // Legs
    drawLine(Offset(hipX, hipY), Offset(kneeX, kneeY), color)
    drawLine(Offset(kneeX, kneeY), Offset(footX, hipY + w * 0.12f), color)
}

// ─── Deadlift ──────────────────────────────────────────────────────────────

private fun DrawScope.drawDeadlift(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.80f
    val headR = w * 0.055f
    val cx = w * 0.50f

    // Hinge angle: t=0 is standing, t=1 is hinged
    val hipX = cx
    val hipY = lerp(floorY - w * 0.36f, floorY - w * 0.18f, t)
    val torsoAngle = lerp(-90f, -50f, t) // angle from horizontal (vertical = -90)
    val torsoLen = w * 0.24f

    val shoulderPos = polar(Offset(hipX, hipY), torsoLen, torsoAngle)
    val headCenter = polar(shoulderPos, headR * 1.5f, torsoAngle)

    // Legs stay mostly straight
    val kneeY = floorY - w * 0.16f
    val footXL = cx - w * 0.08f
    val footXR = cx + w * 0.08f

    // Arms hang down
    val handY = lerp(hipY + w * 0.14f, floorY - w * 0.04f, t)
    val handXL = cx - w * 0.12f
    val handXR = cx + w * 0.12f

    drawFloor(floorY, color)
    drawHead(headCenter, headR, color)
    drawLine(shoulderPos, Offset(hipX, hipY), color)
    // Arms
    drawLine(shoulderPos, Offset(handXL, handY), color)
    drawLine(shoulderPos, Offset(handXR, handY), color)
    // Legs
    drawLine(Offset(hipX, hipY), Offset(footXL - w * 0.02f, kneeY), color)
    drawLine(Offset(footXL - w * 0.02f, kneeY), Offset(footXL, floorY), color)
    drawLine(Offset(hipX, hipY), Offset(footXR + w * 0.02f, kneeY), color)
    drawLine(Offset(footXR + w * 0.02f, kneeY), Offset(footXR, floorY), color)
}

// ─── Shoulder Press ────────────────────────────────────────────────────────

private fun DrawScope.drawShoulderPress(t: Float, color: Color) {
    val w = size.width
    val h = size.height
    val floorY = h * 0.82f
    val headR = w * 0.055f
    val cx = w * 0.50f

    val headY = h * 0.20f
    val shoulderY = headY + headR * 2.2f
    val hipY = shoulderY + w * 0.22f

    // Arms: from shoulder height up to full extension
    val armExtend = lerp(0f, 1f, t)
    val elbowY = lerp(shoulderY + w * 0.06f, shoulderY - w * 0.04f, armExtend)
    val handY = lerp(shoulderY - w * 0.02f, shoulderY - w * 0.22f, armExtend)

    drawFloor(floorY, color)
    drawHead(Offset(cx, headY), headR, color)
    drawLine(Offset(cx, shoulderY), Offset(cx, hipY), color)
    // Left arm
    drawLine(Offset(cx - w * 0.04f, shoulderY), Offset(cx - w * 0.14f, elbowY), color)
    drawLine(Offset(cx - w * 0.14f, elbowY), Offset(cx - w * 0.12f, handY), color)
    // Right arm
    drawLine(Offset(cx + w * 0.04f, shoulderY), Offset(cx + w * 0.14f, elbowY), color)
    drawLine(Offset(cx + w * 0.14f, elbowY), Offset(cx + w * 0.12f, handY), color)
    // Legs
    drawLine(Offset(cx, hipY), Offset(cx - w * 0.07f, floorY - w * 0.14f), color)
    drawLine(Offset(cx - w * 0.07f, floorY - w * 0.14f), Offset(cx - w * 0.09f, floorY), color)
    drawLine(Offset(cx, hipY), Offset(cx + w * 0.07f, floorY - w * 0.14f), color)
    drawLine(Offset(cx + w * 0.07f, floorY - w * 0.14f), Offset(cx + w * 0.09f, floorY), color)
}
