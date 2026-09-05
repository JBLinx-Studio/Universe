using UnityEngine;
using CW.Common;

namespace SpaceGraphicsToolkit
{
    /// --- SUMMARY ---
    /// SgtCameraMove
    /// Rewritten to:
    /// - Add dual-mode scroll (fine + coarse with Shift) � Option C.
    /// - Smooth warp multiplier (target/current) to avoid jumps.
    /// - Realistic warp audio: log-mapped pitch, smoothed pitch & volume, plays only while moving and above threshold.
    /// - Preset system (editable), cycle key (V default), inspector preset buttons.
    /// - Keeps all original serialized fields and behavior.
    /// --- END SUMMARY ---
    [HelpURL(SgtCommon.HelpUrlPrefix + "SgtCameraMove")]
    [AddComponentMenu(SgtCommon.ComponentMenuPrefix + "Camera Move")]
    public class SgtCameraMove : MonoBehaviour
    {
        public enum RotationType { None, Acceleration, MainCamera }

        // --- ORIGINAL FIELDS (unchanged semantics, visible in inspector) --- //

        /// <summary>Is this component currently listening for inputs?</summary>
        public bool Listen { set { listen = value; } get { return listen; } }
        [SerializeField] private bool listen = true;

        /// <summary>How quickly the position goes to the target value (-1 = instant).</summary>
        public float Damping { set { damping = value; } get { return damping; } }
        [SerializeField] private float damping = 10.0f;

        /// <summary>If you want movements to apply to Rigidbody.velocity, set it here.</summary>
        public Rigidbody Target { set { target = value; } get { return target; } }
        [SerializeField] private Rigidbody target;

        /// <summary>If the target is something like a spaceship, rotate it based on movement?</summary>
        public RotationType TargetRotation { set { targetRotation = value; } get { return targetRotation; } }
        [SerializeField] private RotationType targetRotation;

        /// <summary>The speed of the velocity rotation.</summary>
        public float TargetDamping { set { targetDamping = value; } get { return targetDamping; } }
        [SerializeField] private float targetDamping = 1.0f;

        /// <summary>The movement speed will be multiplied by this when near to planets.</summary>
        public float SpeedMin { set { speedMin = value; } get { return speedMin; } }
        [SerializeField] private float speedMin = 1.0f;

        /// <summary>The movement speed will be multiplied by this when far from planets.</summary>
        public float SpeedMax { set { speedMax = value; } get { return speedMax; } }
        [SerializeField] private float speedMax = 10.0f;

        /// <summary>The higher you set this, the faster the <b>SpeedMin</b> value will be reached when approaching planets.</summary>
        public float SpeedRange { set { speedRange = value; } get { return speedRange; } }
        [SerializeField] private float speedRange = 100.0f;

        /// <summary></summary>
        public float SpeedWheel { set { speedWheel = value; } get { return speedWheel; } }
        [SerializeField] [Range(0.0f, 0.5f)] private float speedWheel = 0.1f;

        /// <summary>The keys/fingers required to move left/right.</summary>
        public CwInputManager.Axis HorizontalControls { set { horizontalControls = value; } get { return horizontalControls; } }
        [SerializeField] private CwInputManager.Axis horizontalControls = new CwInputManager.Axis(2, false, CwInputManager.AxisGesture.HorizontalDrag, 1.0f, KeyCode.A, KeyCode.D, KeyCode.LeftArrow, KeyCode.RightArrow, 100.0f);

        /// <summary>The keys/fingers required to move backward/forward.</summary>
        public CwInputManager.Axis DepthControls { set { depthControls = value; } get { return depthControls; } }
        [SerializeField] private CwInputManager.Axis depthControls = new CwInputManager.Axis(2, false, CwInputManager.AxisGesture.HorizontalDrag, 1.0f, KeyCode.S, KeyCode.W, KeyCode.DownArrow, KeyCode.UpArrow, 100.0f);

