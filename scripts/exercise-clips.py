"""Builds the exercise tutorial clips for the crew twin and exports them.

Run inside Blender with CrewRig present (from assets/crew-body.blend):

    exec(open("scripts/exercise-clips.py").read())

Each exercise becomes one looping action on the rig, stashed on its own NLA
track, and the armature alone (no mesh) is exported to
public/twin/crew-exercises.glb. The app plays those clips on the twin's own
skeleton, so the file only carries a few kilobytes of keyframes.
"""

import math
import os

import bpy
from mathutils import Quaternion, Vector

ROOT = "/Volumes/Eduardo/Code/my-github/cheeseOS"
OUT = os.path.join(ROOT, "public/twin/crew-exercises.glb")
FPS = 24

rig = bpy.data.objects["CrewRig"]
bones = rig.pose.bones
REST = {b.name: b.bone.matrix_local.to_3x3() for b in bones}
ANKLE_REST = {s: rig.data.bones[f"foot.{s}"].head_local.copy() for s in "LR"}

# The twin faces -Y; +X is its left. Axes below are in armature space.
LATERAL = Vector((1, 0, 0))
FRONT_BACK = Vector((0, 1, 0))


def local(bone, axis, degrees):
    """Rotation about an armature-space axis, expressed in the bone's own rest frame."""
    r = REST[bone]
    return (r.inverted() @ Quaternion(axis, math.radians(degrees)).to_matrix() @ r).to_quaternion()


def sag(bone, degrees):
    """Swing in the sagittal plane: positive moves the bone's far end forward."""
    return local(bone, LATERAL, -degrees)


def out(bone, degrees):
    """Swing in the frontal plane: positive lifts a limb away from the body, on either side."""
    side = -1 if bone.endswith(".L") else 1
    return local(bone, FRONT_BACK, side * degrees)


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def rep(t):
    """0 at rest, 1 at the working position: move, short hold, return, short hold."""
    if t < 0.4:
        return ease(t / 0.4)
    if t < 0.5:
        return 1.0
    if t < 0.9:
        return 1 - ease((t - 0.5) / 0.4)
    return 0.0


ARMS_DOWN = 12  # The rig rests in an A-pose; bring the arms closer to the body.


def arms_at_sides(pose):
    for s in "LR":
        pose[f"upper_arm.{s}"] = out(f"upper_arm.{s}", -ARMS_DOWN)


def squat(t):
    u = rep(t)
    pose = {"hips": sag("hips", -35 * u), "spine": sag("spine", -4 * u), "neck": sag("neck", 22 * u)}
    for s in "LR":
        pose[f"thigh.{s}"] = sag(f"thigh.{s}", 108 * u) @ out(f"thigh.{s}", 6 * u)
        pose[f"shin.{s}"] = sag(f"shin.{s}", -103 * u)
        pose[f"foot.{s}"] = sag(f"foot.{s}", 30 * u)
        # Arms reach forward as a counterweight.
        pose[f"upper_arm.{s}"] = sag(f"upper_arm.{s}", 110 * u) @ out(f"upper_arm.{s}", -ARMS_DOWN - 10 * u)
    return pose, "LR"


def deadlift(t):
    u = rep(t)
    pose = {"hips": sag("hips", -68 * u), "neck": sag("neck", 30 * u)}
    for s in "LR":
        pose[f"thigh.{s}"] = sag(f"thigh.{s}", 80 * u)
        pose[f"shin.{s}"] = sag(f"shin.{s}", -22 * u)
        pose[f"foot.{s}"] = sag(f"foot.{s}", 10 * u)
        # Arms hang straight down, as if holding the bar.
        pose[f"upper_arm.{s}"] = sag(f"upper_arm.{s}", 66 * u) @ out(f"upper_arm.{s}", -ARMS_DOWN)
    return pose, "LR"


