/// --- SUMMARY ---
/// Master LOD controller for floating objects.
/// - Auto-detects prefab-child LODs under "LOD"
/// - Only one LOD active at a time
/// - Each LOD has its own optional "Pre-Activate On Start" toggle
/// - Inspector shows LOD_1, LOD_2, LOD_3 ... instead of Element 0, 1, 2
/// - Trimmed, optimized, clean

using UnityEngine;
using System.Collections.Generic;

namespace SpaceGraphicsToolkit
{
    [ExecuteInEditMode]
    [AddComponentMenu("Space Graphics Toolkit/Floating LOD Group")]
    [RequireComponent(typeof(SgtFloatingObject))]
    public class SgtFloatingLodGroup : MonoBehaviour
    {
        // --- LOD ENTRY ---
        [System.Serializable]
        public class LODEntry
        {
            public GameObject LODObject;
            public SgtLength DistanceMin;
            public SgtLength DistanceMax;

            [Tooltip("If enabled, this LOD will start active when the object spawns inside its range.")]
            public bool PreActivateOnStart = false;

            [HideInInspector] public bool Active;
        }

        // --- SETTINGS ---
        public List<LODEntry> LODs = new List<LODEntry>();

        // --- CACHED ---
        private SgtFloatingObject floatingObject;
        private LODEntry currentLOD;

        // --- ENABLE ---
        private void OnEnable()
        {
            floatingObject = GetComponent<SgtFloatingObject>();
            floatingObject.OnDistance += HandleDistance;

            AutoPopulateIfEmpty();

            ApplyInitialActivation();
        }

        private void OnDisable()
        {
            if (floatingObject != null)
                floatingObject.OnDistance -= HandleDistance;
        }

        // --- INITIAL ACTIVATION (PER-LOD) ---
        private void ApplyInitialActivation()
        {
            // Give priority to any LOD that has preactivation enabled
            for (int i = 0; i < LODs.Count; i++)
            {
                var lod = LODs[i];
                if (lod.PreActivateOnStart && lod.LODObject != null)
                {
                    ActivateOnly(i);
                    currentLOD = lod;
                    return;
                }
            }

            // If none have preactivation: fallback to distance
            ApplyDistanceImmediately();
        }

        private void ApplyDistanceImmediately()
        {
            if (Camera.main == null) return;
            float d = Vector3.Distance(Camera.main.transform.position, transform.position);
            HandleDistance(d);
        }

        // --- DISTANCE SELECTION ---
        private void HandleDistance(double distance)
        {
            if (LODs.Count == 0) return;

            float d = (float)distance;
            LODEntry best = null;

            for (int i = 0; i < LODs.Count; i++)
            {
                var lod = LODs[i];
                if (lod.LODObject == null) continue;

                if (d >= (float)lod.DistanceMin && d <= (float)lod.DistanceMax)
                {
                    best = lod;
                    break;
                }
            }

            if (currentLOD != best)
            {
                currentLOD = best;
                UpdateActiveStates();
            }
        }

        // --- SET ACTIVE STATES ---
        private void UpdateActiveStates()
        {
            for (int i = 0; i < LODs.Count; i++)
            {
                var lod = LODs[i];
                if (lod.LODObject == null) continue;

                bool shouldBeActive = (lod == currentLOD);

                if (lod.Active != shouldBeActive)
                {
                    lod.LODObject.SetActive(shouldBeActive);
                    lod.Active = shouldBeActive;
                }
            }
        }

        private void ActivateOnly(int index)
        {
            for (int i = 0; i < LODs.Count; i++)
            {
                var lod = LODs[i];
                if (lod.LODObject == null) continue;

                bool active = (i == index);
                lod.LODObject.SetActive(active);
                lod.Active = active;
            }
        }

        // --- AUTO POPULATE LODS ---
        private void AutoPopulateIfEmpty()
        {
            if (LODs.Count > 0) return;

            var root = transform.Find("LOD");
            if (root == null) return;

            LODs.Clear();

            for (int i = 0; i < root.childCount; i++)
            {
                var child = root.GetChild(i).gameObject;

                LODs.Add(new LODEntry
                {
                    LODObject = child,
                    DistanceMin = new SgtLength(i * 1000f, SgtLength.ScaleType.Meter),
                    DistanceMax = new SgtLength((i + 1) * 1000f, SgtLength.ScaleType.Meter),
                    Active = child.activeSelf,
                    PreActivateOnStart = false
                });
            }
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (LODs == null) LODs = new List<LODEntry>();
        }
#endif
    }
}