        /// <summary>The keys/fingers required to move down/up.</summary>
        public CwInputManager.Axis VerticalControls { set { verticalControls = value; } get { return verticalControls; } }
        [SerializeField] private CwInputManager.Axis verticalControls = new CwInputManager.Axis(3, false, CwInputManager.AxisGesture.HorizontalDrag, 1.0f, KeyCode.F, KeyCode.R, KeyCode.None, KeyCode.None, 100.0f);

        // --- Internal runtime fields --- //
        [System.NonSerialized] private Vector3 remainingDelta;
        [System.NonSerialized] private Vector3 lastFixedDelta;

        // --- WARP / PRESET FIELDS (public for editor access) --- //
        [Header("Warp / Preset Settings")]
        [Tooltip("Multiplier applied on top of the distance-based base speed.")]
        [SerializeField] public float warpMultiplier = 1e6f; // target multiplier used for presets & wheel modifications

        [Tooltip("Minimum allowed warp multiplier (mouse wheel and presets are clamped to this).")]
        [SerializeField] public float warpMin = 10f;

        [Tooltip("Maximum allowed warp multiplier (mouse wheel and presets are clamped to this).")]
        [SerializeField] public float warpMax = 1e18f;

        [Tooltip("Multiplicative base used for fine scroll (e.g. 1.05 => ~5% per tick).")]
        [SerializeField] public float fineStep = 1.05f;

        [Tooltip("Multiplicative base used for coarse scroll when Shift is held (e.g. 10 => decade jumps).")]
        [SerializeField] public float coarseStep = 10f;

        [Tooltip("Smooth time (seconds) to lerp current warp multiplier to target. Small values = snappy.")]
        [SerializeField] public float warpSmoothTime = 0.2f;

        [Tooltip("Key used to cycle presets (runtime).")]
        [SerializeField] public KeyCode cycleKey = KeyCode.V;

        [Tooltip("Editable presets. Add, remove or edit any number of presets.")]
        [SerializeField] public float[] speedPresets = new float[] { 1e6f, 1e9f, 1e18f };

        [Tooltip("Index of the currently selected preset.")]
        [SerializeField] public int presetIndex = 0;

        [Tooltip("Optional AudioSource to play warp sound. Pitch is mapped (log) to warpMultiplier. Set to 2D/Looping clip.")]
        [SerializeField] public AudioSource warpAudio;

        [Tooltip("Pitch at warpMin.")]
        [SerializeField] public float warpPitchMin = 0.5f;

        [Tooltip("Pitch at warpMax.")]
        [SerializeField] public float warpPitchMax = 3.0f;

        [Tooltip("Minimum volume when sound is playing.")]
        [SerializeField] [Range(0f, 1f)] public float warpVolumeMin = 0.05f;

        [Tooltip("Maximum volume when sound is playing.")]
        [SerializeField] [Range(0f, 1f)] public float warpVolumeMax = 1.0f;

        [Tooltip("Threshold effective speed above which the warp audio may play (set to warpMin to play at all warps).")]
        [SerializeField] public float warpAudioPlayThreshold = 10f;

        [Tooltip("Minimum input magnitude required to consider the camera 'moving' for audio playback.")]
        [SerializeField] public float inputMoveThreshold = 0.01f;

        [Tooltip("How quickly audio pitch & volume interpolate (higher = faster smoothing).")]
        [SerializeField] public float audioSmoothSpeed = 8.0f;

        [Header("Overdrive Settings")]
        [SerializeField] public float overdriveThreshold = 1e12f; // speed above which overdrive activates
        [SerializeField] public float overdrivePitchMultiplier = 1.5f; // multiplies pitch in overdrive
        [SerializeField] public float overdriveSmoothSpeed = 4f; // smoothing for returning from overdrive

        // runtime smoothing helpers
        private float currentWarp = 1e6f;           // smoothed effective warp multiplier
        private float currentWarpVelocity = 0f;     // for SmoothDamp (if used)
        private float audioTargetPitch = 1f;
        private float audioTargetVolume = 0f;
        private float audioPitch = 1f;
        private float audioVolume = 0f;

        private float overdrivePitchTarget = 1f; // target pitch in overdrive mode

