using UnityEngine;
using CW.Common;

namespace SpaceGraphicsToolkit
{
    /// --- SUMMARY ---
    /// Enhanced floating sphere spawner with optional Source Texture Mode.
    /// - Can spawn prefabs inside a spherical volume (random) or driven by a 2D source texture (optional).
    /// - Texture mode samples UVs and projects them to spherical coordinates to preserve image shape.
    /// - Supports seeded deterministic generation, sampling count, brightness threshold, jitter, per-pixel scale/rotation weighting.
    /// - Compact, inspector-friendly, trimmed for clarity.
    /// --- END SUMMARY ---

    [HelpURL(SgtCommon.HelpUrlPrefix + "SgtFloatingSpawnerSphereEnhanced")]
    [AddComponentMenu(SgtCommon.ComponentMenuPrefix + "Floating Spawner Sphere (Enhanced)")]
    public class SgtFloatingSpawnerSphereEnhanced : SgtFloatingSpawner
    {
        // --- BASIC ---
        [SerializeField] private int count = 10;
        [SerializeField] private SgtLength radius = new SgtLength(2_000_000.0, SgtLength.ScaleType.Meter);
        [SerializeField, Range(0f, 1f)] private float offset = 0f;
        [SerializeField] private float velocityScale = 0f;
        [SerializeField] private int seed;

        // --- RANDOM TRANSFORMS ---
        [SerializeField] private bool useRandomRotation = true;
        [SerializeField] private bool uniformRotation = false;
        [SerializeField] private Vector2 rotX = new Vector2(0f, 360f);
        [SerializeField] private Vector2 rotY = new Vector2(0f, 360f);
        [SerializeField] private Vector2 rotZ = new Vector2(0f, 360f);

        [SerializeField] private bool useRandomScale = false;
        [SerializeField] private bool uniformScale = true;
        [SerializeField] private Vector2 scaleRange = new Vector2(1f, 1f);

        // --- SPIN ---
        [SerializeField] private bool applySpin = false;
        [SerializeField] private Vector3 spinPerSecond = new Vector3(0, 2, 0);

        // --- SOURCE TEXTURE MODE ---
        public enum SourceType { None, Red, Green, Blue, Alpha, AverageRgb, MinRgb, MaxRgb }
        [SerializeField] private bool useSourceTexture = false;
        [SerializeField] private Texture sourceTexture;
        [SerializeField, Range(1, 8)] private int textureSamples = 2;
        [SerializeField, Range(0f, 1f)] private float textureThreshold = 0.1f;
        [SerializeField] private SourceType scaleSource = SourceType.None;
        [SerializeField] private SourceType rotationSource = SourceType.None;
        [SerializeField, Range(0f, 1f)] private float jitter = 0.05f;

        // --- PROPERTIES (optional exposure) ---
        public int Count { get => count; set => count = value; }
        public SgtLength Radius { get => radius; set => radius = value; }
        public bool UseSourceTexture { get => useSourceTexture; set => useSourceTexture = value; }

        // --- INTERNAL ---
        private static Texture2D sourceTex2D;

