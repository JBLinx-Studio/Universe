Shader "JBLinx Studio/AdvancedTriplanar"
{
    Properties
    {
        _MainTex("Base Albedo (UV)", 2D) = "white" {}
        _Overlay("Overlay Albedo (Triplanar)", 2D) = "gray" {}
        _OverlayBlend("Overlay Strength", Range(0,1)) = 0.35

        _Tiling("Triplanar Tiling", Float) = 1
        _MacroTiling("Macro Tiling", Float) = 0.15
        _FallOff("Triplanar Falloff", Range(1,8)) = 4

        [Toggle(_USE_TRIPLANAR_NORMAL)] _UseTriplanarNormal("Use Triplanar Normal Map", Float) = 1
        _NormalMap("Triplanar Normal", 2D) = "bump" {}

        _NoiseScale("Base Noise Scale", Float) = 0.8
        _NoiseStrength("Noise Strength", Range(0,1)) = 0.65
        _MicroNoise1("Micro Noise 1 Scale", Float) = 5
        _MicroNoise1Amp("Micro Noise 1 Amplitude", Range(0,1)) = 0.08
        _MicroNoise2("Micro Noise 2 Scale", Float) = 12
        _MicroNoise2Amp("Micro Noise 2 Amplitude", Range(0,1)) = 0.05

        [Toggle(_USE_GRAIN)] _UseGrain("Use Grain", Float) = 1
        _GrainIntensity("Grain Overlay Strength", Range(0,1)) = 0.35
        _GrainScale("Grain World Scale", Float) = 25.0
        _GrainContrast("Grain Contrast", Range(0,2)) = 1.6
        _GrainDetail("Grain Detail (bands)", Range(1,6)) = 3
        _GrainSeed("Grain Seed (stable)", Float) = 0.0
        _GrainBias("Grain Bias (tone)", Range(-1,1)) = 0.0
        _GrainStrength("Grain Blend Strength", Range(0,2)) = 1.0

        [Toggle(_USE_HEIGHT_TINT)] _UseHeightTint("Use Height/Slope Tint", Float) = 1
        _BottomColor("Bottom Color", Color) = (0.18,0.16,0.14,1)
        _TopColor("Top Color", Color) = (1,1,1,1)
        _HeightBlend("Height Blend Range", Float) = 8.0
        _SlopeInfluence("Slope Influence", Range(0,1)) = 0.35

        [Toggle(_USE_EDGE_ACCENT)] _UseEdgeAccent("Use Edge Accent", Float) = 1
        _EdgeIntensity("Edge Brightness", Range(0,1)) = 0.35
        _CavityIntensity("Cavity Darkening", Range(0,1)) = 0.25
        _EdgeNoiseScale("Edge Noise Scale", Float) = 3.0

        [Toggle(_USE_METAL_MAP)] _UseMetalMap("Use Metallic Map", Float) = 0
        _Metallic("Metallic", Range(0,1)) = 0
        _MetallicMap("Metallic Map (Triplanar - R)", 2D) = "white" {}
        _MetallicFactor("Metallic Factor", Range(0,2)) = 1

        [Toggle(_USE_SMOOTH_MAP)] _UseSmoothMap("Use Smoothness Map", Float) = 0
        _Smoothness("Smoothness", Range(0,1)) = 0.35
        _SmoothnessMap("Smoothness Map (Triplanar - G)", 2D) = "white" {}
        _SmoothnessFactor("Smoothness Factor", Range(0,2)) = 1

        [Toggle(_USE_AO_MAP)] _UseAOMap("Use AO Map", Float) = 0
        _AOMap("AO Map (Triplanar - R)", 2D) = "white" {}
        _AOIntensity("AO Strength", Range(0,1)) = 0.7

        [Toggle(_USE_EMISSION)] _UseEmission("Use Emission Map", Float) = 0
        _Emission("Emission (UV)", 2D) = "black" {}
        _EmissionColor("Emission Color", Color) = (0,0,0,0)

        [Toggle(_USE_DIRT)] _UseDirt("Use Dirt / Edge Mask", Float) = 1
        _DirtStrength("Dirt/Edge Mask Strength", Range(0,1)) = 0.25
        _DirtNoiseScale("Dirt Noise Scale", Float) = 2.0

        _DetailFadeDistance("Detail Fade Start Distance", Float) = 40.0
        _DetailFadeRange("Detail Fade Range", Float) = 25.0
    }

        SubShader
        {
            Tags { "RenderType" = "Opaque" "Queue" = "Geometry" }
            LOD 300
            Cull Back

            Pass
            {
                Tags { "LightMode" = "ForwardBase" }

                CGPROGRAM
                #pragma target 3.0
                #pragma vertex vert
                #pragma fragment frag
                #pragma multi_compile_fwdbase
                #pragma multi_compile_fog
                #pragma multi_compile_shadowcaster

                #pragma shader_feature _USE_TRIPLANAR_NORMAL
                #pragma shader_feature _USE_METAL_MAP
                #pragma shader_feature _USE_SMOOTH_MAP
                #pragma shader_feature _USE_AO_MAP
                #pragma shader_feature _USE_EMISSION
                #pragma shader_feature _USE_DIRT
                #pragma shader_feature _USE_HEIGHT_TINT
                #pragma shader_feature _USE_EDGE_ACCENT
                #pragma shader_feature _USE_GRAIN

                #include "UnityCG.cginc"
                #include "Lighting.cginc"
                #include "AutoLight.cginc"

            // constants
            #define PI 3.14159265359

            sampler2D _MainTex;
            sampler2D _Overlay;
            sampler2D _NormalMap;
            sampler2D _Emission;
            sampler2D _MetallicMap;
            sampler2D _SmoothnessMap;
            sampler2D _AOMap;

            float4 _MainTex_ST;
            float4 _EmissionColor;

            float _Tiling;
            float _MacroTiling;
            float _FallOff;
            float _OverlayBlend;

            float _NoiseScale;
            float _NoiseStrength;
            float _MicroNoise1;
            float _MicroNoise1Amp;
            float _MicroNoise2;
            float _MicroNoise2Amp;

            float4 _BottomColor;
            float4 _TopColor;
            float _HeightBlend;
            float _SlopeInfluence;

            float _EdgeIntensity;
            float _CavityIntensity;
            float _EdgeNoiseScale;

            float _Metallic;
            float _MetallicFactor;
            float _Smoothness;
            float _SmoothnessFactor;

            float _DirtStrength;
            float _DirtNoiseScale;

            float _DetailFadeDistance;
            float _DetailFadeRange;

            float _GrainIntensity;
            float _GrainScale;
            float _GrainContrast;
            float _GrainDetail;
            float _GrainSeed;
            float _GrainBias;
            float _GrainStrength;

            float _AOIntensity;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv     : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 wp  : TEXCOORD0;
                float3 wn  : TEXCOORD1;
                float2 uv  : TEXCOORD2;
                SHADOW_COORDS(3)
                UNITY_FOG_COORDS(4)
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.wp = mul(unity_ObjectToWorld, v.vertex).xyz;
                o.wn = UnityObjectToWorldNormal(v.normal);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                TRANSFER_SHADOW(o);
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            // cheap hash + noise
            inline float hash(float3 p)
            {
                p = frac(p * 0.3183099 + 0.1);
                return frac(dot(p, float3(127.1, 311.7, 74.7)));
            }

            inline float noise(float3 p)
            {
                float3 i = floor(p);
                float3 f = frac(p);
                f = f * f * (3.0 - 2.0 * f);

                float n000 = hash(i + float3(0,0,0));
                float n100 = hash(i + float3(1,0,0));
                float n010 = hash(i + float3(0,1,0));
                float n110 = hash(i + float3(1,1,0));
                float n001 = hash(i + float3(0,0,1));
                float n101 = hash(i + float3(1,0,1));
                float n011 = hash(i + float3(0,1,1));
                float n111 = hash(i + float3(1,1,1));

                float nx00 = lerp(n000, n100, f.x);
                float nx10 = lerp(n010, n110, f.x);
                float nx01 = lerp(n001, n101, f.x);
                float nx11 = lerp(n011, n111, f.x);

                float nxy0 = lerp(nx00, nx10, f.y);
                float nxy1 = lerp(nx01, nx11, f.y);

                return lerp(nxy0, nxy1, f.z);
            }

            // lighter-weight FBM approximation (keeps character but reduces noise samples)
            // This reduces cost by combining a cheap analytic lerp with two noise samples
            inline float fbm3(float3 p)
            {
                // base low-frequency layer
                float a = noise(p * 0.8) * 0.6;
                // mid-frequency detail
                float b = noise(p * 1.9) * 0.3;
                // a tiny high-frequency bump approximated analytically (cheap)
                float c = frac(sin(dot(p * 12.9898, float3(78.233, 37.719, 45.164))) * 43758.5453) * 0.1 - 0.05;
                // smooth blend to preserve visual continuity
                float blend = smoothstep(-0.1, 0.8, a);
                return saturate(lerp(a + b, a + b * 0.6 + c, blend));
            }

            inline float2 rot2(float2 uv, float a)
            {
                float ca = cos(a); float sa = sin(a);
                return float2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
            }

            // normalized triplanar weights
            inline float3 Weights(float3 n)
            {
                n = abs(n);
                n = pow(n, _FallOff);
                float s = max(n.x + n.y + n.z, 1e-4);
                return n / s;
            }

            inline float3 ScaledPos(float3 wp)
            {
                float3 sx = float3(unity_ObjectToWorld._m00, unity_ObjectToWorld._m10, unity_ObjectToWorld._m20);
                float3 sy = float3(unity_ObjectToWorld._m01, unity_ObjectToWorld._m11, unity_ObjectToWorld._m21);
                float3 sz = float3(unity_ObjectToWorld._m02, unity_ObjectToWorld._m12, unity_ObjectToWorld._m22);
                return wp / float3(max(0.0001,length(sx)), max(0.0001,length(sy)), max(0.0001,length(sz)));
            }

            // triplanar color sampling with lightweight shared jitter calc
            inline float3 TPColor(sampler2D t, float3 p, float scale, float3 w)
            {
                p *= scale;
                float ang = hash(floor(p * 0.1234)) * (2.0 * PI);
                float2 jitter = (float2(hash(p * 12.7), hash(p * 7.3)) - 0.5) * 0.002;

                float2 uvX = rot2(frac(p.zy) + jitter, ang);
                float2 uvY = rot2(frac(p.xz) + jitter, ang + 1.234);
                float2 uvZ = rot2(frac(p.xy) + jitter, ang + 2.468);

                float3 cX = tex2D(t, uvX).rgb;
                float3 cY = tex2D(t, uvY).rgb;
                float3 cZ = tex2D(t, uvZ).rgb;

                return saturate(cX * w.x + cY * w.y + cZ * w.z);
            }

            // triplanar scalar helpers (R/G channels)
            inline float TPScalar(sampler2D t, float3 p, float scale, float3 w, int channel)
            {
                p *= scale;
                float2 uvX = p.zy;
                float2 uvY = p.xz;
                float2 uvZ = p.xy;

                float4 sx = tex2D(t, uvX);
                float4 sy = tex2D(t, uvY);
                float4 sz = tex2D(t, uvZ);

                float vX = (channel == 0) ? sx.r : sx.g;
                float vY = (channel == 0) ? sy.r : sy.g;
                float vZ = (channel == 0) ? sz.r : sz.g;

                return dot(w, float3(vX, vY, vZ));
            }

            inline float3 TPNormal(float3 p, float3 n, float3 w)
            {
                float3 tn = n;

                #ifdef _USE_TRIPLANAR_NORMAL
                p *= _Tiling;
                float ang = hash(floor(p * 0.1234)) * (2.0 * PI);
                float2 jitter = (float2(hash(p * 12.7), hash(p * 7.3)) - 0.5) * 0.002;

                float2 uvNX = rot2(frac(p.zy) + jitter, ang);
                float2 uvNY = rot2(frac(p.xz) + jitter, ang + 1.234);
                float2 uvNZ = rot2(frac(p.xy) + jitter, ang + 2.468);

                float3 nx = UnpackNormal(tex2D(_NormalMap, uvNX));
                float3 ny = UnpackNormal(tex2D(_NormalMap, uvNY));
                float3 nz = UnpackNormal(tex2D(_NormalMap, uvNZ));

                float3 blended =
                    float3(nx.z, nx.y, -nx.x) * w.x +
                    float3(ny.x, ny.z, -ny.y) * w.y +
                    float3(nz.x, nz.y,  nz.z) * w.z;

                tn = normalize(blended);
                #endif

                // combine base and micro noise once per normal
                float baseN = fbm3(p * _NoiseScale) - 0.5;
                float micro = fbm3(p * _MicroNoise1) * _MicroNoise1Amp + fbm3(p * _MicroNoise2) * _MicroNoise2Amp;
                float offset = clamp(baseN * 0.25 + micro * 0.75, -0.25, 0.25);
                tn = normalize(lerp(tn, tn + offset, saturate(_NoiseStrength)));
                return tn;
            }

            inline float3 GrainStablePos(float3 wp)
            {
                float safeScale = max(0.0001, _GrainScale);
                float3 raw = (wp + _GrainSeed) / safeScale;
                if (safeScale < 0.1)
                {
                    float tinyJ = (hash(raw * 1.37) - 0.5) * 0.0007;
                    return raw + tinyJ;
                }
                float snapFractionRel = 0.0625;
                float step = max(1e-5, snapFractionRel * safeScale);
                float3 snappedWorld = floor((wp + _GrainSeed) / step) * step;
                float3 snapped = snappedWorld / safeScale;
                float jitter = (hash(snappedWorld * 0.317) - 0.5) * 0.001;
                snapped += jitter;
                return snapped;
            }

            inline float bandSample(float3 p, float freq, float angle)
            {
                float2 r = rot2(p.xy * freq + float2(0.27,0.46), angle);
                return fbm3(float3(r.x, p.z * freq, r.y) * 0.9);
            }

            inline float GrainFactor(float3 wp)
            {
                float3 gPos = GrainStablePos(wp);
                int bands = (int)max(1, floor(_GrainDetail + 0.5));
                float baseAng = hash(gPos * 0.37 + 0.13) * (2.0 * PI);

                float bandHF = bandSample(gPos * 2.2, 2.0, baseAng);
                float bandMF = bandSample(gPos * 0.9, 1.0, baseAng + 2.03);
                float bandLF = bandSample(gPos * 0.35, 0.5, baseAng + 4.21);
                float bandEX = (bands > 3) ? bandSample(gPos * 4.4, 3.4, baseAng + 1.11) * 0.5 : 0.0;

                float regionJ = (hash(gPos * 51.0) - 0.5) * 0.03;
                float raw = saturate(bandHF * 0.70 + bandMF * 0.22 + bandLF * 0.06 + bandEX * 0.02 + regionJ);
                raw = pow(smoothstep(0.01, 0.99, raw), 0.95);
                raw = raw + _GrainBias * 0.06;
                raw = saturate(raw);
                float signedGrain = (raw - 0.5) * _GrainContrast;
                return signedGrain;
            }

            inline float HeightTintFactor(float3 wp, float3 n)
            {
                float h = wp.y;
                float slope = 1.0 - saturate(n.y);
                float hNorm = saturate((h + _HeightBlend * 0.5) / max(_HeightBlend, 0.0001));
                float slopeMask = lerp(1.0, slope, _SlopeInfluence);
                return saturate(hNorm * slopeMask);
            }

            inline float EdgeCavity(float3 wp, float3 n)
            {
                float3 p = ScaledPos(wp) * _EdgeNoiseScale;
                float n1 = noise(p);
                float n2 = noise(p * 1.8 + 3.1);
                float nMix = n1 * 0.6 + n2 * 0.4;
                float facing = saturate(n.y * 0.5 + 0.5);
                float edge = saturate(abs(nMix - 0.5) * 2.0);
                float cavity = (1.0 - facing) * edge;
                float ridge = facing * edge;
                return ridge * _EdgeIntensity - cavity * _CavityIntensity;
            }

            // PBR helpers
            inline float D_GGX(float NdotH, float alpha)
            {
                float a2 = alpha * alpha;
                float d = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
                return a2 / max(PI * d * d, 1e-5);
            }

            inline float G_SchlickGGX(float NdotV, float k)
            {
                return NdotV / max(NdotV * (1.0 - k) + k, 1e-5);
            }

            inline float G_Smith(float NdotV, float NdotL, float k)
            {
                return G_SchlickGGX(NdotV, k) * G_SchlickGGX(NdotL, k);
            }

            inline float3 F_Schlick(float3 F0, float cosTheta)
            {
                return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
            }

            inline float3 SampleSpecIBL(float3 N, float3 V, float smoothness, float3 F0)
            {
                float perceptualRoughness = saturate(1.0 - smoothness);
                float mip = perceptualRoughness * UNITY_SPECCUBE_LOD_STEPS;
                float3 R = reflect(-V, N);
                float4 rgbm = UNITY_SAMPLE_TEXCUBE_LOD(unity_SpecCube0, R, mip);
                float3 env = DecodeHDR(rgbm, unity_SpecCube0_HDR);
                return env * F0;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float3 nGeo = normalize(i.wn);
                float3 v = normalize(_WorldSpaceCameraPos - i.wp);
                float3 p = ScaledPos(i.wp);
                float3 w = Weights(nGeo);

                // Distance-based detail fading to keep far surfaces clean and cheaper
                float camDist = distance(_WorldSpaceCameraPos, i.wp);
                float detailFade = saturate(1.0 - max(camDist - _DetailFadeDistance, 0.0) / max(_DetailFadeRange, 0.001));

                // Base color & overlay (cache repeated values)
                float3 baseCol = tex2D(_MainTex, i.uv).rgb;

                float baseNoise = fbm3(p * _NoiseScale);
                float noiseMask = saturate((baseNoise * 1.2 - 0.08) * 1.12); // bias for richer mid detail

                // stronger micro/macro layering for richer detail with contrast tweak
                float3 ovMacro = TPColor(_Overlay, p, max(0.001, _MacroTiling) * 0.8, w);
                float3 ovFine = TPColor(_Overlay, p, max(0.001, _Tiling) * 1.0, w);
                float blendMask = smoothstep(0.18, 0.82, noiseMask);
                float3 ov = lerp(ovMacro, ovFine, blendMask);
                // slightly punch contrast of overlay for richer reads
                ov = saturate((ov - 0.5) * 1.08 + 0.5);

                float overlayStrength = saturate(_OverlayBlend);
                float3 albedo = lerp(baseCol, baseCol * ov, overlayStrength * (0.65 + 0.35 * detailFade));

                // subtle surface noise modulation (re-use noiseMask) with eased blend
                albedo = lerp(albedo, albedo * (0.72 + noiseMask * 0.62), saturate(_NoiseStrength * 0.95 * detailFade));
                albedo = saturate(albedo);

                // Dirt (softened and distance-aware) with more edge emphasis
                #ifdef _USE_DIRT
                {
                    float dirt = fbm3(p * _DirtNoiseScale * 0.95);
                    dirt = smoothstep(0.24, 0.88, dirt);
                    albedo = lerp(albedo, albedo * 0.48, saturate(dirt * _DirtStrength * detailFade));
                }
                #endif

                // Height/slope tint with stronger blend near peaks and slopes
                #ifdef _USE_HEIGHT_TINT
                {
                    float hFactor = HeightTintFactor(i.wp, nGeo);
                    float boost = smoothstep(0.12, 0.92, hFactor);
                    float3 tint = lerp(_BottomColor.rgb, _TopColor.rgb, hFactor);
                    // apply tint with slight non-linear response for realism
                    albedo = saturate(lerp(albedo, albedo * pow(tint, float3(0.95,0.95,0.95)), 0.5 * boost));
                }
                #endif

                // Normal (triplanar + noise) with improved blend toward triplanar normal
                float3 N = TPNormal(p, nGeo, w);

                // Metal / smoothness / AO (use combined scalar helper)
                float metallic = _Metallic;
                float smoothness = _Smoothness;

                #ifdef _USE_METAL_MAP
                    float metalSample = TPScalar(_MetallicMap, p, max(0.001, _Tiling), w, 0);
                    metallic = saturate(lerp(_Metallic, metalSample * _MetallicFactor, metalSample));
                #endif

                #ifdef _USE_SMOOTH_MAP
                    float smoothSample = TPScalar(_SmoothnessMap, p, max(0.001, _Tiling), w, 1);
                    smoothness = saturate(lerp(_Smoothness, smoothSample * _SmoothnessFactor, smoothSample));
                #endif

                float ao = 1.0;
                #ifdef _USE_AO_MAP
                    float aoSample = TPScalar(_AOMap, p, max(0.001, _MacroTiling), w, 0);
                    ao = lerp(1.0, saturate(aoSample), _AOIntensity);
                #endif

                    // Lighting (directional + IBL)
                    float3 L = normalize(_WorldSpaceLightPos0.xyz);
                    float3 H = normalize(L + v);

                    UNITY_LIGHT_ATTENUATION(atten, i, i.wp);
                    float shadow = max(atten, 0.16);

                    float NdotL = saturate(dot(N, L));
                    float NdotV = saturate(dot(N, v));
                    float NdotH = saturate(dot(N, H));
                    float VdotH = saturate(dot(v, H));

                    // Fresnel base: improved energy-conserving mix
                    float3 F0 = lerp(float3(0.04, 0.04, 0.04), albedo, metallic);
                    F0 = lerp(F0, F0 * (1.0 + 0.06 * smoothness), saturate(smoothness * 0.6));

                    float roughness = saturate(1.0 - smoothness);
                    float alpha = max(roughness * roughness, 0.001);
                    float k = (roughness + 1.0);
                    k = (k * k) / 8.0;

                    float D = D_GGX(NdotH, alpha);
                    float G = G_Smith(NdotV, NdotL, k);
                    float3 F = F_Schlick(F0, VdotH);

                    float3 specBRDF = (D * G * F) / max(4.0 * NdotV * NdotL, 1e-4);

                    float3 kd = (1.0 - F) * (1.0 - metallic);
                    float3 diffuse = kd * albedo / PI;

                    // Slightly amplify direct light response on rough surfaces for warmth
                    float lightBoost = lerp(1.0, 1.09, smoothness * 0.65);
                    float3 direct = (diffuse + specBRDF) * _LightColor0.rgb * (NdotL * shadow) * lerp(1.0, ao, 0.9) * lightBoost;

                    // Ambient: SH diffuse + specular IBL (improved balance)
                    float3 ambientDiffuse = ShadeSH9(float4(N,1.0)) * albedo * 0.62 * ao;
                    float3 specIBL = SampleSpecIBL(N, v, smoothness, F0) * ao * 1.12;
                    float3 ambient = ambientDiffuse + specIBL;

                    float3 color = direct + ambient;

                    // Soft curvature darkening from EdgeCavity to increase perceived detail (slightly stronger)
                    #ifdef _USE_EDGE_ACCENT
                    {
                        float cav = EdgeCavity(i.wp, N) * detailFade;
                        color *= (1.0 + cav * 1.05);
                        // subtle albedo lift on ridges for perceived crispness
                        float ridgeBoost = saturate(cav * 0.6);
                        color = lerp(color, color + albedo * 0.08, ridgeBoost * 0.6);
                    }
                    #endif

                    // Rim lighting/subtle fresnel for silhouettes with warm tint
                    {
                        float rim = pow(saturate(1.0 - NdotV), 2.2) * 0.06 * (1.0 + smoothness * 0.62);
                        color += lerp(float3(0,0,0), albedo * 0.75 * lerp(1.0, 1.12, smoothness), rim);
                    }

                    // Grain (post lighting, preserves tone) with slightly reduced destructive effect
                    #ifdef _USE_GRAIN
                    {
                        float grainIntensityScaled = _GrainIntensity * detailFade;
                        float signedGrain = GrainFactor(i.wp);
                        float lightMod = saturate(lerp(0.75, 1.05, NdotL) * shadow);
                        float visibleGrain = signedGrain * grainIntensityScaled * _GrainStrength * lightMod * 0.45;

                        float3 mulOut = color * (1.0 + visibleGrain * 0.18);
                        float3 addOut = color + visibleGrain * 0.12;
                        color = saturate(lerp(mulOut, addOut, 0.48));

                        float3 gPosStable = GrainStablePos(i.wp);
                        float nPerturb = (fbm3(gPosStable * 2.0) - 0.5) * 0.0065 * saturate(grainIntensityScaled);
                        N = normalize(N + nPerturb * float3(0.10,0.22,0.06));

                        float lum = dot(color, float3(0.2126,0.7152,0.0722));
                        float dither = (hash(floor(gPosStable * 2048.0 + 7.0)) - 0.5) * (0.0018 * (1.0 - lightMod));
                        color += dither * (1.0 - saturate(lum * 0.96));
                    }
                    #endif

                    // Emission
                    #ifdef _USE_EMISSION
                    {
                        float3 emission = tex2D(_Emission, i.uv).rgb * _EmissionColor.rgb;
                        color += emission;
                    }
                    #endif

                    UNITY_APPLY_FOG(i.fogCoord, color);
                    return float4(saturate(color), 1);
                }
                ENDCG
            }

            Pass
            {
                Name "ShadowCaster"
                Tags { "LightMode" = "ShadowCaster" }
                CGPROGRAM
                #pragma vertex vert
                #pragma fragment frag
                #pragma multi_compile_shadowcaster
                #include "UnityCG.cginc"
                struct v2f { V2F_SHADOW_CASTER; };
                v2f vert(appdata_base v) { v2f o; TRANSFER_SHADOW_CASTER_NORMALOFFSET(o); return o; }
                float4 frag(v2f i) : SV_Target { SHADOW_CASTER_FRAGMENT(i); }
                ENDCG
            }
        }
            Fallback "Diffuse"
}