        // store last input magnitude to consider movement
        private float lastInputMagnitude = 0f;

        // --- PUBLIC HELPERS (used by editor buttons or runtime) --- //

        /// <summary>Cycle to the next preset (wraps around).</summary>
        public void CyclePreset()
        {
            if (speedPresets == null || speedPresets.Length == 0) return;
            presetIndex = (presetIndex + 1) % speedPresets.Length;
            warpMultiplier = Mathf.Clamp(speedPresets[presetIndex], warpMin, warpMax);
            // immediate apply to current warp target
        }

        /// <summary>Set preset by index (used by inspector buttons).</summary>
        public void SetPresetIndex(int i)
        {
            if (speedPresets == null || i < 0 || i >= speedPresets.Length) return;
            presetIndex = i;
            warpMultiplier = Mathf.Clamp(speedPresets[presetIndex], warpMin, warpMax);
        }

        /// <summary>Set warp multiplier directly (clamped).</summary>
        public void SetWarpMultiplier(float v)
        {
            warpMultiplier = Mathf.Clamp(v, warpMin, warpMax);
        }

        // --- CORE MOVEMENT --- //

        private Vector3 GetDelta(float deltaTime)
        {
            var delta = default(Vector3);
            delta.x = horizontalControls.GetValue(deltaTime);
            delta.y = verticalControls.GetValue(deltaTime);
            delta.z = depthControls.GetValue(deltaTime);
            return delta;
        }

        protected virtual void OnEnable()
        {
            CwInputManager.EnsureThisComponentExists();

            // clamp warp multiplier initially
            warpMultiplier = Mathf.Clamp(warpMultiplier, warpMin, warpMax);
            currentWarp = warpMultiplier;

            // prepare audio state
            if (warpAudio != null)
            {
                warpAudio.loop = true;
                // don't force play here; Update will handle playback if necessary
                audioPitch = warpAudio.pitch;
                audioVolume = warpAudio.volume;
            }

            // align preset index if matches
            if (speedPresets != null && speedPresets.Length > 0)
            {
                for (int i = 0; i < speedPresets.Length; i++)
                {
                    if (Mathf.Approximately(speedPresets[i], warpMultiplier))
                    {
                        presetIndex = i;
                        break;
                    }
                }
            }
        }

        protected virtual void Update()
        {
            lastFixedDelta = GetDelta(Time.fixedDeltaTime);

            // HANDLE SCROLL INPUT (dual-mode)
            if (CwInput.GetMouseExists() == true)
            {
                float wheel = CwInput.GetMouseWheelDelta(); // typically -1,0,1 but may be fractional on some devices
                if (Mathf.Abs(wheel) > 1e-6f)
                {
                    bool shift = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);

                    // Use pow so fractional wheel values behave predictably:
                    // fine: warpMultiplier *= Mathf.Pow(fineStep, wheel)
                    // coarse: warpMultiplier *= Mathf.Pow(coarseStep, wheel)
                    float baseStep = shift ? coarseStep : fineStep;

                    // Protect invalid steps
                    if (baseStep <= 0f) baseStep = shift ? 10f : 1.05f;

                    // Apply multiplicative change
                    warpMultiplier *= Mathf.Pow(baseStep, wheel);

                    // Clamp to min/max
                    warpMultiplier = Mathf.Clamp(warpMultiplier, warpMin, warpMax);

                    // update preset index when close to preset values
                    if (speedPresets != null && speedPresets.Length > 0)
                    {
                        for (int i = 0; i < speedPresets.Length; i++)
                        {
                            if (Mathf.Approximately(speedPresets[i], warpMultiplier))
                            {
                                presetIndex = i;
                                break;
                            }
                        }
                    }
                }
            }

            // cycle preset with key (runtime)
            if (Input.GetKeyDown(cycleKey))
            {
                CyclePreset();
            }