def lunge(t):
    # Two repetitions per loop: the left leg stays in front first, then the right.
    front, back = ("L", "R") if t < 0.5 else ("R", "L")
    u = rep((t * 2) % 1)
    pose = {"hips": sag("hips", -6 * u)}
    arms_at_sides(pose)
    pose[f"thigh.{front}"] = sag(f"thigh.{front}", 86 * u)
    pose[f"shin.{front}"] = sag(f"shin.{front}", -84 * u)
    pose[f"foot.{front}"] = sag(f"foot.{front}", 4 * u)
    pose[f"thigh.{back}"] = sag(f"thigh.{back}", -25 * u)
    pose[f"shin.{back}"] = sag(f"shin.{back}", -60 * u)
    pose[f"foot.{back}"] = sag(f"foot.{back}", 30 * u)
    return pose, front


def press(t):
    u = rep(t)
    pose = {}
    for s in "LR":
        # From "goalposts" (elbows at shoulder height, forearms up) to arms straight overhead.
        pose[f"shoulder.{s}"] = out(f"shoulder.{s}", 18 * u)
        pose[f"upper_arm.{s}"] = out(f"upper_arm.{s}", 62 + 70 * u)
        pose[f"forearm.{s}"] = out(f"forearm.{s}", 92 * (1 - u))
    return pose, "LR"


def curl(t):
    u = rep(t)
    pose = {}
    arms_at_sides(pose)
    for s in "LR":
        pose[f"forearm.{s}"] = sag(f"forearm.{s}", 135 * u)
    return pose, "LR"


def high_knees(t):
    # One step per half loop, the opposite arm swinging forward.
    up, down = ("L", "R") if t < 0.5 else ("R", "L")
    u = math.sin(math.pi * ((t * 2) % 1)) ** 2
    pose = {}
    pose[f"thigh.{up}"] = sag(f"thigh.{up}", 82 * u)
    pose[f"shin.{up}"] = sag(f"shin.{up}", -88 * u)
    for s, swing in ((up, -1), (down, 1)):
        pose[f"upper_arm.{s}"] = sag(f"upper_arm.{s}", swing * 32 * u) @ out(f"upper_arm.{s}", -ARMS_DOWN)
        pose[f"forearm.{s}"] = sag(f"forearm.{s}", 55 + 30 * u)
    return pose, down


# name -> (pose function, loop length in seconds)
CLIPS = {
    "squat": (squat, 3.2),
    "deadlift": (deadlift, 3.2),
    "lunge": (lunge, 5.6),
    "press": (press, 2.8),
    "curl": (curl, 2.6),
    "highKnees": (high_knees, 1.1),
}


def apply(pose, planted):
    for b in bones:
        b.rotation_mode = "QUATERNION"
        b.rotation_quaternion = pose.get(b.name, Quaternion())
        b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    # Keep the planted feet where they stand: move the hips by whatever the legs gave away.
    drift = Vector()
    for s in planted:
        drift += bones[f"foot.{s}"].head - ANKLE_REST[s]
    drift /= len(planted)
    drift.x = 0
    bones["hips"].location = REST["hips"].inverted() @ -drift
    bpy.context.view_layer.update()


def build():
    rig.animation_data_create()
    for track in list(rig.animation_data.nla_tracks):
        if track.name in CLIPS:
            rig.animation_data.nla_tracks.remove(track)
    for name, (fn, seconds) in CLIPS.items():
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new(name)
        rig.animation_data.action = action
        frames = round(seconds * FPS)
        for f in range(frames + 1):
            pose, planted = fn((f % frames) / frames)
            apply(pose, planted)
            for b in bones:
                b.keyframe_insert("rotation_quaternion", frame=f)
            bones["hips"].keyframe_insert("location", frame=f)
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, action)
        track.mute = True
    for b in bones:
        b.rotation_quaternion = Quaternion()
        b.location = (0, 0, 0)


def export():
    for o in bpy.context.selected_objects:
        o.select_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    for track in rig.animation_data.nla_tracks:
        track.mute = track.name not in CLIPS
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_skins=False,
        export_morph=False,
        export_yup=True,
    )
    for track in rig.animation_data.nla_tracks:
        track.mute = True


def preview(name, t):
    """Pose the rig at phase `t` (0..1) of a clip, for a look in the viewport."""
    fn, _ = CLIPS[name]
    apply(*fn(t))