        protected override void SpawnAll()
        {
            var parentPoint = GetComponentInParent<SgtFloatingPoint>();
            if (parentPoint == null) return;

            BuildSpawnList();

            CwHelper.BeginSeed(seed);

            var rad = (double)radius;

            // prepare texture
            sourceTex2D = sourceTexture as Texture2D;
            var canUseTexture = useSourceTexture && sourceTex2D != null && sourceTex2D.isReadable;

            for (int i = 0; i < count; i++)
            {
                Vector3 direction;
                float distance;
                Color sampled = Color.black;
                float weight = 1.0f;

                if (canUseTexture)
                {
                    // Attempt to find a sample that passes threshold (take brightest of `textureSamples`)
                    float best = -1f;
                    float sampleX = 0f;
                    float sampleY = 0f;

                    for (int s = 0; s < textureSamples; s++)
                    {
                        sampleX = Random.Range(0f, 1f);
                        sampleY = Random.Range(0f, 1f);
                        var pixel = sourceTex2D.GetPixelBilinear(sampleX, sampleY);
                        var brightness = pixel.grayscale;
                        if (brightness > best) { best = brightness; sampled = pixel; }
                    }

                    if (best < textureThreshold)
                    {
                        // If sample failed threshold, skip this spawn attempt and continue (keeps spawn counts deterministic)
                        continue;
                    }

                    // Map UV -> spherical direction
                    float lon = sampleX * Mathf.PI * 2.0f;        // 0..2PI
                    float lat = (sampleY * 2.0f - 1.0f) * Mathf.PI * 0.5f; // -PI/2..PI/2
                    float cosLat = Mathf.Cos(lat);

                    direction = new Vector3(
                        Mathf.Cos(lon) * cosLat,
                        Mathf.Sin(lat),
                        Mathf.Sin(lon) * cosLat
                    ).normalized;

                    // distance can be driven by alpha or brightness (use brightness by default)
                    distance = Mathf.Lerp(offset, 1f, sampled.grayscale);
                    weight = GetWeight(scaleSource, sampled, 1.0f);
                }
                else
                {
                    // Pure random on unit sphere
                    direction = Random.onUnitSphere;
                    distance = Mathf.Lerp(offset, 1f, Random.value);
                }

                // Apply jitter: small local displacement perpendicular to direction
                var jitterOffset = Random.insideUnitSphere * jitter * (float)rad;
                var spawnOffset = direction * (distance * (float)rad) + jitterOffset;

                // Build final position in the parentPoint local space and snap (keeps compatibility with SGT world system)
                var position = parentPoint.Position;
                position.LocalX += spawnOffset.x;
                position.LocalY += spawnOffset.y;
                position.LocalZ += spawnOffset.z;
                position.SnapLocal();

                var clone = SpawnAt(position, i);
                if (clone == null) continue;

                // --- TRANSFORMS ---
                // Rotation
                if (useRandomRotation)
                {
                    if (uniformRotation)
                    {
                        float r = Random.Range(0f, 360f);
                        clone.transform.localRotation = Quaternion.Euler(r, r, r);
                    }
                    else
                    {
                        var rx = Random.Range(rotX.x, rotX.y);
                        var ry = Random.Range(rotY.x, rotY.y);
                        var rz = Random.Range(rotZ.x, rotZ.y);
                        clone.transform.localRotation = Quaternion.Euler(rx, ry, rz);
                    }

                    // If rotationSource defined and texture used, apply extra rotation weighting
                    if (canUseTexture && rotationSource != SourceType.None)
                    {
                        float rotWeight = GetWeight(rotationSource, sampled, 0f);
                        var extra = Quaternion.Euler(rotWeight * 360f, rotWeight * 360f, rotWeight * 360f);
                        clone.transform.localRotation *= extra;
                    }
                }

                // Scale
                if (useRandomScale)
                {
                    if (uniformScale)
                    {
                        float s = Random.Range(scaleRange.x, scaleRange.y);
                        clone.transform.localScale = Vector3.one * s * weight;
                    }
                    else
                    {
                        clone.transform.localScale = new Vector3(
                            Random.Range(scaleRange.x, scaleRange.y) * weight,
                            Random.Range(scaleRange.x, scaleRange.y) * weight,
                            Random.Range(scaleRange.x, scaleRange.y) * weight
                        );
                    }
                }

                // Velocity (simple tangential)
                if (velocityScale > 0f)
                {
                    var rb = clone.GetComponent<Rigidbody>();
                    if (rb != null)
                    {
                        var cross = Vector3.Cross(direction, Random.onUnitSphere).normalized;
                        rb.linearVelocity = (cross * velocityScale) / (distance * distance);
                    }
                }

                // Spin component
                if (applySpin)
                {
                    var spin = clone.gameObject.GetComponent<SpinComponent>();
                    if (spin == null) spin = clone.gameObject.AddComponent<SpinComponent>();
                    spin.RotationPerSecond = spinPerSecond;
                }

                // Optional: tint renderer color by texture sample (if present)
                if (canUseTexture)
                {
                    var rend = clone.GetComponentInChildren<Renderer>();
                    if (rend != null && rend.sharedMaterial != null)
                    {
                        // attempt to set _Color if present (safe)
                        if (rend.sharedMaterial.HasProperty("_Color"))
                        {
                            // Multiply existing color by sampled color to preserve material tinting
                            var baseColor = rend.sharedMaterial.color;
                            rend.sharedMaterial.color = new Color(
                                baseColor.r * sampled.r,
                                baseColor.g * sampled.g,
                                baseColor.b * sampled.b,
                                baseColor.a
                            );
                        }
                    }
                }
            }

            CwHelper.EndSeed();
        }

        // --- UTIL ---
        private float GetWeight(SourceType source, Color pixel, float defaultWeight)
        {
            switch (source)
            {
                case SourceType.Red: return pixel.r;
                case SourceType.Green: return pixel.g;
                case SourceType.Blue: return pixel.b;
                case SourceType.Alpha: return pixel.a;
                case SourceType.AverageRgb: return (pixel.r + pixel.g + pixel.b) / 3.0f;
                case SourceType.MinRgb: return Mathf.Min(pixel.r, Mathf.Min(pixel.g, pixel.b));
                case SourceType.MaxRgb: return Mathf.Max(pixel.r, Mathf.Max(pixel.g, pixel.b));
            }
            return defaultWeight;
        }

        // --- SIMPLE SPIN COMPONENT ---
        public class SpinComponent : MonoBehaviour
        {
            public Vector3 RotationPerSecond = Vector3.zero;
            void Update()
            {
                transform.Rotate(RotationPerSecond * Time.deltaTime, Space.Self);
            }
        }
    }
}