            // update smoothed warp value (so movement and audio don't pop)
            // SmoothDamp works well for percent-like smoothing. We remap to smoothTime.
            float smoothT = Mathf.Max(0.0001f, warpSmoothTime);
            // use SmoothDamp on log space to get multiplicative-smooth behavior across decades
            float logCurrent = Mathf.Log(Mathf.Max(1e-6f, currentWarp));
            float logTarget = Mathf.Log(Mathf.Max(1e-6f, warpMultiplier));
            // Smooth the logarithm
            float logSmoothed = Mathf.SmoothDamp(logCurrent, logTarget, ref currentWarpVelocity, smoothT, Mathf.Infinity, Time.deltaTime);
            currentWarp = Mathf.Exp(logSmoothed);

            // movement input magnitude (to detect "moving")
            var inputDelta = GetDelta(Time.deltaTime);
            lastInputMagnitude = inputDelta.magnitude;

            // preserve original movement behavior when no rigidbody target
            if (target == null && listen == true)
            {
                AddToDelta(inputDelta);
                DampenDelta();
            }

            // update audio targets & playback
            UpdateAudioTargets();
            ApplyAudioSmoothing();
        }

        protected virtual void FixedUpdate()
        {
            if (target != null && listen == true)
            {
                AddToDelta(lastFixedDelta);
                DampenDelta();
            }
        }

        /// <summary>
        /// Returns the original distance-based multiplier (keeps original semantics),
        /// then multiplies it by the smoothed currentWarp.
        /// </summary>
        private float GetSpeedMultiplier()
        {
            if (speedMax > 0.0f)
            {
                var distance = float.PositiveInfinity;
                SgtCommon.InvokeCalculateDistance(transform.position, ref distance);
                var distance01 = Mathf.InverseLerp(speedMin * speedRange, speedMax * speedRange, distance);
                var baseSpeed = Mathf.Lerp(speedMin, speedMax, distance01);

                // apply currentWarp (smoothed)
                double resultDouble = (double)baseSpeed * (double)currentWarp;
                float result = float.IsInfinity((float)resultDouble) || float.IsNaN((float)resultDouble) ? warpMax : (float)resultDouble;
                return Mathf.Clamp(result, 0f, warpMax);
            }

            return Mathf.Clamp(currentWarp, 0f, warpMax);
        }

        private void AddToDelta(Vector3 delta)
        {
            if (delta == Vector3.zero) return;

            // Store old position
            var oldPosition = transform.position;

            // Translate (same semantics as original) - note this uses currentWarp via GetSpeedMultiplier
            transform.Translate(delta * GetSpeedMultiplier(), Space.Self);

            // Add to remaining
            var acceleration = transform.position - oldPosition;
            remainingDelta += acceleration;

            // Revert position (original behavior)
            transform.position = oldPosition;

            // Rotate to acceleration?
            if (target != null && targetRotation != RotationType.None && delta != Vector3.zero)
            {
                var factor = CwHelper.DampenFactor(targetDamping, Time.deltaTime);
                var rotation = target.transform.rotation;

                switch (targetRotation)
                {
                    case RotationType.Acceleration:
                        {
                            rotation = Quaternion.LookRotation(acceleration, target.transform.up);
                        }
                        break;

                    case RotationType.MainCamera:
                        {
                            var camera = Camera.main;
                            if (camera != null)
                            {
                                rotation = camera.transform.rotation;
                            }
                        }
                        break;
                }

                target.transform.rotation = Quaternion.Slerp(target.transform.rotation, rotation, factor);
                target.angularVelocity = Vector3.Lerp(target.angularVelocity, Vector3.zero, factor);
            }
        }

        private void DampenDelta()
        {
            // Dampen remaining delta
            var factor = CwHelper.DampenFactor(damping, Time.deltaTime);
            var newDelta = Vector3.Lerp(remainingDelta, Vector3.zero, factor);

            // Translate by difference
            if (target != null)
            {
                target.linearVelocity += remainingDelta - newDelta;
            }
            else
            {
                transform.position += remainingDelta - newDelta;
            }

            // Update remaining
            remainingDelta = newDelta;
        }

        // --- AUDIO HELPERS --- //

        // Update audio target pitch & volume based on currentWarp (log scale), movement and threshold
        private void UpdateAudioTargets()
        {
            if (warpAudio == null) return;

            float effectiveSpeed = GetSpeedMultiplier();
            bool moving = lastInputMagnitude >= inputMoveThreshold;
            bool aboveThreshold = effectiveSpeed >= warpAudioPlayThreshold;

            if (moving && aboveThreshold)
            {
                // Map currentWarp onto [0,1] using log scale
                float safeMin = Mathf.Max(warpMin, 1e-6f);
                float safeMax = Mathf.Max(warpMax, safeMin * 1.0001f);
                float logMin = Mathf.Log10(safeMin);
                float logMax = Mathf.Log10(safeMax);
                float logVal = Mathf.Log10(Mathf.Clamp(currentWarp, safeMin, safeMax));
                float t = Mathf.InverseLerp(logMin, logMax, logVal);
                t = Mathf.Clamp01(t);

                audioTargetPitch = Mathf.Lerp(warpPitchMin, warpPitchMax, t);
                audioTargetVolume = Mathf.Lerp(warpVolumeMin, warpVolumeMax, t);

                // --- Overdrive logic ---
                if (currentWarp > overdriveThreshold)
                {
                    overdrivePitchTarget = audioTargetPitch * overdrivePitchMultiplier;
                }
                else
                {
                    // Smoothly return to normal pitch
                    overdrivePitchTarget = Mathf.Lerp(overdrivePitchTarget, audioTargetPitch, overdriveSmoothSpeed * Time.deltaTime);
                }
            }
            else
            {
                // Fade out when not moving or below threshold
                audioTargetPitch = Mathf.Lerp(warpPitchMin, warpPitchMax, 0f);
                audioTargetVolume = 0f;
                overdrivePitchTarget = Mathf.Lerp(overdrivePitchTarget, audioTargetPitch, overdriveSmoothSpeed * Time.deltaTime);
            }

            // Ensure audio is playing if target volume > 0
            if (audioTargetVolume > 0f && !warpAudio.isPlaying)
            {
                warpAudio.loop = true;
                warpAudio.Play();
            }
        }

        // --- AUDIO SMOOTHING --- //
        // Smooth pitch & volume toward targets; stop audio when volume goes to zero
        private void ApplyAudioSmoothing()
        {
            if (warpAudio == null) return;

            // Exponential smoothing factor (frame-rate independent)
            float lerpFactor = 1f - Mathf.Exp(-audioSmoothSpeed * Time.deltaTime);

            // Optional: slight overdrive volume boost
            float targetVolume = audioTargetVolume;
            if (currentWarp > overdriveThreshold)
            {
                targetVolume = Mathf.Min(audioTargetVolume * 1.2f, 1f); // boost up to max 1
            }

            // Smooth pitch and volume
            audioPitch = Mathf.Lerp(audioPitch, overdrivePitchTarget, lerpFactor);
            audioVolume = Mathf.Lerp(audioVolume, targetVolume, lerpFactor);

            // Apply to AudioSource
            warpAudio.pitch = audioPitch;
            warpAudio.volume = audioVolume;

            // Stop the audio if fully faded to zero
            if (audioVolume <= 0.0001f && warpAudio.isPlaying)
            {
                warpAudio.Stop();
            }
        }
    }
}

#if UNITY_EDITOR
namespace SpaceGraphicsToolkit
{
    using UnityEditor;
    using TARGET = SgtCameraMove;

    [CanEditMultipleObjects]
    [CustomEditor(typeof(TARGET))]
    public class SgtCameraMove_Editor : CwEditor
    {
        protected override void OnInspector()
        {
            TARGET tgt;
            TARGET[] tgts;
            GetTargets(out tgt, out tgts);

            // --- ORIGINAL FIELDS (preserve ordering & tooltips) --- //
            Draw("listen", "Is this component currently listening for inputs?");
            Draw("damping", "How quickly the position goes to the target value (-1 = instant).");

            Separator();

            Draw("target", "If you want movements to apply to Rigidbody.velocity, set it here.");
            Draw("targetRotation", "If the target is something like a spaceship, rotate it based on movement?");
            Draw("targetDamping", "The speed of the velocity rotation.");

            Separator();

            Draw("speedMin", "The movement speed will be multiplied by this when near to planets.");
            Draw("speedMax", "The movement speed will be multiplied by this when far from planets.");
            Draw("speedRange", "The higher you set this, the faster the <b>SpeedMin</b> value will be reached when approaching planets.");
            Draw("speedWheel");

            Separator();

            Draw("horizontalControls", "The keys/fingers required to move right/left.");
            Draw("depthControls", "The keys/fingers required to move backward/forward.");
            Draw("verticalControls", "The keys/fingers required to move down/up.");

            // --- WARP UI --- //
            Separator();
            EditorGUILayout.LabelField("Overdrive Settings", EditorStyles.boldLabel);
            Draw("overdriveThreshold");
            Draw("overdrivePitchMultiplier");
            Draw("overdriveSmoothSpeed");

            Draw("warpMultiplier", "Current warp multiplier applied to movement.");
            Draw("warpMin", "Minimum allowed warp multiplier (mouse wheel and presets are clamped to this).");
            Draw("warpMax", "Maximum allowed warp multiplier (mouse wheel and presets are clamped to this).");
            Draw("fineStep", "Fine-step multiplicative base for normal scroll (e.g. 1.05).");
            Draw("coarseStep", "Coarse-step multiplicative base for Shift+scroll (e.g. 10).");
            Draw("warpSmoothTime", "Smooth time to interpolate warp changes.");
            Draw("cycleKey", "Key used to cycle presets.");
            Draw("speedPresets", "Array of editable presets.");
            Draw("presetIndex", "Currently selected preset index (for reference).");
            Draw("warpAudio", "Optional warp AudioSource used for pitch feedback.");
            Draw("warpPitchMin", "Pitch at minimal warp.");
            Draw("warpPitchMax", "Pitch at maximal warp.");
            Draw("warpVolumeMin", "Minimum audio volume.");
            Draw("warpVolumeMax", "Maximum audio volume.");
            Draw("warpAudioPlayThreshold", "Effective speed threshold above which warp audio may play.");
            Draw("inputMoveThreshold", "Minimum input magnitude to consider camera moving for audio.");
            Draw("audioSmoothSpeed", "How quickly audio follows target pitch/volume.");

            // Buttons row: Cycle + Reset + Preset buttons
            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("Cycle Preset (V)"))
            {
                foreach (var t in targets)
                {
                    var comp = (TARGET)t;
                    Undo.RecordObject(comp, "Cycle Warp Preset");
                    comp.CyclePreset();
                    EditorUtility.SetDirty(comp);
                }
            }

            if (GUILayout.Button("Set Default Presets"))
            {
                foreach (var t in targets)
                {
                    var comp = (TARGET)t;
                    Undo.RecordObject(comp, "Reset Presets");
                    comp.speedPresets = new float[] { 1e6f, 1e9f, 1e18f };
                    comp.presetIndex = 0;
                    comp.SetPresetIndex(0);
                    EditorUtility.SetDirty(comp);
                }
            }
            EditorGUILayout.EndHorizontal();

            // Show buttons for each preset value (if present)
            var presetsProp = serializedObject.FindProperty("speedPresets");
            if (presetsProp != null && presetsProp.isArray)
            {
                EditorGUILayout.BeginHorizontal();
                for (int i = 0; i < presetsProp.arraySize; i++)
                {
                    var el = presetsProp.GetArrayElementAtIndex(i);
                    string label = el != null ? el.floatValue.ToString("0.#####E+0") : ("Preset " + i);
                    if (GUILayout.Button(label))
                    {
                        foreach (var t in targets)
                        {
                            var comp = (TARGET)t;
                            Undo.RecordObject(comp, "Set Preset Index");
                            comp.SetPresetIndex(i);
                            EditorUtility.SetDirty(comp);
                        }
                    }
                }
                EditorGUILayout.EndHorizontal();
            }

            Separator();
        }
    }
}
#endif
